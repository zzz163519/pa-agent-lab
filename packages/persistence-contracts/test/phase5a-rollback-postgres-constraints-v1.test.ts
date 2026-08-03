import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_RUNTIME,
  canonicalHash,
  createDoctrineCorpusActivation,
  createDoctrineCorpusRollbackActivation,
  type ContractSha256,
  type DoctrineCorpusActivationV1,
  type DoctrineCorpusRollbackActivationV1,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
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

describe("Phase 5A rollback PostgreSQL constraints", () => {
  it("preserves ordinary rows and admits only a causally valid rollback shape", async () => {
    const harness = await createHarness(false);
    try {
      const { target, current } = await createTwoOrdinaryActivations(harness);
      const beforeMigration = await harness.db.query<{
        readonly record: DoctrineCorpusActivationV1;
      }>(
        "SELECT record FROM pa_doctrine_corpus_activations WHERE activation_id=$1",
        [target.activationId],
      );
      await applyContentHashedMigrations(harness.db, migrations);
      const ordinaryRow = await harness.db.query<{
        readonly activation_kind: string;
        readonly record: DoctrineCorpusActivationV1;
      }>(
        "SELECT activation_kind,record FROM pa_doctrine_corpus_activations WHERE activation_id=$1",
        [target.activationId],
      );
      assert.equal(ordinaryRow.rows[0]?.activation_kind, "standard");
      assert.deepEqual(beforeMigration.rows[0]?.record, target);
      assert.deepEqual(ordinaryRow.rows[0]?.record, beforeMigration.rows[0]?.record);

      const rollback = await insertRollback(harness.db, target, current.activationId);
      const rollbackRow = await harness.db.query<{
        readonly activation_kind: string;
        readonly target_activation_id: ContractSha256;
        readonly replaces_activation_id: ContractSha256;
        readonly record: DoctrineCorpusRollbackActivationV1;
      }>(
        `SELECT activation_kind,target_activation_id,replaces_activation_id,record
         FROM pa_doctrine_corpus_activations WHERE activation_id=$1`,
        [rollback.activationId],
      );
      assert.equal(rollbackRow.rows[0]?.activation_kind, "rollback");
      assert.equal(rollbackRow.rows[0]?.target_activation_id, target.activationId);
      assert.equal(rollbackRow.rows[0]?.replaces_activation_id, current.activationId);
      assert.deepEqual(rollbackRow.rows[0]?.record, rollback);

      const response = await harness.store.queryDoctrine({ query: "breakout context" });
      assert.equal(response.evidence.activationId, rollback.activationId);
      assert.equal(response.evidence.runId, target.runId);

      const nextSequence = await allocateSequence(harness.db);
      const repeatedOrdinary = createDoctrineCorpusActivation({
        schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
        activationSequence: nextSequence,
        runId: target.runId,
        snapshotId: target.snapshotId,
        profileHash: target.profileHash,
        qualityReportHash: target.qualityReportHash,
        operatorPrincipal: "local:phase2-operator",
      });
      await assert.rejects(() => insertOrdinary(harness.db, repeatedOrdinary));

      await assert.rejects(() =>
        harness.db.query(
          "UPDATE pa_doctrine_corpus_activations SET record=record WHERE activation_id=$1",
          [rollback.activationId],
        ),
      );
      await assert.rejects(() =>
        harness.db.query(
          "DELETE FROM pa_doctrine_corpus_activations WHERE activation_id=$1",
          [rollback.activationId],
        ),
      );
      await assert.rejects(() => harness.db.exec("TRUNCATE pa_doctrine_corpus_activations"));
    } finally {
      await harness.close();
    }
  });

  it("rejects rollback extra keys, copied-chain drift, and non-current causation", async () => {
    const harness = await createHarness();
    try {
      const { target, current } = await createTwoOrdinaryActivations(harness);
      const valid = createDoctrineCorpusRollbackActivation({
        activationSequence: await allocateSequence(harness.db),
        replacesActivationId: current.activationId,
        targetActivation: target,
        reason: "Restore the prior complete corpus.",
        operatorPrincipal: "local:phase2-operator",
      });
      const { activationId: _validActivationId, ...validBody } = valid;
      const copiedChainDrift = {
        ...validBody,
        runId: current.runId,
      };
      await assert.rejects(() =>
        insertRollbackRecord(harness.db, {
          ...copiedChainDrift,
          activationId: canonicalHash(copiedChainDrift),
        } as never),
      );

      const extraBody = { ...valid, unauthorized: true };
      const { activationId: _activationId, ...bodyWithoutId } = extraBody;
      await assert.rejects(() =>
        insertRollbackRecord(harness.db, {
          ...extraBody,
          activationId: canonicalHash(bodyWithoutId),
        } as never),
      );

      await createOrdinaryActivation(harness, 2);
      const stale = createDoctrineCorpusRollbackActivation({
        activationSequence: await allocateSequence(harness.db),
        replacesActivationId: current.activationId,
        targetActivation: target,
        reason: "Stale current authority.",
        operatorPrincipal: "local:phase2-operator",
      });
      await assert.rejects(() => insertRollbackRecord(harness.db, stale));
    } finally {
      await harness.close();
    }
  });
  it("rechecks the exact Source allowlist when deployment authority narrows", async () => {
    const harness = await createHarness();
    try {
      const { target } = await createTwoOrdinaryActivations(harness);
      await harness.db.exec(`
        CREATE OR REPLACE FUNCTION pa_doctrine_source_is_phase4a_allowed(
          candidate_source_id text,candidate_source_content_hash text
        )
        RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
        AS 'SELECT false'
      `);
      await assert.rejects(
        () =>
          harness.store.createDoctrineCorpusRollback({
            targetActivationId: target.activationId,
            reason: "This narrowed deployment must reject the old Source set.",
          }),
        /outside the exact Phase 4A allowlist/,
      );
      const activations = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_doctrine_corpus_activations",
      );
      assert.equal(activations.rows[0]?.count, 2);
    } finally {
      await harness.close();
    }
  });

  it("rejects retired ordinary targets and rollback targets", async () => {
    const retiredHarness = await createHarness();
    try {
      const { target, current } = await createTwoOrdinaryActivations(retiredHarness);
      const proposal = createPhase3bPilotDoctrineProposalsV1()[0]!;
      const approval = await retiredHarness.db.query<{
        readonly approval_hash: ContractSha256;
      }>(
        "SELECT approval_hash FROM pa_doctrine_approvals WHERE doctrine_id=$1",
        [proposal.doctrineUnit.doctrineId],
      );
      await retiredHarness.store.retireDoctrine(
        proposal.doctrineUnit.doctrineId,
        {
          approvalHash: approval.rows[0]!.approval_hash,
          reason: "No longer current Doctrine.",
        },
        "local:phase2-operator",
      );
      const rollback = createDoctrineCorpusRollbackActivation({
        activationSequence: await allocateSequence(retiredHarness.db),
        replacesActivationId: current.activationId,
        targetActivation: target,
        reason: "Must fail after retirement.",
        operatorPrincipal: "local:phase2-operator",
      });
      await assert.rejects(() => insertRollbackRecord(retiredHarness.db, rollback));
    } finally {
      await retiredHarness.close();
    }

    const rollbackTargetHarness = await createHarness();
    try {
      const { target, current } = await createTwoOrdinaryActivations(
        rollbackTargetHarness,
      );
      const firstRollback = await insertRollback(
        rollbackTargetHarness.db,
        target,
        current.activationId,
      );
      const laterOrdinary = await createOrdinaryActivation(rollbackTargetHarness, 2);
      const sequence = await allocateSequence(rollbackTargetHarness.db);
      const forgedBody = {
        schemaVersion: "doctrine-corpus-rollback-activation.v1",
        activationKind: "rollback",
        activationSequence: sequence,
        replacesActivationId: laterOrdinary.activationId,
        targetActivationId: firstRollback.activationId,
        runId: firstRollback.runId,
        snapshotId: firstRollback.snapshotId,
        profileHash: firstRollback.profileHash,
        qualityReportHash: firstRollback.qualityReportHash,
        reason: "A rollback cannot be a rollback target.",
        reasonHash: canonicalHash({
          schemaVersion: "doctrine-corpus-rollback-reason.v1",
          reason: "A rollback cannot be a rollback target.",
        }),
        operatorPrincipal: "local:phase2-operator",
      } as const;
      await assert.rejects(() =>
        insertRollbackRecord(rollbackTargetHarness.db, {
          ...forgedBody,
          activationId: canonicalHash(forgedBody),
        }),
      );
    } finally {
      await rollbackTargetHarness.close();
    }
  });
});

async function createHarness(includeRollbackMigration = true) {
  const db = new PGlite();
  await applyContentHashedMigrations(
    db,
    includeRollbackMigration ? migrations : migrations.slice(0, 5),
  );
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

async function createTwoOrdinaryActivations(
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
  const target = await createOrdinaryActivation(harness, 0);
  const current = await createOrdinaryActivation(harness, 1);
  return { target, current };
}

async function createOrdinaryActivation(
  harness: Awaited<ReturnType<typeof createHarness>>,
  attemptIndex: number,
): Promise<DoctrineCorpusActivationV1> {
  const run = (
    await harness.store.createDoctrineIngestionRun({ attemptIndex })
  ).run;
  const report = await harness.db.query<{
    readonly quality_report_hash: ContractSha256;
  }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  const activationKindColumn = await harness.db.query<{ readonly count: number }>(
    `SELECT count(*)::int AS count
     FROM information_schema.columns
     WHERE table_name='pa_doctrine_corpus_activations'
       AND column_name='activation_kind'`,
  );
  if (activationKindColumn.rows[0]?.count === 0) {
    const activation = createDoctrineCorpusActivation({
      schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
      activationSequence: await allocateSequence(harness.db),
      runId: run.runId,
      snapshotId: run.snapshotId,
      profileHash: run.profileHash,
      qualityReportHash: report.rows[0]!.quality_report_hash,
      operatorPrincipal: "local:phase2-operator",
    });
    await insertOrdinary(harness.db, activation);
    return activation;
  }
  const mutation = await harness.store.createDoctrineCorpusActivation({
    runId: run.runId,
    qualityReportHash: report.rows[0]!.quality_report_hash,
  });
  return mutation.activation;
}

async function allocateSequence(db: PGliteDatabase): Promise<number> {
  const result = await db.query<{ readonly sequence: number }>(
    "SELECT nextval('pa_doctrine_corpus_activation_sequence_seq')::int AS sequence",
  );
  return result.rows[0]!.sequence;
}

async function insertOrdinary(
  db: PGliteDatabase,
  activation: DoctrineCorpusActivationV1,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_doctrine_corpus_activations
      (activation_sequence,activation_id,run_id,snapshot_id,profile_hash,
       quality_report_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      activation.activationSequence,
      activation.activationId,
      activation.runId,
      activation.snapshotId,
      activation.profileHash,
      activation.qualityReportHash,
      activation.operatorPrincipal,
      JSON.stringify(activation),
    ],
  );
}

async function insertRollback(
  db: PGliteDatabase,
  target: DoctrineCorpusActivationV1,
  replacesActivationId: ContractSha256,
): Promise<DoctrineCorpusRollbackActivationV1> {
  const rollback = createDoctrineCorpusRollbackActivation({
    activationSequence: await allocateSequence(db),
    replacesActivationId,
    targetActivation: target,
    reason: "Restore the prior complete corpus.",
    operatorPrincipal: "local:phase2-operator",
  });
  await insertRollbackRecord(db, rollback);
  return rollback;
}

async function insertRollbackRecord(
  db: PGliteDatabase,
  rollback: DoctrineCorpusRollbackActivationV1,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_doctrine_corpus_activations
      (activation_sequence,activation_id,activation_kind,run_id,snapshot_id,
       profile_hash,quality_report_hash,operator_principal,target_activation_id,
       replaces_activation_id,reason_hash,record)
     VALUES ($1,$2,'rollback',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
    [
      rollback.activationSequence,
      rollback.activationId,
      rollback.runId,
      rollback.snapshotId,
      rollback.profileHash,
      rollback.qualityReportHash,
      rollback.operatorPrincipal,
      rollback.targetActivationId,
      rollback.replacesActivationId,
      rollback.reasonHash,
      JSON.stringify(rollback),
    ],
  );
}
