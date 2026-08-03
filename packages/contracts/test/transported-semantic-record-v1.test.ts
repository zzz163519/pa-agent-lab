import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBrooksDecisionIntegrity,
  assertCalvinReviewIntegrity,
  createBrooksDecision,
  createCalvinReview,
} from "../src/index.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
} from "./fixtures/brooks-decision-v1.fixture.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function makeDecision() {
  return createBrooksDecision(
    makeValidLongDecision(),
    makeValidationContext(),
  ).decision;
}

function decisionBinding(decision = makeDecision()) {
  return {
    caseId: decision.caseId,
    inputHash: decision.inputHash,
    lastVisibleBarId: decision.lastVisibleBarId,
    barDurationSeconds: decision.barDurationSeconds,
  } as const;
}

describe("transported BrooksDecision integrity", () => {
  it("revalidates exact content identity and its persisted Case/input cutoff binding", () => {
    const decision = makeDecision();
    assert.doesNotThrow(() =>
      assertBrooksDecisionIntegrity(decision, decisionBinding(decision)),
    );
    assert.throws(
      () =>
        assertBrooksDecisionIntegrity(
          { ...decision, verdict: "short" },
          decisionBinding(decision),
        ),
      { message: /decision hash does not match its content/ },
    );
    assert.throws(
      () =>
        assertBrooksDecisionIntegrity(
          { ...decision, outcome: "win" } as never,
          decisionBinding(decision),
        ),
      { message: /fields must match the exact V1 contract/ },
    );
    assert.throws(
      () =>
        assertBrooksDecisionIntegrity(decision, {
          ...decisionBinding(decision),
          inputHash: sha("f"),
        }),
      { message: /does not match its persisted Case and input binding/ },
    );
  });
});

describe("transported CalvinReview integrity", () => {
  it("revalidates whole-decision outcome-blind semantics and content identity", () => {
    const decision = makeDecision();
    const review = createCalvinReview(
      {
        reviewId: "review:transport-fixture",
        brooksDecisionId: decision.decisionId,
        reviewedDecisionHash: decision.decisionHash,
        scope: "whole_decision",
        disposition: "agree",
        independentVerdict: decision.verdict,
        summary: "The complete decision is accepted for this synthetic fixture.",
        outcomeBlind: true,
      },
      decision,
    );
    assert.doesNotThrow(() => assertCalvinReviewIntegrity(review, decision));
    assert.throws(
      () =>
        assertCalvinReviewIntegrity(
          { ...review, summary: "tampered" },
          decision,
        ),
      { message: /review hash does not match its content/ },
    );
    assert.throws(
      () =>
        assertCalvinReviewIntegrity(
          { ...review, targetFieldPath: "verdict" } as never,
          decision,
        ),
      { message: /fields must match the exact V1 contract/ },
    );
    assert.throws(
      () =>
        assertCalvinReviewIntegrity(
          { ...review, outcomeBlind: false } as never,
          decision,
        ),
      { message: /outcome-blind/ },
    );
  });
});
