import {
  CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
  CALVIN_REVIEWER_PRINCIPAL,
  createCalvinIndependentAssessment,
  createCalvinReviewWorkflowBinding,
  createDecisionRevealReceipt,
} from "@pa-agent-lab/contracts";

import { makePhase2CaseStoreFixture } from "./phase2-case-store-v1.fixture.ts";

export function makePhase3ReviewWorkflowFixture() {
  const phase2 = makePhase2CaseStoreFixture({ identitySuffix: "phase3a-review" });
  const assessment = createCalvinIndependentAssessment({
    assessmentId: `assessment:${phase2.decision.decisionHash.slice("sha256:".length)}`,
    caseHash: phase2.caseBundle.policyCase.caseHash,
    caseId: phase2.caseBundle.policyCase.caseId,
    inputHash: phase2.caseBundle.policyInput.inputHash,
    lastVisibleBarId: phase2.caseBundle.policyInput.market.lastVisibleBarId,
    barDurationSeconds: phase2.caseBundle.policyCase.barDurationSeconds,
    brooksDecisionId: phase2.decision.decisionId,
    brooksDecisionHash: phase2.decision.decisionHash,
    independentVerdict: phase2.review.independentVerdict,
    blindSummary: "The synthetic market is balanced at the causal cutoff.",
    outcomeBlind: true,
    brooksDecisionContentSeen: false,
    reviewerPrincipal: CALVIN_REVIEWER_PRINCIPAL,
    protocolVersion: CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
  });
  const revealReceipt = createDecisionRevealReceipt({
    receiptId: `reveal:${assessment.assessmentHash.slice("sha256:".length)}`,
    assessmentId: assessment.assessmentId,
    assessmentHash: assessment.assessmentHash,
    brooksDecisionId: assessment.brooksDecisionId,
    brooksDecisionHash: assessment.brooksDecisionHash,
    reviewerPrincipal: assessment.reviewerPrincipal,
    protocolVersion: assessment.protocolVersion,
  });
  const workflowBinding = createCalvinReviewWorkflowBinding({
    bindingId: `binding:${phase2.review.reviewHash.slice("sha256:".length)}`,
    assessmentId: assessment.assessmentId,
    assessmentHash: assessment.assessmentHash,
    revealReceiptId: revealReceipt.receiptId,
    revealReceiptHash: revealReceipt.receiptHash,
    brooksDecisionId: phase2.decision.decisionId,
    brooksDecisionHash: phase2.decision.decisionHash,
    calvinReviewId: phase2.review.reviewId,
    calvinReviewHash: phase2.review.reviewHash,
    reviewerPrincipal: assessment.reviewerPrincipal,
    protocolVersion: assessment.protocolVersion,
  });
  return { ...phase2, assessment, revealReceipt, workflowBinding } as const;
}
