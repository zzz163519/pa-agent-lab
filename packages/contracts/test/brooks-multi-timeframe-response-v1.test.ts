import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BrooksDecisionInputV1 } from "../src/brooks-decision-v1.ts";
import type { BrooksIdentityFreeResponseV2 } from "../src/brooks-identity-free-response-v2.ts";
import {
  BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_KEYS_V1,
  assertBrooksMultiTimeframeIdentityFreeResponseShapeV1,
  createBrooksMultiTimeframeIdentityFreeResponseV1,
  type BrooksMultiTimeframeIdentityFreeResponseV1,
} from "../src/brooks-multi-timeframe-response-v1.ts";
import { makeValidNoTradeDecision } from "./fixtures/brooks-decision-v1.fixture.ts";

function primaryResponse(): BrooksIdentityFreeResponseV2 {
  const full: BrooksDecisionInputV1 = makeValidNoTradeDecision();
  const {
    decisionId: _decisionId,
    caseId: _caseId,
    inputHash: _inputHash,
    lastVisibleBarId: _lastVisibleBarId,
    barDurationSeconds: _barDurationSeconds,
    ...semantic
  } = full;
  return { ...semantic, plannedGeometry: null };
}

function makeResponse(): BrooksMultiTimeframeIdentityFreeResponseV1 {
  return {
    primaryDecision: primaryResponse(),
    timeframeEvidence: [
      {
        evidenceId: "evidence:primary-close",
        timeframe: "5m",
        barId: "bar:5m:finalized:119",
        field: "close",
        normalizedValue: 101.25,
        lifecycle: "finalized",
        claimScope: ["claim:primary-context"],
        doctrineClaimReferences: ["doctrine:primary-context"],
      },
      {
        evidenceId: "evidence:60m-relationship",
        timeframe: "60m",
        barId: "bar:60m:finalized:011",
        field: "relationship",
        normalizedValue: null,
        lifecycle: "finalized",
        claimScope: ["claim:reference-context"],
        doctrineClaimReferences: ["doctrine:reference-context"],
      },
    ],
    referenceAssessments: {
      sixtyMinute: {
        timeframe: "60m",
        relationship: "supports",
        summaryCode: "reference_supports_primary_context",
        evidenceReferences: ["evidence:60m-relationship"],
        doctrineClaimReferences: ["doctrine:reference-context"],
      },
      daily: null,
    },
    gapAssessments: [],
    crossTimeframeConflictAssessment: {
      state: "not_applicable",
      summaryCode: "fewer_than_two_reference_timeframes",
      evidenceReferences: [],
      doctrineClaimReferences: [],
    },
    geometryAnchors: {
      entry: null,
      protection: null,
      objective: null,
    },
  };
}

describe("Brooks multi-timeframe identity-free response V1", () => {
  it("creates one immutable primary decision with structured reference context", () => {
    const response = createBrooksMultiTimeframeIdentityFreeResponseV1(makeResponse());

    assert.deepEqual(
      Object.keys(response).sort(),
      [...BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_KEYS_V1].sort(),
    );
    assert.equal(response.primaryDecision.verdict, "no_trade");
    assert.equal(
      response.referenceAssessments.sixtyMinute?.relationship,
      "supports",
    );
    assert.equal(response.referenceAssessments.daily, null);
    assert.equal(Object.isFrozen(response), true);
    assert.equal(Object.isFrozen(response.timeframeEvidence), true);
    assert.equal(Object.isFrozen(response.primaryDecision), true);
    assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(response);
  });

  it("supports every accepted relationship without encoding a verdict map", () => {
    const relationships = [
      "supports",
      "limits",
      "opposes",
      "no_material_effect",
      "uncertain",
      "unavailable_for_this_decision",
    ] as const;
    for (const relationship of relationships) {
      const base = makeResponse();
      const response: BrooksMultiTimeframeIdentityFreeResponseV1 = {
        ...base,
        referenceAssessments: {
          ...base.referenceAssessments,
          sixtyMinute: {
            ...base.referenceAssessments.sixtyMinute!,
            relationship,
            evidenceReferences:
              relationship === "unavailable_for_this_decision"
                ? []
                : ["evidence:60m-relationship"],
            doctrineClaimReferences:
              relationship === "unavailable_for_this_decision"
                ? []
                : ["doctrine:reference-context"],
          },
        },
      };
      assert.equal(
        createBrooksMultiTimeframeIdentityFreeResponseV1(response)
          .primaryDecision.verdict,
        "no_trade",
      );
    }
  });

  it("represents timeframe-aware gap and frozen provisional anchor evidence", () => {
    const base = makeResponse();
    const response: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...base,
      timeframeEvidence: [
        ...base.timeframeEvidence,
        {
          evidenceId: "evidence:60m-gap",
          timeframe: "60m",
          barId: "bar:60m:provisional:011",
          field: "relationship",
          normalizedValue: null,
          lifecycle: "provisional",
          claimScope: ["claim:gap-materiality"],
          doctrineClaimReferences: ["doctrine:gap-materiality"],
        },
      ],
      gapAssessments: [
        {
          gapId: "gap:60m:011",
          timeframe: "60m",
          materiality: "immaterial",
          affectedClaims: ["claim:gap-materiality"],
          evidenceReferences: ["evidence:60m-gap"],
          doctrineClaimReferences: ["doctrine:gap-materiality"],
          resolutionCondition:
            "plan_does_not_depend_on_missing_reference_structure",
        },
      ],
      geometryAnchors: {
        ...base.geometryAnchors,
        entry: {
          timeframe: "60m",
          barId: "bar:60m:provisional:011",
          field: "high",
          lifecycle: "provisional",
          normalizedValue: 104.5,
        },
      },
    };

    const created = createBrooksMultiTimeframeIdentityFreeResponseV1(response);
    assert.equal(created.gapAssessments[0]?.materiality, "immaterial");
    assert.equal(created.geometryAnchors.entry?.lifecycle, "provisional");
  });

  it("rejects unknown response, assessment, vote, or independent-plan fields", () => {
    const unknownRoot = structuredClone(makeResponse()) as unknown as Record<
      string,
      unknown
    >;
    unknownRoot.timeframeVotes = { fiveMinute: 1, sixtyMinute: 1 };
    assert.throws(
      () => assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(unknownRoot),
      { message: /unknown field: timeframeVotes/ },
    );

    const unknownAssessment = structuredClone(makeResponse());
    (
      unknownAssessment.referenceAssessments.sixtyMinute as unknown as Record<
        string,
        unknown
      >
    ).independentTradePlan = { direction: "long" };
    assert.throws(
      () =>
        assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(unknownAssessment),
      { message: /unknown field: independentTradePlan/ },
    );
  });
});
