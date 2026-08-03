import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalHash,
  createDoctrineApproval,
  createDoctrineProposalBundle,
  createDoctrineRetirement,
  deriveDoctrineStatus,
  toApprovedDoctrineUnit,
  type DoctrineProposalBundleV1,
  type SourceV1,
  type DoctrineUnitV1,
} from "../src/index.ts";

const source: SourceV1 = {
  sourceId: "source:ask-al-breakouts-2016-09-25",
  sourceType: "brooks_website",
  title: "Breakouts",
  urlOrLocalRef: "https://www.brookstradingcourse.com/ask-al/breakouts/",
  contentHash: "sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b",
  private: false,
};
const doctrineUnit: DoctrineUnitV1 = {
  doctrineId: "du:pilot:breakout-needs-context-and-follow-through",
  sourceId: source.sourceId,
  concept: "breakout_context_and_follow_through",
  rule: "Breakout interpretation depends on context and subsequent market behavior.",
  appliesWhen: ["A visible bar breaks a support or resistance structure"],
  avoidWhen: ["Only the breakout bar is visible"],
  decisionEffect: ["Separate a breakout attempt from a confirmed lifecycle state"],
  status: "draft",
};

function proposal(): DoctrineProposalBundleV1 {
  return createDoctrineProposalBundle({
    source,
    doctrineUnit,
    sourceLocator: "Sections Always review context and Look for trend resumption or reversal",
  });
}

describe("minimal Doctrine approval lifecycle", () => {
  it("binds one exact public Source, draft DoctrineUnit, and locator", () => {
    const value = proposal();
    assert.equal(value.schemaVersion, "doctrine-proposal-bundle.v1");
    assert.equal(value.proposalHash, canonicalHash({
      schemaVersion: value.schemaVersion,
      source: value.source,
      doctrineUnit: value.doctrineUnit,
      sourceLocator: value.sourceLocator,
    }));
    assert.equal(deriveDoctrineStatus(value, null, null), "draft");
    assert.throws(
      () => createDoctrineProposalBundle({
        source: { ...source, urlOrLocalRef: "javascript:alert(1)" },
        doctrineUnit,
        sourceLocator: "Public section",
      }),
      /HTTPS URL/,
    );
    assert.throws(
      () => createDoctrineProposalBundle({
        source: { ...source, sourceType: "private_material", private: true },
        doctrineUnit,
        sourceLocator: "Private section",
      }),
      /public Source/,
    );
    assert.throws(
      () => createDoctrineProposalBundle({
        source,
        doctrineUnit: { ...doctrineUnit, sourceId: "source:other" },
        sourceLocator: "Exact section",
      }),
      /same sourceId/,
    );
    assert.throws(
      () => createDoctrineProposalBundle({
        source,
        doctrineUnit: { ...doctrineUnit, status: "approved" },
        sourceLocator: "Exact section",
      }),
      /must be draft/,
    );
  });

  it("uses one explicit authenticated approval and one later retirement", () => {
    const draft = proposal();
    const approval = createDoctrineApproval({
      proposalHash: draft.proposalHash,
      doctrineId: draft.doctrineUnit.doctrineId,
      sourceId: draft.source.sourceId,
      sourceContentHash: draft.source.contentHash,
      approverPrincipal: "local:phase2-operator",
    });
    assert.equal(deriveDoctrineStatus(draft, approval, null), "approved");
    assert.equal(toApprovedDoctrineUnit(draft, approval).status, "approved");

    const retirement = createDoctrineRetirement({
      proposalHash: draft.proposalHash,
      approvalHash: approval.approvalHash,
      doctrineId: draft.doctrineUnit.doctrineId,
      retiredByPrincipal: "local:calvin-reviewer",
      reason: "Source wording requires a replacement proposal.",
    });
    assert.equal(deriveDoctrineStatus(draft, approval, retirement), "retired");
    assert.throws(() => toApprovedDoctrineUnit(draft, approval, retirement), /retired/);
  });

  it("rejects extra fields, forged relationships, and client-selected principals", () => {
    const draft = proposal();
    assert.throws(
      () => createDoctrineProposalBundle({
        source,
        doctrineUnit,
        sourceLocator: "Exact section",
        injected: true,
      } as never),
      /exact keys/,
    );
    assert.throws(
      () => createDoctrineProposalBundle({
        source: { ...source, injected: true } as never,
        doctrineUnit,
        sourceLocator: "Exact section",
      }),
      /Source.*exact keys/,
    );
    assert.throws(
      () => createDoctrineProposalBundle({
        source,
        doctrineUnit: { ...doctrineUnit, injected: true } as never,
        sourceLocator: "Exact section",
      }),
      /DoctrineUnit.*exact keys/,
    );
    assert.throws(
      () => createDoctrineApproval({
        proposalHash: draft.proposalHash,
        doctrineId: "du:other",
        sourceId: draft.source.sourceId,
        sourceContentHash: draft.source.contentHash,
        approverPrincipal: "remote:unknown" as never,
      }),
      /approverPrincipal/,
    );
  });
});
