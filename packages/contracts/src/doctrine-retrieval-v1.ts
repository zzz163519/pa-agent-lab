import {
  assertNonEmpty,
  assertSha256,
  assertStringList,
  assertUnique,
  canonicalHash,
  canonicalStringify,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  toDoctrineRagRecord,
  type DoctrineRagRecordV1,
  type SourceV1,
} from "./doctrine-v1.ts";
import {
  assertDoctrineApprovalIntegrity,
  assertDoctrineProposalBundleIntegrity,
  type DoctrineApprovalV1,
  type DoctrineProposalBundleV1,
} from "./doctrine-approval-v1.ts";

export const DOCTRINE_RETRIEVAL_SCHEMA_VERSION = "doctrine-retrieval.v1" as const;
export const DOCTRINE_CORPUS_ENTRY_SCHEMA_VERSION = "doctrine-corpus-entry.v1" as const;
export const DOCTRINE_CORPUS_SNAPSHOT_SCHEMA_VERSION = "doctrine-corpus-snapshot.v1" as const;
export const DOCTRINE_RETRIEVAL_PROFILE_SCHEMA_VERSION = "doctrine-retrieval-profile.v1" as const;
export const DOCTRINE_INGESTION_RUN_SCHEMA_VERSION = "doctrine-ingestion-run.v1" as const;
export const DOCTRINE_QUALITY_SUITE_SCHEMA_VERSION = "doctrine-retrieval-quality-suite.v1" as const;
export const DOCTRINE_QUALITY_REPORT_SCHEMA_VERSION = "doctrine-retrieval-quality-report.v1" as const;
export const DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION = "doctrine-corpus-activation.v1" as const;
export const DOCTRINE_RETRIEVAL_QUERY_SCHEMA_VERSION = "doctrine-retrieval-query.v1" as const;
export const DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION = "doctrine-retrieval-evidence.v1" as const;
export const DOCTRINE_RETRIEVAL_DEFAULT_LIMIT = 5;
export const DOCTRINE_RETRIEVAL_MAX_LIMIT = 8;
export const DOCTRINE_RETRIEVAL_MAX_QUERY_SCALARS = 400;
export const DOCTRINE_RETRIEVAL_RUNTIME =
  "pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352" as const;

export const DOCTRINE_RETRIEVAL_SOURCE_ALLOWLIST = deepFreeze([
  { sourceId: "source:btc-six-aspects-v1", sourceType: "brooks_website", title: "What is Price Action? Six Aspects", urlOrLocalRef: "https://www.brookstradingcourse.com/price-action/what-is-price-action-6-aspects/", contentHash: "sha256:f1ec149fe8ba929b66836b22b516442b22cb4b7c3fffa260b0250c93b758c372", private: false },
  { sourceId: "source:btc-professional-pa-trader-v1", sourceType: "brooks_website", title: "Professional Price Action Trader", urlOrLocalRef: "https://www.brookstradingcourse.com/price-action/professional-price-action-trader/", contentHash: "sha256:065ae939131da39f74d61d6e4b83a2a426f3dd1f4de6d3ac90e47cd5a43b7b8c", private: false },
  { sourceId: "source:ask-al-breakouts-2016-09-25", sourceType: "brooks_website", title: "Breakouts", urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/breakouts/", contentHash: "sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b", private: false },
  { sourceId: "source:ask-al-pullbacks-entering-2016-05-01", sourceType: "brooks_website", title: "Pullbacks and Entering", urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/pullbacks-entering/", contentHash: "sha256:5a6f6262d86dc6f0a9094a60bdf9bddac973361cc4ae72ef16320cb884481bdb", private: false },
  { sourceId: "source:ask-al-trading-range-breakout-failures-2015-12-27", sourceType: "brooks_website", title: "Trading Range Breakout Failures", urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/trading-range-breakout-failures/", contentHash: "sha256:2703c5561739179736e4fbcc5b42bbfc7c27dcec85561dc58912687406bd6378", private: false },
  { sourceId: "source:ask-al-small-pullback-trend-2017-02-05", sourceType: "brooks_website", title: "Small Pullback Trend", urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/small-pullback-trend-bought-many-times/", contentHash: "sha256:e84b0e60cfc574506d58ad214958013704f704efec35a8a3766445c4d3fa3155", private: false },
] as const satisfies readonly SourceV1[]);

export const DOCTRINE_INGESTION_ERROR_CODES = [
  "RUNTIME_MISMATCH",
  "EMPTY_CORPUS",
  "SOURCE_NOT_ALLOWED",
  "INVALID_ENTRY",
  "INGESTION_FAILED",
] as const;
export const DOCTRINE_RETRIEVAL_ERROR_CODES = [
  "ACTIVATION_NOT_ELIGIBLE",
  "CORPUS_RETIRED",
  "RETRIEVAL_FAILED",
] as const;
export type DoctrineIngestionErrorCodeV1 = (typeof DOCTRINE_INGESTION_ERROR_CODES)[number];
export type DoctrineRetrievalErrorCodeV1 = (typeof DOCTRINE_RETRIEVAL_ERROR_CODES)[number];

export interface DoctrineCorpusEntryV1 {
  readonly schemaVersion: typeof DOCTRINE_CORPUS_ENTRY_SCHEMA_VERSION;
  readonly doctrineId: string;
  readonly proposalHash: ContractSha256;
  readonly approvalHash: ContractSha256;
  readonly sourceId: string;
  readonly sourceContentHash: ContractSha256;
  readonly ragRecord: DoctrineRagRecordV1;
  readonly ragRecordHash: ContractSha256;
}
export interface DoctrineCorpusSnapshotV1 {
  readonly schemaVersion: typeof DOCTRINE_CORPUS_SNAPSHOT_SCHEMA_VERSION;
  readonly entries: readonly DoctrineCorpusEntryV1[];
  readonly snapshotId: ContractSha256;
}
export interface DoctrineRetrievalProfileV1 {
  readonly schemaVersion: typeof DOCTRINE_RETRIEVAL_PROFILE_SCHEMA_VERSION;
  readonly engine: "postgresql_fts";
  readonly runtime: typeof DOCTRINE_RETRIEVAL_RUNTIME;
  readonly postgresqlMajor: 18;
  readonly textSearchConfiguration: "pg_catalog.english";
  readonly fields: readonly ["concept", "rule", "appliesWhen", "avoidWhen", "decisionEffect"];
  readonly fieldWeight: "D";
  readonly arraySeparator: "\n";
  readonly queryParser: "plainto_tsquery";
  readonly matchPredicate: "document_vector_@@_parsed_query";
  readonly rankFunction: "ts_rank_cd_0";
  readonly defaultLimit: 5;
  readonly maxLimit: 8;
  readonly ordering: "rank_desc_doctrine_id_c";
  readonly scoreEncoding: "float4send_hex";
  readonly queryRewriting: "none";
  readonly profileHash: ContractSha256;
}
export interface DoctrineIngestionRunV1 {
  readonly schemaVersion: typeof DOCTRINE_INGESTION_RUN_SCHEMA_VERSION;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly attemptIndex: number;
  readonly status: "succeeded" | "failed";
  readonly entryCount: number;
  readonly ragRecordHashes: readonly ContractSha256[];
  readonly logicalDocumentHashes: readonly ContractSha256[];
  readonly lexicalManifestHash: ContractSha256 | null;
  readonly errorCodes: readonly DoctrineIngestionErrorCodeV1[];
  readonly runId: ContractSha256;
}
export interface DoctrineQualityFixtureV1 {
  readonly fixtureId: string;
  readonly kind: "positive" | "cross_concept" | "no_match" | "isolation";
  readonly query: string;
  readonly requiredDoctrineIds: readonly string[];
  readonly expectedDoctrineIdOrder: readonly string[];
  readonly expectedStatus: "matched" | "no_match";
}
export interface DoctrineRetrievalQualitySuiteV1 {
  readonly schemaVersion: typeof DOCTRINE_QUALITY_SUITE_SCHEMA_VERSION;
  readonly profileHash: ContractSha256;
  readonly fixtures: readonly DoctrineQualityFixtureV1[];
  readonly qualitySuiteHash: ContractSha256;
}
export interface DoctrineRetrievalQualityReportV1 {
  readonly schemaVersion: typeof DOCTRINE_QUALITY_REPORT_SCHEMA_VERSION;
  readonly suiteHash: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly runId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly status: "passed" | "failed";
  readonly fixtureResultHashes: readonly ContractSha256[];
  readonly qualityReportHash: ContractSha256;
}
export interface DoctrineCorpusActivationV1 {
  readonly schemaVersion: typeof DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION;
  readonly activationSequence: number;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly qualityReportHash: ContractSha256;
  readonly operatorPrincipal: "local:phase2-operator";
  readonly activationId: ContractSha256;
}
export interface DoctrineRetrievalQueryV1 {
  readonly schemaVersion: typeof DOCTRINE_RETRIEVAL_QUERY_SCHEMA_VERSION;
  readonly activationId: ContractSha256;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly originalQuery: string;
  readonly normalizedQuery: string;
  readonly queryHash: ContractSha256;
  readonly limit: number;
  readonly repeatIndex: number;
  readonly operatorPrincipal: "local:phase2-operator";
  readonly queryId: ContractSha256;
}
export interface DoctrineRetrievalResultV1 {
  readonly rank: number;
  readonly doctrineId: string;
  readonly ragRecordHash: ContractSha256;
  readonly scoreHex: string;
}
export interface DoctrineRetrievalEvidenceV1 {
  readonly schemaVersion: typeof DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION;
  readonly queryId: ContractSha256;
  readonly activationId: ContractSha256;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly normalizedQuery: string;
  readonly queryHash: ContractSha256;
  readonly limit: number;
  readonly status: "matched" | "no_match" | "failed";
  readonly results: readonly DoctrineRetrievalResultV1[];
  readonly errorCodes: readonly DoctrineRetrievalErrorCodeV1[];
  readonly evidenceId: ContractSha256;
}
export interface DoctrineRetrievalResponseV1 {
  readonly evidence: DoctrineRetrievalEvidenceV1;
  readonly ragRecords: readonly DoctrineRagRecordV1[];
}

export class DoctrineRetrievalContractError extends Error {
  override readonly name = "DoctrineRetrievalContractError";
}

const PROFILE_BODY = {
  schemaVersion: DOCTRINE_RETRIEVAL_PROFILE_SCHEMA_VERSION,
  engine: "postgresql_fts",
  runtime: DOCTRINE_RETRIEVAL_RUNTIME,
  postgresqlMajor: 18,
  textSearchConfiguration: "pg_catalog.english",
  fields: ["concept", "rule", "appliesWhen", "avoidWhen", "decisionEffect"],
  fieldWeight: "D",
  arraySeparator: "\n",
  queryParser: "plainto_tsquery",
  matchPredicate: "document_vector_@@_parsed_query",
  rankFunction: "ts_rank_cd_0",
  defaultLimit: 5,
  maxLimit: 8,
  ordering: "rank_desc_doctrine_id_c",
  scoreEncoding: "float4send_hex",
  queryRewriting: "none",
} as const;

export function createDoctrineRetrievalProfile(): Readonly<DoctrineRetrievalProfileV1> {
  return deepFreeze({ ...PROFILE_BODY, profileHash: canonicalHash(PROFILE_BODY) });
}
export const DOCTRINE_RETRIEVAL_PROFILE_V1 = createDoctrineRetrievalProfile();
export const DOCTRINE_RETRIEVAL_PROFILE_HASH = DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash;

export function assertPhase4aSource(source: SourceV1): void {
  const expected = DOCTRINE_RETRIEVAL_SOURCE_ALLOWLIST.find(
    (value) => value.sourceId === source.sourceId,
  );
  if (expected === undefined || canonicalStringify(expected) !== canonicalStringify(source)) {
    fail("Source is outside the exact Phase 4A allowlist");
  }
}

export function createDoctrineCorpusEntry(input: {
  readonly proposal: DoctrineProposalBundleV1;
  readonly approval: DoctrineApprovalV1;
}): Readonly<DoctrineCorpusEntryV1> {
  exactRecord("DoctrineCorpusEntry input", input, ["proposal", "approval"]);
  assertDoctrineProposalBundleIntegrity(input.proposal);
  assertDoctrineApprovalIntegrity(input.approval, input.proposal);
  assertPhase4aSource(input.proposal.source);
  const ragRecord = toDoctrineRagRecord({
    ...input.proposal.doctrineUnit,
    status: "approved",
  });
  const body = {
    schemaVersion: DOCTRINE_CORPUS_ENTRY_SCHEMA_VERSION,
    doctrineId: input.proposal.doctrineUnit.doctrineId,
    proposalHash: input.proposal.proposalHash,
    approvalHash: input.approval.approvalHash,
    sourceId: input.proposal.source.sourceId,
    sourceContentHash: input.proposal.source.contentHash,
    ragRecord,
    ragRecordHash: canonicalHash(ragRecord),
  } as const;
  return deepFreeze(body);
}

export function assertDoctrineCorpusEntryIntegrity(value: unknown): asserts value is DoctrineCorpusEntryV1 {
  const entry = exactRecord<DoctrineCorpusEntryV1>("DoctrineCorpusEntry", value, [
    "schemaVersion", "doctrineId", "proposalHash", "approvalHash", "sourceId",
    "sourceContentHash", "ragRecord", "ragRecordHash",
  ]);
  if (entry.schemaVersion !== DOCTRINE_CORPUS_ENTRY_SCHEMA_VERSION) fail("DoctrineCorpusEntry schemaVersion is unsupported");
  assertNonEmpty("doctrineId", entry.doctrineId);
  assertNonEmpty("sourceId", entry.sourceId);
  for (const [name, hash] of [["proposalHash", entry.proposalHash], ["approvalHash", entry.approvalHash], ["sourceContentHash", entry.sourceContentHash], ["ragRecordHash", entry.ragRecordHash]] as const) assertSha256(name, hash);
  const allowedSource = DOCTRINE_RETRIEVAL_SOURCE_ALLOWLIST.find(
    (source) => source.sourceId === entry.sourceId,
  );
  if (allowedSource?.contentHash !== entry.sourceContentHash) {
    fail("DoctrineCorpusEntry Source identity is outside the Phase 4A allowlist");
  }
  const rag = exactRecord<DoctrineRagRecordV1>("DoctrineRagRecord", entry.ragRecord, ["doctrineId", "concept", "rule", "appliesWhen", "avoidWhen", "decisionEffect"]);
  if (rag.doctrineId !== entry.doctrineId || canonicalHash(rag) !== entry.ragRecordHash) fail("DoctrineCorpusEntry RAG identity mismatch");
  assertNonEmpty("concept", rag.concept);
  assertNonEmpty("rule", rag.rule);
  for (const field of ["appliesWhen", "avoidWhen", "decisionEffect"] as const) assertStringList(field, rag[field], { min: 1, max: 12 });
}

export function createDoctrineCorpusSnapshot(entries: readonly DoctrineCorpusEntryV1[]): Readonly<DoctrineCorpusSnapshotV1> {
  if (entries.length === 0) fail("corpus snapshot must not be empty");
  entries.forEach(assertDoctrineCorpusEntryIntegrity);
  const ordered = [...entries].sort((left, right) => utf8Compare(left.doctrineId, right.doctrineId));
  for (const field of ["doctrineId", "proposalHash", "approvalHash", "ragRecordHash"] as const) assertUnique(`corpus ${field}`, ordered.map((entry) => entry[field]));
  const body = { schemaVersion: DOCTRINE_CORPUS_SNAPSHOT_SCHEMA_VERSION, entries: structuredClone(ordered) } as const;
  return deepFreeze({ ...body, snapshotId: canonicalHash(body) });
}

export function assertDoctrineCorpusSnapshotIntegrity(value: unknown): asserts value is DoctrineCorpusSnapshotV1 {
  const snapshot = exactRecord<DoctrineCorpusSnapshotV1>("DoctrineCorpusSnapshot", value, ["schemaVersion", "entries", "snapshotId"]);
  if (snapshot.schemaVersion !== DOCTRINE_CORPUS_SNAPSHOT_SCHEMA_VERSION || !Array.isArray(snapshot.entries) || snapshot.entries.length === 0) fail("DoctrineCorpusSnapshot is invalid");
  assertSha256("snapshotId", snapshot.snapshotId);
  const rebuilt = createDoctrineCorpusSnapshot(snapshot.entries);
  if (canonicalStringify(rebuilt.entries) !== canonicalStringify(snapshot.entries) || rebuilt.snapshotId !== snapshot.snapshotId) fail("DoctrineCorpusSnapshot identity or ordering mismatch");
}

export function normalizeDoctrineQuery(value: string): string {
  if (typeof value !== "string" || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) fail("query contains a NUL or control character");
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  const scalarCount = Array.from(normalized).length;
  if (scalarCount < 1 || scalarCount > DOCTRINE_RETRIEVAL_MAX_QUERY_SCALARS) fail("query must contain 1 through 400 Unicode scalar values");
  return normalized;
}

export function createDoctrineRetrievalQuery(input: {
  readonly activationId: ContractSha256;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly originalQuery: string;
  readonly limit?: number;
  readonly repeatIndex: number;
  readonly operatorPrincipal: "local:phase2-operator";
}): Readonly<DoctrineRetrievalQueryV1> {
  exactRecord(
    "DoctrineRetrievalQuery input",
    input,
    input.limit === undefined
      ? [
          "activationId", "runId", "snapshotId", "profileHash",
          "originalQuery", "repeatIndex", "operatorPrincipal",
        ]
      : [
          "activationId", "runId", "snapshotId", "profileHash",
          "originalQuery", "limit", "repeatIndex", "operatorPrincipal",
        ],
  );
  for (const [name, hash] of [["activationId", input.activationId], ["runId", input.runId], ["snapshotId", input.snapshotId], ["profileHash", input.profileHash]] as const) assertSha256(name, hash);
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  const normalizedQuery = normalizeDoctrineQuery(input.originalQuery);
  const limit = input.limit ?? DOCTRINE_RETRIEVAL_DEFAULT_LIMIT;
  nonNegativeInteger("repeatIndex", input.repeatIndex);
  if (!Number.isInteger(limit) || limit < 1 || limit > DOCTRINE_RETRIEVAL_MAX_LIMIT) fail("limit must be between 1 and 8");
  if (input.operatorPrincipal !== "local:phase2-operator") fail("operatorPrincipal is unsupported");
  const body = {
    schemaVersion: DOCTRINE_RETRIEVAL_QUERY_SCHEMA_VERSION,
    activationId: input.activationId,
    runId: input.runId,
    snapshotId: input.snapshotId,
    profileHash: input.profileHash,
    originalQuery: input.originalQuery,
    normalizedQuery,
    queryHash: canonicalHash({ schemaVersion: DOCTRINE_RETRIEVAL_SCHEMA_VERSION, normalizedQuery }),
    limit,
    repeatIndex: input.repeatIndex,
    operatorPrincipal: input.operatorPrincipal,
  } as const;
  return deepFreeze({ ...body, queryId: canonicalHash(body) });
}

export function assertDoctrineRetrievalQueryIntegrity(value: unknown): asserts value is DoctrineRetrievalQueryV1 {
  const query = exactRecord<DoctrineRetrievalQueryV1>("DoctrineRetrievalQuery", value, ["schemaVersion", "activationId", "runId", "snapshotId", "profileHash", "originalQuery", "normalizedQuery", "queryHash", "limit", "repeatIndex", "operatorPrincipal", "queryId"]);
  if (query.schemaVersion !== DOCTRINE_RETRIEVAL_QUERY_SCHEMA_VERSION) fail("DoctrineRetrievalQuery schemaVersion is unsupported");
  const { queryId, normalizedQuery, queryHash, ...input } = query;
  const rebuilt = createDoctrineRetrievalQuery(input);
  if (rebuilt.queryId !== queryId || rebuilt.queryHash !== queryHash || rebuilt.normalizedQuery !== normalizedQuery) fail("DoctrineRetrievalQuery identity mismatch");
}

export function createDoctrineIngestionRun(input: Omit<DoctrineIngestionRunV1, "runId">): Readonly<DoctrineIngestionRunV1> {
  exactRecord("DoctrineIngestionRun input", input, [
    "schemaVersion", "snapshotId", "profileHash", "attemptIndex", "status",
    "entryCount", "ragRecordHashes", "logicalDocumentHashes",
    "lexicalManifestHash", "errorCodes",
  ]);
  if (input.schemaVersion !== DOCTRINE_INGESTION_RUN_SCHEMA_VERSION) {
    fail("DoctrineIngestionRun schemaVersion is unsupported");
  }
  assertSha256("snapshotId", input.snapshotId);
  assertSha256("profileHash", input.profileHash);
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  if (input.status !== "succeeded" && input.status !== "failed") {
    fail("DoctrineIngestionRun status is unsupported");
  }
  nonNegativeInteger("attemptIndex", input.attemptIndex);
  nonNegativeInteger("entryCount", input.entryCount);
  input.ragRecordHashes.forEach((hash) => assertSha256("ragRecordHash", hash));
  input.logicalDocumentHashes.forEach((hash) => assertSha256("logicalDocumentHash", hash));
  assertUnique("ragRecordHashes", input.ragRecordHashes);
  assertUnique("logicalDocumentHashes", input.logicalDocumentHashes);
  assertUnique("ingestion errorCodes", input.errorCodes);
  if (input.errorCodes.some((code) => !DOCTRINE_INGESTION_ERROR_CODES.includes(code))) {
    fail("DoctrineIngestionRun error code is unsupported");
  }
  if (input.status === "succeeded") {
    if (input.entryCount < 1 || input.ragRecordHashes.length !== input.entryCount || input.logicalDocumentHashes.length !== input.entryCount || input.lexicalManifestHash === null || input.errorCodes.length !== 0) fail("successful run is incomplete");
    assertSha256("lexicalManifestHash", input.lexicalManifestHash);
  } else if (input.entryCount !== 0 || input.ragRecordHashes.length !== 0 || input.logicalDocumentHashes.length !== 0 || input.lexicalManifestHash !== null || input.errorCodes.length === 0) {
    fail("failed run must contain only bounded errors");
  }
  const body = structuredClone(input);
  return deepFreeze({ ...body, runId: canonicalHash(body) });
}

export function assertDoctrineIngestionRunIntegrity(value: unknown): asserts value is DoctrineIngestionRunV1 {
  const run = exactRecord<DoctrineIngestionRunV1>("DoctrineIngestionRun", value, ["schemaVersion", "snapshotId", "profileHash", "attemptIndex", "status", "entryCount", "ragRecordHashes", "logicalDocumentHashes", "lexicalManifestHash", "errorCodes", "runId"]);
  const { runId, ...body } = run;
  if (run.schemaVersion !== DOCTRINE_INGESTION_RUN_SCHEMA_VERSION || createDoctrineIngestionRun(body).runId !== runId) fail("DoctrineIngestionRun identity mismatch");
}

export function createDoctrineRetrievalQualitySuite(input: { readonly profileHash: ContractSha256; readonly fixtures: readonly DoctrineQualityFixtureV1[] }): Readonly<DoctrineRetrievalQualitySuiteV1> {
  exactRecord("DoctrineRetrievalQualitySuite input", input, [
    "profileHash", "fixtures",
  ]);
  assertSha256("profileHash", input.profileHash);
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  if (input.fixtures.length === 0) fail("quality suite must not be empty");
  const fixtures = input.fixtures.map((fixture) => validateQualityFixture(fixture));
  assertUnique("quality fixtureId", fixtures.map((fixture) => fixture.fixtureId));
  const body = { schemaVersion: DOCTRINE_QUALITY_SUITE_SCHEMA_VERSION, profileHash: input.profileHash, fixtures } as const;
  return deepFreeze({ ...body, qualitySuiteHash: canonicalHash(body) });
}

export function createDoctrineRetrievalQualityReport(input: Omit<DoctrineRetrievalQualityReportV1, "qualityReportHash">): Readonly<DoctrineRetrievalQualityReportV1> {
  exactRecord("DoctrineRetrievalQualityReport input", input, [
    "schemaVersion", "suiteHash", "snapshotId", "runId", "profileHash",
    "status", "fixtureResultHashes",
  ]);
  if (input.schemaVersion !== DOCTRINE_QUALITY_REPORT_SCHEMA_VERSION) {
    fail("DoctrineRetrievalQualityReport schemaVersion is unsupported");
  }
  for (const [name, hash] of [
    ["suiteHash", input.suiteHash],
    ["snapshotId", input.snapshotId],
    ["runId", input.runId],
    ["profileHash", input.profileHash],
  ] as const) {
    assertSha256(name, hash);
  }
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  if (input.status !== "passed" && input.status !== "failed") {
    fail("DoctrineRetrievalQualityReport status is unsupported");
  }
  if (input.fixtureResultHashes.length === 0) fail("quality report must bind fixture results");
  input.fixtureResultHashes.forEach((hash) => assertSha256("fixtureResultHash", hash));
  assertUnique("fixtureResultHashes", input.fixtureResultHashes);
  const body = structuredClone(input);
  return deepFreeze({ ...body, qualityReportHash: canonicalHash(body) });
}

export function createDoctrineCorpusActivation(input: Omit<DoctrineCorpusActivationV1, "activationId">): Readonly<DoctrineCorpusActivationV1> {
  exactRecord("DoctrineCorpusActivation input", input, [
    "schemaVersion", "activationSequence", "runId", "snapshotId",
    "profileHash", "qualityReportHash", "operatorPrincipal",
  ]);
  if (input.schemaVersion !== DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION) {
    fail("DoctrineCorpusActivation schemaVersion is unsupported");
  }
  for (const [name, hash] of [
    ["runId", input.runId],
    ["snapshotId", input.snapshotId],
    ["profileHash", input.profileHash],
    ["qualityReportHash", input.qualityReportHash],
  ] as const) {
    assertSha256(name, hash);
  }
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  if (!Number.isInteger(input.activationSequence) || input.activationSequence < 1) fail("activationSequence must be positive");
  if (input.operatorPrincipal !== "local:phase2-operator") fail("operatorPrincipal is unsupported");
  const body = structuredClone(input);
  return deepFreeze({ ...body, activationId: canonicalHash(body) });
}

export function createDoctrineRetrievalEvidence(input: Omit<DoctrineRetrievalEvidenceV1, "evidenceId">): Readonly<DoctrineRetrievalEvidenceV1> {
  exactRecord("DoctrineRetrievalEvidence input", input, [
    "schemaVersion", "queryId", "activationId", "runId", "snapshotId",
    "profileHash", "normalizedQuery", "queryHash", "limit", "status",
    "results", "errorCodes",
  ]);
  if (input.schemaVersion !== DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION) {
    fail("DoctrineRetrievalEvidence schemaVersion is unsupported");
  }
  for (const [name, hash] of [
    ["queryId", input.queryId],
    ["activationId", input.activationId],
    ["runId", input.runId],
    ["snapshotId", input.snapshotId],
    ["profileHash", input.profileHash],
    ["queryHash", input.queryHash],
  ] as const) {
    assertSha256(name, hash);
  }
  if (input.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
    fail("profileHash is unsupported");
  }
  const normalizedQuery = normalizeDoctrineQuery(input.normalizedQuery);
  if (normalizedQuery !== input.normalizedQuery) {
    fail("evidence normalizedQuery is not normalized");
  }
  if (input.queryHash !== canonicalHash({
    schemaVersion: DOCTRINE_RETRIEVAL_SCHEMA_VERSION,
    normalizedQuery,
  })) {
    fail("evidence queryHash does not match normalizedQuery");
  }
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > DOCTRINE_RETRIEVAL_MAX_LIMIT) {
    fail("evidence limit must be between 1 and 8");
  }
  if (input.status !== "matched" && input.status !== "no_match" && input.status !== "failed") {
    fail("DoctrineRetrievalEvidence status is unsupported");
  }
  assertUnique("retrieval errorCodes", input.errorCodes);
  if (input.errorCodes.some((code) => !DOCTRINE_RETRIEVAL_ERROR_CODES.includes(code))) {
    fail("DoctrineRetrievalEvidence error code is unsupported");
  }
  if (input.status === "matched") {
    if (input.results.length < 1 || input.results.length > input.limit || input.errorCodes.length !== 0) fail("matched evidence shape is invalid");
  } else if (input.results.length !== 0 || (input.status === "failed" ? input.errorCodes.length === 0 : input.errorCodes.length !== 0)) {
    fail("terminal evidence shape is invalid");
  }
  input.results.forEach((result, index) => {
    exactRecord("DoctrineRetrievalResult", result, [
      "rank", "doctrineId", "ragRecordHash", "scoreHex",
    ]);
    if (result.rank !== index + 1 || !/^[0-9a-f]{8}$/.test(result.scoreHex)) fail("retrieval result rank or score is invalid");
    assertNonEmpty("result doctrineId", result.doctrineId);
    assertSha256("result ragRecordHash", result.ragRecordHash);
  });
  assertUnique(
    "retrieval result doctrineIds",
    input.results.map((result) => result.doctrineId),
  );
  const body = structuredClone(input);
  return deepFreeze({ ...body, evidenceId: canonicalHash(body) });
}

export function assertDoctrineRetrievalEvidenceIntegrity(value: unknown): asserts value is DoctrineRetrievalEvidenceV1 {
  const evidence = exactRecord<DoctrineRetrievalEvidenceV1>("DoctrineRetrievalEvidence", value, ["schemaVersion", "queryId", "activationId", "runId", "snapshotId", "profileHash", "normalizedQuery", "queryHash", "limit", "status", "results", "errorCodes", "evidenceId"]);
  if (evidence.schemaVersion !== DOCTRINE_RETRIEVAL_EVIDENCE_SCHEMA_VERSION) fail("DoctrineRetrievalEvidence schemaVersion is unsupported");
  const { evidenceId, ...body } = evidence;
  createDoctrineRetrievalEvidence(body);
  if (canonicalHash(body) !== evidenceId) fail("DoctrineRetrievalEvidence identity mismatch");
}

function validateQualityFixture(fixture: DoctrineQualityFixtureV1): DoctrineQualityFixtureV1 {
  exactRecord("DoctrineQualityFixture", fixture, ["fixtureId", "kind", "query", "requiredDoctrineIds", "expectedDoctrineIdOrder", "expectedStatus"]);
  if (
    fixture.kind !== "positive" &&
    fixture.kind !== "cross_concept" &&
    fixture.kind !== "no_match" &&
    fixture.kind !== "isolation"
  ) {
    fail("quality fixture kind is unsupported");
  }
  if (fixture.expectedStatus !== "matched" && fixture.expectedStatus !== "no_match") {
    fail("quality fixture expectedStatus is unsupported");
  }
  assertNonEmpty("fixtureId", fixture.fixtureId);
  normalizeDoctrineQuery(fixture.query);
  assertUnique("requiredDoctrineIds", fixture.requiredDoctrineIds);
  assertUnique("expectedDoctrineIdOrder", fixture.expectedDoctrineIdOrder);
  if (fixture.expectedDoctrineIdOrder.some((id) => !fixture.requiredDoctrineIds.includes(id))) {
    fail("ordered quality IDs must also be required IDs");
  }
  if (fixture.expectedStatus === "matched" && fixture.kind === "positive" && fixture.requiredDoctrineIds.length === 0) fail("positive quality fixture requires Doctrine IDs");
  if (fixture.kind === "cross_concept" && fixture.expectedDoctrineIdOrder.length < 2) fail("cross-concept quality fixture requires ordered Doctrine IDs");
  if (fixture.expectedStatus === "no_match" && (fixture.requiredDoctrineIds.length !== 0 || fixture.expectedDoctrineIdOrder.length !== 0)) fail("no-match quality fixture cannot require Doctrine IDs");
  return structuredClone(fixture);
}

function exactRecord<T extends object>(name: string, value: unknown, keys: readonly string[]): T {
  if (value === null || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail(`${name} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(`${name} must contain exact keys: ${expected.join(", ")}`);
  return value as T;
}
function nonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) fail(`${name} must be a non-negative integer`);
}
function utf8Compare(left: string, right: string): number {
  return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"));
}
function fail(message: string): never {
  throw new DoctrineRetrievalContractError(message);
}
