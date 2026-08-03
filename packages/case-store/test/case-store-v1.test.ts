import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { makePhase2CaseStoreFixture } from "../../persistence-contracts/test/fixtures/phase2-case-store-v1.fixture.ts";
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
  query<T>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrations = await loadContentHashedMigrations(
  resolve(root, "persistence-contracts/sql"),
);

describe("Phase 2 Case Store V1", () => {
  it("atomically appends and reconstructs one immutable synthetic review chain", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase2CaseStoreFixture();
      const first = await harness.store.appendSyntheticCaseBundle(
        fixture.caseBundle,
      );
      const second = await harness.store.appendSyntheticCaseBundle(
        fixture.caseBundle,
      );
      assert.deepEqual(first, {
        status: "inserted",
        resourceHash: fixture.caseBundle.bundleHash,
      });
      assert.deepEqual(second, {
        status: "existing",
        resourceHash: fixture.caseBundle.bundleHash,
      });
      assert.deepEqual(
        await harness.store.getCase(fixture.caseBundle.policyCase.caseHash),
        fixture.caseBundle.policyCase,
      );

      assert.deepEqual(await harness.store.appendBrooksDecision(fixture.decision), {
        status: "inserted",
        resourceHash: fixture.decision.decisionHash,
      });
      assert.deepEqual(await harness.store.appendCalvinReview(fixture.review), {
        status: "inserted",
        resourceHash: fixture.review.reviewHash,
      });
      assert.deepEqual(await harness.store.appendBrooksDecision(fixture.decision), {
        status: "existing",
        resourceHash: fixture.decision.decisionHash,
      });
      assert.deepEqual(await harness.store.appendCalvinReview(fixture.review), {
        status: "existing",
        resourceHash: fixture.review.reviewHash,
      });

      const audit = await harness.store.getCaseAudit(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(audit?.caseBundle.bundleHash, fixture.caseBundle.bundleHash);
      assert.equal(audit?.decision?.decisionHash, fixture.decision.decisionHash);
      assert.equal(audit?.review?.reviewHash, fixture.review.reviewHash);
      assert.deepEqual(audit?.decisionConflict?.kinds, [
        "whole_decision_disagreement",
        "verdict_disagreement",
      ]);
      assert.equal(Object.isFrozen(audit), true);

      const metadata = await harness.store.getChartArtifact(
        fixture.caseBundle.chartMetadata.context.artifactId,
      );
      assert.equal(
        metadata?.contentHash,
        fixture.caseBundle.chartMetadata.context.contentHash,
      );
    } finally {
      await harness.close();
    }
  });

  it("rejects natural-identity conflicts instead of replacing immutable content", async () => {
    const harness = await createHarness();
    try {
      const first = makePhase2CaseStoreFixture();
      const conflicting = makePhase2CaseStoreFixture({
        caseId: first.caseBundle.policyCase.caseId,
        policyStreamId: first.caseBundle.policyCase.policyStreamId,
        priceOffset: 5,
        identitySuffix: "phase2-conflicting",
      });
      await harness.store.appendSyntheticCaseBundle(first.caseBundle);
      await assert.rejects(
        () => harness.store.appendSyntheticCaseBundle(conflicting.caseBundle),
        { name: "CaseStoreError", message: /immutable identity conflict/ },
      );
      assert.deepEqual(
        await harness.store.getCase(first.caseBundle.policyCase.caseHash),
        first.caseBundle.policyCase,
      );
    } finally {
      await harness.close();
    }
  });

  it("rolls back every bundle row when an injected dependency fails", async () => {
    const harness = await createHarness({ failOnCaseInputBinding: true });
    try {
      const fixture = makePhase2CaseStoreFixture();
      await assert.rejects(
        () => harness.store.appendSyntheticCaseBundle(fixture.caseBundle),
        { name: "CaseStoreError", message: /injected binding failure/ },
      );
      const counts = await harness.db.query<{
        cases: number;
        inputs: number;
        metadata: number;
        bindings: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pa_policy_cases) AS cases,
          (SELECT count(*)::int FROM pa_policy_inputs) AS inputs,
          (SELECT count(*)::int FROM pa_chart_artifact_metadata) AS metadata,
          (SELECT count(*)::int FROM pa_case_policy_inputs) AS bindings
      `);
      assert.deepEqual(counts.rows, [
        { cases: 0, inputs: 0, metadata: 0, bindings: 0 },
      ]);
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(
  options: { readonly failOnCaseInputBinding?: boolean } = {},
) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const database: CaseStoreDatabaseV1 = {
    query: (sql, params) => db.query(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = {
        query: async (sql, params) => {
          if (
            options.failOnCaseInputBinding === true &&
            /INSERT INTO pa_case_policy_inputs/.test(sql)
          ) {
            throw new Error("injected binding failure");
          }
          return db.query(sql, params);
        },
      };
      try {
        const result = await work(client);
        await db.exec("COMMIT;");
        return result;
      } catch (error) {
        await db.exec("ROLLBACK;");
        throw error;
      }
    },
  };
  return {
    db,
    store: createCaseStore(database),
    close: () => db.close(),
  } as const;
}
