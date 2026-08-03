import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
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
import { createCaseApiV1 } from "@pa-agent-lab/case-api";
import { makePhase3ReviewWorkflowFixture } from "../../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
import { makePhase3bDoctrineApprovalFixture } from "../../../persistence-contracts/test/fixtures/phase3b-doctrine-approval-v1.fixture.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as {
  readonly PGlite: new () => PGliteDatabase;
};
interface PGliteDatabase {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const workspaceRoot = resolve(import.meta.dirname, "../../../..");
const migrations = await loadContentHashedMigrations(
  resolve(workspaceRoot, "packages/persistence-contracts/sql"),
);
const consoleRoot = resolve(workspaceRoot, "packages/research-console/dist");
const operatorToken = "playwright-operator-token-0123456789abcdef";
const reviewerToken = "playwright-reviewer-token-0123456789abcdef";

test("completes the backend-enforced blind review without pre-reveal decision leakage", async ({ page }, testInfo) => {
  const harness = await createHarness();
  const preRevealResponses: string[] = [];
  let revealed = false;
  page.on("response", async (response) => {
    if (!revealed && response.url().includes("/v1/reviewer/") && response.headers()["content-type"]?.includes("json")) {
      preRevealResponses.push(await response.text());
    }
  });
  try {
    await page.goto(`${harness.url}/console/#token=${reviewerToken}`);
    await expect(page.getByRole("heading", { name: "Decision review queue" })).toBeVisible();
    await expect(page.getByText(harness.fixture.decision.decisionId)).toHaveCount(0);
    await page.getByRole("link", { name: /Open case-/ }).click();
    await expect(page.getByRole("heading", { name: "Closed five-minute bars" })).toBeVisible();
    await expect(page.locator("img.review-chart")).toHaveCount(2);
    await expect.poll(async () =>
      page.locator("img.review-chart").evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).naturalWidth === 1200 && (image as HTMLImageElement).naturalHeight === 720),
      )
    ).toBe(true);
    await page.getByRole("link", { name: "Back to review queue" }).click();
    await page.getByRole("link", { name: /Open case-/ }).click();
    await expect(page.locator("img.review-chart")).toHaveCount(2);
    await expect.poll(async () =>
      page.locator("img.review-chart").evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).naturalWidth === 1200 && (image as HTMLImageElement).naturalHeight === 720),
      )
    ).toBe(true);
    await expect(page.getByRole("heading", { name: "BrooksDecision", exact: true })).toHaveCount(0);

    await page.locator("label").filter({ hasText: "no trade" }).click();
    await page.getByLabel("Blind summary").fill("The synthetic market is balanced and has no complete setup.");
    await expect.poll(() => page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key.startsWith("pa-agent-lab:blind-draft:v1:")),
    )).toBe(true);
    await page.getByRole("button", { name: "Freeze assessment" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Freeze" }).click();
    await expect(page.getByText("Assessment locked")).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key.startsWith("pa-agent-lab:blind-draft:v1:")),
    )).toBe(false);
    await expect(page.getByRole("heading", { name: "BrooksDecision", exact: true })).toHaveCount(0);

    assert.ok(preRevealResponses.length >= 3);
    for (const body of preRevealResponses) {
      assert.doesNotMatch(body, new RegExp(harness.fixture.decision.decisionId));
      assert.doesNotMatch(body, /broadContext|tradePlan|humanSummary/);
    }

    revealed = true;
    await page.getByRole("button", { name: "Reveal decision" }).click();
    await expect(page.getByRole("heading", { name: "BrooksDecision", exact: true })).toBeVisible();
    await expect(page.getByText(harness.fixture.decision.decisionId, { exact: true })).toBeVisible();
    await page.locator("label").filter({ hasText: "disagree" }).click();
    await page.getByLabel("Whole-decision summary").fill("The revealed whole decision differs from the frozen assessment.");
    await page.getByRole("button", { name: "Submit final review" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("heading", { name: "CalvinReview" })).toBeVisible();
    await expect(page.getByText("whole decision disagreement, verdict disagreement")).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await page.screenshot({
      path: testInfo.outputPath("phase3a-completed.png"),
      fullPage: true,
    });
  } finally {
    await harness.close();
  }
});

test("approves and retires one exact source-mapped Doctrine proposal", async ({ page }, testInfo) => {
  const harness = await createHarness();
  try {
    await page.goto(`${harness.url}/console/#token=${reviewerToken}`);
    await page.getByRole("link", { name: "Doctrine" }).click();
    await expect(page.getByRole("heading", { name: "Doctrine approval queue" })).toBeVisible();
    await expect(page.getByText(harness.doctrine.proposal.doctrineUnit.concept)).toBeVisible();
    await page.getByRole("link", { name: /Open breakout_context/ }).click();
    await expect(page.getByRole("heading", { name: harness.doctrine.proposal.doctrineUnit.concept })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute("href", harness.doctrine.proposal.source.urlOrLocalRef);
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("approved", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "local:calvin-reviewer" })).toBeVisible();
    await page.getByLabel("Reason").fill("Superseded by corrected wording.");
    await page.getByRole("button", { name: "Retire" }).click();
    await expect(page.getByText("retired", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Superseded by corrected wording." })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath("phase3b-doctrine-retired.png"), fullPage: true });
  } finally {
    await harness.close();
  }
});

async function createHarness() {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const database: CaseStoreDatabaseV1 = {
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
  const store = createCaseStore(database);
  const fixture = makePhase3ReviewWorkflowFixture();
  const doctrine = makePhase3bDoctrineApprovalFixture();
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase3a-playwright-"));
  await persistAnonymousChartArtifacts(fixture.charts, artifactRoot);
  await store.appendSyntheticCaseBundle(fixture.caseBundle);
  await store.appendBrooksDecision(fixture.decision);
  await store.appendDoctrineProposal(doctrine.proposal);
  const port = await availablePort();
  const boundApp = await createCaseApiV1({
    store,
    artifactRoot,
    consoleRoot,
    localToken: operatorToken,
    reviewerToken,
    authorizedSyntheticBundleHashes: [fixture.caseBundle.bundleHash],
    authorizedDoctrineProposalHashes: [doctrine.proposal.proposalHash],
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedOrigins: [`http://127.0.0.1:${port}`],
  });
  const boundUrl = await boundApp.listen({ host: "127.0.0.1", port });
  return {
    url: boundUrl,
    fixture,
    doctrine,
    close: async () => {
      await boundApp.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    },
  } as const;
}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise<void>((resolvePromise, reject) =>
    server.close((error) =>
      error === undefined ? resolvePromise() : reject(error),
    ),
  );
  if (port === 0) throw new Error("Could not reserve a browser-test port");
  return port;
}
