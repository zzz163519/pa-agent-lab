import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import pg from "pg";

import {
  bootstrapPhase2DatabaseV1,
  createPostgresCaseStoreV1,
} from "../src/index.ts";
import { makePhase3ReviewWorkflowFixture } from "../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
import { makePhase3bDoctrineApprovalFixture } from "../../persistence-contracts/test/fixtures/phase3b-doctrine-approval-v1.fixture.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const adminUrl = process.env.PA_PHASE2_POSTGRES_ADMIN_URL;

describe("real PostgreSQL Phase 3B integration", () => {
  it(
    "proves migrations, concurrent idempotency, ownership, and restricted application privileges",
    { skip: adminUrl === undefined },
    async () => {
      assert.ok(adminUrl);
      const applicationRole = "pa_app_integration";
      const applicationPassword = "phase2-integration-password-0123456789abcdef";
      const firstMigration = await bootstrapPhase2DatabaseV1({
        adminConnectionString: adminUrl,
        applicationLoginRole: applicationRole,
        applicationPassword,
        migrationsDirectory: resolve(root, "persistence-contracts/sql"),
        infrastructureDirectory: resolve(root, "../infra/phase2"),
      });
      const secondMigration = await bootstrapPhase2DatabaseV1({
        adminConnectionString: adminUrl,
        applicationLoginRole: applicationRole,
        applicationPassword,
        migrationsDirectory: resolve(root, "persistence-contracts/sql"),
        infrastructureDirectory: resolve(root, "../infra/phase2"),
      });
      assert.deepEqual(firstMigration.map(({ status }) => status), [
        "applied",
        "applied",
        "applied",
        "applied",
      ]);
      assert.deepEqual(secondMigration.map(({ status }) => status), [
        "existing",
        "existing",
        "existing",
        "existing",
      ]);

      const applicationUrl = new URL(adminUrl);
      applicationUrl.username = applicationRole;
      applicationUrl.password = applicationPassword;
      const handle = createPostgresCaseStoreV1({
        connectionString: applicationUrl.toString(),
        maxConnections: 4,
      });
      const applicationPool = new pg.Pool({
        connectionString: applicationUrl.toString(),
        max: 2,
      });
      try {
        const fixture = makePhase3ReviewWorkflowFixture();
        const concurrent = await Promise.all([
          handle.store.appendSyntheticCaseBundle(fixture.caseBundle),
          handle.store.appendSyntheticCaseBundle(fixture.caseBundle),
        ]);
        assert.deepEqual(
          concurrent.map(({ status }) => status).sort(),
          ["existing", "inserted"],
        );
        await handle.store.appendBrooksDecision(fixture.decision);
        const initial = await handle.store.getReviewWorkItem(
          fixture.caseBundle.policyCase.caseHash,
        );
        assert.ok(initial);
        await handle.store.appendIndependentAssessment({
          caseHash: fixture.caseBundle.policyCase.caseHash,
          draftIdentityHash: initial.draftIdentityHash,
          independentVerdict: fixture.assessment.independentVerdict,
          blindSummary: fixture.assessment.blindSummary,
        });
        const assessed = await handle.store.getReviewWorkItem(
          fixture.caseBundle.policyCase.caseHash,
        );
        assert.ok(assessed?.assessment);
        await handle.store.appendDecisionRevealReceipt(
          fixture.caseBundle.policyCase.caseHash,
          { assessmentHash: assessed.assessment.assessmentHash },
        );
        const revealed = await handle.store.getReviewWorkItem(
          fixture.caseBundle.policyCase.caseHash,
        );
        assert.ok(revealed?.assessment && revealed.revealReceipt);
        await handle.store.appendFinalReview({
          caseHash: fixture.caseBundle.policyCase.caseHash,
          assessmentHash: revealed.assessment.assessmentHash,
          revealReceiptHash: revealed.revealReceipt.receiptHash,
          disposition: fixture.review.disposition,
          summary: fixture.review.summary!,
        });
        assert.equal(
          (await handle.store.getReviewWorkItem(
            fixture.caseBundle.policyCase.caseHash,
          ))?.state,
          "completed",
        );
        assert.equal(
          (await handle.store.getCaseAudit(fixture.caseBundle.policyCase.caseHash))
            ?.review?.independentVerdict,
          fixture.review.independentVerdict,
        );

        const doctrine = makePhase3bDoctrineApprovalFixture();
        await handle.store.appendDoctrineProposal(doctrine.proposal);
        const doctrineApproval = await handle.store.approveDoctrine(
          doctrine.proposal.doctrineUnit.doctrineId,
          { proposalHash: doctrine.proposal.proposalHash },
          "local:phase2-operator",
        );
        await handle.store.retireDoctrine(
          doctrine.proposal.doctrineUnit.doctrineId,
          {
            approvalHash: doctrineApproval.resourceHash,
            reason: doctrine.retirement.reason,
          },
          "local:calvin-reviewer",
        );
        assert.equal(
          (await handle.store.getDoctrineWorkItem(
            doctrine.proposal.doctrineUnit.doctrineId,
          ))?.status,
          "retired",
        );

        const owner = await applicationPool.query<{
          readonly owner: string;
          readonly current_user: string;
          readonly canonical_json_execute: boolean;
          readonly vector_installed: boolean;
        }>(`
          SELECT
            pg_get_userbyid(relowner) AS owner,
            current_user,
            has_function_privilege(
              current_user,
              'pa_canonical_json(jsonb)',
              'EXECUTE'
            ) AS canonical_json_execute,
            EXISTS (
              SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) AS vector_installed
          FROM pg_class WHERE relname = 'pa_doctrine_proposals'
        `);
        assert.deepEqual(owner.rows, [
          {
            owner: "pa_migrator",
            current_user: applicationRole,
            canonical_json_execute: true,
            vector_installed: false,
          },
        ]);
        await assert.rejects(
          () => applicationPool.query("UPDATE pa_doctrine_proposals SET record = '{}'::jsonb"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("DELETE FROM pa_policy_cases"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("TRUNCATE pa_policy_cases"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("CREATE TABLE pa_forbidden(id int)"),
          { message: /permission denied/ },
        );
      } finally {
        await applicationPool.end();
        await handle.close();
      }
    },
  );
});
