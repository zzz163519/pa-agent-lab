import {
  createDoctrineApproval,
  createDoctrineProposalBundle,
  createDoctrineRetirement,
} from "@pa-agent-lab/contracts";

export function makePhase3bDoctrineApprovalFixture() {
  const proposal = createDoctrineProposalBundle({
    source: {
      sourceId: "source:ask-al-breakouts-2016-09-25",
      sourceType: "brooks_website",
      title: "Breakouts",
      urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/breakouts/",
      contentHash: "sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b",
      private: false,
    },
    doctrineUnit: {
      doctrineId: "du:pilot:breakout-needs-context-and-follow-through",
      sourceId: "source:ask-al-breakouts-2016-09-25",
      concept: "breakout_context_and_follow_through",
      rule: "Breakout interpretation depends on context and subsequent market behavior; an attempt is not automatically a durable new trend.",
      appliesWhen: [
        "A visible bar breaks a support or resistance structure",
        "The decision distinguishes trend resumption from reversal or range behavior",
      ],
      avoidWhen: [
        "Only the breakout bar is visible",
        "The relevant prior structure or follow-through is missing",
      ],
      decisionEffect: [
        "Separate breakout attempt from confirmed lifecycle state",
        "Do not backfill confirmation into the decision bar",
      ],
      status: "draft",
    },
    sourceLocator: "Sections Always review context, Look for trend resumption or reversal, and Limit order bars",
  });
  const approval = createDoctrineApproval({
    proposalHash: proposal.proposalHash,
    doctrineId: proposal.doctrineUnit.doctrineId,
    sourceId: proposal.source.sourceId,
    sourceContentHash: proposal.source.contentHash,
    approverPrincipal: "local:phase2-operator",
  });
  const retirement = createDoctrineRetirement({
    proposalHash: proposal.proposalHash,
    approvalHash: approval.approvalHash,
    doctrineId: proposal.doctrineUnit.doctrineId,
    retiredByPrincipal: "local:calvin-reviewer",
    reason: "Superseded by a corrected source mapping.",
  });
  return { proposal, approval, retirement } as const;
}
