import type {
  BrooksDecisionV1,
  BrooksVerdictV1,
} from "./brooks-decision-v1.ts";
import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const CALVIN_REVIEW_SCHEMA_VERSION = "calvin-review.v1" as const;
export const CALVIN_REVIEW_DISPOSITIONS = [
  "agree",
  "disagree",
  "clarify",
  "uncertain",
] as const;

export type CalvinReviewDispositionV1 =
  (typeof CALVIN_REVIEW_DISPOSITIONS)[number];

export interface CalvinReviewInputV1 {
  readonly reviewId: string;
  readonly brooksDecisionId: string;
  readonly reviewedDecisionHash: ContractSha256;
  readonly scope: "whole_decision";
  readonly disposition: CalvinReviewDispositionV1;
  readonly independentVerdict: BrooksVerdictV1;
  readonly summary: string | null;
  readonly outcomeBlind: boolean;
}

export interface CalvinReviewV1 extends CalvinReviewInputV1 {
  readonly schemaVersion: typeof CALVIN_REVIEW_SCHEMA_VERSION;
  readonly reviewHash: ContractSha256;
}

export class CalvinReviewContractError extends Error {
  override readonly name = "CalvinReviewContractError";
}

export function createCalvinReview(
  input: CalvinReviewInputV1,
  decision: BrooksDecisionV1,
): Readonly<CalvinReviewV1> {
  try {
    assertNoFieldReviewKeys(input);
    assertNonEmpty("reviewId", input.reviewId);
    assertNonEmpty("brooksDecisionId", input.brooksDecisionId);
    assertSha256("reviewedDecisionHash", input.reviewedDecisionHash);
    if (
      input.brooksDecisionId !== decision.decisionId ||
      input.reviewedDecisionHash !== decision.decisionHash
    ) {
      throw new Error("CalvinReview must bind the exact BrooksDecision identity");
    }
    if (input.scope !== "whole_decision") {
      throw new Error("CalvinReview scope must be whole_decision");
    }
    assertOneOf(
      "CalvinReview disposition",
      input.disposition,
      CALVIN_REVIEW_DISPOSITIONS,
    );
    assertOneOf("independentVerdict", input.independentVerdict, [
      "long",
      "short",
      "no_trade",
      "uncertain",
    ] as const);
    if (!input.outcomeBlind) {
      throw new Error("CalvinReview must be outcome-blind");
    }
    if (
      input.disposition === "agree" &&
      input.independentVerdict !== decision.verdict
    ) {
      throw new Error("an agreeing review must share the Brooks verdict");
    }
    if (input.summary !== null && Array.from(input.summary).length > 600) {
      throw new Error("CalvinReview summary must be at most 600 characters");
    }

    const reviewData = structuredClone({
      schemaVersion: CALVIN_REVIEW_SCHEMA_VERSION,
      ...input,
    });
    const reviewHash = canonicalHash(reviewData);
    return deepFreeze({ ...reviewData, reviewHash });
  } catch (error) {
    throw asCalvinReviewError(error);
  }
}

function assertNoFieldReviewKeys(value: unknown): void {
  const forbidden = new Set([
    "reviewItems",
    "targetClaimId",
    "targetFieldPath",
    "fieldPatch",
    "proposedCorrection",
    "replaceBrooksValue",
  ]);
  const visit = (nested: unknown): void => {
    if (Array.isArray(nested)) {
      for (const item of nested) visit(item);
      return;
    }
    if (nested === null || typeof nested !== "object") return;
    for (const [key, child] of Object.entries(nested)) {
      if (forbidden.has(key)) {
        throw new Error("field-level review and patch keys are forbidden");
      }
      visit(child);
    }
  };
  visit(value);
}

export function assertCalvinReviewIntegrity(
  value: unknown,
  decision: BrooksDecisionV1,
): asserts value is CalvinReviewV1 {
  try {
    const review = exactReviewRecord(value);
    if (review.schemaVersion !== CALVIN_REVIEW_SCHEMA_VERSION) {
      throw new Error("CalvinReview schemaVersion is unsupported");
    }
    assertSha256("reviewHash", review.reviewHash);
    const rebuilt = createCalvinReview(
      {
        reviewId: review.reviewId,
        brooksDecisionId: review.brooksDecisionId,
        reviewedDecisionHash: review.reviewedDecisionHash,
        scope: review.scope,
        disposition: review.disposition,
        independentVerdict: review.independentVerdict,
        summary: review.summary,
        outcomeBlind: review.outcomeBlind,
      },
      decision,
    );
    if (rebuilt.reviewHash !== review.reviewHash) {
      throw new Error("CalvinReview review hash does not match its content");
    }
  } catch (error) {
    throw asCalvinReviewError(error);
  }
}

function exactReviewRecord(value: unknown): CalvinReviewV1 {
  const allowedKeys = [
    "schemaVersion",
    "reviewHash",
    "reviewId",
    "brooksDecisionId",
    "reviewedDecisionHash",
    "scope",
    "disposition",
    "independentVerdict",
    "summary",
    "outcomeBlind",
  ] as const;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error("CalvinReview must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const names = Object.getOwnPropertyNames(record);
  if (
    names.length !== allowedKeys.length ||
    names.some((name) => !(allowedKeys as readonly string[]).includes(name)) ||
    allowedKeys.some((name) => !Object.hasOwn(record, name))
  ) {
    throw new Error("CalvinReview fields must match the exact V1 contract");
  }
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(record, name);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      !descriptor.enumerable
    ) {
      throw new Error("CalvinReview fields must be enumerable data properties");
    }
  }
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    throw new Error("CalvinReview cannot contain symbol fields");
  }
  return record as unknown as CalvinReviewV1;
}

function asCalvinReviewError(error: unknown): CalvinReviewContractError {
  if (error instanceof CalvinReviewContractError) return error;
  return new CalvinReviewContractError(
    error instanceof Error ? error.message : String(error),
  );
}
