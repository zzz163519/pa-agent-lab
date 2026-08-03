import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_PROFILE_V1,
  DOCTRINE_RETRIEVAL_RUNTIME,
  createDoctrineApproval,
  createDoctrineCorpusEntry,
  createDoctrineCorpusSnapshot,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createPhase4aQualitySuiteV1 } from "../src/doctrine-retrieval-quality-v1.ts";
import {
  createCaseStore,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "../src/case-store-v1.ts";
import { applyContentHashedMigrations, loadContentHashedMigrations } from "../src/migration-runner-v1.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as {
  readonly PGlite: new () => PGliteDatabase;
};
interface PGliteDatabase {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}
const migrations = await loadContentHashedMigrations(
  new URL("../../persistence-contracts/sql", import.meta.url).pathname,
);

describe("Phase 4A Doctrine retrieval Case Store", () => {
  it("ingests the complete approved projection, activates, and writes immutable evidence", async () => {
    const harness = await createHarness();
    try {
      for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
        await harness.store.appendDoctrineProposal(proposal);
        await harness.store.approveDoctrine(proposal.doctrineUnit.doctrineId, { proposalHash: proposal.proposalHash }, "local:phase2-operator");
      }
      const firstRun = await harness.store.createDoctrineIngestionRun({ attemptIndex: 0 });
      assert.equal(firstRun.status, "inserted");
      const run = firstRun.run;
      assert.equal(run.status, "succeeded");
      assert.equal(run.entryCount, 9);
      assert.equal(run.profileHash, DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash);
      const report = await harness.db.query<{ readonly quality_report_hash: `sha256:${string}`; readonly status: string }>(
        "SELECT quality_report_hash,status FROM pa_doctrine_quality_reports WHERE run_id=$1",
        [run.runId],
      );
      assert.equal(report.rows[0]?.status, "passed");
      const firstActivation = await harness.store.createDoctrineCorpusActivation({ runId: run.runId, qualityReportHash: report.rows[0]!.quality_report_hash });
      assert.equal(firstActivation.status, "inserted");
      const activation = firstActivation.activation;
      const secondRunMutation = await harness.store.createDoctrineIngestionRun({ attemptIndex: 1 });
      const secondRun = secondRunMutation.run;
      const secondReport = await harness.db.query<{ readonly quality_report_hash: `sha256:${string}` }>(
        "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
        [secondRun.runId],
      );
      const secondActivationMutation = await harness.store.createDoctrineCorpusActivation({
        runId: secondRun.runId,
        qualityReportHash: secondReport.rows[0]!.quality_report_hash,
      });
      const secondActivation = secondActivationMutation.activation;
      assert.equal(secondActivation.activationSequence, activation.activationSequence + 1);
      assert.notEqual(secondActivation.activationId, activation.activationId);
      const response = await harness.store.queryDoctrine({ query: "breakout context follow through" });
      assert.equal(response.evidence.status, "matched");
      assert.ok(response.ragRecords.length > 0);
      assert.deepEqual(Object.keys(response.ragRecords[0]!).sort(), ["appliesWhen", "avoidWhen", "concept", "decisionEffect", "doctrineId", "rule"].sort());
      const repeatedResponse = await harness.store.queryDoctrine({
        query: "breakout context follow through",
      });
      assert.notEqual(repeatedResponse.evidence.queryId, response.evidence.queryId);
      assert.notEqual(repeatedResponse.evidence.evidenceId, response.evidence.evidenceId);
      assert.equal(repeatedResponse.evidence.queryHash, response.evidence.queryHash);
      assert.deepEqual(repeatedResponse.evidence.results, response.evidence.results);
      assert.deepEqual(repeatedResponse.ragRecords, response.ragRecords);
      assert.equal((await harness.store.getDoctrineRetrievalEvidence(response.evidence.evidenceId))?.queryId, response.evidence.queryId);
      assert.equal((await harness.store.getCurrentDoctrineActivation())?.activationId, secondActivation.activationId);
    } finally { await harness.close(); }
  });

  it("creates explicit rollback events with immediate-retry idempotency", async () => {
    const harness = await createHarness();
    try {
      const proposals = createPhase3bPilotDoctrineProposalsV1();
      const approvals = [];
      for (const proposal of proposals) {
        await harness.store.appendDoctrineProposal(proposal);
        approvals.push(
          await harness.store.approveDoctrine(
            proposal.doctrineUnit.doctrineId,
            { proposalHash: proposal.proposalHash },
            "local:phase2-operator",
          ),
        );
      }
      const createActivation = async (attemptIndex: number) => {
        const run = (
          await harness.store.createDoctrineIngestionRun({ attemptIndex })
        ).run;
        const report = await harness.db.query<{
          readonly quality_report_hash: `sha256:${string}`;
        }>(
          "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
          [run.runId],
        );
        return (
          await harness.store.createDoctrineCorpusActivation({
            runId: run.runId,
            qualityReportHash: report.rows[0]!.quality_report_hash,
          })
        ).activation;
      };
      const target = await createActivation(0);
      const current = await createActivation(1);
      const command = {
        targetActivationId: target.activationId,
        reason: "  Restore   prior eligible corpus.  ",
      } as const;
      const first = await harness.store.createDoctrineCorpusRollback(command);
      assert.equal(first.status, "inserted");
      assert.equal(first.activation.activationKind, "rollback");
      assert.equal(first.activation.targetActivationId, target.activationId);
      assert.equal(first.activation.replacesActivationId, current.activationId);
      assert.equal(first.activation.reason, "Restore prior eligible corpus.");

      const retry = await harness.store.createDoctrineCorpusRollback(command);
      assert.equal(retry.status, "existing");
      assert.equal(retry.activation.activationId, first.activation.activationId);
      assert.equal(
        (
          await harness.store.createDoctrineCorpusActivation({
            runId: target.runId,
            qualityReportHash: target.qualityReportHash,
          })
        ).status,
        "existing",
      );
      assert.equal(
        (await harness.store.getCurrentDoctrineActivation())?.activationId,
        first.activation.activationId,
      );
      assert.equal(
        (await harness.store.getDoctrineActivation(target.activationId))?.activationId,
        target.activationId,
      );

      const intervening = await createActivation(2);
      const second = await harness.store.createDoctrineCorpusRollback(command);
      assert.equal(second.status, "inserted");
      assert.equal(second.activation.replacesActivationId, intervening.activationId);
      assert.notEqual(second.activation.activationId, first.activation.activationId);

      await harness.store.retireDoctrine(
        proposals[0]!.doctrineUnit.doctrineId,
        {
          approvalHash: approvals[0]!.resourceHash,
          reason: "No longer current Doctrine.",
        },
        "local:phase2-operator",
      );
      await assert.rejects(
        () => harness.store.createDoctrineCorpusRollback(command),
        /retirement/,
      );
      const count = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_doctrine_corpus_activations",
      );
      assert.equal(count.rows[0]?.count, 5);
    } finally {
      await harness.close();
    }
  });

  it("uses fixed human-authored queries for exact nine-unit pilot coverage", async () => {
    const entries = createPhase3bPilotDoctrineProposalsV1().map((proposal) =>
      createDoctrineCorpusEntry({
        proposal,
        approval: createDoctrineApproval({
          proposalHash: proposal.proposalHash,
          doctrineId: proposal.doctrineUnit.doctrineId,
          sourceId: proposal.source.sourceId,
          sourceContentHash: proposal.source.contentHash,
          approverPrincipal: "local:phase2-operator",
        }),
      }),
    );
    const snapshot = createDoctrineCorpusSnapshot(entries);
    const suite = createPhase4aQualitySuiteV1(snapshot, DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash);
    assert.equal(suite.fixtures.filter((fixture) => fixture.kind === "positive").length, 9);
    assert.equal(
      suite.fixtures.find((fixture) => fixture.fixtureId === "no-match:stop-word-only")?.query,
      "the and or",
    );
    assert.deepEqual(
      suite.fixtures.find((fixture) => fixture.kind === "cross_concept")?.expectedDoctrineIdOrder,
      ["du:pilot:breakout-needs-context-and-follow-through", "du:pilot:range-breakouts-can-fail"],
    );
    assert.throws(
      () => createPhase4aQualitySuiteV1(createDoctrineCorpusSnapshot(snapshot.entries.slice(1)), DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash),
      /exactly cover/,
    );
  });

  it("fails closed after retirement without falling back and commits failed evidence", async () => {
    const harness = await createHarness();
    try {
      const proposals = createPhase3bPilotDoctrineProposalsV1();
      const approvals = [];
      for (const proposal of proposals) {
        await harness.store.appendDoctrineProposal(proposal);
        approvals.push(await harness.store.approveDoctrine(proposal.doctrineUnit.doctrineId, { proposalHash: proposal.proposalHash }, "local:phase2-operator"));
      }
      const run = (await harness.store.createDoctrineIngestionRun({})).run;
      const report = await harness.db.query<{ readonly quality_report_hash: `sha256:${string}` }>("SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1", [run.runId]);
      await harness.store.createDoctrineCorpusActivation({ runId: run.runId, qualityReportHash: report.rows[0]!.quality_report_hash });
      await harness.store.retireDoctrine(proposals[0]!.doctrineUnit.doctrineId, { approvalHash: approvals[0]!.resourceHash, reason: "Superseded." }, "local:phase2-operator");
      const response = await harness.store.queryDoctrine({ query: "context candle pattern" });
      assert.equal(response.evidence.status, "failed");
      assert.deepEqual(response.evidence.errorCodes, ["CORPUS_RETIRED"]);
      assert.deepEqual(response.ragRecords, []);
    } finally { await harness.close(); }
  });
  it("applies public query normalization at the direct store boundary", async () => {
    const harness = await createHarness();
    try {
      await assert.rejects(
        () => harness.store.queryDoctrine({ query: "bad\u0000query" }),
        /control character/,
      );
      await assert.rejects(
        () => harness.store.queryDoctrine({ query: "x".repeat(401) }),
        /1 through 400 Unicode scalar values/,
      );
    } finally { await harness.close(); }
  });

  it("stores a bounded failed run for a mismatched repository runtime attestation", async () => {
    const harness = await createHarness("mismatched-runtime" as typeof DOCTRINE_RETRIEVAL_RUNTIME);
    try {
      for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
        await harness.store.appendDoctrineProposal(proposal);
        await harness.store.approveDoctrine(
          proposal.doctrineUnit.doctrineId,
          { proposalHash: proposal.proposalHash },
          "local:phase2-operator",
        );
      }
      const mutation = await harness.store.createDoctrineIngestionRun({});
      assert.equal(mutation.status, "inserted");
      assert.equal(mutation.run.status, "failed");
      assert.deepEqual(mutation.run.errorCodes, ["RUNTIME_MISMATCH"]);
      const documents = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_doctrine_lexical_documents",
      );
      assert.equal(documents.rows[0]?.count, 0);
    } finally { await harness.close(); }
  });

  it("rolls back lexical rows and stores INGESTION_FAILED after an injected internal failure", async () => {
    const harness = await createHarness(DOCTRINE_RETRIEVAL_RUNTIME, true);
    try {
      for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
        await harness.store.appendDoctrineProposal(proposal);
        await harness.store.approveDoctrine(proposal.doctrineUnit.doctrineId, { proposalHash: proposal.proposalHash }, "local:phase2-operator");
      }
      const run = (await harness.store.createDoctrineIngestionRun({ attemptIndex: 7 })).run;
      assert.equal(run.status, "failed");
      assert.deepEqual(run.errorCodes, ["INGESTION_FAILED"]);
      const documents = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_doctrine_lexical_documents",
      );
      assert.equal(documents.rows[0]?.count, 0);
      assert.equal((await harness.store.getDoctrineIngestionRun(run.runId))?.runId, run.runId);
    } finally { await harness.close(); }
  });

  it("commits RETRIEVAL_FAILED evidence in a fresh transaction after lexical execution fails", async () => {
    const harness = await createHarness();
    try {
      for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
        await harness.store.appendDoctrineProposal(proposal);
        await harness.store.approveDoctrine(
          proposal.doctrineUnit.doctrineId,
          { proposalHash: proposal.proposalHash },
          "local:phase2-operator",
        );
      }
      const run = (await harness.store.createDoctrineIngestionRun({})).run;
      const report = await harness.db.query<{
        readonly quality_report_hash: `sha256:${string}`;
      }>(
        "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
        [run.runId],
      );
      await harness.store.createDoctrineCorpusActivation({
        runId: run.runId,
        qualityReportHash: report.rows[0]!.quality_report_hash,
      });

      harness.failNextRetrieval();
      const response = await harness.store.queryDoctrine({
        query: "breakout context",
      });
      assert.equal(response.evidence.status, "failed");
      assert.deepEqual(response.evidence.errorCodes, ["RETRIEVAL_FAILED"]);
      assert.deepEqual(response.ragRecords, []);
      assert.equal(
        (await harness.store.getDoctrineRetrievalEvidence(
          response.evidence.evidenceId,
        ))?.queryId,
        response.evidence.queryId,
      );
    } finally { await harness.close(); }
  });

  it("fails closed without inventing a snapshot for an empty corpus", async () => {
    const harness = await createHarness();
    try {
      await assert.rejects(
        () => harness.store.createDoctrineIngestionRun({}),
        /snapshot must not be empty/,
      );
      const counts = await harness.db.query<{ readonly snapshots: number; readonly runs: number }>(
        `SELECT (SELECT count(*)::int FROM pa_doctrine_corpus_snapshots) AS snapshots,
                (SELECT count(*)::int FROM pa_doctrine_ingestion_runs) AS runs`,
      );
      assert.deepEqual(counts.rows, [{ snapshots: 0, runs: 0 }]);
    } finally { await harness.close(); }
  });
});

async function createHarness(
  runtime = DOCTRINE_RETRIEVAL_RUNTIME,
  injectDocumentFailure = false,
) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  let injected = false;
  let injectRetrievalFailure = false;
  const query = <T>(sql: string, params?: readonly unknown[]) => {
    if (
      injectRetrievalFailure &&
      sql.includes("encode(float4send(score)")
    ) {
      injectRetrievalFailure = false;
      throw new Error("injected lexical retrieval failure");
    }
    if (
      injectDocumentFailure &&
      !injected &&
      sql.includes("INSERT INTO pa_doctrine_lexical_documents")
    ) {
      injected = true;
      throw new Error("injected internal database failure");
    }
    return db.query<T>(sql, params);
  };
  const database: CaseStoreDatabaseV1 = {
    query,
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = { query };
      try { const value = await work(client); await db.exec("COMMIT;"); return value; }
      catch (error) { await db.exec("ROLLBACK;"); throw error; }
    },
  };
  return {
    db,
    store: createCaseStore(database, { doctrineRetrievalRuntime: runtime }),
    failNextRetrieval: () => {
      injectRetrievalFailure = true;
    },
    close: () => db.close(),
  } as const;
}
