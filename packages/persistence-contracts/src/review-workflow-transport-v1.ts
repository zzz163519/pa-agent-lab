import {
  BROOKS_VERDICTS,
  CALVIN_REVIEW_DISPOSITIONS,
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  deepFreeze,
  type AnonymousMarketInputV1,
  type BrooksDecisionV1,
  type BrooksVerdictV1,
  type CalvinIndependentAssessmentV1,
  type CalvinReviewDispositionV1,
  type CalvinReviewV1,
  type CalvinReviewWorkflowBindingV1,
  type ContractSha256,
  type DecisionConflictV1,
  type DecisionRevealReceiptV1,
} from "@pa-agent-lab/contracts";

import type { AnonymousChartArtifactMetadataV1 } from "./chart-artifact-metadata-v1.ts";
import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";

export const REVIEW_WORK_QUEUE_SCHEMA_VERSION =
  "review-work-queue.v1" as const;
export const REVIEW_WORK_ITEM_DETAIL_SCHEMA_VERSION =
  "review-work-item-detail.v1" as const;
export const REVIEW_WORKFLOW_MUTATION_RESULT_SCHEMA_VERSION =
  "review-workflow-mutation-result.v1" as const;

export const REVIEW_WORKFLOW_STATES = [
  "awaiting_assessment",
  "awaiting_reveal",
  "awaiting_final_review",
  "completed",
] as const;
export type ReviewWorkflowStateV1 = (typeof REVIEW_WORKFLOW_STATES)[number];

export interface ReviewWorkItemSummaryV1 {
  readonly caseHash: ContractSha256;
  readonly anonymousId: string;
  readonly draftIdentityHash: ContractSha256;
  readonly visibleBarCount: number;
  readonly barDurationSeconds: 300;
  readonly lastVisibleBarId: string;
  readonly isLeftCensored: boolean;
  readonly hasMissingData: boolean;
  readonly state: ReviewWorkflowStateV1;
}

export interface ReviewWorkQueueV1 {
  readonly schemaVersion: typeof REVIEW_WORK_QUEUE_SCHEMA_VERSION;
  readonly items: readonly Readonly<ReviewWorkItemSummaryV1>[];
}

export interface BlindReviewChartV1 {
  readonly panel: "context" | "detail";
  readonly artifactId: ContractSha256;
  readonly contentHash: ContractSha256;
  readonly width: number;
  readonly height: number;
}

export interface FrozenIndependentAssessmentViewV1 {
  readonly assessmentId: string;
  readonly assessmentHash: ContractSha256;
  readonly independentVerdict: BrooksVerdictV1;
  readonly blindSummary: string;
  readonly outcomeBlind: true;
  readonly brooksDecisionContentSeen: false;
  readonly reviewerPrincipal: "local:calvin-reviewer";
  readonly protocolVersion: "calvin-review-workflow.v1";
}

export interface ReviewWorkItemDetailV1 {
  readonly schemaVersion: typeof REVIEW_WORK_ITEM_DETAIL_SCHEMA_VERSION;
  readonly sourceScope: "synthetic_fixture_only";
  readonly caseHash: ContractSha256;
  readonly anonymousId: string;
  readonly draftIdentityHash: ContractSha256;
  readonly state: ReviewWorkflowStateV1;
  readonly market: AnonymousMarketInputV1;
  readonly charts: Readonly<{
    context: BlindReviewChartV1;
    detail: BlindReviewChartV1;
  }>;
  readonly assessment: FrozenIndependentAssessmentViewV1 | null;
  readonly decision: BrooksDecisionV1 | null;
  readonly revealReceipt: DecisionRevealReceiptV1 | null;
  readonly review: CalvinReviewV1 | null;
  readonly workflowBinding: CalvinReviewWorkflowBindingV1 | null;
  readonly decisionConflict: DecisionConflictV1 | null;
}

export interface SubmitIndependentAssessmentCommandV1 {
  readonly caseHash: ContractSha256;
  readonly draftIdentityHash: ContractSha256;
  readonly independentVerdict: BrooksVerdictV1;
  readonly blindSummary: string;
}

export interface RevealDecisionCommandV1 {
  readonly assessmentHash: ContractSha256;
}

export interface SubmitFinalReviewCommandV1 {
  readonly caseHash: ContractSha256;
  readonly assessmentHash: ContractSha256;
  readonly revealReceiptHash: ContractSha256;
  readonly disposition: CalvinReviewDispositionV1;
  readonly summary: string;
}

export interface ReviewWorkflowMutationResultV1 {
  readonly schemaVersion: typeof REVIEW_WORKFLOW_MUTATION_RESULT_SCHEMA_VERSION;
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind:
    | "calvin_independent_assessment"
    | "decision_reveal_receipt"
    | "calvin_review_workflow";
  readonly resourceHash: ContractSha256;
  readonly workItem: ReviewWorkItemDetailV1;
}

export interface ReviewWorkflowRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication: "reviewer_token";
  readonly transport: "request_response";
}

export const REVIEW_WORKFLOW_ROUTE_MANIFEST_V1 = deepFreeze([
  route("GET", "/v1/reviewer/work-items", "listReviewerWorkItems"),
  route("GET", "/v1/reviewer/work-items/:caseHash", "getReviewerWorkItem"),
  route(
    "POST",
    "/v1/reviewer/independent-assessments",
    "submitIndependentAssessment",
  ),
  route(
    "POST",
    "/v1/reviewer/work-items/:caseHash/reveal",
    "revealBrooksDecision",
  ),
  route("POST", "/v1/reviewer/final-reviews", "submitFinalReview"),
] as const satisfies readonly ReviewWorkflowRouteManifestEntryV1[]);

export function assertSubmitIndependentAssessmentCommand(
  value: unknown,
): asserts value is SubmitIndependentAssessmentCommandV1 {
  try {
    const command = exactRecord<SubmitIndependentAssessmentCommandV1>(
      "SubmitIndependentAssessmentCommand",
      value,
      ["caseHash", "draftIdentityHash", "independentVerdict", "blindSummary"],
    );
    assertSha256("caseHash", command.caseHash);
    assertSha256("draftIdentityHash", command.draftIdentityHash);
    assertOneOf("independentVerdict", command.independentVerdict, BROOKS_VERDICTS);
    boundedRequiredSummary("blindSummary", command.blindSummary);
  } catch (error) {
    rethrow(error);
  }
}

export function assertRevealDecisionCommand(
  value: unknown,
): asserts value is RevealDecisionCommandV1 {
  try {
    const command = exactRecord<RevealDecisionCommandV1>(
      "RevealDecisionCommand",
      value,
      ["assessmentHash"],
    );
    assertSha256("assessmentHash", command.assessmentHash);
  } catch (error) {
    rethrow(error);
  }
}

export function assertSubmitFinalReviewCommand(
  value: unknown,
): asserts value is SubmitFinalReviewCommandV1 {
  try {
    const command = exactRecord<SubmitFinalReviewCommandV1>(
      "SubmitFinalReviewCommand",
      value,
      [
        "caseHash",
        "assessmentHash",
        "revealReceiptHash",
        "disposition",
        "summary",
      ],
    );
    assertSha256("caseHash", command.caseHash);
    assertSha256("assessmentHash", command.assessmentHash);
    assertSha256("revealReceiptHash", command.revealReceiptHash);
    assertOneOf(
      "CalvinReview disposition",
      command.disposition,
      CALVIN_REVIEW_DISPOSITIONS,
    );
    boundedRequiredSummary("summary", command.summary);
  } catch (error) {
    rethrow(error);
  }
}

export function toBlindReviewChart(
  metadata: AnonymousChartArtifactMetadataV1,
): Readonly<BlindReviewChartV1> {
  return deepFreeze({
    panel: metadata.panel,
    artifactId: metadata.artifactId,
    contentHash: metadata.contentHash,
    width: metadata.widthPx,
    height: metadata.heightPx,
  });
}

export function toFrozenAssessmentView(
  assessment: CalvinIndependentAssessmentV1,
): Readonly<FrozenIndependentAssessmentViewV1> {
  return deepFreeze({
    assessmentId: assessment.assessmentId,
    assessmentHash: assessment.assessmentHash,
    independentVerdict: assessment.independentVerdict,
    blindSummary: assessment.blindSummary,
    outcomeBlind: assessment.outcomeBlind,
    brooksDecisionContentSeen: assessment.brooksDecisionContentSeen,
    reviewerPrincipal: assessment.reviewerPrincipal,
    protocolVersion: assessment.protocolVersion,
  });
}

export function createReviewWorkflowMutationResult(input: {
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind: ReviewWorkflowMutationResultV1["resourceKind"];
  readonly resourceHash: ContractSha256;
  readonly workItem: ReviewWorkItemDetailV1;
}): Readonly<ReviewWorkflowMutationResultV1> {
  assertNonEmpty("requestId", input.requestId);
  assertOneOf("mutation status", input.status, ["inserted", "existing"] as const);
  assertOneOf("resourceKind", input.resourceKind, [
    "calvin_independent_assessment",
    "decision_reveal_receipt",
    "calvin_review_workflow",
  ] as const);
  assertSha256("resourceHash", input.resourceHash);
  return deepFreeze({
    schemaVersion: REVIEW_WORKFLOW_MUTATION_RESULT_SCHEMA_VERSION,
    ...structuredClone(input),
  });
}

function route(
  method: "GET" | "POST",
  path: string,
  operationId: string,
): ReviewWorkflowRouteManifestEntryV1 {
  return {
    method,
    path,
    openapiPath: path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, "{$1}"),
    operationId,
    authentication: "reviewer_token",
    transport: "request_response",
  };
}

function boundedRequiredSummary(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (Array.from(value).length > 600) {
    fail(`${name} must be at most 600 characters`);
  }
}

function exactRecord<T>(
  label: string,
  value: unknown,
  allowedKeys: readonly string[],
): T {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const names = Object.keys(record);
  if (
    names.length !== allowedKeys.length ||
    names.some((name) => !allowedKeys.includes(name)) ||
    allowedKeys.some((name) => !Object.hasOwn(record, name))
  ) {
    fail(`${label} fields must match the exact V1 contract`);
  }
  return record as T;
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  throw new PersistenceContractError(
    error instanceof Error ? error.message : String(error),
  );
}
