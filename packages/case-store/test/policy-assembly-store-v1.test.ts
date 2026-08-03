import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  createModelCallRecord,
  createModelRunAuditRecord,
  createModelRunRecord,
  createDoctrineProposalBundle,
  createDoctrineUnit,
  createOutboundModelPayload,
  createProviderAttemptRecord,
  type ContractSha256,
  type PolicyAssemblyFailureV1,
  type PolicyAssemblyV1,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "../../case-cli/src/synthetic-fixture-v1.ts";
import {
  createCaseStore,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "../src/case-store-v1.ts";
import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
} from "../src/migration-runner-v1.ts";

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

describe("Phase 5A Policy Assembly Case Store", () => {
  it("persists a content-idempotent no-activation failure and no rebuilt input", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      const first = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.equal(first.status, "inserted");
      assert.ok("failureId" in first.terminal);
      const failure = first.terminal as PolicyAssemblyFailureV1;
      assert.deepEqual(failure.errorCodes, ["ACTIVATION_UNAVAILABLE"]);
      assert.equal(failure.sourceBundleHash, fixture.caseBundle.bundleHash);
      assert.deepEqual(
        await harness.store.getPolicyAssemblyFailure(failure.failureId),
        failure,
      );
      assert.equal(
        (
          await harness.store.createPolicyAssembly({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          })
        ).status,
        "existing",
      );
      const counts = await harness.db.query<{
        readonly inputs: number;
        readonly assemblies: number;
        readonly failures: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pa_policy_inputs) AS inputs,
          (SELECT count(*)::int FROM pa_policy_assemblies) AS assemblies,
          (SELECT count(*)::int FROM pa_policy_assembly_failures) AS failures
      `);
      assert.deepEqual(counts.rows, [{ inputs: 1, assemblies: 0, failures: 1 }]);
      assert.equal(harness.artifactValidations(), 0);
    } finally {
      await harness.close();
    }
  });

  it("rebuilds exact current Doctrine, validates both charts, and preserves the Phase 2 binding", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await activatePilotCorpus(harness);
      const first = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.equal(first.status, "inserted");
      assert.ok("assemblyId" in first.terminal);
      const assembly = first.terminal as PolicyAssemblyV1;
      assert.equal(assembly.sourceBundleHash, fixture.caseBundle.bundleHash);
      assert.equal(assembly.doctrineManifest.length, 9);
      assert.equal(assembly.policyInput.doctrine.length, 9);
      assert.ok(
        assembly.policyInput.doctrine.every((record) =>
          record.doctrineId.startsWith("du:pilot:"),
        ),
      );
      assert.ok(
        assembly.policyInput.doctrine.every(
          (record) => !record.doctrineId.startsWith("D-synthetic-"),
        ),
      );
      assert.notEqual(assembly.inputHash, fixture.caseBundle.policyInput.inputHash);
      assert.deepEqual(
        await harness.store.getPolicyAssembly(assembly.assemblyId),
        assembly,
      );
      assert.equal(harness.artifactValidations(), 2);

      const retry = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.equal(retry.status, "existing");
      assert.deepEqual(retry.terminal, assembly);
      assert.equal(harness.artifactValidations(), 4);
      const bindings = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_case_policy_inputs",
      );
      assert.equal(bindings.rows[0]?.count, 1);
      const phase2Audit = await harness.store.getCaseAudit(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(
        phase2Audit?.caseBundle.policyInput.inputHash,
        fixture.caseBundle.policyInput.inputHash,
      );
      assert.equal(phase2Audit?.caseBundle.bundleHash, fixture.caseBundle.bundleHash);
    } finally {
      await harness.close();
    }
  });

  it("persists an ineligible terminal after retirement without falling back", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      const { proposals, approvalHashes } = await activatePilotCorpus(harness);
      await harness.store.retireDoctrine(
        proposals[0]!.doctrineUnit.doctrineId,
        {
          approvalHash: approvalHashes[0]!,
          reason: "No longer current Doctrine.",
        },
        "local:phase2-operator",
      );
      const mutation = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.equal(mutation.status, "inserted");
      assert.ok("failureId" in mutation.terminal);
      assert.deepEqual(
        (mutation.terminal as PolicyAssemblyFailureV1).errorCodes,
        ["ACTIVE_CORPUS_INELIGIBLE"],
      );
      assert.equal(harness.artifactValidations(), 0);
      const success = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_policy_assemblies",
      );
      assert.equal(success.rows[0]?.count, 0);
    } finally {
      await harness.close();
    }
  });

  it("is invariant to forbidden historical records and never queries their tables", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      const { proposals } = await activatePilotCorpus(harness);
      const baseline = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.ok("assemblyId" in baseline.terminal);
      const assembly = baseline.terminal as PolicyAssemblyV1;

      await harness.store.appendBrooksDecision(fixture.decision);
      const initialReview = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.ok(initialReview);
      await harness.store.appendIndependentAssessment({
        caseHash: fixture.caseBundle.policyCase.caseHash,
        draftIdentityHash: initialReview.draftIdentityHash,
        independentVerdict: "no_trade",
        blindSummary: "Invented blind-review isolation fixture.",
      });
      const assessed = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.ok(assessed?.assessment);
      await harness.store.appendDecisionRevealReceipt(
        fixture.caseBundle.policyCase.caseHash,
        { assessmentHash: assessed.assessment.assessmentHash },
      );
      const revealed = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.ok(revealed?.assessment && revealed.revealReceipt);
      await harness.store.appendFinalReview({
        caseHash: fixture.caseBundle.policyCase.caseHash,
        assessmentHash: revealed.assessment.assessmentHash,
        revealReceiptHash: revealed.revealReceipt.receiptHash,
        disposition: fixture.review.disposition,
        summary: fixture.review.summary!,
      });
      await insertInventedModelAudit(harness.db, fixture);

      const draftCandidate = createDoctrineProposalBundle({
        source: proposals[0]!.source,
        doctrineUnit: createDoctrineUnit({
          doctrineId: "du:phase5a-isolation:draft-research-candidate",
          sourceId: proposals[0]!.source.sourceId,
          concept: "draft_research_candidate_without_authority",
          rule: "An invented draft candidate never enters an active snapshot.",
          appliesWhen: ["Testing authority isolation."],
          avoidWhen: ["Making any market judgment."],
          decisionEffect: ["Keep the candidate outside runtime authority."],
          status: "draft",
        }),
        sourceLocator: proposals[0]!.sourceLocator,
      });
      await harness.store.appendDoctrineProposal(draftCandidate);
      const retiredCandidate = createDoctrineProposalBundle({
        source: proposals[1]!.source,
        doctrineUnit: createDoctrineUnit({
          doctrineId: "du:phase5a-isolation:retired-invented-candidate",
          sourceId: proposals[1]!.source.sourceId,
          concept: "retired_invented_candidate_without_active_authority",
          rule: "An invented retired candidate outside the active snapshot is ignored.",
          appliesWhen: ["Testing active-snapshot isolation."],
          avoidWhen: ["Making any market judgment."],
          decisionEffect: ["Use only the exact active snapshot."],
          status: "draft",
        }),
        sourceLocator: proposals[1]!.sourceLocator,
      });
      await harness.store.appendDoctrineProposal(retiredCandidate);
      const retiredApproval = await harness.store.approveDoctrine(
        retiredCandidate.doctrineUnit.doctrineId,
        { proposalHash: retiredCandidate.proposalHash },
        "local:phase2-operator",
      );
      await harness.store.retireDoctrine(
        retiredCandidate.doctrineUnit.doctrineId,
        {
          approvalHash: retiredApproval.resourceHash,
          reason: "Invented isolation candidate is not active authority.",
        },
        "local:phase2-operator",
      );
      assert.throws(
        () =>
          createDoctrineProposalBundle({
            source: { ...proposals[0]!.source, private: true },
            doctrineUnit: createDoctrineUnit({
              doctrineId: "du:phase5a-isolation:private-rejected",
              sourceId: proposals[0]!.source.sourceId,
              concept: "private_rejected",
              rule: "Invented private material is rejected.",
              appliesWhen: ["Testing rejection."],
              avoidWhen: ["All runtime use."],
              decisionEffect: ["Reject."],
              status: "draft",
            }),
            sourceLocator: proposals[0]!.sourceLocator,
          }),
        /public Source/,
      );

      harness.clearCapturedQueries();
      const repeated = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.equal(repeated.status, "existing");
      assert.deepEqual(repeated.terminal, assembly);
      assert.equal(
        (repeated.terminal as PolicyAssemblyV1).doctrineContextHash,
        assembly.doctrineContextHash,
      );
      assert.equal(
        (repeated.terminal as PolicyAssemblyV1).inputHash,
        assembly.inputHash,
      );
      const captured = harness.capturedQueries().join("\n").toLowerCase();
      for (const forbidden of [
        "pa_brooks_decisions",
        "pa_calvin_reviews",
        "pa_calvin_independent_assessments",
        "pa_decision_reveal_receipts",
        "pa_calvin_review_workflow_bindings",
        "pa_model_runs",
        "pa_provider_attempts",
        "pa_model_run_audits",
        "outcome",
        "pnl",
        "replay",
        "settlement",
        "memory",
      ]) {
        assert.doesNotMatch(captured, new RegExp(forbidden));
      }
    } finally {
      await harness.close();
    }
  });

  it("rejects a source bundle outside the exact deployment allowlist without a failure record", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(
      `sha256:${"f".repeat(64)}` as ContractSha256,
    );
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await assert.rejects(
        () =>
          harness.store.createPolicyAssembly({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          }),
        /not authorized/,
      );
      const failures = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_policy_assembly_failures",
      );
      assert.equal(failures.rows[0]?.count, 0);
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(authorizedBundleHash: ContractSha256) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const capturedQueries: string[] = [];
  const database: CaseStoreDatabaseV1 = {
    query: <T>(sql: string, params?: readonly unknown[]) => {
      capturedQueries.push(sql);
      return db.query<T>(sql, params);
    },
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = {
        query: <T>(sql: string, params?: readonly unknown[]) => {
          capturedQueries.push(sql);
          return db.query<T>(sql, params);
        },
      };
      try {
        const value = await work(client);
        await db.exec("COMMIT;");
        return value;
      } catch (error) {
        await db.exec("ROLLBACK;");
        throw error;
      }
    },
  };
  let artifactValidations = 0;
  return {
    db,
    store: createCaseStore(database, {
      doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
      authorizedSyntheticBundleHashes: [authorizedBundleHash],
      validateChartArtifact: async (metadata) => {
        assert.ok(metadata.panel === "context" || metadata.panel === "detail");
        artifactValidations += 1;
      },
    }),
    artifactValidations: () => artifactValidations,
    capturedQueries: () => [...capturedQueries],
    clearCapturedQueries: () => {
      capturedQueries.length = 0;
    },
    close: () => db.close(),
  } as const;
}

async function activatePilotCorpus(
  harness: Awaited<ReturnType<typeof createHarness>>,
) {
  const proposals = createPhase3bPilotDoctrineProposalsV1();
  const approvalHashes: ContractSha256[] = [];
  for (const proposal of proposals) {
    await harness.store.appendDoctrineProposal(proposal);
    approvalHashes.push(
      (
        await harness.store.approveDoctrine(
          proposal.doctrineUnit.doctrineId,
          { proposalHash: proposal.proposalHash },
          "local:phase2-operator",
        )
      ).resourceHash,
    );
  }
  const run = (await harness.store.createDoctrineIngestionRun({})).run;
  const report = await harness.db.query<{ readonly quality_report_hash: ContractSha256 }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  await harness.store.createDoctrineCorpusActivation({
    runId: run.runId,
    qualityReportHash: report.rows[0]!.quality_report_hash,
  });
  return { proposals, approvalHashes };
}

async function insertInventedModelAudit(
  db: PGliteDatabase,
  fixture: ReturnType<typeof createPhase2SyntheticFixtureV1>,
): Promise<void> {
  const sha = (digit: string) =>
    `sha256:${digit.repeat(64)}` as ContractSha256;
  const policyCase = fixture.caseBundle.policyCase;
  const policyInput = fixture.caseBundle.policyInput;
  const payload = createOutboundModelPayload({
    policyInput,
    promptHash: sha("a"),
    outputSchemaVersion: "brooks-decision.v1",
  });
  const call = createModelCallRecord({
    mode: "evaluation_sampled",
    decisionPoint: {
      policyStreamId: policyCase.policyStreamId,
      decisionPointBarId: policyCase.lastVisibleBarId,
      decisionPointSequence: policyCase.bars.at(-1)!.sequence,
      barDurationSeconds: policyCase.barDurationSeconds,
      selectionPolicyId: "selection:phase5a-isolation-fixture",
      inputHash: policyInput.inputHash,
      isClosed: true,
    },
    candidate: {
      candidateId: "candidate:phase5a-isolation-fixture",
      modelId: "model:phase5a-isolation-fixture",
    },
    protocol: {
      promptHash: payload.promptHash,
      outputSchemaVersion: payload.outputSchemaVersion,
      reasoningBudgetId: "budget:phase5a-isolation-fixture",
    },
    repeatIndex: 0,
  });
  const run = createModelRunRecord({ call, policyCase, payload });
  const attempt = createProviderAttemptRecord({
    run,
    attemptIndex: 0,
    providerId: "provider:phase5a-isolation-fixture",
    requestHash: payload.payloadHash,
    status: "response_received",
    responseHash: sha("b"),
    errorCode: null,
    latencyMs: 1,
  });
  const audit = createModelRunAuditRecord({
    run,
    attempt,
    rawOutputHash: sha("b"),
    decisionHash: fixture.decision.decisionHash,
    validationResultHash: sha("c"),
    validationStatus: "accepted",
    rejectionCodes: [],
  });
  await db.query(
    `INSERT INTO pa_model_runs
      (model_run_id,call_id,case_hash,input_hash,payload_hash,record)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      run.modelRunId,
      run.callId,
      run.caseHash,
      run.inputHash,
      run.payloadHash,
      JSON.stringify(run),
    ],
  );
  await db.query(
    `INSERT INTO pa_provider_attempts
      (attempt_id,attempt_key,model_run_id,call_id,attempt_index,
       request_hash,status,response_hash,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      attempt.attemptId,
      attempt.attemptKey,
      attempt.modelRunId,
      attempt.callId,
      attempt.attemptIndex,
      attempt.requestHash,
      attempt.status,
      attempt.responseHash,
      JSON.stringify(attempt),
    ],
  );
  await db.query(
    `INSERT INTO pa_model_run_audits
      (audit_id,model_run_id,call_id,attempt_id,case_hash,input_hash,
       payload_hash,raw_output_hash,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      audit.auditId,
      audit.modelRunId,
      audit.callId,
      audit.attemptId,
      audit.caseHash,
      audit.inputHash,
      audit.payloadHash,
      audit.rawOutputHash,
      JSON.stringify(audit),
    ],
  );
}
