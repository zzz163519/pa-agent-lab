import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import pg from "pg";

import {
  bootstrapPhase2DatabaseV1,
  createPostgresCaseStoreV1,
} from "../src/index.ts";
import { makePhase2CaseStoreFixture } from "../../persistence-contracts/test/fixtures/phase2-case-store-v1.fixture.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const adminUrl = process.env.PA_PHASE2_POSTGRES_ADMIN_URL;

describe("real PostgreSQL Phase 2 integration", () => {
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
      ]);
      assert.deepEqual(secondMigration.map(({ status }) => status), [
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
        const fixture = makePhase2CaseStoreFixture({
          caseId: "case:phase2-real-postgres",
          policyStreamId: "stream:phase2-real-postgres",
          identitySuffix: "phase2-real-postgres",
        });
        const concurrent = await Promise.all([
          handle.store.appendSyntheticCaseBundle(fixture.caseBundle),
          handle.store.appendSyntheticCaseBundle(fixture.caseBundle),
        ]);
        assert.deepEqual(
          concurrent.map(({ status }) => status).sort(),
          ["existing", "inserted"],
        );
        await handle.store.appendBrooksDecision(fixture.decision);
        await handle.store.appendCalvinReview(fixture.review);
        assert.equal(
          (await handle.store.getCaseAudit(fixture.caseBundle.policyCase.caseHash))
            ?.review?.reviewHash,
          fixture.review.reviewHash,
        );

        const owner = await applicationPool.query<{
          readonly owner: string;
          readonly current_user: string;
          readonly vector_installed: boolean;
        }>(`
          SELECT
            pg_get_userbyid(relowner) AS owner,
            current_user,
            EXISTS (
              SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) AS vector_installed
          FROM pg_class WHERE relname = 'pa_policy_cases'
        `);
        assert.deepEqual(owner.rows, [
          {
            owner: "pa_migrator",
            current_user: applicationRole,
            vector_installed: false,
          },
        ]);
        await assert.rejects(
          () => applicationPool.query("UPDATE pa_policy_cases SET record = '{}'::jsonb"),
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
