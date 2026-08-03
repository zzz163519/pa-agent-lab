import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { makePhase3ReviewWorkflowFixture } from "../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
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

const migrations = await loadContentHashedMigrations(
  new URL("../../persistence-contracts/sql", import.meta.url).pathname,
);

describe("Phase 3A blind review Case Store", () => {
  it("derives a redacted queue and enforces assessment then reveal then final review", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase3ReviewWorkflowFixture();
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await harness.store.appendBrooksDecision(fixture.decision);

      const initialQueue = await harness.store.listReviewWorkItems();
      assert.equal(initialQueue.items.length, 1);
      assert.equal(initialQueue.items[0]?.state, "awaiting_assessment");
      const initial = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(initial?.decision, null);
      assert.equal(initial?.assessment, null);
      assert.equal(initial?.state, "awaiting_assessment");
      assert.doesNotMatch(JSON.stringify(initial), new RegExp(fixture.decision.decisionId));
      assert.doesNotMatch(JSON.stringify(initial), /broadContext|tradePlan|humanSummary/);

      await assert.rejects(
        () =>
          harness.store.appendDecisionRevealReceipt(
            fixture.caseBundle.policyCase.caseHash,
            { assessmentHash: fixture.assessment.assessmentHash },
          ),
        { name: "CaseStoreError", message: /assessment.*required/i },
      );

      const assessmentCommand = {
        caseHash: fixture.caseBundle.policyCase.caseHash,
        draftIdentityHash: initial!.draftIdentityHash,
        independentVerdict: fixture.assessment.independentVerdict,
        blindSummary: fixture.assessment.blindSummary,
      } as const;
      assert.equal(
        (await harness.store.appendIndependentAssessment(assessmentCommand)).status,
        "inserted",
      );
      assert.equal(
        (await harness.store.appendIndependentAssessment(assessmentCommand)).status,
        "existing",
      );
      await assert.rejects(
        () =>
          harness.store.appendIndependentAssessment({
            ...assessmentCommand,
            blindSummary: "Conflicting immutable assessment content.",
          }),
        { name: "CaseStoreError", message: /immutable identity conflict/ },
      );

      const frozen = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(frozen?.state, "awaiting_reveal");
      assert.equal(frozen?.decision, null);
      assert.equal(frozen?.assessment?.independentVerdict, "no_trade");
      assert.doesNotMatch(JSON.stringify(frozen), new RegExp(fixture.decision.decisionId));

      const reveal = await harness.store.appendDecisionRevealReceipt(
        fixture.caseBundle.policyCase.caseHash,
        { assessmentHash: frozen!.assessment!.assessmentHash },
      );
      assert.equal(reveal.status, "inserted");
      const revealed = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(revealed?.state, "awaiting_final_review");
      assert.equal(revealed?.decision?.decisionHash, fixture.decision.decisionHash);
      assert.equal(revealed?.revealReceipt?.receiptHash, reveal.resourceHash);

      const finalCommand = {
        caseHash: fixture.caseBundle.policyCase.caseHash,
        assessmentHash: revealed!.assessment!.assessmentHash,
        revealReceiptHash: revealed!.revealReceipt!.receiptHash,
        disposition: fixture.review.disposition,
        summary: fixture.review.summary!,
      } as const;
      assert.equal((await harness.store.appendFinalReview(finalCommand)).status, "inserted");
      assert.equal((await harness.store.appendFinalReview(finalCommand)).status, "existing");
      const completed = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.equal(completed?.state, "completed");
      assert.equal(completed?.review?.independentVerdict, "no_trade");
      assert.equal(completed?.workflowBinding?.assessmentHash, revealed?.assessment?.assessmentHash);
      assert.deepEqual(completed?.decisionConflict?.kinds, [
        "whole_decision_disagreement",
        "verdict_disagreement",
      ]);
    } finally {
      await harness.close();
    }
  });

  it("rejects final review before reveal and rolls back review when binding insertion fails", async () => {
    const harness = await createHarness({ failOnWorkflowBinding: true });
    try {
      const fixture = makePhase3ReviewWorkflowFixture();
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await harness.store.appendBrooksDecision(fixture.decision);
      const initial = await harness.store.getReviewWorkItem(fixture.caseBundle.policyCase.caseHash);
      await harness.store.appendIndependentAssessment({
        caseHash: fixture.caseBundle.policyCase.caseHash,
        draftIdentityHash: initial!.draftIdentityHash,
        independentVerdict: "no_trade",
        blindSummary: fixture.assessment.blindSummary,
      });
      const assessed = await harness.store.getReviewWorkItem(fixture.caseBundle.policyCase.caseHash);
      await assert.rejects(
        () =>
          harness.store.appendFinalReview({
            caseHash: fixture.caseBundle.policyCase.caseHash,
            assessmentHash: assessed!.assessment!.assessmentHash,
            revealReceiptHash: fixture.revealReceipt.receiptHash,
            disposition: "disagree",
            summary: "Cannot be stored before reveal.",
          }),
        { name: "CaseStoreError", message: /reveal receipt.*required/i },
      );
      await harness.store.appendDecisionRevealReceipt(
        fixture.caseBundle.policyCase.caseHash,
        { assessmentHash: assessed!.assessment!.assessmentHash },
      );
      const revealed = await harness.store.getReviewWorkItem(fixture.caseBundle.policyCase.caseHash);
      await assert.rejects(
        () =>
          harness.store.appendFinalReview({
            caseHash: fixture.caseBundle.policyCase.caseHash,
            assessmentHash: assessed!.assessment!.assessmentHash,
            revealReceiptHash: revealed!.revealReceipt!.receiptHash,
            disposition: "disagree",
            summary: "The binding write is intentionally failed.",
          }),
        { name: "CaseStoreError", message: /injected workflow binding failure/ },
      );
      const counts = await harness.db.query<{
        reviews: number;
        bindings: number;
      }>(`SELECT
        (SELECT count(*)::int FROM pa_calvin_reviews) AS reviews,
        (SELECT count(*)::int FROM pa_calvin_review_workflow_bindings) AS bindings`);
      assert.deepEqual(counts.rows, [{ reviews: 0, bindings: 0 }]);
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(
  options: { readonly failOnWorkflowBinding?: boolean } = {},
) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const database: CaseStoreDatabaseV1 = {
    query: (sql, params) => db.query(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = {
        query: (sql, params) => {
          if (
            options.failOnWorkflowBinding === true &&
            /INSERT INTO pa_calvin_review_workflow_bindings/.test(sql)
          ) {
            throw new Error("injected workflow binding failure");
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
