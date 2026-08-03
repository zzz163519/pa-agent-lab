import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REVIEW_WORKFLOW_ROUTE_MANIFEST_V1,
  assertSubmitFinalReviewCommand,
  assertSubmitIndependentAssessmentCommand,
  assertRevealDecisionCommand,
} from "../src/review-workflow-transport-v1.ts";

const hash = (character: string) => `sha256:${character.repeat(64)}`;

test("publishes the five reviewer-only request/response routes", () => {
  assert.deepEqual(
    REVIEW_WORKFLOW_ROUTE_MANIFEST_V1.map(({ method, path, authentication }) => ({
      method,
      path,
      authentication,
    })),
    [
      { method: "GET", path: "/v1/reviewer/work-items", authentication: "reviewer_token" },
      { method: "GET", path: "/v1/reviewer/work-items/:caseHash", authentication: "reviewer_token" },
      { method: "POST", path: "/v1/reviewer/independent-assessments", authentication: "reviewer_token" },
      { method: "POST", path: "/v1/reviewer/work-items/:caseHash/reveal", authentication: "reviewer_token" },
      { method: "POST", path: "/v1/reviewer/final-reviews", authentication: "reviewer_token" },
    ],
  );
});

test("accepts only exact minimal reviewer commands", () => {
  assert.doesNotThrow(() =>
    assertSubmitIndependentAssessmentCommand({
      caseHash: hash("1"),
      draftIdentityHash: hash("2"),
      independentVerdict: "no_trade",
      blindSummary: "No complete setup is visible at the cutoff.",
    }),
  );
  assert.doesNotThrow(() =>
    assertRevealDecisionCommand({ assessmentHash: hash("3") }),
  );
  assert.doesNotThrow(() =>
    assertSubmitFinalReviewCommand({
      caseHash: hash("1"),
      assessmentHash: hash("3"),
      revealReceiptHash: hash("4"),
      disposition: "agree",
      summary: "The whole decision matches the independent judgment.",
    }),
  );
  assert.throws(
    () =>
      assertSubmitIndependentAssessmentCommand({
        caseHash: hash("1"),
        draftIdentityHash: hash("2"),
        independentVerdict: "no_trade",
        blindSummary: "Valid.",
        decisionHash: hash("9"),
      }),
    /exact V1 contract/,
  );
});
