import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  createCaseStore,
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "@pa-agent-lab/case-store";
import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
} from "@pa-agent-lab/case-store/migration-runner-v1";
import { canonicalHash, createDoctrineProposalBundle } from "@pa-agent-lab/contracts";
import { makePhase3ReviewWorkflowFixture } from "../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
import { makePhase3bDoctrineApprovalFixture } from "../../persistence-contracts/test/fixtures/phase3b-doctrine-approval-v1.fixture.ts";
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
const operatorToken = "phase3b-operator-token-0123456789abcdef";
const reviewerToken = "phase3b-reviewer-token-0123456789abcdef";
const baseHeaders = { host: "127.0.0.1", origin: "http://127.0.0.1", "content-type": "application/json" } as const;
const operatorHeaders = { ...baseHeaders, authorization: `Bearer ${operatorToken}` } as const;
const reviewerHeaders = { ...baseHeaders, authorization: `Bearer ${reviewerToken}` } as const;

describe("Phase 3B Doctrine approval REST workflow", () => {
  it("requires an exact proposal allowlist and binds Calvin or Agent principals", async () => {
    const fixture = makePhase3bDoctrineApprovalFixture();
    const second = createDoctrineProposalBundle({
      source: fixture.proposal.source,
      doctrineUnit: {
        ...fixture.proposal.doctrineUnit,
        doctrineId: "du:pilot:breakout-needs-context-agent-copy",
      },
      sourceLocator: fixture.proposal.sourceLocator,
    });
    const { proposalHash: _proposalHash, ...validProposalBody } = fixture.proposal;
    const invalidProposalBody = {
      ...validProposalBody,
      source: { ...fixture.proposal.source, title: "" },
    };
    const invalidProposal = {
      ...invalidProposalBody,
      proposalHash: canonicalHash(invalidProposalBody),
    };
    const harness = await createHarness([
      fixture.proposal.proposalHash,
      second.proposalHash,
      invalidProposal.proposalHash,
    ]);
    try {
      const reviewerInsert = await harness.app.inject({ method: "POST", url: "/v1/doctrine/proposals", headers: reviewerHeaders, payload: JSON.stringify(fixture.proposal) });
      assert.equal(reviewerInsert.statusCode, 401, reviewerInsert.body);

      const forged = { ...fixture.proposal, proposalHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
      const unauthorized = await harness.app.inject({ method: "POST", url: "/v1/doctrine/proposals", headers: operatorHeaders, payload: JSON.stringify(forged) });
      assert.equal(unauthorized.statusCode, 403, unauthorized.body);

      const invalid = await harness.app.inject({
        method: "POST",
        url: "/v1/doctrine/proposals",
        headers: operatorHeaders,
        payload: JSON.stringify(invalidProposal),
      });
      assert.equal(invalid.statusCode, 422, invalid.body);
      assert.equal(invalid.json().code, "INVALID_RECORD");

      for (const proposal of [fixture.proposal, second]) {
        const inserted = await harness.app.inject({ method: "POST", url: "/v1/doctrine/proposals", headers: operatorHeaders, payload: JSON.stringify(proposal) });
        assert.equal(inserted.statusCode, 201, inserted.body);
      }

      const queue = await harness.app.inject({ method: "GET", url: "/v1/doctrine/proposals", headers: reviewerHeaders });
      assert.equal(queue.statusCode, 200, queue.body);
      assert.equal(queue.headers["cache-control"], "no-store");
      assert.equal(queue.json().items.length, 2);

      const calvinApproval = await harness.app.inject({
        method: "POST",
        url: `/v1/doctrine/proposals/${encodeURIComponent(fixture.proposal.doctrineUnit.doctrineId)}/approve`,
        headers: reviewerHeaders,
        payload: JSON.stringify({ proposalHash: fixture.proposal.proposalHash }),
      });
      assert.equal(calvinApproval.statusCode, 201, calvinApproval.body);
      assert.equal(calvinApproval.json().workItem.approval.approverPrincipal, "local:calvin-reviewer");

      const agentApproval = await harness.app.inject({
        method: "POST",
        url: `/v1/doctrine/proposals/${encodeURIComponent(second.doctrineUnit.doctrineId)}/approve`,
        headers: operatorHeaders,
        payload: JSON.stringify({ proposalHash: second.proposalHash }),
      });
      assert.equal(agentApproval.statusCode, 201, agentApproval.body);
      assert.equal(agentApproval.json().workItem.approval.approverPrincipal, "local:phase2-operator");

      const forgedPrincipal = await harness.app.inject({
        method: "POST",
        url: `/v1/doctrine/proposals/${encodeURIComponent(second.doctrineUnit.doctrineId)}/approve`,
        headers: operatorHeaders,
        payload: JSON.stringify({ proposalHash: second.proposalHash, approverPrincipal: "local:calvin-reviewer" }),
      });
      assert.equal(forgedPrincipal.statusCode, 422, forgedPrincipal.body);

      const blankRetirement = await harness.app.inject({
        method: "POST",
        url: `/v1/doctrine/proposals/${encodeURIComponent(fixture.proposal.doctrineUnit.doctrineId)}/retire`,
        headers: reviewerHeaders,
        payload: JSON.stringify({
          approvalHash: calvinApproval.json().resourceHash,
          reason: "   ",
        }),
      });
      assert.equal(blankRetirement.statusCode, 422, blankRetirement.body);
      assert.equal(blankRetirement.json().code, "INVALID_RECORD");

      const retired = await harness.app.inject({
        method: "POST",
        url: `/v1/doctrine/proposals/${encodeURIComponent(fixture.proposal.doctrineUnit.doctrineId)}/retire`,
        headers: reviewerHeaders,
        payload: JSON.stringify({ approvalHash: calvinApproval.json().resourceHash, reason: "Superseded by corrected wording." }),
      });
      assert.equal(retired.statusCode, 201, retired.body);
      assert.equal(retired.json().workItem.status, "retired");
    } finally {
      await harness.close();
    }
  });
});

async function createHarness(authorizedDoctrineProposalHashes: readonly `sha256:${string}`[]) {
  const db = new PGlite();
  await applyContentHashedMigrations(db, migrations);
  const store = createCaseStore(makeDatabase(db));
  const artifactRoot = await mkdtemp(resolve(tmpdir(), "pa-phase3b-api-artifacts-"));
  const app = await createCaseApiV1({
    store,
    artifactRoot,
    localToken: operatorToken,
    reviewerToken,
    authorizedSyntheticBundleHashes: [makePhase3ReviewWorkflowFixture().caseBundle.bundleHash],
    authorizedDoctrineProposalHashes,
    allowedHosts: ["127.0.0.1"],
    allowedOrigins: ["http://127.0.0.1"],
  });
  return {
    app,
    close: async () => {
      await app.close();
      await db.close();
      await rm(artifactRoot, { recursive: true, force: true });
    },
  } as const;
}

function makeDatabase(db: PGliteDatabase): CaseStoreDatabaseV1 {
  return {
    query: (sql, params) => db.query(sql, params),
    transaction: async (work) => {
      await db.exec("BEGIN;");
      const client: CaseStoreDatabaseClientV1 = { query: (sql, params) => db.query(sql, params) };
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
