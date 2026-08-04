import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  canonicalStringify,
  createBrooksPromptPackageActivation,
  createBrooksPromptPackageRollbackActivation,
  createPreparedPolicyPayload,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageActivationAuthorityV1,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
  type ContractSha256,
  type PolicyAssemblyV1,
  type PreparedPolicyPayloadV1,
  type VerifiedBrooksPromptPackageV1,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "../../case-cli/src/synthetic-fixture-v1.ts";
import {
  createCaseStore,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "../../case-store/src/case-store-v1.ts";
import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
} from "../../case-store/src/migration-runner-v1.ts";

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
  new URL("../sql", import.meta.url).pathname,
);

describe("Phase 5B1 Prompt Package PostgreSQL constraints", () => {
  it("persists only exact approved package authority and a reconstructed prepared payload", async () => {
    const harness = await createHarness();
    try {
      const { assembly, promptPackage } = await createAssemblyAndPackage(harness);
      await persistPackage(harness.db, promptPackage);

      const first = createBrooksPromptPackageActivation({
        activationSequence: await allocateSequence(harness.db),
        promptPackage,
        operatorPrincipal: "local:phase2-operator",
      });
      await insertActivation(harness.db, first);
      const duplicate = createBrooksPromptPackageActivation({
        activationSequence: await allocateSequence(harness.db),
        promptPackage,
        operatorPrincipal: "local:phase2-operator",
      });
      await assert.rejects(() => insertActivation(harness.db, duplicate));
      const invalidRollback = createBrooksPromptPackageRollbackActivation({
        activationSequence: await allocateSequence(harness.db),
        replacesActivationId: `sha256:${"e".repeat(64)}`,
        targetActivation: first,
        reason: "A rollback must replace an existing current activation.",
        operatorPrincipal: "local:phase2-operator",
      });
      await assert.rejects(() => insertActivation(harness.db, invalidRollback));

      const prepared = createPreparedPolicyPayload({
        assembly,
        packageActivation: first,
        promptPackage,
        operatorPrincipal: "local:phase2-operator",
      });
      await insertPrepared(harness.db, prepared, first, promptPackage);
      const stored = await harness.db.query<{ readonly record: PreparedPolicyPayloadV1 }>(
        "SELECT record FROM pa_prepared_policy_payloads WHERE preparation_id=$1",
        [prepared.preparationId],
      );
      assert.deepEqual(stored.rows[0]?.record, prepared);

      await assert.rejects(() =>
        harness.db.query(
          `INSERT INTO pa_prompt_package_approvals
            (approval_record_hash,approval_id,package_hash,approved_at,approved_by,record)
           VALUES ($1,'approval:invented',$2,'2026-01-01T00:00:00Z','Calvin',$3::jsonb)`,
          [
            `sha256:${"f".repeat(64)}`,
            promptPackage.manifest.packageHash,
            canonicalStringify({
              ...promptPackage.approval,
              approvalId: "approval:invented",
              approvalRecordHash: `sha256:${"f".repeat(64)}`,
            }),
          ],
        ),
      );
      await assert.rejects(() =>
        harness.db.query(
          "UPDATE pa_prepared_policy_payloads SET record=record WHERE preparation_id=$1",
          [prepared.preparationId],
        ),
      );
      for (const table of [
        "pa_prompt_package_manifests",
        "pa_prompt_package_approvals",
        "pa_prompt_package_activations",
        "pa_prepared_policy_payloads",
      ]) {
        await assert.rejects(() => harness.db.exec(`TRUNCATE ${table}`));
      }
      const forbiddenCounts = await harness.db.query<{
        readonly model_runs: number;
        readonly attempts: number;
        readonly audits: number;
        readonly decisions: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pa_model_runs) AS model_runs,
          (SELECT count(*)::int FROM pa_provider_attempts) AS attempts,
          (SELECT count(*)::int FROM pa_model_run_audits) AS audits,
          (SELECT count(*)::int FROM pa_brooks_decisions) AS decisions
      `);
      assert.deepEqual(forbiddenCounts.rows, [{
        model_runs: 0,
        attempts: 0,
        audits: 0,
        decisions: 0,
      }]);
    } finally {
      await harness.close();
    }
  });
});

async function createHarness() {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const database: CaseStoreDatabaseV1 = {
    query: <T>(sql: string, params?: readonly unknown[]) => db.query<T>(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = {
        query: <T>(sql: string, params?: readonly unknown[]) => db.query<T>(sql, params),
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
  return {
    db,
    store: createCaseStore(database, {
      doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
      validateChartArtifact: async () => undefined,
    }),
    close: () => db.close(),
  } as const;
}

async function createAssemblyAndPackage(
  harness: Awaited<ReturnType<typeof createHarness>>,
): Promise<{
  readonly assembly: PolicyAssemblyV1;
  readonly promptPackage: VerifiedBrooksPromptPackageV1;
}> {
  const fixture = createPhase2SyntheticFixtureV1();
  Object.assign(harness.store, {});
  const authorizedStore = createCaseStore(
    {
      query: harness.db.query.bind(harness.db),
      transaction: async <T>(work: (client: CaseStoreDatabaseClientV1) => Promise<T>) => {
        await harness.db.exec("BEGIN;");
        try {
          const result = await work({ query: harness.db.query.bind(harness.db) });
          await harness.db.exec("COMMIT;");
          return result;
        } catch (error) {
          await harness.db.exec("ROLLBACK;");
          throw error;
        }
      },
    },
    {
      doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
      authorizedSyntheticBundleHashes: [fixture.caseBundle.bundleHash],
      validateChartArtifact: async () => undefined,
    },
  );
  await authorizedStore.appendSyntheticCaseBundle(fixture.caseBundle);
  for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
    await authorizedStore.appendDoctrineProposal(proposal);
    await authorizedStore.approveDoctrine(
      proposal.doctrineUnit.doctrineId,
      { proposalHash: proposal.proposalHash },
      "local:phase2-operator",
    );
  }
  const run = (await authorizedStore.createDoctrineIngestionRun({})).run;
  const quality = await harness.db.query<{ readonly quality_report_hash: ContractSha256 }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  await authorizedStore.createDoctrineCorpusActivation({
    runId: run.runId,
    qualityReportHash: quality.rows[0]!.quality_report_hash,
  });
  const terminal = (
    await authorizedStore.createPolicyAssembly({
      caseHash: fixture.caseBundle.policyCase.caseHash,
    })
  ).terminal;
  assert.ok("assemblyId" in terminal);
  const promptPackage = verifyBrooksPromptPackageArtifacts({
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
  return { assembly: terminal, promptPackage };
}

async function persistPackage(
  db: PGliteDatabase,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Promise<void> {
  const manifest = promptPackage.manifest;
  const approval = promptPackage.approval;
  await db.query(
    `INSERT INTO pa_prompt_package_manifests
      (package_hash,package_version,prompt_hash,prompt_byte_length,
       response_schema_hash,response_schema_byte_length,output_schema_version,
       validator_version,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      manifest.packageHash,
      manifest.packageVersion,
      manifest.prompt.contentHash,
      manifest.prompt.byteLength,
      manifest.responseSchema.contentHash,
      manifest.responseSchema.byteLength,
      manifest.responseSchema.schemaVersion,
      manifest.validatorVersion,
      canonicalStringify(manifest),
    ],
  );
  await db.query(
    `INSERT INTO pa_prompt_package_approvals
      (approval_record_hash,approval_id,package_hash,approved_at,approved_by,record)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      approval.approvalRecordHash,
      approval.approvalId,
      approval.packageHash,
      approval.approvedAt,
      approval.approvedBy,
      canonicalStringify(approval),
    ],
  );
}

async function allocateSequence(db: PGliteDatabase): Promise<number> {
  const result = await db.query<{ readonly sequence: number }>(
    "SELECT nextval('pa_prompt_package_activation_sequence_seq')::int AS sequence",
  );
  return result.rows[0]!.sequence;
}

async function insertActivation(
  db: PGliteDatabase,
  activation: BrooksPromptPackageActivationAuthorityV1,
): Promise<void> {
  const rollback = activation.activationKind === "rollback" ? activation : null;
  await db.query(
    `INSERT INTO pa_prompt_package_activations
      (activation_sequence,activation_id,activation_kind,package_hash,
       approval_record_hash,target_activation_id,replaces_activation_id,
       reason_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      activation.activationSequence,
      activation.activationId,
      activation.activationKind,
      activation.packageHash,
      activation.approvalRecordHash,
      rollback?.targetActivationId ?? null,
      rollback?.replacesActivationId ?? null,
      rollback?.reasonHash ?? null,
      activation.operatorPrincipal,
      canonicalStringify(activation),
    ],
  );
}

async function insertPrepared(
  db: PGliteDatabase,
  prepared: PreparedPolicyPayloadV1,
  activation: BrooksPromptPackageActivationAuthorityV1,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_prepared_policy_payloads
      (preparation_id,preparation_rules_version,source_scope,assembly_id,input_hash,
       package_activation_id,package_activation_kind,package_activation_sequence,
       package_hash,approval_record_hash,prompt_hash,response_schema_hash,
       output_schema_version,validator_version,payload_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)`,
    [
      prepared.preparationId,
      prepared.preparationRulesVersion,
      prepared.sourceScope,
      prepared.assemblyId,
      prepared.payload.policyInput.inputHash,
      prepared.packageActivationId,
      activation.activationKind,
      activation.activationSequence,
      prepared.packageHash,
      promptPackage.approval.approvalRecordHash,
      prepared.promptHash,
      prepared.responseSchemaHash,
      prepared.outputSchemaVersion,
      prepared.validatorVersion,
      prepared.payloadHash,
      prepared.operatorPrincipal,
      canonicalStringify(prepared),
    ],
  );
}
