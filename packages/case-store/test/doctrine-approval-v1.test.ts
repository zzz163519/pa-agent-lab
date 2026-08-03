import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "@pa-agent-lab/contracts";

import { makePhase3bDoctrineApprovalFixture } from "../../persistence-contracts/test/fixtures/phase3b-doctrine-approval-v1.fixture.ts";
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

describe("Phase 3B Doctrine approval Case Store", () => {
  it("appends one authorized proposal and derives draft, approved, then retired", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase3bDoctrineApprovalFixture();
      assert.equal((await harness.store.appendDoctrineProposal(fixture.proposal)).status, "inserted");
      assert.equal((await harness.store.appendDoctrineProposal(fixture.proposal)).status, "existing");
      assert.equal((await harness.store.listDoctrineWorkItems()).items[0]?.status, "draft");
      assert.equal((await harness.store.listApprovedDoctrineUnits()).length, 0);

      const approved = await harness.store.approveDoctrine(
        fixture.proposal.doctrineUnit.doctrineId,
        { proposalHash: fixture.proposal.proposalHash },
        "local:phase2-operator",
      );
      assert.equal(approved.status, "inserted");
      assert.equal((await harness.store.getDoctrineWorkItem(fixture.proposal.doctrineUnit.doctrineId))?.status, "approved");
      assert.equal((await harness.store.listApprovedDoctrineUnits())[0]?.status, "approved");

      const retired = await harness.store.retireDoctrine(
        fixture.proposal.doctrineUnit.doctrineId,
        { approvalHash: approved.resourceHash, reason: fixture.retirement.reason },
        "local:calvin-reviewer",
      );
      assert.equal(retired.status, "inserted");
      assert.equal((await harness.store.getDoctrineWorkItem(fixture.proposal.doctrineUnit.doctrineId))?.status, "retired");
      assert.equal((await harness.store.listApprovedDoctrineUnits()).length, 0);
    } finally {
      await harness.close();
    }
  });

  it("rejects wrong proposal identities and retirement before approval", async () => {
    const harness = await createHarness();
    try {
      const fixture = makePhase3bDoctrineApprovalFixture();
      const { proposalHash: _proposalHash, ...proposalBody } = fixture.proposal;
      const invalidBody = {
        ...proposalBody,
        source: { ...fixture.proposal.source, title: "" },
      };
      await assert.rejects(
        () => harness.store.appendDoctrineProposal({
          ...invalidBody,
          proposalHash: canonicalHash(invalidBody),
        }),
        { name: "CaseStoreError", code: "INTEGRITY_VIOLATION" },
      );
      await harness.store.appendDoctrineProposal(fixture.proposal);
      await assert.rejects(
        () => harness.store.approveDoctrine(
          fixture.proposal.doctrineUnit.doctrineId,
          { proposalHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
          "local:calvin-reviewer",
        ),
        { name: "CaseStoreError", message: /proposal hash/i },
      );
      await assert.rejects(
        () => harness.store.retireDoctrine(
          fixture.proposal.doctrineUnit.doctrineId,
          { approvalHash: fixture.approval.approvalHash, reason: "Not approved." },
          "local:calvin-reviewer",
        ),
        { name: "CaseStoreError", message: /approval.*required/i },
      );
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
  return {
    store: createCaseStore(database),
    close: () => db.close(),
  } as const;
}
