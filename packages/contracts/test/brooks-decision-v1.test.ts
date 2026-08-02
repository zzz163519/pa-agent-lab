import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBrooksDecision,
  type BrooksDecisionInputV1,
} from "../src/brooks-decision-v1.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
} from "./fixtures/brooks-decision-v1.fixture.ts";

function makeNoTradeDecision(): BrooksDecisionInputV1 {
  const base = makeValidLongDecision();
  return {
    ...base,
    decisionId: "decision:fixture-no-trade",
    verdict: "no_trade",
    evidenceBalance: "balanced",
    longCase: {
      ...base.longCase,
      state: "forming",
      evidenceBalance: "balanced",
      setupCandidates: base.longCase.setupCandidates.map((setup) => ({
        ...setup,
        state: "forming",
      })),
      signalBasis: {
        ...base.longCase.signalBasis,
        state: "forming",
      },
      triggerState: "not_applicable",
    },
    tradePlan: null,
    noTrade: {
      reasonCodes: ["setup_forming"],
      claimIds: ["claim-setup", "claim-verdict"],
      nextObservableCondition: "wait_for_confirmed_signal",
    },
    uncertainty: null,
    humanSummary: "The long setup is still forming, so there is no trade.",
  };
}

function makeUncertainDecision(): BrooksDecisionInputV1 {
  const base = makeValidLongDecision();
  return {
    ...base,
    decisionId: "decision:fixture-uncertain",
    verdict: "uncertain",
    evidenceBalance: "conflicting",
    longCase: {
      ...base.longCase,
      state: "uncertain",
      evidenceBalance: "conflicting",
      signalBasis: {
        ...base.longCase.signalBasis,
        state: "uncertain",
      },
      triggerState: "ambiguous",
    },
    tradePlan: null,
    noTrade: null,
    uncertainty: {
      reasonCodes: ["market_structure_conflict"],
      conflictingClaimIds: ["claim-setup", "claim-short"],
      missingEvidence: ["follow_through_evidence"],
      resolutionCondition: "wait_for_structure_confirmation",
    },
    humanSummary: "The visible structure is conflicting, so the decision abstains.",
  };
}

describe("BrooksDecision V1 verdict contracts", () => {
  it("accepts a complete five-minute long swing plan above 2R", () => {
    const validated = createBrooksDecision(
      makeValidLongDecision("swing"),
      makeValidationContext(),
    );

    assert.equal(validated.decision.verdict, "long");
    assert.equal(validated.decision.barDurationSeconds, 300);
    assert.match(validated.decision.decisionHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(validated.rewardRiskAudit?.minimumRequired, 2);
    assert.ok((validated.rewardRiskAudit?.ratio ?? 0) >= 2);
    assert.equal(Object.isFrozen(validated), true);
    assert.equal(Object.isFrozen(validated.decision.tradePlan), true);
  });

  it("keeps no_trade and uncertain as distinct valid terminal states", () => {
    const noTrade = createBrooksDecision(
      makeNoTradeDecision(),
      makeValidationContext({ plannedGeometry: null }),
    );
    const uncertain = createBrooksDecision(
      makeUncertainDecision(),
      makeValidationContext({ plannedGeometry: null }),
    );

    assert.equal(noTrade.decision.verdict, "no_trade");
    assert.deepEqual(noTrade.decision.noTrade?.reasonCodes, ["setup_forming"]);
    assert.equal(noTrade.decision.uncertainty, null);
    assert.equal(noTrade.rewardRiskAudit, null);

    assert.equal(uncertain.decision.verdict, "uncertain");
    assert.deepEqual(uncertain.decision.uncertainty?.reasonCodes, [
      "market_structure_conflict",
    ]);
    assert.equal(uncertain.decision.noTrade, null);
  });

  it("rejects a long verdict without a trade plan", () => {
    const input = { ...makeValidLongDecision(), tradePlan: null };

    assert.throws(() => createBrooksDecision(input, makeValidationContext()), {
      name: "BrooksDecisionContractError",
      message: /long or short verdict requires a trade plan/,
    });
  });

  it("rejects a long plan before setup and signal are confirmed", () => {
    const base = makeValidLongDecision();
    const input: BrooksDecisionInputV1 = {
      ...base,
      longCase: {
        ...base.longCase,
        signalBasis: { ...base.longCase.signalBasis, state: "forming" },
      },
    };

    assert.throws(() => createBrooksDecision(input, makeValidationContext()), {
      name: "BrooksDecisionContractError",
      message: /selected signal must be confirmed/,
    });
  });

  it("rejects market evidence or anchors outside the visible causal prefix", () => {
    const base = makeValidLongDecision();
    if (base.tradePlan === null || base.tradePlan.entry.entryType !== "stop") {
      assert.fail("fixture must use a stop entry");
    }
    const input: BrooksDecisionInputV1 = {
      ...base,
      tradePlan: {
        ...base.tradePlan,
        entry: {
          ...base.tradePlan.entry,
          anchor: {
            ...base.tradePlan.entry.anchor,
            barId: "bar:future",
          },
        },
      },
    };

    assert.throws(() => createBrooksDecision(input, makeValidationContext()), {
      name: "BrooksDecisionContractError",
      message: /bar is outside the visible causal prefix/,
    });
  });

  it("allows a low-RR scalp but rejects a swing below 2R", () => {
    const lowRewardContext = makeValidationContext({
      plannedGeometry: {
        entryNormalizedPrice: 103.1,
        protectionNormalizedPrice: 100.4,
        objectiveNormalizedPrice: 104,
      },
    });

    const scalp = createBrooksDecision(
      makeValidLongDecision("scalp"),
      lowRewardContext,
    );
    assert.ok((scalp.rewardRiskAudit?.ratio ?? 1) < 2);
    assert.equal(scalp.rewardRiskAudit?.minimumRequired, null);

    assert.throws(
      () => createBrooksDecision(makeValidLongDecision("swing"), lowRewardContext),
      {
        name: "BrooksDecisionContractError",
        message: /swing plan requires at least 2R/,
      },
    );
  });

  it("rejects an oversized summary or model-reported probability", () => {
    assert.throws(
      () =>
        createBrooksDecision(
          { ...makeValidLongDecision(), humanSummary: "x".repeat(601) },
          makeValidationContext(),
        ),
      {
        name: "BrooksDecisionContractError",
        message: /humanSummary must be at most 600 characters/,
      },
    );

    const withProbability = {
      ...makeValidLongDecision(),
      winProbability: 0.7,
    } as unknown as BrooksDecisionInputV1;
    assert.throws(
      () => createBrooksDecision(withProbability, makeValidationContext()),
      {
        name: "BrooksDecisionContractError",
        message: /numeric probability and confidence fields are forbidden/,
      },
    );
  });
});
