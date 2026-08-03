import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  canonicalStringify,
  createPolicyAssembly,
  createPolicyAssemblyFailure,
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

describe("Phase 5A Policy Assembly PostgreSQL constraints", () => {
  it("persists one complete assembly chain without adding a Phase 2 binding", async () => {
    const harness = await createHarness();
    try {
      const fixture = createPhase2SyntheticFixtureV1();
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      const { activation, snapshot } = await activatePilotCorpus(harness);
      const assembly = createPolicyAssembly({
        sourceBundleHash: fixture.caseBundle.bundleHash,
        activation,
        snapshot,
        policyCase: fixture.caseBundle.policyCase,
        charts: {
          context: {
            metadataId: fixture.caseBundle.chartMetadata.context.metadataId,
            artifactId: fixture.caseBundle.chartMetadata.context.artifactId,
            contentHash: fixture.caseBundle.chartMetadata.context.contentHash,
            manifest: fixture.caseBundle.policyInput.charts.context,
          },
          detail: {
            metadataId: fixture.caseBundle.chartMetadata.detail.metadataId,
            artifactId: fixture.caseBundle.chartMetadata.detail.artifactId,
            contentHash: fixture.caseBundle.chartMetadata.detail.contentHash,
            manifest: fixture.caseBundle.policyInput.charts.detail,
          },
        },
        operatorPrincipal: "local:phase2-operator",
      });

      await persistAssembly(harness.db, assembly);
      const stored = await harness.db.query<{
        readonly record: PolicyAssemblyV1;
      }>("SELECT record FROM pa_policy_assemblies WHERE assembly_id=$1", [assembly.assemblyId]);
      assert.deepEqual(stored.rows[0]?.record, assembly);
      const counts = await harness.db.query<{
        readonly phase2_bindings: number;
        readonly assembly_bindings: number;
        readonly doctrine_bindings: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pa_case_policy_inputs) AS phase2_bindings,
          (SELECT count(*)::int FROM pa_policy_assembly_bindings) AS assembly_bindings,
          (SELECT count(*)::int FROM pa_policy_assembly_doctrine_bindings) AS doctrine_bindings
      `);
      assert.deepEqual(counts.rows, [{
        phase2_bindings: 1,
        assembly_bindings: 1,
        doctrine_bindings: 9,
      }]);

      await assert.rejects(async () => {
        await harness.db.exec("BEGIN;");
        try {
          const tampered = {
            ...assembly,
            doctrineManifest: assembly.doctrineManifest.slice(1),
          };
          const { assemblyId: _assemblyId, ...body } = tampered;
          const forgedId = (await import("@pa-agent-lab/contracts")).canonicalHash(body);
          await insertAssemblyRow(harness.db, { ...tampered, assemblyId: forgedId });
          await harness.db.exec("COMMIT;");
        } catch (error) {
          await harness.db.exec("ROLLBACK;");
          throw error;
        }
      });

      for (const table of [
        "pa_policy_assemblies",
        "pa_policy_assembly_bindings",
        "pa_policy_assembly_doctrine_bindings",
        "pa_policy_assembly_failures",
      ]) {
        await assert.rejects(() => harness.db.exec(`TRUNCATE ${table}`));
      }
    } finally {
      await harness.close();
    }
  });

  it("persists only an exact no-activation failure in an empty authority state", async () => {
    const harness = await createHarness();
    try {
      const fixture = createPhase2SyntheticFixtureV1();
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      const failure = createPolicyAssemblyFailure({
        caseHash: fixture.caseBundle.policyCase.caseHash,
        sourceBundleHash: fixture.caseBundle.bundleHash,
        activation: null,
        observedDoctrineCount: null,
        observedDoctrineContextByteLength: null,
        errorCodes: ["ACTIVATION_UNAVAILABLE"],
        operatorPrincipal: "local:phase2-operator",
      });
      await insertFailure(harness.db, failure);
      const stored = await harness.db.query<{ readonly record: PolicyAssemblyFailureV1 }>(
        "SELECT record FROM pa_policy_assembly_failures WHERE failure_id=$1",
        [failure.failureId],
      );
      assert.deepEqual(stored.rows[0]?.record, failure);

      const forged = {
        ...failure,
        observedDoctrineCount: 1,
      };
      const { failureId: _failureId, ...body } = forged;
      const forgedId = (await import("@pa-agent-lab/contracts")).canonicalHash(body);
      await assert.rejects(() =>
        insertFailure(harness.db, { ...forged, failureId: forgedId } as never),
      );
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
    }),
    close: () => db.close(),
  } as const;
}

async function activatePilotCorpus(
  harness: Awaited<ReturnType<typeof createHarness>>,
) {
  for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
    await harness.store.appendDoctrineProposal(proposal);
    await harness.store.approveDoctrine(
      proposal.doctrineUnit.doctrineId,
      { proposalHash: proposal.proposalHash },
      "local:phase2-operator",
    );
  }
  const run = (await harness.store.createDoctrineIngestionRun({})).run;
  const report = await harness.db.query<{ readonly quality_report_hash: ContractSha256 }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  const activation = (
    await harness.store.createDoctrineCorpusActivation({
      runId: run.runId,
      qualityReportHash: report.rows[0]!.quality_report_hash,
    })
  ).activation;
  const snapshot = await harness.store.getDoctrineCorpusSnapshot(run.snapshotId);
  assert.ok(snapshot);
  return { activation, snapshot };
}

async function persistAssembly(
  db: PGliteDatabase,
  assembly: PolicyAssemblyV1,
): Promise<void> {
  await db.exec("BEGIN;");
  try {
    await db.query(
      `INSERT INTO pa_policy_inputs
        (input_hash,context_content_hash,detail_content_hash,record)
       VALUES ($1,$2,$3,$4::jsonb)
       ON CONFLICT (input_hash) DO NOTHING`,
      [
        assembly.inputHash,
        assembly.policyInput.charts.context.contentHash,
        assembly.policyInput.charts.detail.contentHash,
        canonicalStringify(assembly.policyInput),
      ],
    );
    await insertAssemblyRow(db, assembly);
    await db.query(
      `INSERT INTO pa_policy_assembly_bindings
        (assembly_id,case_hash,input_hash,context_metadata_id,context_panel,
         context_artifact_id,context_content_hash,detail_metadata_id,detail_panel,
         detail_artifact_id,detail_content_hash)
       VALUES ($1,$2,$3,$4,'context',$5,$6,$7,'detail',$8,$9)`,
      [
        assembly.assemblyId,
        assembly.caseHash,
        assembly.inputHash,
        assembly.charts.context.metadataId,
        assembly.charts.context.artifactId,
        assembly.charts.context.contentHash,
        assembly.charts.detail.metadataId,
        assembly.charts.detail.artifactId,
        assembly.charts.detail.contentHash,
      ],
    );
    for (const [index, binding] of assembly.doctrineManifest.entries()) {
      await db.query(
        `INSERT INTO pa_policy_assembly_doctrine_bindings
          (assembly_id,doctrine_index,snapshot_id,doctrine_id,rag_record_hash)
         VALUES ($1,$2,$3,$4,$5)`,
        [assembly.assemblyId, index, assembly.snapshotId, binding.doctrineId, binding.ragRecordHash],
      );
    }
    await db.exec("COMMIT;");
  } catch (error) {
    await db.exec("ROLLBACK;");
    throw error;
  }
}

async function insertAssemblyRow(
  db: PGliteDatabase,
  assembly: PolicyAssemblyV1,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_policy_assemblies
      (assembly_id,assembly_rules_version,case_hash,source_bundle_hash,
       activation_id,activation_kind,activation_sequence,run_id,snapshot_id,
       profile_hash,quality_report_hash,doctrine_context_hash,
       doctrine_context_byte_length,input_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
    [
      assembly.assemblyId,
      assembly.assemblyRulesVersion,
      assembly.caseHash,
      assembly.sourceBundleHash,
      assembly.activationId,
      assembly.activationKind,
      assembly.activationSequence,
      assembly.runId,
      assembly.snapshotId,
      assembly.profileHash,
      assembly.qualityReportHash,
      assembly.doctrineContextHash,
      assembly.doctrineContextByteLength,
      assembly.inputHash,
      assembly.operatorPrincipal,
      canonicalStringify(assembly),
    ],
  );
}

async function insertFailure(
  db: PGliteDatabase,
  failure: PolicyAssemblyFailureV1,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_policy_assembly_failures
      (failure_id,assembly_rules_version,case_hash,source_bundle_hash,
       activation_kind,activation_id,activation_sequence,snapshot_id,
       observed_doctrine_count,observed_doctrine_context_byte_length,
       error_codes,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb)`,
    [
      failure.failureId,
      failure.assemblyRulesVersion,
      failure.caseHash,
      failure.sourceBundleHash,
      failure.activationKind,
      failure.activationId,
      failure.activationSequence,
      failure.snapshotId,
      failure.observedDoctrineCount,
      failure.observedDoctrineContextByteLength,
      JSON.stringify(failure.errorCodes),
      failure.operatorPrincipal,
      canonicalStringify(failure),
    ],
  );
}
