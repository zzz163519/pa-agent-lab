import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
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
      };
      assert.match(seeded.caseHash, /^sha256:[0-9a-f]{64}$/);
      assert.match(seeded.decisionHash, /^sha256:[0-9a-f]{64}$/);
      assert.match(seeded.reviewHash, /^sha256:[0-9a-f]{64}$/);
      assert.deepEqual(seeded.conflictKinds, ["none"]);
      assert.equal((await readdir(artifactRoot)).filter((name) => name.endsWith(".png")).length, 2);
      assert.doesNotMatch(output.join("\n"), /2025-02|2025-05|2025-08|symbol|venue|outcome/i);

      const auditOutput: string[] = [];
      const auditExit = await runCaseCliV1({
        argv: ["get-audit", seeded.caseHash, "--api-url", address],
        env: { PA_API_TOKEN: localToken },
        stdout: (line) => auditOutput.push(line),
        stderr: (line) => auditOutput.push(`ERROR:${line}`),
      });
      assert.equal(auditExit, 0, auditOutput.join("\n"));
      assert.equal(JSON.parse(auditOutput[0]!).caseHash, seeded.caseHash);
    } finally {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    }
  });
});
