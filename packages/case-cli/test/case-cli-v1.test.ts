import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { createCaseApiV1 } from "@pa-agent-lab/case-api";
import {
  applyContentHashedMigrations,
  createCaseStore,
  loadContentHashedMigrations,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "@pa-agent-lab/case-store";

import { runCaseCliV1 } from "../src/case-cli-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "../src/synthetic-fixture-v1.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as {
  readonly PGlite: new () => PGliteDatabase;
};

interface PGliteDatabase {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrations = await loadContentHashedMigrations(
  resolve(root, "persistence-contracts/sql"),
);
const localToken = "phase2-cli-local-token-0123456789abcdef";

describe("Phase 2 synthetic Case CLI", () => {
  it("seeds and audits one complete synthetic review chain through local HTTP", async () => {
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
    const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase2-cli-artifacts-"));
    const authorizedFixture = createPhase2SyntheticFixtureV1();
    const app = await createCaseApiV1({
      store: createCaseStore(database),
      artifactRoot,
      localToken,
      reviewerToken: "phase3a-reviewer-token-for-cli-test-0123456789",
      authorizedSyntheticBundleHashes: [authorizedFixture.caseBundle.bundleHash],
      allowedHosts: ["127.0.0.1", "localhost"],
      allowedOrigins: ["http://127.0.0.1"],
    });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const output: string[] = [];
    try {
      const exitCode = await runCaseCliV1({
        argv: [
          "seed-synthetic",
          "--api-url",
          address,
          "--artifact-root",
          artifactRoot,
        ],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => output.push(line),
        stderr: (line) => output.push(`ERROR:${line}`),
      });
      assert.equal(exitCode, 0, output.join("\n"));
      const seeded = JSON.parse(output.at(-1)!) as {
        readonly caseHash: string;
        readonly decisionHash: string;
        readonly reviewHash: string;
        readonly conflictKinds: readonly string[];
        readonly mutations: {
          readonly caseBundle: string;
          readonly brooksDecision: string;
          readonly calvinReview: string;
        };
        readonly chartArtifacts: {
          readonly context: {
            readonly artifactId: string;
            readonly contentHash: string;
          };
          readonly detail: {
            readonly artifactId: string;
            readonly contentHash: string;
          };
        };
      };
      assert.match(seeded.caseHash, /^sha256:[0-9a-f]{64}$/);
      assert.match(seeded.decisionHash, /^sha256:[0-9a-f]{64}$/);
      assert.match(seeded.reviewHash, /^sha256:[0-9a-f]{64}$/);
      assert.deepEqual(seeded.conflictKinds, ["none"]);
      assert.deepEqual(seeded.mutations, {
        caseBundle: "inserted",
        brooksDecision: "inserted",
        calvinReview: "inserted",
      });
      assert.deepEqual(seeded.chartArtifacts, {
        context: {
          artifactId:
            authorizedFixture.caseBundle.chartMetadata.context.artifactId,
          contentHash:
            authorizedFixture.caseBundle.chartMetadata.context.contentHash,
        },
        detail: {
          artifactId:
            authorizedFixture.caseBundle.chartMetadata.detail.artifactId,
          contentHash:
            authorizedFixture.caseBundle.chartMetadata.detail.contentHash,
        },
      });
      assert.equal((await readdir(artifactRoot)).filter((name) => name.endsWith(".png")).length, 2);
      assert.doesNotMatch(output.join("\n"), /2025-02|2025-05|2025-08|symbol|venue|outcome/i);

      const retryOutput: string[] = [];
      const retryExitCode = await runCaseCliV1({
        argv: [
          "seed-synthetic",
          "--api-url",
          address,
          "--artifact-root",
          artifactRoot,
        ],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => retryOutput.push(line),
        stderr: (line) => retryOutput.push(`ERROR:${line}`),
      });
      assert.equal(retryExitCode, 0, retryOutput.join("\n"));
      assert.deepEqual(JSON.parse(retryOutput.at(-1)!).mutations, {
        caseBundle: "existing",
        brooksDecision: "existing",
        calvinReview: "existing",
      });

      const inspectionOutput: string[] = [];
      const inspectionExit = await runCaseCliV1({
        argv: ["inspect-case", seeded.caseHash, "--api-url", address],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => inspectionOutput.push(line),
        stderr: (line) => inspectionOutput.push(`ERROR:${line}`),
      });
      assert.equal(inspectionExit, 0, inspectionOutput.join("\n"));
      assert.ok(inspectionOutput[0]!.length < 2_048);
      const inspection = JSON.parse(inspectionOutput[0]!);
      assert.match(inspection.auditHash, /^sha256:[0-9a-f]{64}$/);
      const { auditHash: _auditHash, ...inspectionBody } = inspection;
      assert.deepEqual(inspectionBody, {
        caseHash: authorizedFixture.caseBundle.policyCase.caseHash,
        caseId: authorizedFixture.caseBundle.policyCase.caseId,
        sourceScope: "synthetic_fixture_only",
        inputHash: authorizedFixture.caseBundle.policyInput.inputHash,
        barCount: 120,
        barDurationSeconds: 300,
        lastVisibleBarId:
          authorizedFixture.caseBundle.policyCase.lastVisibleBarId,
        decision: {
          decisionHash: authorizedFixture.decision.decisionHash,
          verdict: "no_trade",
        },
        review: {
          reviewHash: authorizedFixture.review.reviewHash,
          disposition: "agree",
        },
        conflict: {
          kinds: ["none"],
          status: "closed",
        },
        chartArtifacts: {
          context: {
            artifactId:
              authorizedFixture.caseBundle.chartMetadata.context.artifactId,
            contentHash:
              authorizedFixture.caseBundle.chartMetadata.context.contentHash,
            widthPx: 1200,
            heightPx: 720,
          },
          detail: {
            artifactId:
              authorizedFixture.caseBundle.chartMetadata.detail.artifactId,
            contentHash:
              authorizedFixture.caseBundle.chartMetadata.detail.contentHash,
            widthPx: 1200,
            heightPx: 720,
          },
        },
      });

      const auditOutput: string[] = [];
      const auditExit = await runCaseCliV1({
        argv: ["get-audit", seeded.caseHash, "--api-url", address],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => auditOutput.push(line),
        stderr: (line) => auditOutput.push(`ERROR:${line}`),
      });
      assert.equal(auditExit, 0, auditOutput.join("\n"));
      assert.equal(JSON.parse(auditOutput[0]!).caseHash, seeded.caseHash);

      const downloadedPath = resolve(artifactRoot, "downloaded-context.png");
      const chartOutput: string[] = [];
      const chartExit = await runCaseCliV1({
        argv: [
          "get-chart",
          authorizedFixture.caseBundle.chartMetadata.context.artifactId,
          "--api-url",
          address,
          "--output",
          downloadedPath,
        ],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => chartOutput.push(line),
        stderr: (line) => chartOutput.push(`ERROR:${line}`),
      });
      assert.equal(chartExit, 0, chartOutput.join("\n"));
      assert.deepEqual(JSON.parse(chartOutput[0]!), {
        artifactId:
          authorizedFixture.caseBundle.chartMetadata.context.artifactId,
        outputPath: downloadedPath,
        byteLength:
          authorizedFixture.caseBundle.chartMetadata.context.byteLength,
        contentHash:
          authorizedFixture.caseBundle.chartMetadata.context.contentHash,
        widthPx: 1200,
        heightPx: 720,
      });
      assert.deepEqual(
        await readFile(downloadedPath),
        await readFile(
          resolve(
            artifactRoot,
            `${authorizedFixture.caseBundle.chartMetadata.context.contentHash.slice("sha256:".length)}.png`,
          ),
        ),
      );

      const overwriteOutput: string[] = [];
      const overwriteExit = await runCaseCliV1({
        argv: [
          "get-chart",
          authorizedFixture.caseBundle.chartMetadata.context.artifactId,
          "--api-url",
          address,
          "--output",
          downloadedPath,
        ],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => overwriteOutput.push(line),
        stderr: (line) => overwriteOutput.push(`ERROR:${line}`),
      });
      assert.equal(overwriteExit, 1);
      assert.match(overwriteOutput.join("\n"), /already exists/);
    } finally {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });

  it("seeds one blind-review work item without creating a CalvinReview", async () => {
    const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase3a-cli-seed-"));
    const requestedPaths: string[] = [];
    const fakeFetch = (async (input, init) => {
      requestedPaths.push(new URL(String(input)).pathname);
      assert.equal(init?.method, "POST");
      return new Response(
        JSON.stringify({ status: "inserted" }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    const output: string[] = [];
    try {
      const exitCode = await runCaseCliV1({
        argv: ["seed-review-work-item", "--artifact-root", artifactRoot],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => output.push(line),
        stderr: (line) => output.push(`ERROR:${line}`),
        fetchImpl: fakeFetch,
      });
      assert.equal(exitCode, 0, output.join("\n"));
      assert.deepEqual(requestedPaths, [
        "/v1/synthetic-case-bundles",
        "/v1/brooks-decisions",
      ]);
      const result = JSON.parse(output.at(-1)!) as {
        readonly mutations: Readonly<Record<string, string>>;
        readonly reviewState: string;
      };
      assert.deepEqual(result.mutations, {
        caseBundle: "inserted",
        brooksDecision: "inserted",
      });
      assert.equal(result.reviewState, "awaiting_assessment");
      assert.equal((await readdir(artifactRoot)).length, 2);
    } finally {
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });

  it("rejects an invalid chart response before creating an output file", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "pa-phase2-cli-download-"));
    const outputPath = resolve(root, "invalid.png");
    const output: string[] = [];
    const fakeFetch = (async (_input, init) => {
      assert.equal(init?.redirect, "error");
      return new Response(Buffer.from("not-a-png"), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }) as typeof fetch;
    try {
      const exitCode = await runCaseCliV1({
        argv: [
          "get-chart",
          `sha256:${"a".repeat(64)}`,
          "--output",
          outputPath,
        ],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => output.push(line),
        stderr: (line) => output.push(`ERROR:${line}`),
        fetchImpl: fakeFetch,
      });
      assert.equal(exitCode, 1);
      assert.match(output.join("\n"), /not a valid Phase 2 anonymous PNG/);
      await assert.rejects(() => readFile(outputPath), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
