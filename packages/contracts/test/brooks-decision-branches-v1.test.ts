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

function noTradeWithActionableLong(): BrooksDecisionInputV1 {
  const base = makeValidLongDecision();
  return {
    ...base,
    verdict: "no_trade",
    evidenceBalance: "balanced",
    tradePlan: null,
    noTrade: {
      reasonCodes: ["balanced_evidence"],
      claimIds: ["claim-verdict"],
      nextObservableCondition: "wait_for_new_setup",
    },
    uncertainty: null,
  };
}

describe("BrooksDecision V1 guarded branches", () => {
  it("accepts the mirrored short geometry and direction gates", () => {
    const base = makeValidLongDecision("scalp");
    if (base.tradePlan === null) assert.fail("fixture requires a trade plan");
    const input: BrooksDecisionInputV1 = {
      ...base,
      decisionId: "decision:fixture-short",
      verdict: "short",
      evidenceBalance: "favors_short",
      broadContext: {
        ...base.broadContext,
        trendDirection: "bear",
      },
      currentLeg: { ...base.currentLeg, direction: "down" },
      alwaysIn: { ...base.alwaysIn, state: "short" },
      pressure: {
        buying: { ...base.pressure.buying, state: "absent" },
        selling: { ...base.pressure.selling, state: "present" },
        balance: "favors_short",
      },
      magnets: base.magnets.map((magnet) => ({
        ...magnet,
        structureId: "structure:support",
        side: "below",
      })),
      longCase: {
        ...base.shortCase,
        direction: "long",
      },
      shortCase: {
        ...base.longCase,
        direction: "short",
        evidenceBalance: "favors_short",
        setupCandidates: base.longCase.setupCandidates.map((setup) => ({
          ...setup,
          setupId: "setup:short-primary",
        })),
      },
      tradePlan: {
        ...base.tradePlan,
        direction: "short",
        setupId: "setup:short-primary",
        entry: {
          entryType: "stop",
          relation: "break_below",
          anchor: {
            barId: "bar:119",
            field: "low",
            normalizedReferencePrice: 100.5,
          },
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
        protection: {
          ...base.tradePlan.protection,
          relation: "above",
          anchor: {
            barId: "bar:119",
            field: "high",
            normalizedReferencePrice: 103,
          },
        },
      },
    };

    const validated = createBrooksDecision(
      input,
      makeValidationContext({
        plannedGeometry: {
          entryNormalizedPrice: 100.4,
          protectionNormalizedPrice: 103.1,
          objectiveNormalizedPrice: 99,
        },
      }),
    );
    assert.equal(validated.decision.verdict, "short");
    assert.equal(validated.decision.tradePlan?.direction, "short");
  });

  it("rejects no_trade while a directional case remains actionable", () => {
    assert.throws(
      () =>
        createBrooksDecision(
          noTradeWithActionableLong(),
          makeValidationContext({ plannedGeometry: null }),
        ),
      {
        name: "BrooksDecisionContractError",
        message: /no_trade cannot leave an actionable directional case/,
      },
    );
  });

  it("rejects a trade while the opposing case is also actionable", () => {
    const base = makeValidLongDecision();
    const input: BrooksDecisionInputV1 = {
      ...base,
      shortCase: { ...base.shortCase, state: "actionable" },
    };

    assert.throws(() => createBrooksDecision(input, makeValidationContext()), {
      name: "BrooksDecisionContractError",
      message: /opposing directional case cannot also be actionable/,
    });
  });

  it("accepts a limit entry anchored by an existing structure", () => {
    const base = makeValidLongDecision();
    if (base.tradePlan === null) assert.fail("fixture requires a trade plan");
    const input: BrooksDecisionInputV1 = {
      ...base,
      tradePlan: {
        ...base.tradePlan,
        entry: {
          entryType: "limit",
          relation: "pullback_to",
          structureId: "structure:support",
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
      },
    };

    const validated = createBrooksDecision(
      input,
      makeValidationContext({
        plannedGeometry: {
          entryNormalizedPrice: 101,
          protectionNormalizedPrice: 99,
          objectiveNormalizedPrice: 112,
        },
      }),
    );
    assert.equal(validated.decision.tradePlan?.entry.entryType, "limit");
  });

  it("accepts market-next-event only after the last visible bar", () => {
    const base = makeValidLongDecision();
    if (base.tradePlan === null) assert.fail("fixture requires a trade plan");
    const marketEntry: BrooksDecisionInputV1 = {
      ...base,
      tradePlan: {
        ...base.tradePlan,
        entry: {
          entryType: "market_next_event",
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
      },
    };
    assert.equal(
      createBrooksDecision(marketEntry, makeValidationContext()).decision
        .tradePlan?.entry.entryType,
      "market_next_event",
    );

    const backfilled: BrooksDecisionInputV1 = {
      ...marketEntry,
      tradePlan: {
        ...marketEntry.tradePlan!,
        entry: {
          ...marketEntry.tradePlan!.entry,
          validAfterBarId: "bar:118",
        },
      },
    };
    assert.throws(
      () => createBrooksDecision(backfilled, makeValidationContext()),
      { message: /entry must become valid after the last visible bar/ },
    );
  });

  it("rejects a limit entry or breakout lifecycle with an unknown structure", () => {
    const base = makeValidLongDecision();
    if (base.tradePlan === null) assert.fail("fixture requires a trade plan");
    const unknownLimit: BrooksDecisionInputV1 = {
      ...base,
      tradePlan: {
        ...base.tradePlan,
        entry: {
          entryType: "limit",
          relation: "pullback_to",
          structureId: "structure:missing",
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
      },
    };
    assert.throws(
      () => createBrooksDecision(unknownLimit, makeValidationContext()),
      { message: /limit entry references unknown structure/ },
    );

    const unknownBreakout: BrooksDecisionInputV1 = {
      ...base,
      breakoutLifecycle: {
        ...base.breakoutLifecycle,
        state: "provisional",
        direction: "up",
        structureId: "structure:missing",
      },
    };
    assert.throws(
      () => createBrooksDecision(unknownBreakout, makeValidationContext()),
      { message: /breakout lifecycle references unknown structure/ },
    );
  });

  it("requires directional and primary magnets for selected objectives", () => {
    const base = makeValidLongDecision("scalp");
    const wrongSide: BrooksDecisionInputV1 = {
      ...base,
      magnets: base.magnets.map((magnet) => ({ ...magnet, side: "below" })),
    };
    assert.throws(
      () => createBrooksDecision(wrongSide, makeValidationContext()),
      { message: /objective magnet is on the wrong side/ },
    );

    const secondaryScalp: BrooksDecisionInputV1 = {
      ...base,
      magnets: base.magnets.map((magnet) => ({
        ...magnet,
        relevance: "secondary",
      })),
    };
    assert.throws(
      () => createBrooksDecision(secondaryScalp, makeValidationContext()),
      { message: /scalp objective requires a primary magnet/ },
    );
  });
});
