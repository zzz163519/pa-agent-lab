import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBrooksDecision } from "../src/brooks-decision-v1.ts";
import {
  createCalvinReview,
  type CalvinReviewInputV1,
} from "../src/calvin-review-v1.ts";
import { deriveDecisionConflict } from "../src/decision-conflict-v1.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
} from "./fixtures/brooks-decision-v1.fixture.ts";

function brooksDecision() {
  return createBrooksDecision(
    makeValidLongDecision("swing"),
    makeValidationContext(),
  ).decision;
}

function reviewInput(
  disposition: "agree" | "disagree" | "clarify" | "uncertain",
  independentVerdict: "long" | "short" | "no_trade" | "uncertain" = "long",
): CalvinReviewInputV1 {
  const decision = brooksDecision();
  return {
    reviewId: `review:${disposition}:${independentVerdict}`,
    brooksDecisionId: decision.decisionId,
    reviewedDecisionHash: decision.decisionHash,
    scope: "whole_decision",
    disposition,
    independentVerdict,
    summary: "Calvin's outcome-blind assessment of the complete decision.",
    outcomeBlind: true,
  };
}

describe("whole-decision CalvinReview V1", () => {
  it("records an overall review without changing Brooks semantics", () => {
    const decision = brooksDecision();
    const originalHash = decision.decisionHash;
    const review = createCalvinReview(reviewInput("agree"), decision);

    assert.equal(review.scope, "whole_decision");
    assert.equal(review.disposition, "agree");
    assert.equal(review.independentVerdict, "long");
    assert.equal(review.reviewedDecisionHash, originalHash);
    assert.equal(decision.decisionHash, originalHash);
    assert.match(review.reviewHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(review), true);
    assert.equal("reviewItems" in review, false);
    assert.equal("proposedCorrection" in review, false);
  });

  it("rejects field-level targets, patches, or non-blind reviews", () => {
    const decision = brooksDecision();
    const patched = {
      ...reviewInput("disagree", "short"),
      targetClaimId: "claim-signal",
      fieldPatch: { verdict: "short" },
    } as unknown as CalvinReviewInputV1;

    assert.throws(() => createCalvinReview(patched, decision), {
      name: "CalvinReviewContractError",
      message: /field-level review and patch keys are forbidden/,
    });
    assert.throws(
      () =>
        createCalvinReview(
          { ...reviewInput("agree"), outcomeBlind: false },
          decision,
        ),
      {
        name: "CalvinReviewContractError",
        message: /CalvinReview must be outcome-blind/,
      },
    );
  });
});

describe("whole-decision conflict derivation", () => {
  it("closes an agreeing review without selecting a winner", () => {
    const decision = brooksDecision();
    const review = createCalvinReview(reviewInput("agree"), decision);
    const conflict = deriveDecisionConflict(decision, review);

    assert.deepEqual(conflict.kinds, ["none"]);
    assert.equal(conflict.status, "closed");
    assert.equal("winner" in conflict, false);
    assert.equal("fieldConflicts" in conflict, false);
  });

  it("records whole-decision and verdict disagreement independently", () => {
    const decision = brooksDecision();
    const sameVerdictReview = createCalvinReview(
      reviewInput("disagree", "long"),
      decision,
    );
    const differentVerdictReview = createCalvinReview(
      reviewInput("disagree", "short"),
      decision,
    );

    assert.deepEqual(
      deriveDecisionConflict(decision, sameVerdictReview).kinds,
      ["whole_decision_disagreement"],
    );
    assert.deepEqual(
      deriveDecisionConflict(decision, differentVerdictReview).kinds,
      ["whole_decision_disagreement", "verdict_disagreement"],
    );
  });

  it("derives clarification and reviewer uncertainty without rewriting either record", () => {
    const decision = brooksDecision();
    const clarification = createCalvinReview(
      reviewInput("clarify", "long"),
      decision,
    );
    const reviewerUncertain = createCalvinReview(
      reviewInput("uncertain", "uncertain"),
      decision,
    );

    assert.deepEqual(deriveDecisionConflict(decision, clarification).kinds, [
      "clarification_required",
    ]);
    assert.deepEqual(deriveDecisionConflict(decision, reviewerUncertain).kinds, [
      "reviewer_uncertain",
      "verdict_disagreement",
    ]);
    assert.equal(decision.verdict, "long");
  });
});
