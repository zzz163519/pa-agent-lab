import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
  createCalvinIndependentAssessment,
  createCalvinReviewWorkflowBinding,
  createDecisionRevealReceipt,
  assertCalvinIndependentAssessmentIntegrity,
  assertCalvinReviewWorkflowBindingIntegrity,
  assertDecisionRevealReceiptIntegrity,
  type ContractSha256,
} from "../src/index.ts";

const hash = (character: string) =>
  `sha256:${character.repeat(64)}` as ContractSha256;

const assessmentInput = {
  assessmentId: "assessment:synthetic-1",
  caseHash: hash("1"),
  caseId: "case-synthetic-1",
  inputHash: hash("2"),
  lastVisibleBarId: "bar-119",
  barDurationSeconds: 300,
  brooksDecisionId: "decision:synthetic-1",
  brooksDecisionHash: hash("3"),
  independentVerdict: "no_trade",
  blindSummary: "The market is balanced and no entry is currently permitted.",
  outcomeBlind: true,
  brooksDecisionContentSeen: false,
  reviewerPrincipal: "local:calvin-reviewer",
  protocolVersion: CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
} as const;
const assessment = createCalvinIndependentAssessment(assessmentInput);

const receipt = createDecisionRevealReceipt({
  receiptId: "reveal:synthetic-1",
  assessmentId: assessment.assessmentId,
  assessmentHash: assessment.assessmentHash,
  brooksDecisionId: assessment.brooksDecisionId,
  brooksDecisionHash: assessment.brooksDecisionHash,
  reviewerPrincipal: assessment.reviewerPrincipal,
  protocolVersion: assessment.protocolVersion,
});

const binding = createCalvinReviewWorkflowBinding({
  bindingId: "binding:synthetic-1",
  assessmentId: assessment.assessmentId,
  assessmentHash: assessment.assessmentHash,
  revealReceiptId: receipt.receiptId,
  revealReceiptHash: receipt.receiptHash,
  brooksDecisionId: assessment.brooksDecisionId,
  brooksDecisionHash: assessment.brooksDecisionHash,
  calvinReviewId: "review:synthetic-1",
  calvinReviewHash: hash("4"),
  reviewerPrincipal: assessment.reviewerPrincipal,
  protocolVersion: assessment.protocolVersion,
});

test("builds exact immutable Phase 3A workflow records", () => {
  assert.equal(assessment.schemaVersion, "calvin-independent-assessment.v1");
  assert.equal(receipt.schemaVersion, "decision-reveal-receipt.v1");
  assert.equal(binding.schemaVersion, "calvin-review-workflow-binding.v1");
  assert.equal(assessment.barDurationSeconds, 300);
  assert.equal(assessment.outcomeBlind, true);
  assert.equal(assessment.brooksDecisionContentSeen, false);
  assert.ok(Object.isFrozen(assessment));
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(binding));
  assertCalvinIndependentAssessmentIntegrity(assessment);
  assertDecisionRevealReceiptIntegrity(receipt, assessment);
  assertCalvinReviewWorkflowBindingIntegrity(binding, assessment, receipt, {
    reviewId: binding.calvinReviewId,
    reviewHash: binding.calvinReviewHash,
    decisionId: binding.brooksDecisionId,
    decisionHash: binding.brooksDecisionHash,
  });
});

test("rejects extra fields and altered content hashes", () => {
  assert.throws(
    () => assertCalvinIndependentAssessmentIntegrity({ ...assessment, confidence: 0.8 }),
    /exact V1 contract/,
  );
  assert.throws(
    () =>
      assertDecisionRevealReceiptIntegrity(
        { ...receipt, assessmentHash: hash("9") },
        assessment,
      ),
    /assessment|hash/,
  );
  assert.throws(
    () =>
      assertCalvinReviewWorkflowBindingIntegrity(
        { ...binding, reviewerPrincipal: "local:phase2-operator" },
        assessment,
        receipt,
        {
          reviewId: binding.calvinReviewId,
          reviewHash: binding.calvinReviewHash,
          decisionId: binding.brooksDecisionId,
          decisionHash: binding.brooksDecisionHash,
        },
      ),
    /reviewer|principal|hash/,
  );
});

test("requires a substantive blind summary and forbids seen decision content", () => {
  assert.throws(
    () => createCalvinIndependentAssessment({ ...assessmentInput, blindSummary: " " }),
    /blindSummary/,
  );
  assert.throws(
    () =>
      createCalvinIndependentAssessment({
        ...assessmentInput,
        brooksDecisionContentSeen: true as never,
      }),
    /not have seen/,
  );
});
