import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import pg from "pg";

import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  createDoctrineCorpusRollbackActivation,
  createDoctrineRetirement,
  type ContractSha256,
  type DoctrineCorpusActivationV1,
  type DoctrineCorpusRollbackActivationV1,
} from "@pa-agent-lab/contracts";
import {
  bootstrapPhase2DatabaseV1,
  createPostgresCaseStoreV1,
} from "../src/index.ts";
import { makePhase3ReviewWorkflowFixture } from "../../persistence-contracts/test/fixtures/phase3a-review-workflow-v1.fixture.ts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const adminUrl = process.env.PA_PHASE2_POSTGRES_ADMIN_URL;

describe("real PostgreSQL Phase 5A and Phase 5B1 integration", () => {
  it(
    "proves migrations, rollback serialization, ownership, and restricted application privileges",
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
        "applied",
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
        "existing",
        "existing",
        "existing",
        "existing",
        "existing",
      ]);

      const applicationUrl = new URL(adminUrl);
      applicationUrl.username = applicationRole;
      applicationUrl.password = applicationPassword;
      const fixture = makePhase3ReviewWorkflowFixture();
      const artifactRoot = await mkdtemp(
        resolve(tmpdir(), "pa-phase5a-postgres-"),
      );
      await persistFixtureCharts(fixture, artifactRoot);
      const handle = createPostgresCaseStoreV1({
        connectionString: applicationUrl.toString(),
        maxConnections: 4,
        doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
        authorizedSyntheticBundleHashes: [fixture.caseBundle.bundleHash],
        artifactRoot,
        promptPackageRoot: resolve(root, "../docs/prompts"),
      });
      const applicationPool = new pg.Pool({
        connectionString: applicationUrl.toString(),
        max: 2,
      });
      try {
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

        const pilotProposals = createPhase3bPilotDoctrineProposalsV1();
        for (const proposal of pilotProposals) {
          await handle.store.appendDoctrineProposal(proposal);
          await handle.store.approveDoctrine(
            proposal.doctrineUnit.doctrineId,
            { proposalHash: proposal.proposalHash },
            "local:phase2-operator",
          );
        }
        const retrievalRun = (await handle.store.createDoctrineIngestionRun({})).run;
        assert.equal(retrievalRun.status, "succeeded");
        const quality = await applicationPool.query<{
          readonly quality_report_hash: `sha256:${string}`;
          readonly status: string;
        }>(
          "SELECT quality_report_hash,status FROM pa_doctrine_quality_reports WHERE run_id=$1",
          [retrievalRun.runId],
        );
        assert.equal(quality.rows[0]?.status, "passed");
        const firstActivationMutation =
          await handle.store.createDoctrineCorpusActivation({
            runId: retrievalRun.runId,
            qualityReportHash: quality.rows[0]!.quality_report_hash,
          });
        const firstActivation = firstActivationMutation.activation;
        assert.equal(firstActivationMutation.status, "inserted");
        assert.equal(
          (
            await handle.store.createDoctrineCorpusActivation({
              runId: retrievalRun.runId,
              qualityReportHash: quality.rows[0]!.quality_report_hash,
            })
          ).status,
          "existing",
        );

        const secondRun = (
          await handle.store.createDoctrineIngestionRun({ attemptIndex: 1 })
        ).run;
        const secondQuality = await applicationPool.query<{
          readonly quality_report_hash: ContractSha256;
        }>(
          "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
          [secondRun.runId],
        );
        const secondActivation = (
          await handle.store.createDoctrineCorpusActivation({
            runId: secondRun.runId,
            qualityReportHash: secondQuality.rows[0]!.quality_report_hash,
          })
        ).activation;
        const firstRollback = await createAndInsertRollback(
          applicationPool,
          firstActivation,
          secondActivation.activationId,
          "Restore prior eligible corpus.",
        );
        assert.equal(
          (await handle.store.getCurrentDoctrineActivation())?.activationId,
          firstRollback.activationId,
        );

        const thirdRun = (
          await handle.store.createDoctrineIngestionRun({ attemptIndex: 2 })
        ).run;
        const thirdQuality = await applicationPool.query<{
          readonly quality_report_hash: ContractSha256;
        }>(
          "SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",
          [thirdRun.runId],
        );
        const thirdActivation = (
          await handle.store.createDoctrineCorpusActivation({
            runId: thirdRun.runId,
            qualityReportHash: thirdQuality.rows[0]!.quality_report_hash,
          })
        ).activation;
        const secondRollback = await createAndInsertRollback(
          applicationPool,
          firstActivation,
          thirdActivation.activationId,
          "Restore prior eligible corpus.",
        );
        assert.notEqual(secondRollback.activationId, firstRollback.activationId);
        assert.ok(secondRollback.activationSequence > firstRollback.activationSequence);
        assert.equal(
          (
            await handle.store.createDoctrineCorpusActivation({
              runId: retrievalRun.runId,
              qualityReportHash: quality.rows[0]!.quality_report_hash,
            })
          ).status,
          "existing",
        );
        assert.equal(
          (await handle.store.getCurrentDoctrineActivation())?.activationId,
          secondRollback.activationId,
        );

        const concurrentAssemblies = await Promise.all([
          handle.store.createPolicyAssembly({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          }),
          handle.store.createPolicyAssembly({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          }),
        ]);
        assert.deepEqual(
          concurrentAssemblies.map(({ status }) => status).sort(),
          ["existing", "inserted"],
        );
        const assembly = concurrentAssemblies[0]!.terminal;
        assert.ok("assemblyId" in assembly);
        assert.equal(assembly.activationKind, "rollback");
        assert.equal(assembly.activationId, secondRollback.activationId);
        assert.equal(assembly.policyInput.doctrine.length, 9);
        assert.equal(
          (await handle.store.getPolicyAssembly(assembly.assemblyId))?.assemblyId,
          assembly.assemblyId,
        );
        const assemblyRelations = await applicationPool.query<{
          readonly phase2_bindings: number;
          readonly assembly_bindings: number;
          readonly doctrine_bindings: number;
        }>(`
          SELECT
            (SELECT count(*)::int FROM pa_case_policy_inputs) AS phase2_bindings,
            (SELECT count(*)::int FROM pa_policy_assembly_bindings) AS assembly_bindings,
            (SELECT count(*)::int FROM pa_policy_assembly_doctrine_bindings)
              AS doctrine_bindings
        `);
        assert.deepEqual(assemblyRelations.rows, [{
          phase2_bindings: 1,
          assembly_bindings: 1,
          doctrine_bindings: 9,
        }]);

        const modelRecordCountsBefore = await applicationPool.query<{
          readonly model_runs: number;
          readonly provider_attempts: number;
          readonly model_run_audits: number;
          readonly brooks_decisions: number;
        }>(`
          SELECT
            (SELECT count(*)::int FROM pa_model_runs) AS model_runs,
            (SELECT count(*)::int FROM pa_provider_attempts) AS provider_attempts,
            (SELECT count(*)::int FROM pa_model_run_audits) AS model_run_audits,
            (SELECT count(*)::int FROM pa_brooks_decisions) AS brooks_decisions
        `);
        const packageActivations = await Promise.all([
          handle.store.activateBrooksPromptPackage(),
          handle.store.activateBrooksPromptPackage(),
        ]);
        assert.deepEqual(
          packageActivations.map(({ status }) => status).sort(),
          ["existing", "inserted"],
        );
        const packageActivation = packageActivations[0]!.activation;
        assert.equal(packageActivation.activationKind, "standard");
        assert.equal(
          (await handle.store.getCurrentBrooksPromptPackageActivation())
            ?.activationId,
          packageActivation.activationId,
        );
        const preparations = await Promise.all([
          handle.store.preparePolicyPayload({ assemblyId: assembly.assemblyId }),
          handle.store.preparePolicyPayload({ assemblyId: assembly.assemblyId }),
        ]);
        assert.deepEqual(
          preparations.map(({ status }) => status).sort(),
          ["existing", "inserted"],
        );
        const preparation = preparations[0]!.preparedPayload;
        assert.equal(preparation.assemblyId, assembly.assemblyId);
        assert.equal(
          preparation.packageActivationId,
          packageActivation.activationId,
        );
        assert.equal(
          (await handle.store.getPreparedPolicyPayload(
            preparation.preparationId,
          ))?.preparationId,
          preparation.preparationId,
        );
        const phase5b1Rows = await applicationPool.query<{
          readonly manifests: number;
          readonly approvals: number;
          readonly activations: number;
          readonly preparations: number;
        }>(`
          SELECT
            (SELECT count(*)::int FROM pa_prompt_package_manifests) AS manifests,
            (SELECT count(*)::int FROM pa_prompt_package_approvals) AS approvals,
            (SELECT count(*)::int FROM pa_prompt_package_activations) AS activations,
            (SELECT count(*)::int FROM pa_prepared_policy_payloads) AS preparations
        `);
        assert.deepEqual(phase5b1Rows.rows, [{
          manifests: 1,
          approvals: 1,
          activations: 1,
          preparations: 1,
        }]);
        assert.deepEqual(
          (await applicationPool.query(`
            SELECT
              (SELECT count(*)::int FROM pa_model_runs) AS model_runs,
              (SELECT count(*)::int FROM pa_provider_attempts) AS provider_attempts,
              (SELECT count(*)::int FROM pa_model_run_audits) AS model_run_audits,
              (SELECT count(*)::int FROM pa_brooks_decisions) AS brooks_decisions
          `)).rows,
          modelRecordCountsBefore.rows,
        );

        const retrieval = await handle.store.queryDoctrine({
          query: "breakout context follow through",
        });
        assert.equal(retrieval.evidence.status, "matched");
        assert.equal(retrieval.evidence.activationId, secondRollback.activationId);
        assert.match(retrieval.evidence.results[0]!.scoreHex, /^[0-9a-f]{8}$/);

        const retirementTarget = pilotProposals[0]!;
        const retirementApproval = await applicationPool.query<{
          readonly approval_hash: ContractSha256;
        }>(
          "SELECT approval_hash FROM pa_doctrine_approvals WHERE doctrine_id=$1",
          [retirementTarget.doctrineUnit.doctrineId],
        );
        const retirement = createDoctrineRetirement({
          proposalHash: retirementTarget.proposalHash,
          approvalHash: retirementApproval.rows[0]!.approval_hash,
          doctrineId: retirementTarget.doctrineUnit.doctrineId,
          retiredByPrincipal: "local:phase2-operator",
          reason: "Concurrent retirement serialization proof.",
        });
        const pendingRollback = createDoctrineCorpusRollbackActivation({
          activationSequence: await allocateActivationSequence(applicationPool),
          replacesActivationId: secondRollback.activationId,
          targetActivation: firstActivation,
          reason: "Must fail after the serialized retirement.",
          operatorPrincipal: "local:phase2-operator",
        });
        const retirementClient = await applicationPool.connect();
        const rollbackClient = await applicationPool.connect();
        try {
          await retirementClient.query("BEGIN");
          await retirementClient.query(
            `INSERT INTO pa_doctrine_retirements
              (retirement_hash,approval_hash,proposal_hash,doctrine_id,
               retired_by_principal,record)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
            [
              retirement.retirementHash,
              retirement.approvalHash,
              retirement.proposalHash,
              retirement.doctrineId,
              retirement.retiredByPrincipal,
              JSON.stringify(retirement),
            ],
          );
          await rollbackClient.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
          const blockedRollback = insertRollbackRow(
            rollbackClient,
            pendingRollback,
          );
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
          await retirementClient.query("COMMIT");
          await blockedRollback;
          await rollbackClient.query("COMMIT");
          const afterRetirementRace = await handle.store.queryDoctrine({
            query: "breakout context follow through",
          });
          assert.equal(afterRetirementRace.evidence.status, "failed");
          assert.deepEqual(afterRetirementRace.evidence.errorCodes, [
            "CORPUS_RETIRED",
          ]);
          const failedAssembly = await handle.store.createPolicyAssembly({
            caseHash: fixture.caseBundle.policyCase.caseHash,
          });
          assert.equal(failedAssembly.status, "inserted");
          assert.ok("failureId" in failedAssembly.terminal);
          assert.deepEqual(failedAssembly.terminal.errorCodes, [
            "ACTIVE_CORPUS_INELIGIBLE",
          ]);
          assert.equal(
            failedAssembly.terminal.activationId,
            pendingRollback.activationId,
          );
          assert.equal(
            (await handle.store.getPolicyAssemblyFailure(
              failedAssembly.terminal.failureId,
            ))?.failureId,
            failedAssembly.terminal.failureId,
          );
        } finally {
          retirementClient.release();
          rollbackClient.release();
        }

        const owner = await applicationPool.query<{
          readonly owner: string;
          readonly current_user: string;
          readonly canonical_json_execute: boolean;
          readonly vector_installed: boolean;
          readonly postgresql_major: number;
          readonly activation_view_select: boolean;
          readonly retirement_lock_execute: boolean;
          readonly assembly_authority_lock_execute: boolean;
          readonly assembly_read_insert: boolean;
          readonly assembly_update: boolean;
          readonly prompt_authority_select: boolean;
          readonly prompt_lock_execute: boolean;
          readonly prompt_read_insert: boolean;
          readonly prompt_update: boolean;
          readonly prepared_read_insert: boolean;
          readonly prepared_update: boolean;
          readonly model_run_insert: boolean;
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
            ) AS vector_installed,
            current_setting('server_version_num')::integer / 10000 AS postgresql_major,
            has_table_privilege(
              current_user,
              'pa_doctrine_activation_authority_v1',
              'SELECT'
            ) AS activation_view_select,
            has_function_privilege(
              current_user,
              'pa_serialize_doctrine_retirement()',
              'EXECUTE'
            ) AS retirement_lock_execute,
            has_function_privilege(
              current_user,
              'pa_serialize_policy_assembly_authority()',
              'EXECUTE'
            ) AS assembly_authority_lock_execute,
            has_table_privilege(
              current_user,
              'pa_policy_assemblies',
              'SELECT,INSERT'
            ) AS assembly_read_insert,
            has_table_privilege(
              current_user,
              'pa_policy_assemblies',
              'UPDATE'
            ) AS assembly_update,
            has_table_privilege(
              current_user,
              'pa_prompt_package_activation_authority_v1',
              'SELECT'
            ) AS prompt_authority_select,
            has_function_privilege(
              current_user,
              'pa_serialize_prompt_package_authority()',
              'EXECUTE'
            ) AS prompt_lock_execute,
            has_table_privilege(
              current_user,
              'pa_prompt_package_activations',
              'SELECT,INSERT'
            ) AS prompt_read_insert,
            has_table_privilege(
              current_user,
              'pa_prompt_package_activations',
              'UPDATE'
            ) AS prompt_update,
            has_table_privilege(
              current_user,
              'pa_prepared_policy_payloads',
              'SELECT,INSERT'
            ) AS prepared_read_insert,
            has_table_privilege(
              current_user,
              'pa_prepared_policy_payloads',
              'UPDATE'
            ) AS prepared_update,
            has_table_privilege(
              current_user,
              'pa_model_runs',
              'INSERT'
            ) AS model_run_insert
          FROM pg_class WHERE relname = 'pa_policy_assemblies'
        `);
        assert.deepEqual(owner.rows, [
          {
            owner: "pa_migrator",
            current_user: applicationRole,
            canonical_json_execute: true,
            vector_installed: false,
            postgresql_major: 18,
            activation_view_select: true,
            retirement_lock_execute: true,
            assembly_authority_lock_execute: true,
            assembly_read_insert: true,
            assembly_update: false,
            prompt_authority_select: true,
            prompt_lock_execute: true,
            prompt_read_insert: true,
            prompt_update: false,
            prepared_read_insert: true,
            prepared_update: false,
            model_run_insert: false,
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
          () => applicationPool.query("UPDATE pa_policy_assemblies SET record = '{}'::jsonb"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("TRUNCATE pa_policy_assembly_failures"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("UPDATE pa_prompt_package_activations SET record = '{}'::jsonb"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("DELETE FROM pa_prepared_policy_payloads"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("TRUNCATE pa_prompt_package_manifests"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("INSERT INTO pa_model_runs DEFAULT VALUES"),
          { message: /permission denied/ },
        );
        await assert.rejects(
          () => applicationPool.query("CREATE TABLE pa_forbidden(id int)"),
          { message: /permission denied/ },
        );
      } finally {
        await applicationPool.end();
        await handle.close();
        await rm(artifactRoot, { recursive: true, force: true });
      }
    },
  );
});

async function persistFixtureCharts(
  fixture: ReturnType<typeof makePhase3ReviewWorkflowFixture>,
  artifactRoot: string,
): Promise<void> {
  for (const chart of [fixture.charts.context, fixture.charts.detail]) {
    await writeFile(
      resolve(
        artifactRoot,
        `${chart.contentHash.slice("sha256:".length)}.png`,
      ),
      Buffer.from(chart.pngBase64, "base64"),
      { flag: "wx" },
    );
  }
}

interface RollbackSqlClientV1 {
  query<T = unknown>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
}

async function allocateActivationSequence(
  client: RollbackSqlClientV1,
): Promise<number> {
  const result = await client.query<{ readonly sequence: number }>(
    "SELECT nextval('pa_doctrine_corpus_activation_sequence_seq')::int AS sequence",
  );
  return result.rows[0]!.sequence;
}

async function createAndInsertRollback(
  client: RollbackSqlClientV1,
  targetActivation: DoctrineCorpusActivationV1,
  replacesActivationId: ContractSha256,
  reason: string,
): Promise<DoctrineCorpusRollbackActivationV1> {
  const rollback = createDoctrineCorpusRollbackActivation({
    activationSequence: await allocateActivationSequence(client),
    replacesActivationId,
    targetActivation,
    reason,
    operatorPrincipal: "local:phase2-operator",
  });
  await insertRollbackRow(client, rollback);
  return rollback;
}

async function insertRollbackRow(
  client: RollbackSqlClientV1,
  rollback: DoctrineCorpusRollbackActivationV1,
): Promise<void> {
  await client.query(
    `INSERT INTO pa_doctrine_corpus_activations
      (activation_sequence,activation_id,activation_kind,run_id,snapshot_id,
       profile_hash,quality_report_hash,operator_principal,target_activation_id,
       replaces_activation_id,reason_hash,record)
     VALUES ($1,$2,'rollback',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
    [
      rollback.activationSequence,
      rollback.activationId,
      rollback.runId,
      rollback.snapshotId,
      rollback.profileHash,
      rollback.qualityReportHash,
      rollback.operatorPrincipal,
      rollback.targetActivationId,
      rollback.replacesActivationId,
      rollback.reasonHash,
      JSON.stringify(rollback),
    ],
  );
}
