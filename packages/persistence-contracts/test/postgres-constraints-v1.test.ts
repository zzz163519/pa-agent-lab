import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import { createProviderAttemptRecord } from "@pa-agent-lab/contracts";

import {
  makeCaseInputChartFixtures,
  makePersistedChartMetadataFixtures,
  makePersistedRecordFixtures,
} from "./fixtures/persistence-v1.fixture.ts";

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
const sha = (digit: string) =>
  `sha256:${digit.repeat(64)}` as `sha256:${string}`;
let db: PGliteDatabase;

before(async () => {
  db = new PGlite();
  const migration = await readFile(
    resolve(packageRoot, "sql/0001_phase1_immutable_records_v1.sql"),
    "utf8",
  );
  await db.exec(migration);
});

after(async () => {
  await db.close();
});

describe("PostgreSQL immutable record constraints V1", () => {
  it("applies the migration and persists one complete synthetic audit chain", async () => {
    const records = makePersistedRecordFixtures();
    await insertRecordChain(records);

    const result = await db.query<{ table_name: string; row_count: number }>(`
      SELECT 'pa_policy_cases' AS table_name, count(*)::int AS row_count FROM pa_policy_cases
      UNION ALL SELECT 'pa_policy_inputs', count(*)::int FROM pa_policy_inputs
      UNION ALL SELECT 'pa_chart_artifact_metadata', count(*)::int FROM pa_chart_artifact_metadata
      UNION ALL SELECT 'pa_model_runs', count(*)::int FROM pa_model_runs
      UNION ALL SELECT 'pa_provider_attempts', count(*)::int FROM pa_provider_attempts
      UNION ALL SELECT 'pa_model_run_audits', count(*)::int FROM pa_model_run_audits
      ORDER BY table_name
    `);
    assert.deepEqual(
      result.rows,
      [
        "pa_chart_artifact_metadata",
        "pa_model_run_audits",
        "pa_model_runs",
        "pa_policy_cases",
        "pa_policy_inputs",
        "pa_provider_attempts",
      ].map((table_name) => ({
        table_name,
        row_count: table_name === "pa_chart_artifact_metadata" ? 2 : 1,
      })),
    );
  });

  it("deduplicates one anonymous input across independently bound local cases", async () => {
    const original = makePersistedRecordFixtures();
    const alternate = makeCaseInputChartFixtures(
      "case:persistence-alternate",
      "stream:persistence-alternate",
    );
    assert.equal(alternate.policyInput.inputHash, original.policy_input.inputHash);

    await insertPolicyCase(alternate.policyCase);
    for (const metadata of Object.values(alternate.chartMetadata)) {
      await insertChartMetadata(metadata);
    }
    await insertCaseInputLink(
      alternate.policyCase,
      alternate.policyInput,
      alternate.chartMetadata,
    );

    const counts = await db.query<{
      case_count: number;
      input_count: number;
      relation_count: number;
    }>(`
      SELECT
        (SELECT count(*)::int FROM pa_policy_cases) AS case_count,
        (SELECT count(*)::int FROM pa_policy_inputs) AS input_count,
        (SELECT count(*)::int FROM pa_case_policy_inputs) AS relation_count
    `);
    assert.deepEqual(counts.rows, [
      { case_count: 2, input_count: 1, relation_count: 2 },
    ]);
  });

  it("rejects missing JSON identity fields in every record table", async () => {
    const records = makePersistedRecordFixtures();
    const emptyRecord = "{}";

    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_policy_cases
            (case_hash, case_id, policy_stream_id, last_visible_bar_id,
             decision_point_sequence, bar_duration_seconds, record)
           VALUES ($1, 'case:missing-json', 'stream:missing-json',
                   'local:missing', 0, 300, $2::jsonb)`,
          [sha("a"), emptyRecord],
        ),
      { message: /check constraint/ },
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_policy_inputs
            (input_hash, context_content_hash, detail_content_hash, record)
           VALUES ($1, $2, $3, $4::jsonb)`,
          [sha("b"), sha("c"), sha("d"), emptyRecord],
        ),
      { message: /check constraint/ },
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_chart_artifact_metadata
            (metadata_id, artifact_id, source_case_hash, anonymous_market_hash,
             panel, renderer_id, renderer_runtime, renderer_platform,
             render_input_hash, content_hash, record)
           VALUES ($1, $2, $3, $4, 'context', 'renderer', 'runtime',
                   'platform', $5, $6, $7::jsonb)`,
          [
            sha("c"),
            sha("d"),
            records.policy_case.caseHash,
            sha("e"),
            sha("f"),
            sha("a"),
            emptyRecord,
          ],
        ),
      { message: /check constraint/ },
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_model_runs
            (model_run_id, call_id, case_hash, input_hash, payload_hash, record)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            sha("d"),
            sha("e"),
            records.model_run.caseHash,
            records.model_run.inputHash,
            sha("f"),
            emptyRecord,
          ],
        ),
      { message: /check constraint/ },
    );
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_provider_attempts
            (attempt_id, attempt_key, model_run_id, call_id, attempt_index,
             request_hash, status, response_hash, record)
           VALUES ($1, $2, $3, $4, 10, $5, 'timeout', NULL, $6::jsonb)`,
          [
            sha("a"),
            sha("b"),
            records.model_run.modelRunId,
            records.model_run.callId,
            records.model_run.payloadHash,
            emptyRecord,
          ],
        ),
      { message: /check constraint/ },
    );

    const responseAttempt = createProviderAttemptRecord({
      run: records.model_run,
      attemptIndex: 3,
      providerId: "provider:missing-json-audit",
      requestHash: records.model_run.payloadHash,
      status: "response_received",
      responseHash: sha("e"),
      errorCode: null,
      latencyMs: 1,
    });
    await insertProviderAttempt(responseAttempt);
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_model_run_audits
            (audit_id, model_run_id, call_id, attempt_id, case_hash, input_hash,
             payload_hash, raw_output_hash, record)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            sha("c"),
            records.model_run.modelRunId,
            records.model_run.callId,
            responseAttempt.attemptId,
            records.model_run.caseHash,
            records.model_run.inputHash,
            records.model_run.payloadHash,
            responseAttempt.responseHash,
            emptyRecord,
          ],
        ),
      { message: /check constraint/ },
    );
  });

  it("stores terminal failures with NULL responses and forbids their audits", async () => {
    const records = makePersistedRecordFixtures();
    const timeout = createProviderAttemptRecord({
      run: records.model_run,
      attemptIndex: 1,
      providerId: "provider:timeout-fixture",
      requestHash: records.model_run.payloadHash,
      status: "timeout",
      responseHash: null,
      errorCode: "deadline_exceeded",
      latencyMs: 500,
    });
    const transportError = createProviderAttemptRecord({
      run: records.model_run,
      attemptIndex: 2,
      providerId: "provider:transport-error-fixture",
      requestHash: records.model_run.payloadHash,
      status: "transport_error",
      responseHash: null,
      errorCode: "connection_reset",
      latencyMs: 25,
    });
    await insertProviderAttempt(timeout);
    await insertProviderAttempt(transportError);

    const stored = await db.query<{
      status: string;
      response_hash: string | null;
    }>(
      `SELECT status, response_hash
       FROM pa_provider_attempts
       WHERE attempt_id IN ($1, $2)
       ORDER BY status`,
      [timeout.attemptId, transportError.attemptId],
    );
    assert.deepEqual(stored.rows, [
      { status: "timeout", response_hash: null },
      { status: "transport_error", response_hash: null },
    ]);

    const rawOutputHash = sha("f");
    const auditId = sha("e");
    const auditRecord = {
      schemaVersion: "model-run-audit.v1",
      auditId,
      modelRunId: records.model_run.modelRunId,
      callId: records.model_run.callId,
      attemptId: timeout.attemptId,
      caseId: records.model_run.caseId,
      caseHash: records.model_run.caseHash,
      inputHash: records.model_run.inputHash,
      payloadHash: records.model_run.payloadHash,
      promptHash: records.model_run.promptHash,
      retrievedDoctrineIds: records.model_run.retrievedDoctrineIds,
      rawOutputHash,
      decisionHash: null,
      validationResultHash: sha("d"),
      validationStatus: "rejected",
      rejectionCodes: ["transport_timeout"],
    } as const;
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_model_run_audits
            (audit_id, model_run_id, call_id, attempt_id, case_hash, input_hash,
             payload_hash, raw_output_hash, record)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            auditId,
            records.model_run.modelRunId,
            records.model_run.callId,
            timeout.attemptId,
            records.model_run.caseHash,
            records.model_run.inputHash,
            records.model_run.payloadHash,
            rawOutputHash,
            JSON.stringify(auditRecord),
          ],
        ),
      { message: /foreign key constraint/ },
    );
  });

  it("atomically rejects reused case and attempt identities", async () => {
    const records = makePersistedRecordFixtures();
    const changedCase = {
      ...records.policy_case,
      caseHash: sha("8"),
    };
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_policy_cases
            (case_hash, case_id, policy_stream_id, last_visible_bar_id,
             decision_point_sequence, bar_duration_seconds, record)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            changedCase.caseHash,
            changedCase.caseId,
            changedCase.policyStreamId,
            changedCase.lastVisibleBarId,
            changedCase.bars.at(-1)!.sequence,
            changedCase.barDurationSeconds,
            JSON.stringify(changedCase),
          ],
        ),
      { message: /unique constraint/ },
    );

    const changedAttempt = {
      ...records.provider_attempt,
      attemptId: sha("7"),
      attemptKey: sha("6"),
    };
    await assert.rejects(
      () => insertProviderAttempt(changedAttempt),
      { message: /unique constraint/ },
    );
  });

  it("rejects broken relationships and column-to-JSON identity mismatches", async () => {
    const records = makePersistedRecordFixtures();
    const unknownRunAttempt = {
      ...records.provider_attempt,
      attemptId: sha("5"),
      attemptKey: sha("6"),
      modelRunId: sha("7"),
      callId: sha("8"),
      attemptIndex: 1,
    };
    await assert.rejects(
      () => insertProviderAttempt(unknownRunAttempt),
      { message: /foreign key constraint/ },
    );

    const alternateInputHash = sha("5");
    const alternateInput = {
      ...records.policy_input,
      inputHash: alternateInputHash,
    };
    await db.query(
      `INSERT INTO pa_policy_inputs
        (input_hash, context_content_hash, detail_content_hash, record)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        alternateInputHash,
        records.policy_input.charts.context.contentHash,
        records.policy_input.charts.detail.contentHash,
        JSON.stringify(alternateInput),
      ],
    );
    const metadata = makePersistedChartMetadataFixtures();
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_case_policy_inputs
            (case_hash, input_hash,
             context_metadata_id, context_panel, context_content_hash,
             detail_metadata_id, detail_panel, detail_content_hash)
           VALUES ($1, $2, $3, 'context', $4, $5, 'detail', $6)`,
          [
            records.policy_case.caseHash,
            alternateInputHash,
            metadata.detail.metadataId,
            records.policy_input.charts.context.contentHash,
            metadata.detail.metadataId,
            records.policy_input.charts.detail.contentHash,
          ],
        ),
      { message: /foreign key constraint/ },
    );

    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO pa_model_runs
            (model_run_id, call_id, case_hash, input_hash, payload_hash, record)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            sha("9"),
            records.model_run.callId,
            records.model_run.caseHash,
            records.model_run.inputHash,
            records.model_run.payloadHash,
            JSON.stringify(records.model_run),
          ],
        ),
      { message: /check constraint/ },
    );
  });

  it("forbids update, delete, and truncate of accepted rows", async () => {
    const triggerCounts = await db.query<{
      table_name: string;
      trigger_count: number;
    }>(`
      SELECT relation.relname AS table_name, count(*)::int AS trigger_count
      FROM pg_trigger AS trigger
      JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
      WHERE NOT trigger.tgisinternal
        AND relation.relname IN (
          'pa_policy_cases',
          'pa_policy_inputs',
          'pa_case_policy_inputs',
          'pa_chart_artifact_metadata',
          'pa_model_runs',
          'pa_provider_attempts',
          'pa_model_run_audits'
        )
      GROUP BY relation.relname
      ORDER BY relation.relname
    `);
    assert.deepEqual(
      triggerCounts.rows,
      [
        "pa_case_policy_inputs",
        "pa_chart_artifact_metadata",
        "pa_model_run_audits",
        "pa_model_runs",
        "pa_policy_cases",
        "pa_policy_inputs",
        "pa_provider_attempts",
      ].map((table_name) => ({ table_name, trigger_count: 2 })),
    );

    const records = makePersistedRecordFixtures();
    await assert.rejects(
      () =>
        db.exec(
          `UPDATE pa_model_runs
           SET record = jsonb_set(record, '{candidateId}', '"tampered"')
           WHERE model_run_id = '${records.model_run.modelRunId}'`,
        ),
      { message: /immutable table pa_model_runs/ },
    );
    await assert.rejects(
      () =>
        db.exec(
          `DELETE FROM pa_model_run_audits
           WHERE audit_id = '${records.model_run_audit.auditId}'`,
        ),
      { message: /immutable table pa_model_run_audits/ },
    );
    await assert.rejects(
      () => db.exec("TRUNCATE pa_model_run_audits"),
      { message: /immutable table pa_model_run_audits/ },
    );
  });
});

async function insertPolicyCase(
  policyCase: ReturnType<typeof makePersistedRecordFixtures>["policy_case"],
): Promise<void> {
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
}

async function insertChartMetadata(
  metadata: ReturnType<typeof makePersistedChartMetadataFixtures>["context"],
): Promise<void> {
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

async function insertCaseInputLink(
  policyCase: ReturnType<typeof makePersistedRecordFixtures>["policy_case"],
  input: ReturnType<typeof makePersistedRecordFixtures>["policy_input"],
  chartMetadata: ReturnType<typeof makePersistedChartMetadataFixtures>,
): Promise<void> {
  await db.query(
    `INSERT INTO pa_case_policy_inputs
      (case_hash, input_hash,
       context_metadata_id, context_panel, context_content_hash,
       detail_metadata_id, detail_panel, detail_content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      policyCase.caseHash,
      input.inputHash,
      chartMetadata.context.metadataId,
      chartMetadata.context.panel,
      input.charts.context.contentHash,
      chartMetadata.detail.metadataId,
      chartMetadata.detail.panel,
      input.charts.detail.contentHash,
    ],
  );
}

async function insertRecordChain(
  records: ReturnType<typeof makePersistedRecordFixtures>,
): Promise<void> {
  const policyCase = records.policy_case;
  await insertPolicyCase(policyCase);

  const chartMetadata = makePersistedChartMetadataFixtures();
  for (const metadata of Object.values(chartMetadata)) {
    await insertChartMetadata(metadata);
  }

  const input = records.policy_input;
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
  await insertCaseInputLink(policyCase, input, chartMetadata);

  const run = records.model_run;
  await db.query(
    `INSERT INTO pa_model_runs
      (model_run_id, call_id, case_hash, input_hash, payload_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      run.modelRunId,
      run.callId,
      run.caseHash,
      run.inputHash,
      run.payloadHash,
      JSON.stringify(run),
    ],
  );

  await insertProviderAttempt(records.provider_attempt);

  const audit = records.model_run_audit;
  await db.query(
    `INSERT INTO pa_model_run_audits
      (audit_id, model_run_id, call_id, attempt_id, case_hash, input_hash,
       payload_hash, raw_output_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      audit.auditId,
      audit.modelRunId,
      audit.callId,
      audit.attemptId,
      audit.caseHash,
      audit.inputHash,
      audit.payloadHash,
      audit.rawOutputHash,
      JSON.stringify(audit),
    ],
  );
}

async function insertProviderAttempt(
  attempt: ReturnType<typeof makePersistedRecordFixtures>["provider_attempt"],
): Promise<void> {
  await db.query(
    `INSERT INTO pa_provider_attempts
      (attempt_id, attempt_key, model_run_id, call_id, attempt_index,
       request_hash, status, response_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      attempt.attemptId,
      attempt.attemptKey,
      attempt.modelRunId,
      attempt.callId,
      attempt.attemptIndex,
      attempt.requestHash,
      attempt.status,
      attempt.responseHash,
      JSON.stringify(attempt),
    ],
  );
}
