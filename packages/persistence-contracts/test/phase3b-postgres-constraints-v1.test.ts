import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash, canonicalStringify } from "@pa-agent-lab/contracts";

import { applyContentHashedMigrations, loadContentHashedMigrations } from "../../case-store/src/migration-runner-v1.ts";
import { makePhase3bDoctrineApprovalFixture } from "./fixtures/phase3b-doctrine-approval-v1.fixture.ts";

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
  new URL("../sql", import.meta.url).pathname,
);

describe("Phase 3B Doctrine PostgreSQL constraints", () => {
  it("persists one exact proposal, approval, and retirement chain", async () => {
    const db = new PGlite();
    try {
      await applyContentHashedMigrations(db, migrations);
      const fixture = makePhase3bDoctrineApprovalFixture();
      await insertProposal(db, fixture.proposal);
      await insertApproval(db, fixture.approval);
      await insertRetirement(db, fixture.retirement);
      const counts = await db.query<{ proposals: number; approvals: number; retirements: number }>(`SELECT
        (SELECT count(*)::int FROM pa_doctrine_proposals) AS proposals,
        (SELECT count(*)::int FROM pa_doctrine_approvals) AS approvals,
        (SELECT count(*)::int FROM pa_doctrine_retirements) AS retirements`);
      assert.deepEqual(counts.rows, [{ proposals: 1, approvals: 1, retirements: 1 }]);
    } finally {
      await db.close();
    }
  });

  it("rejects extra keys, forged hashes, and mismatched parent identities", async () => {
    const db = new PGlite();
    try {
      await applyContentHashedMigrations(db, migrations);
      const { proposal, approval } = makePhase3bDoctrineApprovalFixture();
      await assert.rejects(() => insertProposal(db, { ...proposal, injected: true }));
      await assert.rejects(() => insertProposal(db, { ...proposal, proposalHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }));
      const { proposalHash: _proposalHash, ...proposalBody } = proposal;
      const unsafeBody = {
        ...proposalBody,
        source: { ...proposal.source, urlOrLocalRef: "javascript:alert(1)" },
      };
      await assert.rejects(() =>
        insertProposal(db, { ...unsafeBody, proposalHash: canonicalHash(unsafeBody) }),
      );
      await insertProposal(db, proposal);

      const wrongBody = {
        schemaVersion: approval.schemaVersion,
        proposalHash: approval.proposalHash,
        doctrineId: approval.doctrineId,
        sourceId: "source:wrong",
        sourceContentHash: approval.sourceContentHash,
        approverPrincipal: approval.approverPrincipal,
      } as const;
      const wrongApproval = { ...wrongBody, approvalHash: canonicalHash(wrongBody) };
      await assert.rejects(() => insertApproval(db, wrongApproval));
    } finally {
      await db.close();
    }
  });

  it("forbids update, delete, and truncate on every lifecycle table", async () => {
    const db = new PGlite();
    try {
      await applyContentHashedMigrations(db, migrations);
      const fixture = makePhase3bDoctrineApprovalFixture();
      await insertProposal(db, fixture.proposal);
      await insertApproval(db, fixture.approval);
      await insertRetirement(db, fixture.retirement);
      for (const table of ["pa_doctrine_proposals", "pa_doctrine_approvals", "pa_doctrine_retirements"] as const) {
        await assert.rejects(() => db.exec(`UPDATE ${table} SET record = record`));
        await assert.rejects(() => db.exec(`DELETE FROM ${table}`));
        await assert.rejects(() => db.exec(`TRUNCATE ${table}`));
      }
    } finally {
      await db.close();
    }
  });
});

function insertProposal(db: PGliteDatabase, proposal: Record<string, unknown>) {
  const source = proposal.source as { sourceId: string; contentHash: string };
  const doctrine = proposal.doctrineUnit as { doctrineId: string };
  return db.query(
    `INSERT INTO pa_doctrine_proposals
      (proposal_hash, doctrine_id, source_id, source_content_hash, record)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [proposal.proposalHash, doctrine.doctrineId, source.sourceId, source.contentHash, canonicalStringify(proposal)],
  );
}

function insertApproval(db: PGliteDatabase, approval: Record<string, unknown>) {
  return db.query(
    `INSERT INTO pa_doctrine_approvals
      (approval_hash, proposal_hash, doctrine_id, source_id, source_content_hash,
       approver_principal, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [approval.approvalHash, approval.proposalHash, approval.doctrineId, approval.sourceId,
      approval.sourceContentHash, approval.approverPrincipal, canonicalStringify(approval)],
  );
}

function insertRetirement(db: PGliteDatabase, retirement: Record<string, unknown>) {
  return db.query(
    `INSERT INTO pa_doctrine_retirements
      (retirement_hash, approval_hash, proposal_hash, doctrine_id,
       retired_by_principal, record)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [retirement.retirementHash, retirement.approvalHash, retirement.proposalHash,
      retirement.doctrineId, retirement.retiredByPrincipal, canonicalStringify(retirement)],
  );
}
