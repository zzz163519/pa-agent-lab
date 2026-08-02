import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertOutboundModelPayloadPrivacy,
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  createOutboundModelPayload,
  type BrooksPolicyCaseV1,
  type LocalClosedBarV1,
} from "../src/policy-input-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function makeBars(count = 120): LocalClosedBarV1[] {
  return Array.from({ length: count }, (_, index) => ({
    barId: `local-bar:${index}`,
    sequence: index,
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100 + index,
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
}

function anonymousBarId(index: number): string {
  return `bar:${index.toString().padStart(3, "0")}`;
}

function makePolicyCase(
  count = 120,
  isLeftCensored = count < 120,
): BrooksPolicyCaseV1 {
  return createBrooksPolicyCase({
    caseId: "case:synthetic",
    policyStreamId: "stream:synthetic",
    barDurationSeconds: 300,
    bars: makeBars(count),
    lastVisibleBarId: `local-bar:${count - 1}`,
    isLeftCensored,
  });
}

function makeCharts(count = 120) {
  const lastVisibleBarId = anonymousBarId(count - 1);
  return {
    context: {
      panel: "context" as const,
      mediaType: "image/png" as const,
      contentHash: sha("1"),
      barIds: Array.from({ length: count }, (_, index) => anonymousBarId(index)),
      lastVisibleBarId,
    },
    detail: {
      panel: "detail" as const,
      mediaType: "image/png" as const,
      contentHash: sha("2"),
      barIds: Array.from(
        { length: 40 },
        (_, index) => anonymousBarId(index + count - 40),
      ),
      lastVisibleBarId,
    },
  };
}

function makePolicyInput(count = 120) {
  return createBrooksPolicyInput({
    policyCase: makePolicyCase(count),
    charts: makeCharts(count),
    doctrine: [
      {
        doctrineId: "doctrine:breakout-follow-through",
        concept: "Breakout follow-through",
        rule: "A breakout needs follow-through before being treated as strong.",
        appliesWhen: ["price closes beyond a prior boundary"],
        avoidWhen: ["the breakout immediately reverses"],
        decisionEffect: [
          "Do not promote an unconfirmed breakout to a trade premise.",
        ],
      },
    ],
  });
}

function makeOutboundPayload() {
  return createOutboundModelPayload({
    policyInput: makePolicyInput(),
    promptHash: sha("3"),
    outputSchemaVersion: "brooks-decision.v1",
  });
}

describe("Brooks policy input V1", () => {
  it("builds an anonymous normalized 120/40 causal payload", () => {
    const policyInput = makePolicyInput();

    assert.equal(policyInput.market.barDurationSeconds, 300);
    assert.equal(policyInput.market.lastVisibleBarId, "bar:119");
    assert.equal(policyInput.market.bars.length, 120);
    assert.equal(policyInput.market.bars[0]?.close, 100);
    assert.equal(policyInput.market.bars[119]?.close, 219);
    assert.deepEqual(
      policyInput.charts.detail.barIds,
      Array.from({ length: 40 }, (_, index) => anonymousBarId(index + 80)),
    );

    const outbound = createOutboundModelPayload({
      policyInput,
      promptHash: sha("3"),
      outputSchemaVersion: "brooks-decision.v1",
    });
    const serialized = JSON.stringify(outbound);

    assert.doesNotMatch(
      serialized,
      /case:synthetic|stream:synthetic|local-bar/,
    );
    assert.doesNotMatch(
      serialized,
      /rawPrice|symbol|timestamp|venue|account|outcome|pnl/i,
    );
    assert.equal(Object.isFrozen(outbound), true);
    assert.match(outbound.payloadHash, /^sha256:[0-9a-f]{64}$/);
  });

  it("accepts explicit left-censoring but rejects incomplete or open prefixes", () => {
    const censored = makePolicyInput(40);
    assert.equal(censored.market.isLeftCensored, true);
    assert.equal(censored.market.leftCensoredBarsMissing, 80);
    assert.equal(censored.market.lastVisibleBarId, "bar:039");
    assert.equal(censored.charts.detail.barIds.length, 40);

    assert.throws(() => makePolicyCase(39), {
      message: /left-censored input requires between 40 and 119 closed bars/,
    });

    assert.throws(
      () =>
        createBrooksPolicyCase({
          caseId: "case:short",
          policyStreamId: "stream:synthetic",
          barDurationSeconds: 300,
          bars: makeBars(119),
          lastVisibleBarId: "local-bar:118",
          isLeftCensored: false,
        }),
      { message: /non-censored input requires exactly 120 closed bars/ },
    );

    const openBars = makeBars();
    openBars[119] = { ...openBars[119]!, isClosed: false };
    assert.throws(
      () =>
        createBrooksPolicyCase({
          caseId: "case:open",
          policyStreamId: "stream:synthetic",
          barDurationSeconds: 300,
          bars: openBars,
          lastVisibleBarId: "local-bar:119",
          isLeftCensored: false,
        }),
      { message: /only closed bars/ },
    );
  });

  it("rejects invalid OHLC and a detail chart outside the final 40 bars", () => {
    const invalidBars = makeBars();
    invalidBars[12] = {
      ...invalidBars[12]!,
      high: invalidBars[12]!.open - 1,
    };
    assert.throws(
      () =>
        createBrooksPolicyCase({
          caseId: "case:bad-ohlc",
          policyStreamId: "stream:synthetic",
          barDurationSeconds: 300,
          bars: invalidBars,
          lastVisibleBarId: "local-bar:119",
          isLeftCensored: false,
        }),
      { message: /invalid OHLC geometry/ },
    );

    const charts = makeCharts();
    const wrongDetail = {
      ...charts,
      detail: {
        ...charts.detail,
        barIds: charts.detail.barIds.map((barId, index) =>
          index === 0 ? "bar:079" : barId,
        ),
      },
    };
    assert.throws(
      () =>
        createBrooksPolicyInput({
          policyCase: makePolicyCase(),
          charts: wrongDetail,
          doctrine: [],
        }),
      { message: /detail chart bars must match the causal market prefix/ },
    );
  });

  it("rejects incomplete Doctrine RAG semantics", () => {
    assert.throws(
      () =>
        createBrooksPolicyInput({
          policyCase: makePolicyCase(),
          charts: makeCharts(),
          doctrine: [
            {
              doctrineId: "doctrine:incomplete",
              concept: "Incomplete doctrine",
              rule: "A rule without an application boundary is incomplete.",
              appliesWhen: [],
              avoidWhen: ["the rule does not apply"],
              decisionEffect: ["Do not retrieve incomplete doctrine."],
            },
          ],
        }),
      { message: /appliesWhen must contain between 1 and 12 items/ },
    );
  });

  it("rejects root or nested privacy fields and tampered content hashes", () => {
    const payload = makeOutboundPayload();
    assertOutboundModelPayloadPrivacy(payload);

    assert.throws(
      () =>
        assertOutboundModelPayloadPrivacy({
          ...payload,
          symbol: "SYNTHETIC",
        }),
      { message: /forbidden or unknown field: symbol/ },
    );

    const nested = structuredClone(payload) as unknown as {
      policyInput: { market: { bars: Array<Record<string, unknown>> } };
    };
    nested.policyInput.market.bars[0]!.timestamp = "redacted";
    assert.throws(() => assertOutboundModelPayloadPrivacy(nested), {
      message: /forbidden or unknown field: timestamp/,
    });

    const exotic = structuredClone(payload);
    Object.defineProperty(exotic, "toJSON", {
      value: () => ({ symbol: "SYNTHETIC" }),
    });
    assert.throws(() => assertOutboundModelPayloadPrivacy(exotic), {
      message: /fields must be enumerable data properties/,
    });

    assert.throws(
      () =>
        assertOutboundModelPayloadPrivacy({
          ...payload,
          payloadHash: sha("9"),
        }),
      { message: /payload hash does not match its content/ },
    );
  });
});
