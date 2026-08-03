import pg, { type Pool, type PoolClient } from "pg";

import {
  assertBrooksDecisionIntegrity,
  assertCalvinReviewIntegrity,
  canonicalStringify,
  deepFreeze,
  type BrooksDecisionV1,
  type BrooksPolicyCaseV1,
  type CalvinReviewV1,
  type ContractSha256,
} from "@pa-agent-lab/contracts";
import {
  assertAnonymousChartArtifactMetadataIntegrity,
  assertSyntheticCaseBundleIntegrity,
  createCaseAuditView,
  createSyntheticCaseBundle,
  parsePersistedRecordJson,
  serializePersistedRecord,
  type AnonymousChartArtifactMetadataV1,
  type CaseAuditViewV1,
  type SyntheticCaseBundleV1,
} from "@pa-agent-lab/persistence-contracts";

export interface CaseStoreDatabaseClientV1 {
  query<T>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[] }>;
}

export interface CaseStoreDatabaseV1 extends CaseStoreDatabaseClientV1 {
  transaction<T>(
    work: (client: CaseStoreDatabaseClientV1) => Promise<T>,
  ): Promise<T>;
}

export interface CaseStoreMutationResultV1 {
  readonly status: "inserted" | "existing";
  readonly resourceHash: ContractSha256;
}

export interface CaseStoreV1 {
  appendSyntheticCaseBundle(
    bundle: SyntheticCaseBundleV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendBrooksDecision(
    decision: BrooksDecisionV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendCalvinReview(
    review: CalvinReviewV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  getCase(caseHash: ContractSha256): Promise<Readonly<BrooksPolicyCaseV1> | null>;
  getCaseAudit(caseHash: ContractSha256): Promise<Readonly<CaseAuditViewV1> | null>;
  getChartArtifact(
    artifactId: ContractSha256,
  ): Promise<Readonly<AnonymousChartArtifactMetadataV1> | null>;
  checkReadiness(): Promise<boolean>;
}

export type CaseStoreErrorCodeV1 =
  | "INTEGRITY_VIOLATION"
  | "IDENTITY_CONFLICT"
  | "DEPENDENCY_UNAVAILABLE";

export class CaseStoreError extends Error {
  override readonly name = "CaseStoreError";
  readonly code: CaseStoreErrorCodeV1;

  constructor(
    code: CaseStoreErrorCodeV1,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
  }
}

export interface PostgresCaseStoreHandleV1 {
  readonly store: CaseStoreV1;
  close(): Promise<void>;
}

export function createPostgresCaseStoreV1(options: {
  readonly connectionString: string;
  readonly maxConnections?: number;
}): PostgresCaseStoreHandleV1 {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 4,
  });
  return {
    store: createCaseStore(createPgCaseStoreDatabase(pool)),
    close: () => pool.end(),
  };
}

export function createCaseStore(database: CaseStoreDatabaseV1): CaseStoreV1 {
  return {
    appendSyntheticCaseBundle: (bundle) => appendBundle(database, bundle),
    appendBrooksDecision: (decision) => appendDecision(database, decision),
    appendCalvinReview: (review) => appendReview(database, review),
    getCase: (caseHash) => getCase(database, caseHash),
    getCaseAudit: (caseHash) => getAudit(database, caseHash),
    getChartArtifact: (artifactId) => getChartArtifact(database, artifactId),
    checkReadiness: async () => {
      const result = await database.query<{ readonly ready: number }>(
        "SELECT 1::int AS ready",
      );
      return result.rows[0]?.ready === 1;
    },
  };
}

export function createPgCaseStoreDatabase(pool: Pool): CaseStoreDatabaseV1 {
  return {
    query: (sql, params) => queryPg(pool, sql, params),
    transaction: (work) => runPgTransaction(pool, work),
  };
}

async function runPgTransaction<T>(
  pool: Pool,
  work: (client: CaseStoreDatabaseClientV1) => Promise<T>,
): Promise<T> {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await work({
        query: (sql, params) => queryPg(client, sql, params),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original transaction failure.
      }
      if (attempt < maximumAttempts && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error("PostgreSQL transaction retry limit was exhausted");
}

function isRetryableTransactionError(error: unknown): boolean {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  return error.code === "40001" || error.code === "40P01";
}

async function appendBundle(
  database: CaseStoreDatabaseV1,
  bundle: SyntheticCaseBundleV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertSyntheticCaseBundleIntegrity(bundle);
    const statuses = await database.transaction(async (client) => {
      const policyCase = bundle.policyCase;
      const input = bundle.policyInput;
      const context = bundle.chartMetadata.context;
      const detail = bundle.chartMetadata.detail;
      return [
        await insertImmutableRecord(client, {
          insertSql: `INSERT INTO pa_policy_cases
            (case_hash, case_id, policy_stream_id, last_visible_bar_id,
             decision_point_sequence, bar_duration_seconds, record)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           ON CONFLICT DO NOTHING RETURNING case_hash AS identity`,
          insertParams: [
            policyCase.caseHash,
            policyCase.caseId,
            policyCase.policyStreamId,
            policyCase.lastVisibleBarId,
            policyCase.bars.at(-1)!.sequence,
            policyCase.barDurationSeconds,
            serializePersistedRecord("policy_case", policyCase),
          ],
          existingSql: `SELECT case_hash AS identity, record
            FROM pa_policy_cases
            WHERE case_hash = $1 OR case_id = $2
               OR (policy_stream_id = $3 AND last_visible_bar_id = $4)
               OR (policy_stream_id = $3 AND decision_point_sequence = $5)`,
          existingParams: [
            policyCase.caseHash,
            policyCase.caseId,
            policyCase.policyStreamId,
            policyCase.lastVisibleBarId,
            policyCase.bars.at(-1)!.sequence,
          ],
          expectedIdentity: policyCase.caseHash,
          expectedCanonical: serializePersistedRecord("policy_case", policyCase),
          parseExisting: (value) => parseRecord("policy_case", value),
        }),
        await insertImmutableRecord(client, {
          insertSql: `INSERT INTO pa_policy_inputs
            (input_hash, context_content_hash, detail_content_hash, record)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT DO NOTHING RETURNING input_hash AS identity`,
          insertParams: [
            input.inputHash,
            input.charts.context.contentHash,
            input.charts.detail.contentHash,
            serializePersistedRecord("policy_input", input),
          ],
          existingSql: `SELECT input_hash AS identity, record
            FROM pa_policy_inputs WHERE input_hash = $1`,
          existingParams: [input.inputHash],
          expectedIdentity: input.inputHash,
          expectedCanonical: serializePersistedRecord("policy_input", input),
          parseExisting: (value) => parseRecord("policy_input", value),
        }),
        await insertChartMetadata(client, context),
        await insertChartMetadata(client, detail),
        await insertCaseInputBinding(client, bundle),
      ];
    });
    return mutationResult(
      statuses.every((status) => status === "existing")
        ? "existing"
        : "inserted",
      bundle.bundleHash,
    );
  } catch (error) {
    rethrow(error);
  }
}

async function appendDecision(
  database: CaseStoreDatabaseV1,
  decision: BrooksDecisionV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    return await database.transaction(async (client) => {
      const bundle = await loadBundleByCaseIdAndInput(
        client,
        decision.caseId,
        decision.inputHash,
      );
      if (bundle === null) fail("INTEGRITY_VIOLATION", "BrooksDecision parent CaseBundle is missing");
      assertBrooksDecisionIntegrity(decision, decisionBinding(bundle));
      const expectedCanonical = canonicalStringify(decision);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_brooks_decisions
          (decision_hash, decision_id, case_hash, case_id, input_hash, record)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING RETURNING decision_hash AS identity`,
        insertParams: [
          decision.decisionHash,
          decision.decisionId,
          bundle.policyCase.caseHash,
          decision.caseId,
          decision.inputHash,
          expectedCanonical,
        ],
        existingSql: `SELECT decision_hash AS identity, record
          FROM pa_brooks_decisions
          WHERE decision_hash = $1 OR decision_id = $2
             OR (case_hash = $3 AND input_hash = $4)`,
        existingParams: [
          decision.decisionHash,
          decision.decisionId,
          bundle.policyCase.caseHash,
          decision.inputHash,
        ],
        expectedIdentity: decision.decisionHash,
        expectedCanonical,
        parseExisting: (value) => parseDecision(value, bundle),
      });
      return mutationResult(status, decision.decisionHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function appendReview(
  database: CaseStoreDatabaseV1,
  review: CalvinReviewV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    return await database.transaction(async (client) => {
      const loaded = await loadDecisionByIdentity(
        client,
        review.reviewedDecisionHash,
        review.brooksDecisionId,
      );
      if (loaded === null) fail("INTEGRITY_VIOLATION", "CalvinReview parent BrooksDecision is missing");
      assertCalvinReviewIntegrity(review, loaded.decision);
      const expectedCanonical = canonicalStringify(review);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_calvin_reviews
          (review_hash, review_id, decision_hash, decision_id, record)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT DO NOTHING RETURNING review_hash AS identity`,
        insertParams: [
          review.reviewHash,
          review.reviewId,
          review.reviewedDecisionHash,
          review.brooksDecisionId,
          expectedCanonical,
        ],
        existingSql: `SELECT review_hash AS identity, record
          FROM pa_calvin_reviews
          WHERE review_hash = $1 OR review_id = $2 OR decision_hash = $3`,
        existingParams: [
          review.reviewHash,
          review.reviewId,
          review.reviewedDecisionHash,
        ],
        expectedIdentity: review.reviewHash,
        expectedCanonical,
        parseExisting: (value) => parseReview(value, loaded.decision),
      });
      return mutationResult(status, review.reviewHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function getCase(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
): Promise<Readonly<BrooksPolicyCaseV1> | null> {
  try {
    const result = await database.query<{ readonly record: unknown }>(
      "SELECT record FROM pa_policy_cases WHERE case_hash = $1",
      [caseHash],
    );
    if (result.rows.length === 0) return null;
    if (result.rows.length !== 1) fail("INTEGRITY_VIOLATION", "Case identity is not unique");
    return parseRecord("policy_case", result.rows[0]!.record);
  } catch (error) {
    rethrow(error);
  }
}

async function getAudit(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
): Promise<Readonly<CaseAuditViewV1> | null> {
  try {
    return await database.transaction(async (client) => {
      const bundle = await loadBundleByCaseHash(client, caseHash);
      if (bundle === null) return null;
      const decisionRows = await client.query<{ readonly record: unknown }>(
        `SELECT record FROM pa_brooks_decisions
         WHERE case_hash = $1 AND input_hash = $2`,
        [caseHash, bundle.policyInput.inputHash],
      );
      if (decisionRows.rows.length > 1) {
        fail("INTEGRITY_VIOLATION", "Phase 2 Case has multiple BrooksDecision records");
      }
      const decision =
        decisionRows.rows.length === 0
          ? null
          : parseDecision(decisionRows.rows[0]!.record, bundle);
      let review: CalvinReviewV1 | null = null;
      if (decision !== null) {
        const reviewRows = await client.query<{ readonly record: unknown }>(
          "SELECT record FROM pa_calvin_reviews WHERE decision_hash = $1",
          [decision.decisionHash],
        );
        if (reviewRows.rows.length > 1) {
          fail("INTEGRITY_VIOLATION", "Phase 2 BrooksDecision has multiple CalvinReview records");
        }
        if (reviewRows.rows.length === 1) {
          review = parseReview(reviewRows.rows[0]!.record, decision);
        }
      }
      return createCaseAuditView({ caseBundle: bundle, decision, review });
    });
  } catch (error) {
    rethrow(error);
  }
}

async function getChartArtifact(
  database: CaseStoreDatabaseV1,
  artifactId: ContractSha256,
): Promise<Readonly<AnonymousChartArtifactMetadataV1> | null> {
  try {
    const result = await database.query<{ readonly record: unknown }>(
      `SELECT record FROM pa_chart_artifact_metadata
       WHERE artifact_id = $1 ORDER BY metadata_id`,
      [artifactId],
    );
    if (result.rows.length === 0) return null;
    const metadata = result.rows.map((row) => parseChartMetadata(row.record));
    const first = metadata[0]!;
    if (metadata.some((item) => item.contentHash !== first.contentHash)) {
      fail("INTEGRITY_VIOLATION", "shared chart artifact identity has inconsistent bytes");
    }
    return first;
  } catch (error) {
    rethrow(error);
  }
}

async function insertChartMetadata(
  client: CaseStoreDatabaseClientV1,
  metadata: AnonymousChartArtifactMetadataV1,
): Promise<"inserted" | "existing"> {
  assertAnonymousChartArtifactMetadataIntegrity(metadata);
  const expectedCanonical = serializePersistedRecord(
    "chart_artifact_metadata",
    metadata,
  );
  return insertImmutableRecord(client, {
    insertSql: `INSERT INTO pa_chart_artifact_metadata
      (metadata_id, artifact_id, source_case_hash, anonymous_market_hash,
       panel, renderer_id, renderer_runtime, renderer_platform,
       render_input_hash, content_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     ON CONFLICT DO NOTHING RETURNING metadata_id AS identity`,
    insertParams: [
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
      expectedCanonical,
    ],
    existingSql: `SELECT metadata_id AS identity, record
      FROM pa_chart_artifact_metadata
      WHERE metadata_id = $1
         OR (source_case_hash = $2 AND panel = $3 AND render_input_hash = $4)`,
    existingParams: [
      metadata.metadataId,
      metadata.sourceCaseHash,
      metadata.panel,
      metadata.renderInputHash,
    ],
    expectedIdentity: metadata.metadataId,
    expectedCanonical,
    parseExisting: parseChartMetadata,
  });
}

async function insertCaseInputBinding(
  client: CaseStoreDatabaseClientV1,
  bundle: SyntheticCaseBundleV1,
): Promise<"inserted" | "existing"> {
  const result = await client.query<{ readonly case_hash: string }>(
    `INSERT INTO pa_case_policy_inputs
      (case_hash, input_hash,
       context_metadata_id, context_panel, context_content_hash,
       detail_metadata_id, detail_panel, detail_content_hash)
     VALUES ($1, $2, $3, 'context', $4, $5, 'detail', $6)
     ON CONFLICT DO NOTHING RETURNING case_hash`,
    [
      bundle.binding.caseHash,
      bundle.binding.inputHash,
      bundle.binding.contextMetadataId,
      bundle.policyInput.charts.context.contentHash,
      bundle.binding.detailMetadataId,
      bundle.policyInput.charts.detail.contentHash,
    ],
  );
  if (result.rows.length === 1) return "inserted";
  const existing = await client.query<{
    readonly context_metadata_id: string;
    readonly context_content_hash: string;
    readonly detail_metadata_id: string;
    readonly detail_content_hash: string;
  }>(
    `SELECT context_metadata_id, context_content_hash,
            detail_metadata_id, detail_content_hash
     FROM pa_case_policy_inputs WHERE case_hash = $1 AND input_hash = $2`,
    [bundle.binding.caseHash, bundle.binding.inputHash],
  );
  const row = existing.rows[0];
  if (
    existing.rows.length !== 1 ||
    row?.context_metadata_id !== bundle.binding.contextMetadataId ||
    row.context_content_hash !== bundle.policyInput.charts.context.contentHash ||
    row.detail_metadata_id !== bundle.binding.detailMetadataId ||
    row.detail_content_hash !== bundle.policyInput.charts.detail.contentHash
  ) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict for Case/input binding");
  }
  return "existing";
}

interface ImmutableInsertV1<T> {
  readonly insertSql: string;
  readonly insertParams: readonly unknown[];
  readonly existingSql: string;
  readonly existingParams: readonly unknown[];
  readonly expectedIdentity: string;
  readonly expectedCanonical: string;
  readonly parseExisting: (value: unknown) => T;
}

async function insertImmutableRecord<T>(
  client: CaseStoreDatabaseClientV1,
  input: ImmutableInsertV1<T>,
): Promise<"inserted" | "existing"> {
  const inserted = await client.query<{ readonly identity: string }>(
    input.insertSql,
    input.insertParams,
  );
  if (inserted.rows.length === 1) return "inserted";
  const existing = await client.query<{
    readonly identity: string;
    readonly record: unknown;
  }>(input.existingSql, input.existingParams);
  if (existing.rows.length !== 1) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict has no exact stored record");
  }
  const row = existing.rows[0]!;
  const parsed = input.parseExisting(row.record);
  if (
    row.identity !== input.expectedIdentity ||
    canonicalStringify(parsed) !== input.expectedCanonical
  ) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict names different content");
  }
  return "existing";
}

interface BundleRowV1 {
  readonly case_record: unknown;
  readonly input_record: unknown;
  readonly context_record: unknown;
  readonly detail_record: unknown;
}

async function loadBundleByCaseHash(
  client: CaseStoreDatabaseClientV1,
  caseHash: ContractSha256,
): Promise<SyntheticCaseBundleV1 | null> {
  return loadBundle(client, "c.case_hash = $1", [caseHash]);
}

async function loadBundleByCaseIdAndInput(
  client: CaseStoreDatabaseClientV1,
  caseId: string,
  inputHash: ContractSha256,
): Promise<SyntheticCaseBundleV1 | null> {
  return loadBundle(client, "c.case_id = $1 AND i.input_hash = $2", [caseId, inputHash]);
}

async function loadBundle(
  client: CaseStoreDatabaseClientV1,
  predicate: string,
  params: readonly unknown[],
): Promise<SyntheticCaseBundleV1 | null> {
  const result = await client.query<BundleRowV1>(
    `SELECT c.record AS case_record, i.record AS input_record,
            context.record AS context_record, detail.record AS detail_record
     FROM pa_policy_cases AS c
     JOIN pa_case_policy_inputs AS binding ON binding.case_hash = c.case_hash
     JOIN pa_policy_inputs AS i ON i.input_hash = binding.input_hash
     JOIN pa_chart_artifact_metadata AS context
       ON context.metadata_id = binding.context_metadata_id
     JOIN pa_chart_artifact_metadata AS detail
       ON detail.metadata_id = binding.detail_metadata_id
     WHERE ${predicate}`,
    params,
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) {
    fail("INTEGRITY_VIOLATION", "Phase 2 CaseBundle binding is not unique");
  }
  const row = result.rows[0]!;
  const policyCase = parseRecord("policy_case", row.case_record);
  const policyInput = parseRecord("policy_input", row.input_record);
  const context = parseChartMetadata(row.context_record);
  const detail = parseChartMetadata(row.detail_record);
  return createSyntheticCaseBundle({
    sourceScope: "synthetic_fixture_only",
    policyCase,
    policyInput,
    chartMetadata: { context, detail },
    binding: {
      caseHash: policyCase.caseHash,
      inputHash: policyInput.inputHash,
      contextMetadataId: context.metadataId,
      detailMetadataId: detail.metadataId,
    },
  });
}

async function loadDecisionByIdentity(
  client: CaseStoreDatabaseClientV1,
  decisionHash: ContractSha256,
  decisionId: string,
): Promise<{
  readonly decision: BrooksDecisionV1;
  readonly bundle: SyntheticCaseBundleV1;
} | null> {
  const identity = await client.query<{
    readonly case_hash: ContractSha256;
    readonly input_hash: ContractSha256;
    readonly record: unknown;
  }>(
    `SELECT case_hash, input_hash, record FROM pa_brooks_decisions
     WHERE decision_hash = $1 AND decision_id = $2`,
    [decisionHash, decisionId],
  );
  if (identity.rows.length === 0) return null;
  if (identity.rows.length !== 1) fail("INTEGRITY_VIOLATION", "BrooksDecision identity is not unique");
  const row = identity.rows[0]!;
  const bundle = await loadBundleByCaseHash(client, row.case_hash);
  if (bundle === null || bundle.policyInput.inputHash !== row.input_hash) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision parent binding is incomplete");
  }
  return { decision: parseDecision(row.record, bundle), bundle };
}

function parseRecord<K extends "policy_case" | "policy_input">(
  kind: K,
  value: unknown,
) {
  return parsePersistedRecordJson(kind, jsonText(value));
}

function parseChartMetadata(value: unknown): AnonymousChartArtifactMetadataV1 {
  return parsePersistedRecordJson("chart_artifact_metadata", jsonText(value));
}

function parseDecision(
  value: unknown,
  bundle: SyntheticCaseBundleV1,
): BrooksDecisionV1 {
  const decision = materialize<BrooksDecisionV1>(value);
  assertBrooksDecisionIntegrity(decision, decisionBinding(bundle));
  return deepFreeze(decision);
}

function parseReview(
  value: unknown,
  decision: BrooksDecisionV1,
): CalvinReviewV1 {
  const review = materialize<CalvinReviewV1>(value);
  assertCalvinReviewIntegrity(review, decision);
  return deepFreeze(review);
}

function materialize<T>(value: unknown): T {
  return JSON.parse(jsonText(value)) as T;
}

function jsonText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function decisionBinding(bundle: SyntheticCaseBundleV1) {
  return {
    caseId: bundle.policyCase.caseId,
    inputHash: bundle.policyInput.inputHash,
    lastVisibleBarId: bundle.policyInput.market.lastVisibleBarId,
    barDurationSeconds: bundle.policyCase.barDurationSeconds,
  } as const;
}

function mutationResult(
  status: "inserted" | "existing",
  resourceHash: ContractSha256,
): Readonly<CaseStoreMutationResultV1> {
  return deepFreeze({ status, resourceHash });
}

async function queryPg<T>(
  client: Pool | PoolClient,
  sql: string,
  params: readonly unknown[] = [],
): Promise<{ readonly rows: readonly T[] }> {
  const result = await client.query(
    sql,
    params as unknown[],
  );
  return { rows: result.rows as unknown as readonly T[] };
}

function fail(code: CaseStoreErrorCodeV1, message: string): never {
  throw new CaseStoreError(code, message);
}

function rethrow(error: unknown): never {
  if (error instanceof CaseStoreError) throw error;
  if (error instanceof Error) {
    const code = /conflict|unique constraint/i.test(error.message)
      ? "IDENTITY_CONFLICT"
      : /missing|invalid|unsupported|match|binding/i.test(error.message)
        ? "INTEGRITY_VIOLATION"
        : "DEPENDENCY_UNAVAILABLE";
    throw new CaseStoreError(code, error.message, { cause: error });
  }
  throw new CaseStoreError("DEPENDENCY_UNAVAILABLE", "Case Store operation failed");
}
