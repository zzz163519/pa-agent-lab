import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import { makePhase2CaseStoreFixture } from "./fixtures/phase2-case-store-v1.fixture.ts";

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
  for (const migration of [
    "0001_phase1_immutable_records_v1.sql",
    "0002_phase2_decision_review_records_v1.sql",
  ]) {
    await db.exec(await readFile(resolve(packageRoot, "sql", migration), "utf8"));
  }
});

after(async () => {
  await db.close();
});

describe("Phase 2 decision and review PostgreSQL constraints", () => {
  it("persists one synthetic Case, BrooksDecision, and CalvinReview without generic label authority", async () => {
    const fixture = makePhase2CaseStoreFixture();
    await insertBundle(fixture.caseBundle);
    await insertDecision(fixture);
    await insertReview(fixture);

    const counts = await db.query<{
      decision_count: number;
      review_count: number;
      labels: string | null;
      commitments: string | null;
      conflicts: string | null;
    }>(`
      SELECT
        (SELECT count(*)::int FROM pa_brooks_decisions) AS decision_count,
        (SELECT count(*)::int FROM pa_calvin_reviews) AS review_count,
        to_regclass('pa_case_labels')::text AS labels,
        to_regclass('pa_case_commitments')::text AS commitments,
        to_regclass('pa_decision_conflicts')::text AS conflicts
    `);
    assert.deepEqual(counts.rows, [{
      decision_count: 1,
      review_count: 1,
      labels: null,
      commitments: null,
      conflicts: null,
    }]);
  });

  it("rejects missing JSON identities and broken decision/review relationships", async () => {
    const fixture = makePhase2CaseStoreFixture();
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_brooks_decisions
            (decision_hash, decision_id, case_hash, case_id, input_hash, record)
           VALUES ($1, 'decision:missing-json', $2, $3, $4, '{}'::jsonb)`,
          [
            fixture.decision.decisionHash,
            fixture.caseBundle.policyCase.caseHash,
            fixture.caseBundle.policyCase.caseId,
            fixture.caseBundle.policyInput.inputHash,
          ],
        ),
      { message: /check constraint/ },
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_calvin_reviews
            (review_hash, review_id, decision_hash, decision_id, record)
           VALUES ($1, 'review:unknown-decision', $2, 'decision:unknown', $3::jsonb)`,
          [
            `sha256:${"f".repeat(64)}`,
            `sha256:${"e".repeat(64)}`,
            JSON.stringify({ ...fixture.review, reviewId: "review:unknown-decision" }),
          ],
        ),
      { message: /foreign key constraint|check constraint/ },
    );
  });

  it("forbids update, delete, and truncate of semantic records", async () => {
    const triggerCounts = await db.query<{
      table_name: string;
      trigger_count: number;
    }>(`
      SELECT relation.relname AS table_name, count(*)::int AS trigger_count
      FROM pg_trigger AS trigger
      JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
      WHERE NOT trigger.tgisinternal
        AND relation.relname IN ('pa_brooks_decisions', 'pa_calvin_reviews')
      GROUP BY relation.relname
      ORDER BY relation.relname
    `);
    assert.deepEqual(triggerCounts.rows, [
      { table_name: "pa_brooks_decisions", trigger_count: 2 },
      { table_name: "pa_calvin_reviews", trigger_count: 2 },
    ]);
    await assert.rejects(
      () => db.exec("UPDATE pa_brooks_decisions SET record = '{}'::jsonb"),
      { message: /immutable table pa_brooks_decisions/ },
    );
    await assert.rejects(
      () => db.exec("DELETE FROM pa_calvin_reviews"),
      { message: /immutable table pa_calvin_reviews/ },
    );
    await assert.rejects(
      () => db.exec("TRUNCATE pa_calvin_reviews"),
      { message: /immutable table pa_calvin_reviews/ },
    );
  });
});

async function insertBundle(
  bundle: ReturnType<typeof makePhase2CaseStoreFixture>["caseBundle"],
): Promise<void> {
  const policyCase = bundle.policyCase;
  await db.query(
    `INSERT INTO pa_policy_cases
      (case_hash, case_id, policy_stream_id, last_visible_bar_id,
       decision_point_sequence, bar_duration_seconds, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      policyCase.caseHash,
      policyCase.caseId,
      policyCase.policyStreamId,
      policyCase.lastVisibleBarId,
      policyCase.bars.at(-1)!.sequence,
      policyCase.barDurationSeconds,
      JSON.stringify(policyCase),
    ],
  );
  const input = bundle.policyInput;
  await db.query(
    `INSERT INTO pa_policy_inputs
      (input_hash, context_content_hash, detail_content_hash, record)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      input.inputHash,
      input.charts.context.contentHash,
      input.charts.detail.contentHash,
      JSON.stringify(input),
    ],
  );
  for (const metadata of Object.values(bundle.chartMetadata)) {
    await db.query(
      `INSERT INTO pa_chart_artifact_metadata
        (metadata_id, artifact_id, source_case_hash, anonymous_market_hash,
         panel, renderer_id, renderer_runtime, renderer_platform,
         render_input_hash, content_hash, record)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
        metadata.metadataId,
        metadata.artifactId,
        metadata.sourceCaseHash,
        metadata.anonymousMarketHash,
        metadata.panel,
        metadata.rendererId,
        metadata.rendererRuntime,
        metadata.rendererPlatform,
        metadata.renderInputHash,
        metadata.contentHash,
        JSON.stringify(metadata),
      ],
    );
  }
  await db.query(
    `INSERT INTO pa_case_policy_inputs
      (case_hash, input_hash,
       context_metadata_id, context_panel, context_content_hash,
       detail_metadata_id, detail_panel, detail_content_hash)
     VALUES ($1, $2, $3, 'context', $4, $5, 'detail', $6)`,
    [
      bundle.binding.caseHash,
      bundle.binding.inputHash,
      bundle.binding.contextMetadataId,
      input.charts.context.contentHash,
      bundle.binding.detailMetadataId,
      input.charts.detail.contentHash,
    ],
  );
}

async function insertDecision(
  fixture: ReturnType<typeof makePhase2CaseStoreFixture>,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_brooks_decisions
      (decision_hash, decision_id, case_hash, case_id, input_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      fixture.decision.decisionHash,
      fixture.decision.decisionId,
      fixture.caseBundle.policyCase.caseHash,
      fixture.decision.caseId,
      fixture.decision.inputHash,
      JSON.stringify(fixture.decision),
    ],
  );
}

async function insertReview(
  fixture: ReturnType<typeof makePhase2CaseStoreFixture>,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_calvin_reviews
      (review_hash, review_id, decision_hash, decision_id, record)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      fixture.review.reviewHash,
      fixture.review.reviewId,
      fixture.review.reviewedDecisionHash,
      fixture.review.brooksDecisionId,
      JSON.stringify(fixture.review),
    ],
  );
}
