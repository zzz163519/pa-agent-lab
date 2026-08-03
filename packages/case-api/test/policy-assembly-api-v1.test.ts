import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  applyContentHashedMigrations,
  CaseStoreError,
  createCaseStore,
  createLocalPngArtifactValidatorV1,
  loadContentHashedMigrations,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "@pa-agent-lab/case-store";
import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  type ContractSha256,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import {
  createPhase2SyntheticFixtureV1,
  persistPhase2SyntheticFixtureChartsV1,
} from "../../case-cli/src/synthetic-fixture-v1.ts";
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
const operatorToken = "phase5a-operator-token-0123456789abcdef";
const reviewerToken = "phase5a-reviewer-token-0123456789abcdef";
const operatorHeaders = {
  host: "127.0.0.1",
  origin: "http://127.0.0.1",
  authorization: `Bearer ${operatorToken}`,
  "content-type": "application/json",
} as const;

describe("Phase 5A Policy Assembly API", () => {
  it("serves strict operator-only terminal creation and readback", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await persistPhase2SyntheticFixtureChartsV1(harness.artifactRoot);
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);

      const anonymous = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: {
          host: operatorHeaders.host,
          origin: operatorHeaders.origin,
          "content-type": operatorHeaders["content-type"],
        },
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(anonymous.statusCode, 401, anonymous.body);
      const reviewer = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: {
          ...operatorHeaders,
          authorization: `Bearer ${reviewerToken}`,
        },
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(reviewer.statusCode, 401, reviewer.body);
      const widened = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({
          caseHash: fixture.caseBundle.policyCase.caseHash,
          activationId: `sha256:${"a".repeat(64)}`,
        }),
      });
      assert.equal(widened.statusCode, 422, widened.body);
      const malformed = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: '{"caseHash":',
      });
      assert.equal(malformed.statusCode, 400, malformed.body);
      const missing = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: `sha256:${"e".repeat(64)}` }),
      });
      assert.equal(missing.statusCode, 404, missing.body);

      const failed = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(failed.statusCode, 201, failed.body);
      assert.deepEqual(failed.json().errorCodes, ["ACTIVATION_UNAVAILABLE"]);
      const failureRead = await harness.app.inject({
        method: "GET",
        url: `/v1/policy-assembly-failures/${failed.json().failureId}`,
        headers: operatorHeaders,
      });
      assert.equal(failureRead.statusCode, 200, failureRead.body);
      assert.deepEqual(failureRead.json(), failed.json());
      const repeatedFailure = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(repeatedFailure.statusCode, 200, repeatedFailure.body);

      await activatePilotCorpus(harness);
      const created = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(created.statusCode, 201, created.body);
      assert.equal(created.json().policyInput.doctrine.length, 9);
      const readback = await harness.app.inject({
        method: "GET",
        url: `/v1/policy-assemblies/${created.json().assemblyId}`,
        headers: operatorHeaders,
      });
      assert.equal(readback.statusCode, 200, readback.body);
      assert.deepEqual(readback.json(), created.json());
      const repeated = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(repeated.statusCode, 200, repeated.body);
      assert.equal(repeated.json().assemblyId, created.json().assemblyId);

      const unknownRead = await harness.app.inject({
        method: "GET",
        url: `/v1/policy-assemblies/sha256:${"f".repeat(64)}`,
        headers: operatorHeaders,
      });
      assert.equal(unknownRead.statusCode, 404, unknownRead.body);

      const proposals = createPhase3bPilotDoctrineProposalsV1();
      const conflictApp = await createCaseApiV1({
        store: {
          ...harness.store,
          createPolicyAssembly: async () => {
            throw new CaseStoreError(
              "IDENTITY_CONFLICT",
              "Injected immutable Policy Assembly conflict.",
            );
          },
        },
        artifactRoot: harness.artifactRoot,
        localToken: operatorToken,
        reviewerToken,
        authorizedSyntheticBundleHashes: [fixture.caseBundle.bundleHash],
        authorizedDoctrineProposalHashes: proposals.map(
          (proposal) => proposal.proposalHash,
        ),
        allowedHosts: ["127.0.0.1"],
        allowedOrigins: ["http://127.0.0.1"],
      });
      try {
        const conflict = await conflictApp.inject({
          method: "POST",
          url: "/v1/policy-assemblies",
          headers: operatorHeaders,
          payload: JSON.stringify({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          }),
        });
        assert.equal(conflict.statusCode, 409, conflict.body);
        assert.equal(conflict.json().code, "IDENTITY_CONFLICT");
      } finally {
        await conflictApp.close();
      }

      const noConsoleExpansion = await harness.app.inject({
        method: "GET",
        url: "/console/policy-assemblies",
        headers: operatorHeaders,
      });
      assert.equal(noConsoleExpansion.statusCode, 404, noConsoleExpansion.body);
    } finally {
      await harness.close();
    }
  });

  it("fails closed when a content-addressed chart dependency is missing", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await persistPhase2SyntheticFixtureChartsV1(harness.artifactRoot);
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await activatePilotCorpus(harness);
      await rm(
        resolve(
          harness.artifactRoot,
          `${fixture.caseBundle.chartMetadata.context.contentHash.slice("sha256:".length)}.png`,
        ),
      );
      const response = await harness.app.inject({
        method: "POST",
        url: "/v1/policy-assemblies",
        headers: operatorHeaders,
        payload: JSON.stringify({ caseHash: fixture.caseBundle.policyCase.caseHash }),
      });
      assert.equal(response.statusCode, 503, response.body);
      assert.equal(response.json().code, "DEPENDENCY_UNAVAILABLE");
      const terminalRows = await harness.db.query<{
        readonly assemblies: number;
        readonly failures: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pa_policy_assemblies) AS assemblies,
          (SELECT count(*)::int FROM pa_policy_assembly_failures) AS failures
      `);
      assert.deepEqual(terminalRows.rows, [{ assemblies: 0, failures: 0 }]);
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(authorizedBundleHash: ContractSha256) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase5a-api-"));
  const database = makeDatabase(db);
  const store = createCaseStore(database, {
    doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
    authorizedSyntheticBundleHashes: [authorizedBundleHash],
    validateChartArtifact: createLocalPngArtifactValidatorV1(artifactRoot),
  });
  const proposals = createPhase3bPilotDoctrineProposalsV1();
  const app = await createCaseApiV1({
    store,
    artifactRoot,
    localToken: operatorToken,
    reviewerToken,
    authorizedSyntheticBundleHashes: [authorizedBundleHash],
    authorizedDoctrineProposalHashes: proposals.map(
      (proposal) => proposal.proposalHash,
    ),
    allowedHosts: ["127.0.0.1"],
    allowedOrigins: ["http://127.0.0.1"],
  });
  return {
    db,
    store,
    app,
    artifactRoot,
    close: async () => {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    },
  } as const;
}

async function activatePilotCorpus(
  harness: Awaited<ReturnType<typeof createHarness>>,
): Promise<void> {
  for (const proposal of createPhase3bPilotDoctrineProposalsV1()) {
    await harness.store.appendDoctrineProposal(proposal);
    await harness.store.approveDoctrine(
      proposal.doctrineUnit.doctrineId,
      { proposalHash: proposal.proposalHash },
      "local:phase2-operator",
    );
  }
  const run = (await harness.store.createDoctrineIngestionRun({})).run;
  const report = await harness.db.query<{
    readonly quality_report_hash: ContractSha256;
  }>(
    "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
    [run.runId],
  );
  await harness.store.createDoctrineCorpusActivation({
    runId: run.runId,
    qualityReportHash: report.rows[0]!.quality_report_hash,
  });
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
        const value = await work(client);
        await db.exec("COMMIT;");
        return value;
      } catch (error) {
        await db.exec("ROLLBACK;");
        throw error;
      }
    },
  };
}
