import {
  assertBrooksDecisionIntegrity,
  assertBrooksPolicyCaseIntegrity,
  assertBrooksPolicyInputIntegrity,
  assertCalvinReviewIntegrity,
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  canonicalHash,
  createAnonymousMarketInput,
  deepFreeze,
  deriveDecisionConflict,
  type BrooksDecisionV1,
  type BrooksPolicyCaseV1,
  type BrooksPolicyInputV1,
  type CalvinReviewV1,
  type ContractSha256,
  type DecisionConflictV1,
} from "@pa-agent-lab/contracts";

import {
  assertAnonymousChartArtifactMetadataIntegrity,
  PersistenceContractError,
  type AnonymousChartArtifactMetadataV1,
} from "./chart-artifact-metadata-v1.ts";

export const SYNTHETIC_CASE_BUNDLE_SCHEMA_VERSION =
  "synthetic-case-bundle.v1" as const;
export const CASE_AUDIT_VIEW_SCHEMA_VERSION = "case-audit-view.v1" as const;
export const CASE_API_MUTATION_RESULT_SCHEMA_VERSION =
  "case-api-mutation-result.v1" as const;
export const CASE_API_ERROR_SCHEMA_VERSION = "case-api-error.v1" as const;
export const CASE_API_BODY_LIMIT_BYTES = 512 * 1024;

export const CASE_API_ERROR_CODES = [
  "INVALID_JSON",
  "INVALID_RECORD",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "IDENTITY_CONFLICT",
  "BODY_TOO_LARGE",
  "DEPENDENCY_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type CaseApiErrorCodeV1 = (typeof CASE_API_ERROR_CODES)[number];

export interface SyntheticCaseBindingV1 {
  readonly caseHash: ContractSha256;
  readonly inputHash: ContractSha256;
  readonly contextMetadataId: ContractSha256;
  readonly detailMetadataId: ContractSha256;
}

export interface SyntheticCaseBundleInputV1 {
  readonly sourceScope: "synthetic_fixture_only";
  readonly policyCase: BrooksPolicyCaseV1;
  readonly policyInput: BrooksPolicyInputV1;
  readonly chartMetadata: {
    readonly context: AnonymousChartArtifactMetadataV1;
    readonly detail: AnonymousChartArtifactMetadataV1;
  };
  readonly binding: SyntheticCaseBindingV1;
}

export interface SyntheticCaseBundleV1 extends SyntheticCaseBundleInputV1 {
  readonly schemaVersion: typeof SYNTHETIC_CASE_BUNDLE_SCHEMA_VERSION;
  readonly bundleHash: ContractSha256;
}

export interface CaseAuditViewInputV1 {
  readonly caseBundle: SyntheticCaseBundleV1;
  readonly decision: BrooksDecisionV1 | null;
  readonly review: CalvinReviewV1 | null;
}

export interface CaseAuditViewV1 extends CaseAuditViewInputV1 {
  readonly schemaVersion: typeof CASE_AUDIT_VIEW_SCHEMA_VERSION;
  readonly auditHash: ContractSha256;
  readonly caseHash: ContractSha256;
  readonly decisionConflict: DecisionConflictV1 | null;
}

export interface CaseApiMutationResultInputV1 {
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind:
    | "synthetic_case_bundle"
    | "brooks_decision"
    | "calvin_review";
  readonly resourceHash: ContractSha256;
}

export interface CaseApiMutationResultV1
  extends CaseApiMutationResultInputV1 {
  readonly schemaVersion: typeof CASE_API_MUTATION_RESULT_SCHEMA_VERSION;
}

export interface CaseApiErrorInputV1 {
  readonly requestId: string;
  readonly code: CaseApiErrorCodeV1;
  readonly message: string;
}

export interface CaseApiErrorV1 extends CaseApiErrorInputV1 {
  readonly schemaVersion: typeof CASE_API_ERROR_SCHEMA_VERSION;
}

export interface CaseApiRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication:
    | "operator_token"
    | "operator_or_reviewer_token"
    | "none";
  readonly transport: "request_response";
}

export const CASE_API_ROUTE_MANIFEST_V1 = deepFreeze([
  route("POST", "/v1/synthetic-case-bundles", "createSyntheticCaseBundle", "operator_token"),
  route("POST", "/v1/brooks-decisions", "appendBrooksDecision", "operator_token"),
  route("POST", "/v1/calvin-reviews", "appendCalvinReview", "operator_token"),
  route("GET", "/v1/cases/:caseHash", "getCase", "operator_token"),
  route("GET", "/v1/cases/:caseHash/audit", "getCaseAudit", "operator_token"),
  route(
    "GET",
    "/v1/chart-artifacts/:artifactId/content",
    "getChartArtifactContent",
    "operator_or_reviewer_token",
  ),
  route("GET", "/healthz", "getHealth", "none"),
  route("GET", "/readyz", "getReadiness", "none"),
] as const satisfies readonly CaseApiRouteManifestEntryV1[]);

export function createSyntheticCaseBundle(
  input: SyntheticCaseBundleInputV1,
): Readonly<SyntheticCaseBundleV1> {
  try {
    validateSyntheticCaseBundleBody(input);
    const body = structuredClone({
      schemaVersion: SYNTHETIC_CASE_BUNDLE_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, bundleHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertSyntheticCaseBundleIntegrity(
  value: unknown,
): asserts value is SyntheticCaseBundleV1 {
  try {
    const bundle = exactRecord("SyntheticCaseBundle", value, [
      "schemaVersion",
      "bundleHash",
      "sourceScope",
      "policyCase",
      "policyInput",
      "chartMetadata",
      "binding",
    ]) as unknown as SyntheticCaseBundleV1;
    if (bundle.schemaVersion !== SYNTHETIC_CASE_BUNDLE_SCHEMA_VERSION) {
      fail("SyntheticCaseBundle schemaVersion is unsupported");
    }
    assertSha256("bundleHash", bundle.bundleHash);
    validateSyntheticCaseBundleBody(bundle);
    const { bundleHash, ...body } = bundle;
    if (canonicalHash(body) !== bundleHash) {
      fail("SyntheticCaseBundle bundle hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createCaseAuditView(
  input: CaseAuditViewInputV1,
): Readonly<CaseAuditViewV1> {
  try {
    const decisionConflict = validateAuditInputs(input);
    const body = structuredClone({
      schemaVersion: CASE_AUDIT_VIEW_SCHEMA_VERSION,
      caseHash: input.caseBundle.policyCase.caseHash,
      caseBundle: input.caseBundle,
      decision: input.decision,
      review: input.review,
      decisionConflict,
    });
    return deepFreeze({ ...body, auditHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertCaseAuditViewIntegrity(
  value: unknown,
): asserts value is CaseAuditViewV1 {
  try {
    const audit = exactRecord("CaseAuditView", value, [
      "schemaVersion",
      "auditHash",
      "caseHash",
      "caseBundle",
      "decision",
      "review",
      "decisionConflict",
    ]) as unknown as CaseAuditViewV1;
    if (audit.schemaVersion !== CASE_AUDIT_VIEW_SCHEMA_VERSION) {
      fail("CaseAuditView schemaVersion is unsupported");
    }
    assertSha256("auditHash", audit.auditHash);
    assertSha256("caseHash", audit.caseHash);
    assertSyntheticCaseBundleIntegrity(audit.caseBundle);
    if (audit.caseHash !== audit.caseBundle.policyCase.caseHash) {
      fail("CaseAuditView caseHash does not match its bundle");
    }
    const expectedConflict = validateAuditInputs(audit);
    if (canonicalHash(expectedConflict) !== canonicalHash(audit.decisionConflict)) {
      fail("CaseAuditView derived conflict does not match its source records");
    }
    const { auditHash, ...body } = audit;
    if (canonicalHash(body) !== auditHash) {
      fail("CaseAuditView audit hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createCaseApiMutationResult(
  input: CaseApiMutationResultInputV1,
): Readonly<CaseApiMutationResultV1> {
  try {
    assertNonEmpty("requestId", input.requestId);
    assertOneOf("mutation status", input.status, ["inserted", "existing"] as const);
    assertOneOf("resourceKind", input.resourceKind, [
      "synthetic_case_bundle",
      "brooks_decision",
      "calvin_review",
    ] as const);
    assertSha256("resourceHash", input.resourceHash);
    return deepFreeze({
      schemaVersion: CASE_API_MUTATION_RESULT_SCHEMA_VERSION,
      ...structuredClone(input),
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createCaseApiError(
  input: CaseApiErrorInputV1,
): Readonly<CaseApiErrorV1> {
  try {
    assertNonEmpty("requestId", input.requestId);
    assertOneOf("API error code", input.code, CASE_API_ERROR_CODES);
    assertNonEmpty("API error message", input.message);
    if (Array.from(input.message).length > 300) {
      fail("API error message must be at most 300 characters");
    }
    return deepFreeze({
      schemaVersion: CASE_API_ERROR_SCHEMA_VERSION,
      ...structuredClone(input),
    });
  } catch (error) {
    rethrow(error);
  }
}

function validateSyntheticCaseBundleBody(
  input: SyntheticCaseBundleInputV1,
): void {
  if (input.sourceScope !== "synthetic_fixture_only") {
    fail("SyntheticCaseBundle sourceScope must be synthetic_fixture_only");
  }
  assertBrooksPolicyCaseIntegrity(input.policyCase);
  assertBrooksPolicyInputIntegrity(input.policyInput);
  assertAnonymousChartArtifactMetadataIntegrity(input.chartMetadata.context);
  assertAnonymousChartArtifactMetadataIntegrity(input.chartMetadata.detail);
  if (
    input.chartMetadata.context.panel !== "context" ||
    input.chartMetadata.detail.panel !== "detail"
  ) {
    fail("SyntheticCaseBundle requires context and detail chart metadata");
  }
  const expectedMarket = createAnonymousMarketInput(input.policyCase);
  const anonymousMarketHash = canonicalHash(expectedMarket);
  if (
    canonicalHash(input.policyInput.market) !== canonicalHash(expectedMarket) ||
    input.chartMetadata.context.anonymousMarketHash !== anonymousMarketHash ||
    input.chartMetadata.detail.anonymousMarketHash !== anonymousMarketHash ||
    input.chartMetadata.context.sourceCaseHash !== input.policyCase.caseHash ||
    input.chartMetadata.detail.sourceCaseHash !== input.policyCase.caseHash
  ) {
    fail("SyntheticCaseBundle records do not share one causal Case identity");
  }
  if (
    input.chartMetadata.context.contentHash !==
      input.policyInput.charts.context.contentHash ||
    input.chartMetadata.detail.contentHash !==
      input.policyInput.charts.detail.contentHash ||
    canonicalHash(input.chartMetadata.context.barIds) !==
      canonicalHash(input.policyInput.charts.context.barIds) ||
    canonicalHash(input.chartMetadata.detail.barIds) !==
      canonicalHash(input.policyInput.charts.detail.barIds)
  ) {
    fail("SyntheticCaseBundle chart metadata does not match its policy input");
  }
  const binding = exactRecord("SyntheticCaseBinding", input.binding, [
    "caseHash",
    "inputHash",
    "contextMetadataId",
    "detailMetadataId",
  ]) as unknown as SyntheticCaseBindingV1;
  for (const [name, value] of Object.entries(binding)) {
    assertSha256(name, value);
  }
  if (
    binding.caseHash !== input.policyCase.caseHash ||
    binding.inputHash !== input.policyInput.inputHash ||
    binding.contextMetadataId !== input.chartMetadata.context.metadataId ||
    binding.detailMetadataId !== input.chartMetadata.detail.metadataId
  ) {
    fail("SyntheticCaseBundle binding does not match its records");
  }
}

function validateAuditInputs(input: CaseAuditViewInputV1): DecisionConflictV1 | null {
  assertSyntheticCaseBundleIntegrity(input.caseBundle);
  if (input.decision === null) {
    if (input.review !== null) fail("CalvinReview requires its BrooksDecision");
    return null;
  }
  assertBrooksDecisionIntegrity(input.decision, {
    caseId: input.caseBundle.policyCase.caseId,
    inputHash: input.caseBundle.policyInput.inputHash,
    lastVisibleBarId: input.caseBundle.policyInput.market.lastVisibleBarId,
    barDurationSeconds: input.caseBundle.policyCase.barDurationSeconds,
  });
  if (input.review === null) return null;
  assertCalvinReviewIntegrity(input.review, input.decision);
  return deriveDecisionConflict(input.decision, input.review);
}

function route(
  method: "GET" | "POST",
  path: string,
  operationId: string,
  authentication: "operator_token" | "operator_or_reviewer_token" | "none",
): CaseApiRouteManifestEntryV1 {
  return {
    method,
    path,
    openapiPath: path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
    operationId,
    authentication,
    transport: "request_response",
  };
}

function exactRecord(
  name: string,
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const names = Object.getOwnPropertyNames(record);
  if (
    names.length !== allowedKeys.length ||
    names.some((name) => !allowedKeys.includes(name)) ||
    allowedKeys.some((name) => !Object.hasOwn(record, name))
  ) {
    fail(`${name} fields must match the exact V1 contract`);
  }
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(record, name);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${name} fields must be enumerable data properties`);
    }
  }
  return record;
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  if (error instanceof Error) throw new PersistenceContractError(error.message);
  throw new PersistenceContractError("Phase 2 Case Store transport validation failed");
}
