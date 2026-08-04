import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
  type ContractSha256,
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

describe("Phase 5B1 Prompt Package Case Store", () => {
  it("activates the exact repository package and prepares one immutable synthetic payload", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const promptPackage = loadPromptPackage();
    let artifactLoads = 0;
    const harness = await createHarness(
      fixture.caseBundle.bundleHash,
      async () => {
        artifactLoads += 1;
        return promptPackage;
      },
    );
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await activatePilotCorpus(harness);
      const assemblyMutation = await harness.store.createPolicyAssembly({
        caseHash: fixture.caseBundle.policyCase.caseHash,
      });
      assert.ok("assemblyId" in assemblyMutation.terminal);
      const assembly = assemblyMutation.terminal;

      const activationMutation = await harness.store.activateBrooksPromptPackage();
      assert.equal(activationMutation.status, "inserted");
      assert.equal(
        activationMutation.activation.packageHash,
        promptPackage.manifest.packageHash,
      );
      assert.deepEqual(
        await harness.store.getCurrentBrooksPromptPackageActivation(),
        activationMutation.activation,
      );
      assert.equal(
        (await harness.store.activateBrooksPromptPackage()).status,
        "existing",
      );

      harness.clearCapturedQueries();
      const first = await harness.store.preparePolicyPayload({
        assemblyId: assembly.assemblyId,
      });
      assert.equal(first.status, "inserted");
      assert.equal(first.preparedPayload.assemblyId, assembly.assemblyId);
      assert.equal(
        first.preparedPayload.packageActivationId,
        activationMutation.activation.activationId,
      );
      assert.deepEqual(
        await harness.store.getPreparedPolicyPayload(
          first.preparedPayload.preparationId,
        ),
        first.preparedPayload,
      );
      assert.equal(
        (
          await harness.store.preparePolicyPayload({
            assemblyId: assembly.assemblyId,
          })
        ).status,
        "existing",
      );
      assert.ok(artifactLoads >= 4);
      const captured = harness.capturedQueries().join("\n").toLowerCase();
      for (const forbidden of [
        "pa_brooks_decisions",
        "pa_calvin_reviews",
        "pa_calvin_independent_assessments",
        "pa_decision_reveal_receipts",
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

      await assert.rejects(
        () => harness.store.rollbackBrooksPromptPackage({
          targetActivationId: activationMutation.activation.activationId,
          reason: "A current activation is not an earlier rollback target.",
        }),
        /earlier than the current activation/,
      );
    } finally {
      await harness.close();
    }
  });

  it("fails closed when artifacts are unavailable or an assembly is no longer current", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(
      fixture.caseBundle.bundleHash,
      async () => loadPromptPackage(),
    );
    try {
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await activatePilotCorpus(harness);
      const terminal = (
        await harness.store.createPolicyAssembly({
          caseHash: fixture.caseBundle.policyCase.caseHash,
        })
      ).terminal;
      assert.ok("assemblyId" in terminal);
      await harness.store.activateBrooksPromptPackage();
      await activateAnotherCorpus(harness);
      await assert.rejects(
        () => harness.store.preparePolicyPayload({ assemblyId: terminal.assemblyId }),
        /not current Doctrine authority/,
      );
    } finally {
      await harness.close();
    }

    const unavailable = await createHarness(
      fixture.caseBundle.bundleHash,
      null,
    );
    try {
      await assert.rejects(
        () => unavailable.store.activateBrooksPromptPackage(),
        /artifact validation is not configured/,
      );
    } finally {
      await unavailable.close();
    }
  });
});

function loadPromptPackage() {
  return verifyBrooksPromptPackageArtifacts({
    promptBytes: readFileSync(
      new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url),
    ),
    responseSchemaBytes: readFileSync(
      new URL(
        "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
        import.meta.url,
      ),
    ),
    manifest: JSON.parse(readFileSync(
      new URL("../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json", import.meta.url),
      "utf8",
    )) as BrooksPromptPackageManifestV1,
    approval: JSON.parse(readFileSync(
      new URL(
        "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json",
        import.meta.url,
      ),
      "utf8",
    )) as BrooksPromptPackageApprovalV1,
  });
}

async function createHarness(
  authorizedBundleHash: ContractSha256,
  loadPromptPackageArtifacts: (() => Promise<ReturnType<typeof loadPromptPackage>>) | null,
) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const capturedQueries: string[] = [];
  const query = <T>(sql: string, params?: readonly unknown[]) => {
    capturedQueries.push(sql);
    return db.query<T>(sql, params);
  };
  const database: CaseStoreDatabaseV1 = {
    query,
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = { query };
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
  return {
    db,
    store: createCaseStore(database, {
      doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
      authorizedSyntheticBundleHashes: [authorizedBundleHash],
      validateChartArtifact: async () => undefined,
      loadPromptPackageArtifacts,
    }),
    capturedQueries: () => [...capturedQueries],
    clearCapturedQueries: () => {
      capturedQueries.length = 0;
    },
    close: () => db.close(),
  } as const;
}

async function activatePilotCorpus(
  harness: Awaited<ReturnType<typeof createHarness>>,
): Promise<void> {
  for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
    await harness.store.appendDoctrineProposal(proposal);
    await harness.store.approveDoctrine(
      proposal.doctrineUnit.doctrineId,
      { proposalHash: proposal.proposalHash },
      "local:phase2-operator",
    );
  }
  await activateAnotherCorpus(harness);
}

async function activateAnotherCorpus(
  harness: Awaited<ReturnType<typeof createHarness>>,
): Promise<void> {
  const attempt = await harness.db.query<{ readonly count: number }>(
    "SELECT count(*)::int AS count FROM pa_doctrine_ingestion_runs",
  );
  const run = (
    await harness.store.createDoctrineIngestionRun({
      attemptIndex: attempt.rows[0]!.count,
    })
  ).run;
  const quality = await harness.db.query<{ readonly quality_report_hash: ContractSha256 }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  await harness.store.createDoctrineCorpusActivation({
    runId: run.runId,
    qualityReportHash: quality.rows[0]!.quality_report_hash,
  });
}
