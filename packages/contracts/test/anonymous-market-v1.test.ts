import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAnonymousMarketInput,
  createBrooksPolicyCase,
} from "../src/policy-input-v1.ts";

function makeCase() {
  return createBrooksPolicyCase({
    caseId: "case:anonymous-market",
    policyStreamId: "stream:anonymous-market",
    barDurationSeconds: 300,
    bars: Array.from({ length: 40 }, (_, index) => ({
      barId: `local:${index}`,
      sequence: 500 + index,
      open: 50 + index,
      high: 51 + index,
      low: 49 + index,
      close: 50 + index,
      isClosed: true,
      continuityFromPrevious:
        index === 0
          ? ("unknown" as const)
          : index === 20
            ? ("session_boundary" as const)
            : ("contiguous" as const),
    })),
    lastVisibleBarId: "local:39",
    isLeftCensored: true,
  });
}

describe("anonymous causal market input V1", () => {
  it("is the single normalized market representation shared by payload and renderer", () => {
    const market = createAnonymousMarketInput(makeCase());

    assert.equal(market.barDurationSeconds, 300);
    assert.equal(market.visibleBarCount, 40);
    assert.equal(market.lastVisibleBarId, "bar:039");
    assert.equal(market.leftCensoredBarsMissing, 80);
    assert.equal(market.bars[0]?.open, 100);
    assert.equal(market.bars[39]?.close, 178);
    assert.equal(
      market.bars[20]?.continuityFromPrevious,
      "session_boundary",
    );
    assert.equal(Object.isFrozen(market), true);
    assert.equal(Object.isFrozen(market.bars), true);
  });
});
