import type { BrooksDecisionV1 } from "./brooks-decision-v1.ts";
import type { CalvinReviewV1 } from "./calvin-review-v1.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const DECISION_CONFLICT_SCHEMA_VERSION = "decision-conflict.v1" as const;

export type DecisionConflictKindV1 =
  | "none"
  | "whole_decision_disagreement"
  | "verdict_disagreement"
  | "clarification_required"
  | "reviewer_uncertain";

export interface DecisionConflictV1 {
  readonly schemaVersion: typeof DECISION_CONFLICT_SCHEMA_VERSION;
  readonly conflictId: ContractSha256;
  readonly brooksDecisionId: string;
  readonly brooksDecisionHash: ContractSha256;
  readonly calvinReviewId: string;
  readonly calvinReviewHash: ContractSha256;
  readonly kinds: readonly DecisionConflictKindV1[];
  readonly status: "open" | "closed";
}

export class DecisionConflictContractError extends Error {
  override readonly name = "DecisionConflictContractError";
}

export function deriveDecisionConflict(
  decision: BrooksDecisionV1,
  review: CalvinReviewV1,
): Readonly<DecisionConflictV1> {
  if (
    review.brooksDecisionId !== decision.decisionId ||
    review.reviewedDecisionHash !== decision.decisionHash
  ) {
    throw new DecisionConflictContractError(
      "conflict inputs do not reference the same BrooksDecision",
    );
  }

  const kinds: DecisionConflictKindV1[] = [];
  if (review.disposition === "disagree") {
    kinds.push("whole_decision_disagreement");
  } else if (review.disposition === "clarify") {
    kinds.push("clarification_required");
  } else if (review.disposition === "uncertain") {
    kinds.push("reviewer_uncertain");
  }
  if (review.independentVerdict !== decision.verdict) {
    kinds.push("verdict_disagreement");
  }
  if (kinds.length === 0) {
    kinds.push("none");
  }

  const identity = {
    schemaVersion: DECISION_CONFLICT_SCHEMA_VERSION,
    brooksDecisionId: decision.decisionId,
    brooksDecisionHash: decision.decisionHash,
    calvinReviewId: review.reviewId,
    calvinReviewHash: review.reviewHash,
    kinds,
    status: kinds[0] === "none" ? ("closed" as const) : ("open" as const),
  };
  const conflictId = canonicalHash(identity);
  return deepFreeze({ ...identity, conflictId });
}
