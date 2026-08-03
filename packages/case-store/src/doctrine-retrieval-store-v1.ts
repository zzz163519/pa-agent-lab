import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_INGESTION_RUN_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_PROFILE_V1,
  DOCTRINE_RETRIEVAL_RUNTIME,
  createDoctrineCorpusActivation,
  createDoctrineCorpusEntry,
  createDoctrineCorpusSnapshot,
  createDoctrineIngestionRun,
  createDoctrineRetrievalEvidence,
  createDoctrineRetrievalQualityReport,
  createDoctrineRetrievalQuery,
  normalizeDoctrineQuery,
  assertDoctrineCorpusSnapshotIntegrity,
  assertDoctrineIngestionRunIntegrity,
  assertDoctrineRetrievalEvidenceIntegrity,
  canonicalHash,
  canonicalStringify,
  deepFreeze,
  type ContractSha256,
  type DoctrineCorpusActivationV1,
  type DoctrineCorpusSnapshotV1,
  type DoctrineIngestionRunV1,
  type DoctrineProposalBundleV1,
  type DoctrineApprovalV1,
  type DoctrineRetrievalEvidenceV1,
  type DoctrineRetrievalResponseV1,
  type DoctrineRagRecordV1,
} from "@pa-agent-lab/contracts";
import {
  assertDoctrineRetrievalQueryCommand,
  type DoctrineActivationCommandV1,
  type DoctrineIngestionCommandV1,
  type DoctrineRetrievalQueryCommandV1,
} from "@pa-agent-lab/persistence-contracts";

import type {
  CaseStoreDatabaseClientV1,
  CaseStoreDatabaseV1,
} from "./case-store-v1.ts";
import {
  createPhase4aQualityFixtureResultV1,
  createPhase4aQualitySuiteV1,
} from "./doctrine-retrieval-quality-v1.ts";

export const DOCTRINE_RETRIEVAL_OPERATOR_PRINCIPAL =
  "local:phase2-operator" as const;

export interface DoctrineRetrievalRuntimeAttestationV1 {
  readonly runtime: typeof DOCTRINE_RETRIEVAL_RUNTIME;
}

export interface DoctrineRetrievalStoreOptionsV1 {
  readonly runtimeAttestation: DoctrineRetrievalRuntimeAttestationV1 | null;
}

export interface DoctrineIngestionMutationV1 {
  readonly status: "inserted" | "existing";
  readonly run: DoctrineIngestionRunV1;
}

export interface DoctrineActivationMutationV1 {
  readonly status: "inserted" | "existing";
  readonly activation: DoctrineCorpusActivationV1;
}

export interface DoctrineRetrievalStoreV1 {
  createDoctrineIngestionRun(
    command: DoctrineIngestionCommandV1,
  ): Promise<Readonly<DoctrineIngestionMutationV1>>;
  getDoctrineCorpusSnapshot(
    snapshotId: ContractSha256,
  ): Promise<Readonly<DoctrineCorpusSnapshotV1> | null>;
  getDoctrineIngestionRun(
    runId: ContractSha256,
  ): Promise<Readonly<DoctrineIngestionRunV1> | null>;
  createDoctrineCorpusActivation(
    command: DoctrineActivationCommandV1,
  ): Promise<Readonly<DoctrineActivationMutationV1>>;
  getCurrentDoctrineActivation(): Promise<Readonly<DoctrineCorpusActivationV1> | null>;
  queryDoctrine(
    command: DoctrineRetrievalQueryCommandV1,
  ): Promise<Readonly<DoctrineRetrievalResponseV1>>;
  getDoctrineRetrievalEvidence(
    evidenceId: ContractSha256,
  ): Promise<Readonly<DoctrineRetrievalEvidenceV1> | null>;
}

interface DoctrineParentRowV1 {
  readonly proposal_record: unknown;
  readonly approval_record: unknown;
}
interface RetrievalRowV1 {
  readonly doctrine_id: string;
  readonly rag_record_hash: ContractSha256;
  readonly score_hex: string;
}

export function createDoctrineRetrievalStoreV1(
  database: CaseStoreDatabaseV1,
  options: DoctrineRetrievalStoreOptionsV1,
): DoctrineRetrievalStoreV1 {
  return {
    createDoctrineIngestionRun: (command) => ingest(database, options, command),
    getDoctrineCorpusSnapshot: (snapshotId) => getSnapshot(database, snapshotId),
    getDoctrineIngestionRun: (runId) => getRun(database, runId),
    createDoctrineCorpusActivation: (command) => activate(database, command),
    getCurrentDoctrineActivation: () => currentActivation(database),
    queryDoctrine: (command) => query(database, command),
    getDoctrineRetrievalEvidence: (evidenceId) => getEvidence(database, evidenceId),
  };
}

async function ingest(
  database: CaseStoreDatabaseV1,
  options: DoctrineRetrievalStoreOptionsV1,
  command: DoctrineIngestionCommandV1,
): Promise<Readonly<DoctrineIngestionMutationV1>> {
  const attemptIndex = command.attemptIndex ?? 0;
  try {
    if (options.runtimeAttestation?.runtime !== DOCTRINE_RETRIEVAL_RUNTIME) {
      fail(`runtime mismatch for ${DOCTRINE_RETRIEVAL_RUNTIME}`);
    }
    return await database.transaction(async (client) => {
      await assertRuntime(client);
      const snapshot = await buildEligibleSnapshot(client);
      if (command.snapshotId !== undefined && command.snapshotId !== snapshot.snapshotId) {
        fail("requested snapshotId is not the complete current eligible projection");
      }
      const existing = await findRunByNaturalIdentity(
        client,
        snapshot.snapshotId,
        attemptIndex,
      );
      if (existing !== null) {
        return deepFreeze({ status: "existing", run: existing });
      }
      await insertSnapshot(client, snapshot);
      await insertProfile(client);
      const vectors: {
        readonly doctrineId: string;
        readonly ragRecordHash: ContractSha256;
        readonly vectorText: string;
        readonly logicalDocumentHash: ContractSha256;
      }[] = [];
      for (const entry of snapshot.entries) {
        const vector = await buildDocumentVector(client, entry.ragRecord);
        const logicalDocumentHash = canonicalHash({
          doctrineId: entry.doctrineId,
          ragRecordHash: entry.ragRecordHash,
          documentVectorText: vector.vectorText,
        });
        vectors.push({
          doctrineId: entry.doctrineId,
          ragRecordHash: entry.ragRecordHash,
          vectorText: vector.vectorText,
          logicalDocumentHash,
        });
      }
      const ragRecordHashes = snapshot.entries.map((entry) => entry.ragRecordHash);
      const logicalDocumentHashes = vectors.map((vector) => vector.logicalDocumentHash);
      const run = createDoctrineIngestionRun({
        schemaVersion: DOCTRINE_INGESTION_RUN_SCHEMA_VERSION,
        snapshotId: snapshot.snapshotId,
        profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
        attemptIndex,
        status: "succeeded",
        entryCount: snapshot.entries.length,
        ragRecordHashes,
        logicalDocumentHashes,
        lexicalManifestHash: canonicalHash({
          schemaVersion: "doctrine-lexical-manifest.v1",
          documents: vectors.map((vector) => ({
            doctrineId: vector.doctrineId,
            ragRecordHash: vector.ragRecordHash,
            logicalDocumentHash: vector.logicalDocumentHash,
          })),
        }),
        errorCodes: [],
      });
      await client.query(
        `INSERT INTO pa_doctrine_ingestion_runs
          (run_id, snapshot_id, profile_hash, attempt_index, status,
           entry_count, lexical_manifest_hash, record)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [
          run.runId,
          run.snapshotId,
          run.profileHash,
          run.attemptIndex,
          run.status,
          run.entryCount,
          run.lexicalManifestHash,
          canonicalStringify(run),
        ],
      );
      for (const vector of vectors) {
        await client.query(
          `INSERT INTO pa_doctrine_lexical_documents
            (run_id,snapshot_id,profile_hash,doctrine_id,rag_record_hash,
             document_vector,logical_document_hash)
           VALUES ($1,$2,$3,$4,$5,$6::tsvector,$7)`,
          [
            run.runId,
            run.snapshotId,
            run.profileHash,
            vector.doctrineId,
            vector.ragRecordHash,
            vector.vectorText,
            vector.logicalDocumentHash,
          ],
        );
      }
      await createAndInsertQualityReport(client, snapshot, run);
      return deepFreeze({ status: "inserted", run });
    });
  } catch (error) {
    const errorCode = ingestionErrorCode(error);
    let snapshot: Readonly<DoctrineCorpusSnapshotV1>;
    try {
      snapshot = await buildEligibleSnapshot(database);
    } catch {
      // A failed run cannot name an empty or structurally invalid snapshot.
      throw error;
    }
    const existing = await findRunByNaturalIdentity(database, snapshot.snapshotId, attemptIndex);
    if (existing !== null) {
      return deepFreeze({ status: "existing", run: existing });
    }
    const failed = createDoctrineIngestionRun({
      schemaVersion: DOCTRINE_INGESTION_RUN_SCHEMA_VERSION,
      snapshotId: snapshot.snapshotId,
      profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
      attemptIndex,
      status: "failed",
      entryCount: 0,
      ragRecordHashes: [],
      logicalDocumentHashes: [],
      lexicalManifestHash: null,
      errorCodes: [errorCode],
    });
    await database.transaction(async (client) => {
      await insertSnapshot(client, snapshot);
      await insertProfile(client);
      await client.query(
        `INSERT INTO pa_doctrine_ingestion_runs
          (run_id,snapshot_id,profile_hash,attempt_index,status,entry_count,
           lexical_manifest_hash,record)
         VALUES ($1,$2,$3,$4,'failed',0,NULL,$5::jsonb)
         ON CONFLICT DO NOTHING`,
        [failed.runId, failed.snapshotId, failed.profileHash, failed.attemptIndex, canonicalStringify(failed)],
      );
    });
    return deepFreeze({ status: "inserted", run: failed });
  }
}

function ingestionErrorCode(error: unknown):
  | "RUNTIME_MISMATCH"
  | "EMPTY_CORPUS"
  | "SOURCE_NOT_ALLOWED"
  | "INVALID_ENTRY"
  | "INGESTION_FAILED" {
  if (error instanceof Error && error.message.includes("runtime mismatch")) {
    return "RUNTIME_MISMATCH";
  }
  if (error instanceof Error && error.message.includes("outside the exact Phase 4A allowlist")) {
    return "SOURCE_NOT_ALLOWED";
  }
  if (error instanceof Error && error.message.includes("snapshot must not be empty")) {
    return "EMPTY_CORPUS";
  }
  if (error instanceof Error && /identity|invalid|unsupported|must |outside bounds|not match/i.test(error.message)) {
    return "INVALID_ENTRY";
  }
  return "INGESTION_FAILED";
}

async function buildEligibleSnapshot(
  client: CaseStoreDatabaseClientV1,
): Promise<Readonly<DoctrineCorpusSnapshotV1>> {
  const result = await client.query<DoctrineParentRowV1>(
    `SELECT proposal.record AS proposal_record, approval.record AS approval_record
     FROM pa_doctrine_proposals AS proposal
     JOIN pa_doctrine_approvals AS approval
       ON approval.proposal_hash = proposal.proposal_hash
     LEFT JOIN pa_doctrine_retirements AS retirement
       ON retirement.approval_hash = approval.approval_hash
     WHERE retirement.retirement_hash IS NULL
     ORDER BY proposal.doctrine_id COLLATE "C"`,
  );
  const entries = result.rows.map((row) => {
    const proposal = materialize<DoctrineProposalBundleV1>(row.proposal_record);
    const approval = materialize<DoctrineApprovalV1>(row.approval_record);
    return createDoctrineCorpusEntry({ proposal, approval });
  });
  return createDoctrineCorpusSnapshot(entries);
}

async function insertSnapshot(
  client: CaseStoreDatabaseClientV1,
  snapshot: DoctrineCorpusSnapshotV1,
): Promise<void> {
  const exists = await client.query<{ readonly snapshot_id: string }>(
    "SELECT snapshot_id FROM pa_doctrine_corpus_snapshots WHERE snapshot_id=$1",
    [snapshot.snapshotId],
  );
  if (exists.rows.length === 1) return;
  await client.query("SET CONSTRAINTS pa_doctrine_snapshot_complete DEFERRED");
  await client.query(
    `INSERT INTO pa_doctrine_corpus_snapshots
      (snapshot_id,entry_count,record) VALUES ($1,$2,$3::jsonb)`,
    [snapshot.snapshotId, snapshot.entries.length, canonicalStringify(snapshot)],
  );
  for (const [index, entry] of snapshot.entries.entries()) {
    await client.query(
      `INSERT INTO pa_doctrine_corpus_entries
        (snapshot_id,entry_index,doctrine_id,proposal_hash,approval_hash,
         source_id,source_content_hash,rag_record_hash,record)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [snapshot.snapshotId,index,entry.doctrineId,entry.proposalHash,entry.approvalHash,entry.sourceId,entry.sourceContentHash,entry.ragRecordHash,canonicalStringify(entry)],
    );
  }
}

async function insertProfile(client: CaseStoreDatabaseClientV1): Promise<void> {
  await client.query(
    `INSERT INTO pa_doctrine_retrieval_profiles(profile_hash,record)
     VALUES ($1,$2::jsonb) ON CONFLICT DO NOTHING`,
    [DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash, canonicalStringify(DOCTRINE_RETRIEVAL_PROFILE_V1)],
  );
}

async function assertRuntime(
  client: CaseStoreDatabaseClientV1,
): Promise<void> {
  const result = await client.query<{ readonly major: number }>(
    "SELECT current_setting('server_version_num')::integer / 10000 AS major",
  );
  if (result.rows[0]?.major !== 18) fail(`runtime mismatch for ${DOCTRINE_RETRIEVAL_RUNTIME}`);
}

async function buildDocumentVector(
  client: CaseStoreDatabaseClientV1,
  rag: DoctrineRagRecordV1,
): Promise<{ readonly vectorText: string }> {
  const result = await client.query<{ readonly vector_text: string }>(
    `SELECT (
      setweight(to_tsvector('pg_catalog.english', $1), 'D') ||
      setweight(to_tsvector('pg_catalog.english', $2), 'D') ||
      setweight(to_tsvector('pg_catalog.english', $3), 'D') ||
      setweight(to_tsvector('pg_catalog.english', $4), 'D') ||
      setweight(to_tsvector('pg_catalog.english', $5), 'D')
    )::text AS vector_text`,
    [rag.concept, rag.rule, rag.appliesWhen.join("\n"), rag.avoidWhen.join("\n"), rag.decisionEffect.join("\n")],
  );
  const vectorText = result.rows[0]?.vector_text;
  if (typeof vectorText !== "string") fail("PostgreSQL did not produce a lexical document");
  return { vectorText };
}

async function createAndInsertQualityReport(
  client: CaseStoreDatabaseClientV1,
  snapshot: DoctrineCorpusSnapshotV1,
  run: DoctrineIngestionRunV1,
): Promise<void> {
  const suite = createPhase4aQualitySuiteV1(snapshot, run.profileHash);
  const fixtureResults = [];
  for (const fixture of suite.fixtures) {
    const first = await executeLexical(client, run.runId, fixture.query, 5);
    const repeated = await executeLexical(client, run.runId, fixture.query, 5);
    fixtureResults.push(createPhase4aQualityFixtureResultV1({
      fixture,
      actualStatus: first.length === 0 ? "no_match" : "matched",
      doctrineIds: first.map((row) => row.doctrine_id),
      repeatedDoctrineIds: repeated.map((row) => row.doctrine_id),
      scoreHexes: first.map((row) => row.score_hex),
      repeatedScoreHexes: repeated.map((row) => row.score_hex),
    }));
  }
  const report = createDoctrineRetrievalQualityReport({
    schemaVersion: "doctrine-retrieval-quality-report.v1",
    suiteHash: suite.qualitySuiteHash,
    snapshotId: snapshot.snapshotId,
    runId: run.runId,
    profileHash: run.profileHash,
    status: fixtureResults.every((result) => result.status === "passed") ? "passed" : "failed",
    fixtureResultHashes: fixtureResults.map((result) => result.resultHash),
  });
  await client.query(
    `INSERT INTO pa_doctrine_quality_suites
      (quality_suite_hash,profile_hash,fixture_count,record)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT DO NOTHING`,
    [
      suite.qualitySuiteHash,
      suite.profileHash,
      suite.fixtures.length,
      canonicalStringify(suite),
    ],
  );
  await client.query(
    `INSERT INTO pa_doctrine_quality_reports
      (quality_report_hash,suite_hash,run_id,snapshot_id,profile_hash,status,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [report.qualityReportHash, report.suiteHash, report.runId, report.snapshotId, report.profileHash, report.status, canonicalStringify(report)],
  );
}

async function executeLexical(
  client: CaseStoreDatabaseClientV1,
  runId: ContractSha256,
  normalizedQuery: string,
  limit: number,
): Promise<readonly RetrievalRowV1[]> {
  const result = await client.query<RetrievalRowV1>(
    `WITH parsed AS (
       SELECT plainto_tsquery('pg_catalog.english', $2) AS query
     ), ranked AS (
       SELECT document.doctrine_id, document.rag_record_hash,
              ts_rank_cd(document.document_vector, parsed.query, 0)::real AS score
       FROM pa_doctrine_lexical_documents AS document CROSS JOIN parsed
       WHERE document.run_id = $1 AND parsed.query <> ''::tsquery
         AND document.document_vector @@ parsed.query
     )
     SELECT doctrine_id, rag_record_hash,
            encode(float4send(score), 'hex') AS score_hex
     FROM ranked
     ORDER BY score DESC, doctrine_id COLLATE "C" ASC
     LIMIT $3`,
    [runId, normalizedQuery, limit],
  );
  return result.rows;
}

async function activate(
  database: CaseStoreDatabaseV1,
  command: DoctrineActivationCommandV1,
): Promise<Readonly<DoctrineActivationMutationV1>> {
  return database.transaction(async (client) => {
    const existing = await client.query<{ readonly record: unknown }>(
      "SELECT record FROM pa_doctrine_corpus_activations WHERE run_id=$1 AND quality_report_hash=$2",
      [command.runId, command.qualityReportHash],
    );
    if (existing.rows.length === 1) {
      return deepFreeze({
        status: "existing",
        activation: materializeActivation(existing.rows[0]!.record),
      });
    }
    const parents = await client.query<{ readonly snapshot_id: ContractSha256; readonly profile_hash: ContractSha256 }>(
      `SELECT run.snapshot_id, run.profile_hash
       FROM pa_doctrine_ingestion_runs AS run
       JOIN pa_doctrine_quality_reports AS report ON report.run_id=run.run_id
       WHERE run.run_id=$1 AND run.status='succeeded'
         AND report.quality_report_hash=$2 AND report.status='passed'`,
      [command.runId, command.qualityReportHash],
    );
    const parent = parents.rows[0];
    if (parent === undefined) fail("activation requires a succeeded run and passed quality report");
    const sequence = await client.query<{ readonly activation_sequence: number }>(
      "SELECT nextval('pa_doctrine_corpus_activation_sequence_seq')::integer AS activation_sequence",
    );
    const activationSequence = sequence.rows[0]?.activation_sequence;
    if (activationSequence === undefined) fail("database did not assign an activation sequence");
    const activation = createDoctrineCorpusActivation({
      schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
      activationSequence,
      runId: command.runId,
      snapshotId: parent.snapshot_id,
      profileHash: parent.profile_hash,
      qualityReportHash: command.qualityReportHash,
      operatorPrincipal: DOCTRINE_RETRIEVAL_OPERATOR_PRINCIPAL,
    });
    await client.query(
      `INSERT INTO pa_doctrine_corpus_activations
        (activation_sequence,activation_id,run_id,snapshot_id,profile_hash,
         quality_report_hash,operator_principal,record)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [activation.activationSequence,activation.activationId,activation.runId,activation.snapshotId,activation.profileHash,activation.qualityReportHash,activation.operatorPrincipal,canonicalStringify(activation)],
    );
    return deepFreeze({ status: "inserted", activation });
  });
}

async function currentActivation(
  client: CaseStoreDatabaseClientV1,
): Promise<Readonly<DoctrineCorpusActivationV1> | null> {
  const result = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_doctrine_corpus_activations ORDER BY activation_sequence DESC LIMIT 1",
  );
  return result.rows[0] === undefined ? null : materializeActivation(result.rows[0].record);
}

async function query(
  database: CaseStoreDatabaseV1,
  command: DoctrineRetrievalQueryCommandV1,
): Promise<Readonly<DoctrineRetrievalResponseV1>> {
  assertDoctrineRetrievalQueryCommand(command);
  const normalized = normalizeDoctrineQuery(command.query);
  try {
    return await database.transaction((client) =>
      executeQueryTransaction(client, command, normalized),
    );
  } catch (error) {
    const errorCode =
      error instanceof Error && error.message.includes("latest activation")
        ? "ACTIVATION_NOT_ELIGIBLE"
        : "RETRIEVAL_FAILED";
    try {
      return await database.transaction((client) =>
        persistFailedQuery(client, command, normalized, errorCode, error),
      );
    } catch {
      throw error;
    }
  }
}

async function executeQueryTransaction(
  client: CaseStoreDatabaseClientV1,
  command: DoctrineRetrievalQueryCommandV1,
  normalized: string,
): Promise<Readonly<DoctrineRetrievalResponseV1>> {
  const activation = await currentActivation(client);
  if (activation === null) fail("Doctrine retrieval is not ready before activation");
  for (const [requested, actual, name] of [
    [command.activationId, activation.activationId, "activationId"],
    [command.snapshotId, activation.snapshotId, "snapshotId"],
    [command.profileHash, activation.profileHash, "profileHash"],
  ] as const) {
    if (requested !== undefined && requested !== actual) {
      fail(`${name} must name the latest activation`);
    }
  }
  const limit = command.limit ?? 5;
  const queryRecord = await buildQueryRecord(
    client,
    activation,
    command,
    normalized,
    limit,
  );
  const retired = await client.query<{ readonly retired: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pa_doctrine_corpus_entries AS entry
       JOIN pa_doctrine_retirements AS retirement
         ON retirement.doctrine_id=entry.doctrine_id
       WHERE entry.snapshot_id=$1
     ) AS retired`,
    [activation.snapshotId],
  );
  const rows = retired.rows[0]?.retired === true
    ? []
    : await executeLexical(
        client,
        activation.runId,
        queryRecord.normalizedQuery,
        limit,
      );
  const status = retired.rows[0]?.retired === true
    ? "failed"
    : rows.length === 0
      ? "no_match"
      : "matched";
  const evidence = createDoctrineRetrievalEvidence({
    schemaVersion: DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION,
    queryId: queryRecord.queryId,
    activationId: activation.activationId,
    runId: activation.runId,
    snapshotId: activation.snapshotId,
    profileHash: activation.profileHash,
    normalizedQuery: queryRecord.normalizedQuery,
    queryHash: queryRecord.queryHash,
    limit,
    status,
    results: rows.map((row, index) => ({
      rank: index + 1,
      doctrineId: row.doctrine_id,
      ragRecordHash: row.rag_record_hash,
      scoreHex: row.score_hex,
    })),
    errorCodes: status === "failed" ? ["CORPUS_RETIRED"] : [],
  });
  await insertQueryAndEvidence(client, queryRecord, evidence);
  const ragRecords = status === "matched"
    ? await loadRagRecords(client, activation.snapshotId, rows)
    : [];
  return deepFreeze({ evidence, ragRecords });
}

async function persistFailedQuery(
  client: CaseStoreDatabaseClientV1,
  command: DoctrineRetrievalQueryCommandV1,
  normalized: string,
  errorCode: "ACTIVATION_NOT_ELIGIBLE" | "RETRIEVAL_FAILED",
  originalError: unknown,
): Promise<Readonly<DoctrineRetrievalResponseV1>> {
  const activation = await currentActivation(client);
  if (activation === null) throw originalError;
  const limit = command.limit ?? 5;
  const queryRecord = await buildQueryRecord(
    client,
    activation,
    command,
    normalized,
    limit,
  );
  const evidence = createDoctrineRetrievalEvidence({
    schemaVersion: DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION,
    queryId: queryRecord.queryId,
    activationId: activation.activationId,
    runId: activation.runId,
    snapshotId: activation.snapshotId,
    profileHash: activation.profileHash,
    normalizedQuery: queryRecord.normalizedQuery,
    queryHash: queryRecord.queryHash,
    limit,
    status: "failed",
    results: [],
    errorCodes: [errorCode],
  });
  await insertQueryAndEvidence(client, queryRecord, evidence);
  return deepFreeze({ evidence, ragRecords: [] });
}

async function buildQueryRecord(
  client: CaseStoreDatabaseClientV1,
  activation: DoctrineCorpusActivationV1,
  command: DoctrineRetrievalQueryCommandV1,
  normalized: string,
  limit: number,
) {
  const queryHash = canonicalHash({
    schemaVersion: "doctrine-retrieval.v1",
    normalizedQuery: normalized,
  });
  let repeatIndex = command.repeatIndex;
  if (repeatIndex === undefined) {
    const next = await client.query<{ readonly next_index: number }>(
      `SELECT coalesce(max(repeat_index),-1)+1 AS next_index
       FROM pa_doctrine_retrieval_queries
       WHERE snapshot_id=$1 AND profile_hash=$2
         AND query_hash=$3 AND requested_limit=$4`,
      [activation.snapshotId, activation.profileHash, queryHash, limit],
    );
    repeatIndex = next.rows[0]?.next_index ?? 0;
  }
  return createDoctrineRetrievalQuery({
    activationId: activation.activationId,
    runId: activation.runId,
    snapshotId: activation.snapshotId,
    profileHash: activation.profileHash,
    originalQuery: command.query,
    limit,
    repeatIndex,
    operatorPrincipal: DOCTRINE_RETRIEVAL_OPERATOR_PRINCIPAL,
  });
}

async function insertQueryAndEvidence(
  client: CaseStoreDatabaseClientV1,
  queryRecord: ReturnType<typeof createDoctrineRetrievalQuery>,
  evidence: DoctrineRetrievalEvidenceV1,
): Promise<void> {
  await client.query(
    `INSERT INTO pa_doctrine_retrieval_queries
      (query_id,activation_id,run_id,snapshot_id,profile_hash,query_hash,
       normalized_query,original_query,requested_limit,repeat_index,
       operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
    [
      queryRecord.queryId,
      queryRecord.activationId,
      queryRecord.runId,
      queryRecord.snapshotId,
      queryRecord.profileHash,
      queryRecord.queryHash,
      queryRecord.normalizedQuery,
      queryRecord.originalQuery,
      queryRecord.limit,
      queryRecord.repeatIndex,
      queryRecord.operatorPrincipal,
      canonicalStringify(queryRecord),
    ],
  );
  await client.query(
    `INSERT INTO pa_doctrine_retrieval_evidence
      (evidence_id,query_id,activation_id,run_id,snapshot_id,profile_hash,status,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      evidence.evidenceId,
      evidence.queryId,
      evidence.activationId,
      evidence.runId,
      evidence.snapshotId,
      evidence.profileHash,
      evidence.status,
      canonicalStringify(evidence),
    ],
  );
}

async function loadRagRecords(
  client: CaseStoreDatabaseClientV1,
  snapshotId: ContractSha256,
  rows: readonly RetrievalRowV1[],
): Promise<readonly DoctrineRagRecordV1[]> {
  const records = [];
  for (const row of rows) {
    const result = await client.query<{ readonly record: unknown }>(
      `SELECT record FROM pa_doctrine_corpus_entries
       WHERE snapshot_id=$1 AND doctrine_id=$2 AND rag_record_hash=$3`,
      [snapshotId, row.doctrine_id, row.rag_record_hash],
    );
    const entry = materialize<{ readonly ragRecord: DoctrineRagRecordV1 }>(result.rows[0]?.record);
    records.push(entry.ragRecord);
  }
  return deepFreeze(records);
}

async function getSnapshot(client: CaseStoreDatabaseClientV1, id: ContractSha256) {
  const result = await client.query<{ readonly record: unknown }>("SELECT record FROM pa_doctrine_corpus_snapshots WHERE snapshot_id=$1", [id]);
  if (result.rows[0] === undefined) return null;
  const snapshot = materialize<DoctrineCorpusSnapshotV1>(result.rows[0].record);
  assertDoctrineCorpusSnapshotIntegrity(snapshot);
  return deepFreeze(snapshot);
}
async function getRun(client: CaseStoreDatabaseClientV1, id: ContractSha256) {
  const result = await client.query<{ readonly record: unknown }>("SELECT record FROM pa_doctrine_ingestion_runs WHERE run_id=$1", [id]);
  if (result.rows[0] === undefined) return null;
  const run = materialize<DoctrineIngestionRunV1>(result.rows[0].record);
  assertDoctrineIngestionRunIntegrity(run);
  return deepFreeze(run);
}
async function getEvidence(client: CaseStoreDatabaseClientV1, id: ContractSha256) {
  const result = await client.query<{ readonly record: unknown }>("SELECT record FROM pa_doctrine_retrieval_evidence WHERE evidence_id=$1", [id]);
  if (result.rows[0] === undefined) return null;
  const evidence = materialize<DoctrineRetrievalEvidenceV1>(result.rows[0].record);
  assertDoctrineRetrievalEvidenceIntegrity(evidence);
  return deepFreeze(evidence);
}
async function findRunByNaturalIdentity(client: CaseStoreDatabaseClientV1, snapshotId: ContractSha256, attemptIndex: number) {
  const result = await client.query<{ readonly record: unknown }>("SELECT record FROM pa_doctrine_ingestion_runs WHERE snapshot_id=$1 AND profile_hash=$2 AND attempt_index=$3", [snapshotId, DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash, attemptIndex]);
  if (result.rows[0] === undefined) return null;
  const run = materialize<DoctrineIngestionRunV1>(result.rows[0].record);
  assertDoctrineIngestionRunIntegrity(run);
  return run;
}
function materialize<T>(value: unknown): T {
  if (value === null || value === undefined) fail("stored Doctrine retrieval record is missing");
  return structuredClone(value) as T;
}
function materializeActivation(value: unknown): Readonly<DoctrineCorpusActivationV1> {
  const activation = materialize<DoctrineCorpusActivationV1>(value);
  const { activationId, ...body } = activation;
  if (canonicalHash(body) !== activationId) fail("stored activation identity mismatch");
  return deepFreeze(activation);
}
function fail(message: string): never {
  throw new Error(message);
}
