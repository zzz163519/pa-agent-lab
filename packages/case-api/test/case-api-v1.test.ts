import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
import { CASE_API_BODY_LIMIT_BYTES } from "@pa-agent-lab/persistence-contracts";

import { createCaseApiV1 } from "../src/case-api-v1.ts";
import { makePhase2CaseStoreFixture } from "../../persistence-contracts/test/fixtures/phase2-case-store-v1.fixture.ts";

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
const localToken = "phase2-local-token-0123456789abcdef";
const reviewerToken = "phase3a-reviewer-token-0123456789abcdef";

function authorizedHeaders() {
  return {
    authorization: `Bearer ${localToken}`,
    host: "127.0.0.1",
    origin: "http://127.0.0.1",
    "content-type": "application/json",
  } as const;
}

describe("Phase 2 local Case REST API", () => {
  it("requires the local principal while leaving health and readiness bounded", async () => {
    const harness = await createHarness();
    try {
      const health = await harness.app.inject({ method: "GET", url: "/healthz" });
      const ready = await harness.app.inject({ method: "GET", url: "/readyz" });
      assert.deepEqual(health.json(), { status: "ok" });
      assert.deepEqual(ready.json(), { status: "ready" });

      const denied = await harness.app.inject({
        method: "GET",
        url: `/v1/cases/${"sha256:" + "a".repeat(64)}`,
        headers: { host: "127.0.0.1" },
      });
      assert.equal(denied.statusCode, 401);
      assert.equal(denied.json().code, "UNAUTHORIZED");

      const foreignHost = await harness.app.inject({
        method: "GET",
        url: "/healthz",
        headers: { host: "attacker.example" },
      });
      assert.equal(foreignHost.statusCode, 403);
      assert.equal(foreignHost.json().code, "FORBIDDEN");
    } finally {
      await harness.close();
    }
  });

  it("strictly parses one complete bundle and keeps retries idempotent", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase2CaseStoreFixture();
      await persistAnonymousChartArtifacts(fixture.charts, harness.artifactRoot);
      const payload = JSON.stringify(fixture.caseBundle);
      const first = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload,
      });
      const second = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload,
      });
      assert.equal(first.statusCode, 201, first.body);
      assert.equal(first.json().status, "inserted");
      assert.equal(second.statusCode, 200, second.body);
      assert.equal(second.json().status, "existing");

      const duplicate = payload.replace(
        '"sourceScope":',
        '"sourceScope":"synthetic_fixture_only","sourceScope":',
      );
      const duplicateResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: duplicate,
      });
      assert.equal(duplicateResponse.statusCode, 400);
      assert.equal(duplicateResponse.json().code, "INVALID_JSON");
      const nestedDuplicate = payload.replace(
        '"barId":',
        '"barId":"duplicate","barId":',
      );
      const nestedDuplicateResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: nestedDuplicate,
      });
      assert.equal(nestedDuplicateResponse.statusCode, 400);
      assert.equal(nestedDuplicateResponse.json().code, "INVALID_JSON");

      const injected = JSON.stringify({
        ...fixture.caseBundle,
        futureOutcome: "win",
      });
      const injectedResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: injected,
      });
      assert.equal(injectedResponse.statusCode, 422, injectedResponse.body);
      assert.equal(injectedResponse.json().code, "INVALID_RECORD");

      const unauthorized = makePhase2CaseStoreFixture({
        caseId: "case:unauthorized-synthetic",
        policyStreamId: "stream:unauthorized-synthetic",
        priceOffset: 7,
        identitySuffix: "unauthorized-synthetic",
      });
      const unauthorizedResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: JSON.stringify(unauthorized.caseBundle),
      });
      assert.equal(unauthorizedResponse.statusCode, 403);
      assert.equal(unauthorizedResponse.json().code, "FORBIDDEN");
    } finally {
      await harness.close();
    }
  });

  it("appends semantic records, derives audit, and serves validated PNG bytes", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase2CaseStoreFixture();
      const persisted = await persistAnonymousChartArtifacts(
        fixture.charts,
        harness.artifactRoot,
      );
      const bundleResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: JSON.stringify(fixture.caseBundle),
      });
      assert.equal(bundleResponse.statusCode, 201, bundleResponse.body);
      const decisionResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/brooks-decisions",
        headers: authorizedHeaders(),
        payload: JSON.stringify(fixture.decision),
      });
      const reviewResponse = await harness.app.inject({
        method: "POST",
        url: "/v1/calvin-reviews",
        headers: authorizedHeaders(),
        payload: JSON.stringify(fixture.review),
      });
      assert.equal(decisionResponse.statusCode, 201, decisionResponse.body);
      assert.equal(reviewResponse.statusCode, 201, reviewResponse.body);

      const auditResponse = await harness.app.inject({
        method: "GET",
        url: `/v1/cases/${fixture.caseBundle.policyCase.caseHash}/audit`,
        headers: authorizedHeaders(),
      });
      assert.equal(auditResponse.statusCode, 200, auditResponse.body);
      assert.deepEqual(auditResponse.json().decisionConflict.kinds, [
        "whole_decision_disagreement",
        "verdict_disagreement",
      ]);

      const pngResponse = await harness.app.inject({
        method: "GET",
        url: `/v1/chart-artifacts/${fixture.caseBundle.chartMetadata.context.artifactId}/content`,
        headers: authorizedHeaders(),
      });
      assert.equal(pngResponse.statusCode, 200, pngResponse.body);
      assert.equal(pngResponse.headers["content-type"], "image/png");
      assert.deepEqual(pngResponse.rawPayload, await readFile(persisted.contextPath));
    } finally {
      await harness.close();
    }
  });

  it("rejects missing or corrupt chart bytes before opening a database transaction", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase2CaseStoreFixture();
      const missing = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: JSON.stringify(fixture.caseBundle),
      });
      assert.equal(missing.statusCode, 503, missing.body);
      assert.equal(missing.json().code, "DEPENDENCY_UNAVAILABLE");

      const persisted = await persistAnonymousChartArtifacts(
        fixture.charts,
        harness.artifactRoot,
      );
      await writeFile(persisted.contextPath, Buffer.from("corrupt"));
      const corrupt = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: JSON.stringify(fixture.caseBundle),
      });
      assert.equal(corrupt.statusCode, 503, corrupt.body);
      const counts = await harness.db.query<{ readonly count: number }>(
        "SELECT count(*)::int AS count FROM pa_policy_cases",
      );
      assert.deepEqual(counts.rows, [{ count: 0 }]);
    } finally {
      await harness.close();
    }
  });

  it("rejects oversized bodies and exposes no mutation verbs beyond the manifest", async () => {
    const harness = await createHarness();
    try {
      const oversized = await harness.app.inject({
        method: "POST",
        url: "/v1/synthetic-case-bundles",
        headers: authorizedHeaders(),
        payload: `{"padding":"${"x".repeat(CASE_API_BODY_LIMIT_BYTES)}"}`,
      });
      assert.equal(oversized.statusCode, 413, oversized.body);
      assert.equal(oversized.json().code, "BODY_TOO_LARGE");

      for (const method of ["PATCH", "DELETE"] as const) {
        const response = await harness.app.inject({
          method,
          url: `/v1/cases/${"sha256:" + "a".repeat(64)}`,
          headers: authorizedHeaders(),
        });
        assert.equal(response.statusCode, 404);
        assert.equal(response.json().code, "NOT_FOUND");
      }
    } finally {
      await harness.close();
    }
  });
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
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase2-api-artifacts-"));
  const authorizedFixture = makePhase2CaseStoreFixture();
  const app = await createCaseApiV1({
    store: createCaseStore(database),
    artifactRoot,
    localToken,
    reviewerToken,
    authorizedSyntheticBundleHashes: [authorizedFixture.caseBundle.bundleHash],
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedOrigins: ["http://127.0.0.1"],
  });
  return {
    app,
    db,
    artifactRoot,
    close: async () => {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    },
  } as const;
}
