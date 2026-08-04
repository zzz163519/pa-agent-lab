import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  applyContentHashedMigrations,
  createCaseStore,
  loadContentHashedMigrations,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "@pa-agent-lab/case-store";
import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
  type ContractSha256,
} from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import {
  createPhase2SyntheticFixtureV1,
  persistPhase2SyntheticFixtureChartsV1,
} from "../../case-cli/src/synthetic-fixture-v1.ts";
import { createCaseApiV1 } from "../src/case-api-v1.ts";
import { readFileSync } from "node:fs";

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
const operatorToken = "phase5b1-operator-token-0123456789abcdef";
const reviewerToken = "phase5b1-reviewer-token-0123456789abcdef";
const operatorHeaders = {
  host: "127.0.0.1",
  origin: "http://127.0.0.1",
  authorization: `Bearer ${operatorToken}`,
  "content-type": "application/json",
} as const;

describe("Phase 5B1 Prompt Package API", () => {
  it("serves only strict operator activation and offline preparation routes", async () => {
    const fixture = createPhase2SyntheticFixtureV1();
    const harness = await createHarness(fixture.caseBundle.bundleHash);
    try {
      await persistPhase2SyntheticFixtureChartsV1(harness.artifactRoot);
      await harness.store.appendSyntheticCaseBundle(fixture.caseBundle);
      await activatePilotCorpus(harness);
      const assembly = (
        await harness.store.createPolicyAssembly({
          caseHash: fixture.caseBundle.policyCase.caseHash,
        })
      ).terminal;
      assert.ok("assemblyId" in assembly);

      const denied = await harness.app.inject({
        method: "POST",
        url: "/v1/prompt-package-activations",
        headers: {
          ...operatorHeaders,
          authorization: `Bearer ${reviewerToken}`,
        },
        payload: "{}",
      });
      assert.equal(denied.statusCode, 401, denied.body);
      const widened = await harness.app.inject({
        method: "POST",
        url: "/v1/prompt-package-activations",
        headers: operatorHeaders,
        payload: JSON.stringify({ packageHash: `sha256:${"a".repeat(64)}` }),
      });
      assert.equal(widened.statusCode, 422, widened.body);
      const activated = await harness.app.inject({
        method: "POST",
        url: "/v1/prompt-package-activations",
        headers: operatorHeaders,
        payload: "{}",
      });
      assert.equal(activated.statusCode, 201, activated.body);
      assert.equal(activated.json().activationKind, "standard");
      const repeatedActivation = await harness.app.inject({
        method: "POST",
        url: "/v1/prompt-package-activations",
        headers: operatorHeaders,
        payload: "{}",
      });
      assert.equal(repeatedActivation.statusCode, 200, repeatedActivation.body);
      const current = await harness.app.inject({
        method: "GET",
        url: "/v1/prompt-package-activations/current",
        headers: operatorHeaders,
      });
      assert.equal(current.statusCode, 200, current.body);
      assert.equal(current.json().activationId, activated.json().activationId);

      const invalidRollback = await harness.app.inject({
        method: "POST",
        url: "/v1/prompt-package-rollback-activations",
        headers: operatorHeaders,
        payload: JSON.stringify({
          targetActivationId: activated.json().activationId,
          reason: "Current is not an earlier rollback target.",
        }),
      });
      assert.equal(invalidRollback.statusCode, 422, invalidRollback.body);

      const prepared = await harness.app.inject({
        method: "POST",
        url: "/v1/prepared-policy-payloads",
        headers: operatorHeaders,
        payload: JSON.stringify({ assemblyId: assembly.assemblyId }),
      });
      assert.equal(prepared.statusCode, 201, prepared.body);
      assert.equal(prepared.json().assemblyId, assembly.assemblyId);
      assert.equal("modelRunId" in prepared.json(), false);
      assert.equal("decisionHash" in prepared.json(), false);
      const repeated = await harness.app.inject({
        method: "POST",
        url: "/v1/prepared-policy-payloads",
        headers: operatorHeaders,
        payload: JSON.stringify({ assemblyId: assembly.assemblyId }),
      });
      assert.equal(repeated.statusCode, 200, repeated.body);
      const readback = await harness.app.inject({
        method: "GET",
        url: `/v1/prepared-policy-payloads/${prepared.json().preparationId}`,
        headers: operatorHeaders,
      });
      assert.equal(readback.statusCode, 200, readback.body);
      assert.deepEqual(readback.json(), prepared.json());

      for (const path of [
        "/v1/provider-responses",
        "/v1/model-runs",
        "/v1/prompt-package-approvals",
        "/console/prepared-policy-payloads",
      ]) {
        const absent = await harness.app.inject({
          method: "POST",
          url: path,
          headers: operatorHeaders,
          payload: "{}",
        });
        assert.equal(absent.statusCode, 404, `${path}: ${absent.body}`);
      }
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(authorizedBundleHash: ContractSha256) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase5b1-api-"));
  const database = makeDatabase(db);
  const promptPackage = verifyBrooksPromptPackageArtifacts({
    promptBytes: readFileSync(
      new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url),
    ),
    responseSchemaBytes: readFileSync(
      new URL(
        "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
        import.meta.url,
      ),
    ),
    manifest: JSON.parse(readFileSync(
      new URL("../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json", import.meta.url),
      "utf8",
    )) as BrooksPromptPackageManifestV1,
    approval: JSON.parse(readFileSync(
      new URL(
        "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json",
        import.meta.url,
      ),
      "utf8",
    )) as BrooksPromptPackageApprovalV1,
  });
  const store = createCaseStore(database, {
    doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
    authorizedSyntheticBundleHashes: [authorizedBundleHash],
    validateChartArtifact: async () => undefined,
    loadPromptPackageArtifacts: async () => promptPackage,
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
  const report = await harness.db.query<{ readonly quality_report_hash: ContractSha256 }>(
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
