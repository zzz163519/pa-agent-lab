import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import { canonicalHash } from "@pa-agent-lab/contracts";

import { makePhase3ReviewWorkflowFixture } from "./fixtures/phase3a-review-workflow-v1.fixture.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as {
  readonly PGlite: new () => PGliteDatabase;
};

interface PGliteDatabase {
  query<T extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let db: PGliteDatabase;

before(async () => {
  db = new PGlite();
  await applyMigrations(db);
});

after(async () => db.close());

describe("Phase 3A blind review PostgreSQL constraints", () => {
  it("persists one exact assessment, reveal receipt, review, and binding chain", async () => {
    const fixture = makePhase3ReviewWorkflowFixture();
    await insertPhase2Parents(fixture);
    await insertAssessment(fixture);
    await insertReceipt(fixture);
    await insertReview(fixture);
    await insertBinding(fixture);

    const counts = await db.query<{
      assessments: number;
      receipts: number;
      bindings: number;
    }>(`SELECT
      (SELECT count(*)::int FROM pa_calvin_independent_assessments) AS assessments,
      (SELECT count(*)::int FROM pa_decision_reveal_receipts) AS receipts,
      (SELECT count(*)::int FROM pa_calvin_review_workflow_bindings) AS bindings`);
    assert.deepEqual(counts.rows, [{ assessments: 1, receipts: 1, bindings: 1 }]);
  });

  it("rejects reveal and binding rows that do not match the exact parent identities", async () => {
    const fixture = makePhase3ReviewWorkflowFixture();
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_decision_reveal_receipts
            (receipt_hash, receipt_id, assessment_hash, assessment_id,
             decision_hash, decision_id, reviewer_principal, protocol_version, record)
           VALUES ($1, 'reveal:broken', $2, $3, $4, $5,
                   'local:calvin-reviewer', 'calvin-review-workflow.v1', $6::jsonb)`,
          [
            `sha256:${"f".repeat(64)}`,
            fixture.assessment.assessmentHash,
            fixture.assessment.assessmentId,
            `sha256:${"e".repeat(64)}`,
            fixture.decision.decisionId,
            JSON.stringify({ ...fixture.revealReceipt, receiptId: "reveal:broken" }),
          ],
        ),
      { message: /foreign key constraint|check constraint/ },
    );
  });

  it("rejects extra keys, forged hashes, false cutoffs, and verdict disagreement", async () => {
    const isolated = new PGlite();
    try {
      await applyMigrations(isolated);
      const fixture = makePhase3ReviewWorkflowFixture();
      await insertPhase2Parents(fixture, isolated);

      const { assessmentHash: _assessmentHash, ...assessmentBody } =
        fixture.assessment;
      const assessmentWithExtraBody = {
        ...assessmentBody,
        unauthorizedDecisionContent: "must not persist",
      };
      await assert.rejects(
        () =>
          insertAssessment(fixture, isolated, {
            ...assessmentWithExtraBody,
            assessmentHash: canonicalHash(assessmentWithExtraBody),
          }),
        { message: /check constraint/ },
      );

      const falseCutoffBody = {
        ...assessmentBody,
        assessmentId: `${assessmentBody.assessmentId}:false-cutoff`,
        lastVisibleBarId: "bar:false-cutoff",
      };
      await assert.rejects(
        () =>
          insertAssessment(fixture, isolated, {
            ...falseCutoffBody,
            assessmentHash: canonicalHash(falseCutoffBody),
          }),
        { message: /foreign key constraint/ },
      );
      await assert.rejects(
        () =>
          insertAssessment(fixture, isolated, {
            ...fixture.assessment,
            assessmentHash: `sha256:${"f".repeat(64)}`,
          }),
        { message: /check constraint/ },
      );
      await insertAssessment(fixture, isolated);

      const { receiptHash: _receiptHash, ...receiptBody } = fixture.revealReceipt;
      const receiptWithExtraBody = { ...receiptBody, unauthorized: true };
      await assert.rejects(
        () =>
          insertReceipt(fixture, isolated, {
            ...receiptWithExtraBody,
            receiptHash: canonicalHash(receiptWithExtraBody),
          }),
        { message: /check constraint/ },
      );
      await insertReceipt(fixture, isolated);
      await insertReview(fixture, isolated);

      const { bindingHash: _bindingHash, ...bindingBody } =
        fixture.workflowBinding;
      const bindingWithExtraBody = { ...bindingBody, unauthorized: true };
      await assert.rejects(
        () =>
          insertBinding(fixture, isolated, {
            ...bindingWithExtraBody,
            bindingHash: canonicalHash(bindingWithExtraBody),
          }),
        { message: /check constraint/ },
      );
      await assert.rejects(
        () =>
          insertBinding(
            fixture,
            isolated,
            fixture.workflowBinding,
            fixture.assessment.independentVerdict === "short"
              ? "long"
              : "short",
          ),
        { message: /foreign key constraint/ },
      );
    } finally {
      await isolated.close();
    }
  });

  it("installs update, delete, and truncate protection on all workflow tables", async () => {
    const rows = await db.query<{ table_name: string; trigger_count: number }>(`
      SELECT relation.relname AS table_name, count(*)::int AS trigger_count
      FROM pg_trigger AS trigger
      JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
      WHERE NOT trigger.tgisinternal
        AND relation.relname IN (
          'pa_calvin_independent_assessments',
          'pa_decision_reveal_receipts',
          'pa_calvin_review_workflow_bindings'
        )
      GROUP BY relation.relname
      ORDER BY relation.relname`);
    assert.deepEqual(rows.rows, [
      { table_name: "pa_calvin_independent_assessments", trigger_count: 2 },
      { table_name: "pa_calvin_review_workflow_bindings", trigger_count: 2 },
      { table_name: "pa_decision_reveal_receipts", trigger_count: 2 },
    ]);
    await assert.rejects(
      () => db.exec("UPDATE pa_calvin_independent_assessments SET record = '{}'::jsonb"),
      { message: /immutable table pa_calvin_independent_assessments/ },
    );
    await assert.rejects(
      () => db.exec("DELETE FROM pa_decision_reveal_receipts"),
      { message: /immutable table pa_decision_reveal_receipts/ },
    );
    await assert.rejects(
      () => db.exec("TRUNCATE pa_calvin_review_workflow_bindings"),
      { message: /immutable table pa_calvin_review_workflow_bindings/ },
    );
  });
});

type Fixture = ReturnType<typeof makePhase3ReviewWorkflowFixture>;

async function applyMigrations(target: PGliteDatabase): Promise<void> {
  for (const migration of [
    "0001_phase1_immutable_records_v1.sql",
    "0002_phase2_decision_review_records_v1.sql",
    "0003_phase3a_blind_review_workflow_v1.sql",
  ]) {
    await target.exec(await readFile(resolve(packageRoot, "sql", migration), "utf8"));
  }
}

async function insertPhase2Parents(
  fixture: Fixture,
  target: PGliteDatabase = db,
): Promise<void> {
  const policyCase = fixture.caseBundle.policyCase;
  const input = fixture.caseBundle.policyInput;
  await target.query(
    `INSERT INTO pa_policy_cases
      (case_hash, case_id, policy_stream_id, last_visible_bar_id,
       decision_point_sequence, bar_duration_seconds, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [policyCase.caseHash, policyCase.caseId, policyCase.policyStreamId,
      policyCase.lastVisibleBarId, policyCase.bars.at(-1)!.sequence,
      policyCase.barDurationSeconds, JSON.stringify(policyCase)],
  );
  await target.query(
    `INSERT INTO pa_policy_inputs
      (input_hash, context_content_hash, detail_content_hash, record)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [input.inputHash, input.charts.context.contentHash,
      input.charts.detail.contentHash, JSON.stringify(input)],
  );
  for (const metadata of Object.values(fixture.caseBundle.chartMetadata)) {
    await target.query(
      `INSERT INTO pa_chart_artifact_metadata
        (metadata_id, artifact_id, source_case_hash, anonymous_market_hash,
         panel, renderer_id, renderer_runtime, renderer_platform,
         render_input_hash, content_hash, record)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [metadata.metadataId, metadata.artifactId, metadata.sourceCaseHash,
        metadata.anonymousMarketHash, metadata.panel, metadata.rendererId,
        metadata.rendererRuntime, metadata.rendererPlatform,
        metadata.renderInputHash, metadata.contentHash, JSON.stringify(metadata)],
    );
  }
  await target.query(
    `INSERT INTO pa_case_policy_inputs
      (case_hash, input_hash, context_metadata_id, context_panel,
       context_content_hash, detail_metadata_id, detail_panel, detail_content_hash)
     VALUES ($1, $2, $3, 'context', $4, $5, 'detail', $6)`,
    [policyCase.caseHash, input.inputHash,
      fixture.caseBundle.binding.contextMetadataId, input.charts.context.contentHash,
      fixture.caseBundle.binding.detailMetadataId, input.charts.detail.contentHash],
  );
  await target.query(
    `INSERT INTO pa_brooks_decisions
      (decision_hash, decision_id, case_hash, case_id, input_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [fixture.decision.decisionHash, fixture.decision.decisionId,
      policyCase.caseHash, policyCase.caseId, input.inputHash,
      JSON.stringify(fixture.decision)],
  );
}

async function insertAssessment(
  fixture: Fixture,
  target: PGliteDatabase = db,
  record: Record<string, unknown> = fixture.assessment,
): Promise<void> {
  await target.query(
    `INSERT INTO pa_calvin_independent_assessments
      (assessment_hash, assessment_id, decision_hash, decision_id,
       case_hash, case_id, input_hash, last_visible_bar_id,
       bar_duration_seconds, independent_verdict,
       reviewer_principal, protocol_version, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
    [record.assessmentHash, record.assessmentId, record.brooksDecisionHash,
      record.brooksDecisionId, record.caseHash, record.caseId, record.inputHash,
      record.lastVisibleBarId, record.barDurationSeconds,
      record.independentVerdict, record.reviewerPrincipal,
      record.protocolVersion, JSON.stringify(record)],
  );
}

async function insertReceipt(
  fixture: Fixture,
  target: PGliteDatabase = db,
  record: Record<string, unknown> = fixture.revealReceipt,
): Promise<void> {
  await target.query(
    `INSERT INTO pa_decision_reveal_receipts
      (receipt_hash, receipt_id, assessment_hash, assessment_id,
       decision_hash, decision_id, reviewer_principal, protocol_version, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [record.receiptHash, record.receiptId, record.assessmentHash,
      record.assessmentId, record.brooksDecisionHash, record.brooksDecisionId,
      record.reviewerPrincipal, record.protocolVersion, JSON.stringify(record)],
  );
}

async function insertReview(
  fixture: Fixture,
  target: PGliteDatabase = db,
): Promise<void> {
  const record = fixture.review;
  await target.query(
    `INSERT INTO pa_calvin_reviews
      (review_hash, review_id, decision_hash, decision_id, record)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [record.reviewHash, record.reviewId, record.reviewedDecisionHash,
      record.brooksDecisionId, JSON.stringify(record)],
  );
}

async function insertBinding(
  fixture: Fixture,
  target: PGliteDatabase = db,
  record: Record<string, unknown> = fixture.workflowBinding,
  independentVerdict: string = fixture.assessment.independentVerdict,
): Promise<void> {
  await target.query(
    `INSERT INTO pa_calvin_review_workflow_bindings
      (binding_hash, binding_id, assessment_hash, assessment_id,
       receipt_hash, receipt_id, decision_hash, decision_id,
       review_hash, review_id, independent_verdict,
       reviewer_principal, protocol_version, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
    [record.bindingHash, record.bindingId, record.assessmentHash,
      record.assessmentId, record.revealReceiptHash, record.revealReceiptId,
      record.brooksDecisionHash, record.brooksDecisionId,
      record.calvinReviewHash, record.calvinReviewId,
      independentVerdict,
      record.reviewerPrincipal, record.protocolVersion, JSON.stringify(record)],
  );
}
