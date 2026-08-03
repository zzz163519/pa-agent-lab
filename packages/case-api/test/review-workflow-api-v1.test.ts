import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { persistAnonymousChartArtifacts } from "@pa-agent-lab/chart-renderer";
import {
  createCaseStore,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "@pa-agent-lab/case-store";
import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
} from "@pa-agent-lab/case-store/migration-runner-v1";
import { makePhase3ReviewWorkflowFixture } from "../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
import { createCaseApiV1 } from "../src/case-api-v1.ts";

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
const operatorToken = "phase3a-operator-token-0123456789abcdef";
const reviewerToken = "phase3a-reviewer-token-0123456789abcdef";
const baseHeaders = {
  host: "127.0.0.1",
  origin: "http://127.0.0.1",
  "content-type": "application/json",
} as const;
const operatorHeaders = {
  ...baseHeaders,
  authorization: `Bearer ${operatorToken}`,
} as const;
const reviewerHeaders = {
  ...baseHeaders,
  authorization: `Bearer ${reviewerToken}`,
} as const;

describe("Phase 3A reviewer REST workflow", () => {
  it("keeps operator and reviewer principals separate while sharing anonymous PNG reads", async () => {
    const harness = await createHarness();
    try {
      const fixture = await seed(harness);
      const operatorOnReviewer = await harness.app.inject({
        method: "GET",
        url: "/v1/reviewer/work-items",
        headers: operatorHeaders,
      });
      assert.equal(operatorOnReviewer.statusCode, 401);
      const reviewerOnAudit = await harness.app.inject({
        method: "GET",
        url: `/v1/cases/${fixture.caseBundle.policyCase.caseHash}/audit`,
        headers: reviewerHeaders,
      });
      assert.equal(reviewerOnAudit.statusCode, 401);
      const reviewerChart = await harness.app.inject({
        method: "GET",
        url: `/v1/chart-artifacts/${fixture.caseBundle.chartMetadata.context.artifactId}/content`,
        headers: reviewerHeaders,
      });
      assert.equal(reviewerChart.statusCode, 200, reviewerChart.body);
      assert.equal(reviewerChart.headers["cache-control"], "no-store");
    } finally {
      await harness.close();
    }
  });

  it("returns no BrooksDecision content before receipt and enforces the full workflow", async () => {
    const harness = await createHarness();
    try {
      const fixture = await seed(harness);
      const queue = await harness.app.inject({
        method: "GET",
        url: "/v1/reviewer/work-items",
        headers: reviewerHeaders,
      });
      assert.equal(queue.statusCode, 200, queue.body);
      assert.equal(queue.headers["cache-control"], "no-store");
      assert.doesNotMatch(queue.body, new RegExp(fixture.decision.decisionId));
      assert.doesNotMatch(queue.body, /broadContext|tradePlan|humanSummary/);
      const item = queue.json().items[0];

      const detail = await harness.app.inject({
        method: "GET",
        url: `/v1/reviewer/work-items/${item.caseHash}`,
        headers: reviewerHeaders,
      });
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(detail.json().decision, null);
      assert.doesNotMatch(detail.body, new RegExp(fixture.decision.decisionId));

      const revealTooSoon = await harness.app.inject({
        method: "POST",
        url: `/v1/reviewer/work-items/${item.caseHash}/reveal`,
        headers: reviewerHeaders,
        payload: JSON.stringify({ assessmentHash: fixture.assessment.assessmentHash }),
      });
      assert.equal(revealTooSoon.statusCode, 422, revealTooSoon.body);

      const assessment = await harness.app.inject({
        method: "POST",
        url: "/v1/reviewer/independent-assessments",
        headers: reviewerHeaders,
        payload: JSON.stringify({
          caseHash: item.caseHash,
          draftIdentityHash: item.draftIdentityHash,
          independentVerdict: "no_trade",
          blindSummary: fixture.assessment.blindSummary,
        }),
      });
      assert.equal(assessment.statusCode, 201, assessment.body);
      assert.equal(assessment.headers["cache-control"], "no-store");
      assert.equal(assessment.json().workItem.state, "awaiting_reveal");
      assert.equal(assessment.json().workItem.decision, null);
      assert.doesNotMatch(assessment.body, new RegExp(fixture.decision.decisionId));

      const reveal = await harness.app.inject({
        method: "POST",
        url: `/v1/reviewer/work-items/${item.caseHash}/reveal`,
        headers: reviewerHeaders,
        payload: JSON.stringify({
          assessmentHash: assessment.json().workItem.assessment.assessmentHash,
        }),
      });
      assert.equal(reveal.statusCode, 201, reveal.body);
      assert.equal(reveal.json().workItem.state, "awaiting_final_review");
      assert.equal(reveal.json().workItem.decision.decisionHash, fixture.decision.decisionHash);

      const finalPayload = JSON.stringify({
        caseHash: item.caseHash,
        assessmentHash: reveal.json().workItem.assessment.assessmentHash,
        revealReceiptHash: reveal.json().workItem.revealReceipt.receiptHash,
        disposition: "disagree",
        summary: "The whole Brooks decision differs from the frozen judgment.",
      });
      const finalReview = await harness.app.inject({
        method: "POST",
        url: "/v1/reviewer/final-reviews",
        headers: reviewerHeaders,
        payload: finalPayload,
      });
      assert.equal(finalReview.statusCode, 201, finalReview.body);
      assert.equal(finalReview.json().workItem.state, "completed");
      assert.deepEqual(finalReview.json().workItem.decisionConflict.kinds, [
        "whole_decision_disagreement",
        "verdict_disagreement",
      ]);
      const retry = await harness.app.inject({
        method: "POST",
        url: "/v1/reviewer/final-reviews",
        headers: reviewerHeaders,
        payload: finalPayload,
      });
      assert.equal(retry.statusCode, 200, retry.body);
    } finally {
      await harness.close();
    }
  });

  it("enforces exact reviewer response schemas and the pre-reveal state boundary", async () => {
    const harness = await createHarness();
    try {
      const fixture = await seed(harness);
      const originalQueue = await harness.store.listReviewWorkItems();
      const originalDetail = await harness.store.getReviewWorkItem(
        fixture.caseBundle.policyCase.caseHash,
      );
      assert.ok(originalDetail);
      Object.assign(harness.store, {
        listReviewWorkItems: async () => ({
          ...originalQueue,
          unauthorizedDecisionContent: fixture.decision,
          items: originalQueue.items.map((item) => ({
            ...item,
            unauthorizedVerdict: fixture.decision.verdict,
          })),
        }),
      });
      const queue = await harness.app.inject({
        method: "GET",
        url: "/v1/reviewer/work-items",
        headers: reviewerHeaders,
      });
      assert.equal(queue.statusCode, 200, queue.body);
      assert.doesNotMatch(queue.body, /unauthorizedDecisionContent|unauthorizedVerdict/);
      assert.doesNotMatch(queue.body, new RegExp(fixture.decision.decisionId));

      Object.assign(harness.store, {
        getReviewWorkItem: async () => ({
          ...originalDetail,
          decision: fixture.decision,
        }),
      });
      const detail = await harness.app.inject({
        method: "GET",
        url: `/v1/reviewer/work-items/${fixture.caseBundle.policyCase.caseHash}`,
        headers: reviewerHeaders,
      });
      assert.equal(detail.statusCode, 500, detail.body);
      assert.doesNotMatch(detail.body, new RegExp(fixture.decision.decisionId));
      assert.equal(detail.json().code, "INTERNAL_ERROR");
    } finally {
      await harness.close();
    }
  });

  it("serves the console shell with strict local security headers", async () => {
    const harness = await createHarness();
    try {
      const response = await harness.app.inject({
        method: "GET",
        url: "/console/",
        headers: { host: "127.0.0.1" },
      });
      assert.equal(response.statusCode, 200, response.body);
      assert.match(response.body, /Research Console/);
      assert.equal(response.headers["cache-control"], "no-store");
      assert.match(response.headers["content-security-policy"] ?? "", /default-src 'self'/);
      assert.equal(response.headers["referrer-policy"], "no-referrer");
      assert.doesNotMatch(response.body, /reviewer-token/);
    } finally {
      await harness.close();
    }
  });

  it("rejects equal operator and reviewer deployment tokens", async () => {
    const db = new PGlite();
    await applyContentHashedMigrations(db, migrations);
    const database = makeDatabase(db);
    await assert.rejects(
      () =>
        createCaseApiV1({
          store: createCaseStore(database),
          artifactRoot: tmpdir(),
          localToken: operatorToken,
          reviewerToken: operatorToken,
          authorizedSyntheticBundleHashes: [makePhase3ReviewWorkflowFixture().caseBundle.bundleHash],
          allowedHosts: ["127.0.0.1"],
          allowedOrigins: ["http://127.0.0.1"],
        }),
      /must be distinct/,
    );
    await db.close();
  });
});

async function createHarness() {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const database = makeDatabase(db);
  const store = createCaseStore(database);
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase3a-api-artifacts-"));
  const consoleRoot = await mkdtemp(resolve(tmpdir(), "pa-phase3a-console-"));
  await writeFile(
    resolve(consoleRoot, "index.html"),
    "<!doctype html><title>PA Agent Lab Research Console</title>",
    "utf8",
  );
  const fixture = makePhase3ReviewWorkflowFixture();
  const app = await createCaseApiV1({
    store,
    artifactRoot,
    localToken: operatorToken,
    reviewerToken,
    authorizedSyntheticBundleHashes: [fixture.caseBundle.bundleHash],
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedOrigins: ["http://127.0.0.1"],
    consoleRoot,
  });
  return {
    app,
    db,
    store,
    artifactRoot,
    close: async () => {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
      await rm(consoleRoot, { recursive: true, force: true });
    },
  } as const;
}

function makeDatabase(db: PGliteDatabase): CaseStoreDatabaseV1 {
  return {
    query: (sql, params) => db.query(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = {
        query: (sql, params) => db.query(sql, params),
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
}

async function seed(harness: Awaited<ReturnType<typeof createHarness>>) {
  const fixture = makePhase3ReviewWorkflowFixture();
  await persistAnonymousChartArtifacts(fixture.charts, harness.artifactRoot);
  await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
  await harness.store.appendBrooksDecision(fixture.decision);
  return fixture;
}
