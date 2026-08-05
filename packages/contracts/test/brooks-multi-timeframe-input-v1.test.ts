import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "../src/contract-utils-v1.ts";
import {
  assertBrooksMultiTimeframeCaseIntegrityV1,
  assertBrooksMultiTimeframePolicyInputPrivacyV1,
  createBrooksMultiTimeframeCaseV1,
  createBrooksMultiTimeframePolicyInputV1,
  createBrooksMultiTimeframeSourceProfileV1,
  createAnonymousMultiTimeframeMarketInputV1,
  type AnonymousMultiTimeframeChartManifestV1,
  type BrooksMultiTimeframePolicyInputV1,
  type LocalMultiTimeframeBarV1,
} from "../src/brooks-multi-timeframe-input-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;
const FIVE_MINUTES_MS = 300_000;

function makeSourceProfile() {
  return createBrooksMultiTimeframeSourceProfileV1({
    sourceId: "source:synthetic-native",
    sourceVersion: "synthetic-native.v1",
    marketSurface: "synthetic-market",
    instrumentId: "instrument:synthetic",
    priceBasis: "unadjusted-trade-price.v1",
    sessionProfile: {
      profileId: "session:synthetic-24x7",
      profileVersion: "synthetic-24x7.v1",
      timezone: "Etc/UTC",
      calendarVersion: "synthetic-calendar.v1",
      fiveMinuteAlignmentId: "alignment:5m:epoch",
      sixtyMinuteAlignmentId: "alignment:60m:epoch",
      dailyAlignmentId: "alignment:1d:utc-midnight",
    },
  });
}

function makeBars(
  timeframe: "5m" | "60m" | "1d",
  count: number,
  cutoffEpochMs: number,
  sourceProfileHash: `sha256:${string}`,
): LocalMultiTimeframeBarV1[] {
  const durationMs =
    timeframe === "5m"
      ? FIVE_MINUTES_MS
      : timeframe === "60m"
        ? 3_600_000
        : 86_400_000;
  const firstStart = cutoffEpochMs - count * durationMs;
  return Array.from({ length: count }, (_, index) => {
    const open = 200 + index;
    return {
      sourceBarId: `source-bar:${timeframe}:${index}`,
      sequence: index,
      timeframe,
      lifecycle: "finalized" as const,
      periodStartEpochMs: firstStart + index * durationMs,
      periodEndEpochMs: firstStart + (index + 1) * durationMs,
      snapshotCutoffEpochMs: cutoffEpochMs,
      open,
      high: open + 2,
      low: open - 2,
      close: open + 1,
      continuityFromPrevious:
        index === 0 ? ("unknown_left_boundary" as const) : ("contiguous" as const),
      progress: null,
      sourceContentHash: sha(((index % 9) + 1).toString()),
      sourceProfileHash,
      alignmentId:
        timeframe === "5m"
          ? "alignment:5m:epoch"
          : timeframe === "60m"
            ? "alignment:60m:epoch"
            : "alignment:1d:utc-midnight",
    };
  });
}

function makeFiveMinuteOnlyCase(count = 40) {
  return makeCase({ primaryCount: count });
}

function makeChartManifest(
  timeframe: "5m" | "60m" | "1d",
  panel: "context" | "detail",
  barIds: readonly string[],
  hashDigit: string,
): AnonymousMultiTimeframeChartManifestV1 {
  return {
    timeframe,
    panel,
    mediaType: "image/png",
    contentHash: sha(hashDigit),
    barIds: [...barIds],
    lastVisibleBarId: barIds.at(-1) ?? null,
  };
}

function makePolicyInput(policyCase = makeCase({
  primaryCount: 120,
  sixtyMinuteCount: 12,
  dailyCount: 3,
})) {
  const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
  const primaryIds = market.primary.bars.map((bar) => bar.barId);
  const sixtyMinuteIds =
    market.references.sixtyMinute.availability === "supplied"
      ? market.references.sixtyMinute.bars.map((bar) => bar.barId)
      : [];
  const dailyIds =
    market.references.daily.availability === "supplied"
      ? market.references.daily.bars.map((bar) => bar.barId)
      : [];
  return createBrooksMultiTimeframePolicyInputV1({
    policyCase,
    charts: {
      primary: {
        context: makeChartManifest("5m", "context", primaryIds, "1"),
        detail: makeChartManifest("5m", "detail", primaryIds.slice(-40), "2"),
      },
      references: {
        sixtyMinute:
          market.references.sixtyMinute.availability === "supplied"
            ? makeChartManifest("60m", "context", sixtyMinuteIds, "3")
            : null,
        daily:
          market.references.daily.availability === "supplied"
            ? makeChartManifest("1d", "context", dailyIds, "4")
            : null,
      },
    },
    doctrine: [],
  });
}

function rehashPolicyInput(
  value: BrooksMultiTimeframePolicyInputV1,
): BrooksMultiTimeframePolicyInputV1 {
  const cloned = structuredClone(value) as unknown as Record<string, unknown> & {
    inputHash: `sha256:${string}`;
    market: Record<string, unknown> & { marketHash: `sha256:${string}` };
  };
  const {
    schemaVersion: _marketSchemaVersion,
    marketHash: _marketHash,
    ...marketBody
  } = cloned.market;
  cloned.market.marketHash = canonicalHash(marketBody);
  const {
    schemaVersion: _inputSchemaVersion,
    inputHash: _inputHash,
    ...inputBody
  } = cloned;
  cloned.inputHash = canonicalHash(inputBody);
  return cloned as unknown as BrooksMultiTimeframePolicyInputV1;
}

function makeSuppliedReference(
  timeframe: "60m" | "1d",
  count: number,
  cutoffEpochMs: number,
  sourceProfileHash: `sha256:${string}`,
  options: Readonly<{
    provisional?: boolean;
    historyStart?:
      | "instrument_history_start"
      | "window_truncated"
      | "source_history_limit"
      | "unknown";
  }> = {},
) {
  const provisional = options.provisional ?? false;
  const durationMs = timeframe === "60m" ? 3_600_000 : 86_400_000;
  const provisionalStart = cutoffEpochMs - durationMs / 2;
  const finalizedCount = provisional ? count - 1 : count;
  const finalizedCutoff = provisional ? provisionalStart : cutoffEpochMs;
  const bars = makeBars(
    timeframe,
    finalizedCount,
    finalizedCutoff,
    sourceProfileHash,
  );
  bars.forEach((bar, index) => {
    bars[index] = { ...bar, snapshotCutoffEpochMs: cutoffEpochMs };
  });
  if (provisional) {
    bars.push({
      sourceBarId: `source-bar:${timeframe}:provisional`,
      sequence: finalizedCount,
      timeframe,
      lifecycle: "provisional",
      periodStartEpochMs: provisionalStart,
      periodEndEpochMs: provisionalStart + durationMs,
      snapshotCutoffEpochMs: cutoffEpochMs,
      open: 400,
      high: 403,
      low: 399,
      close: 402,
      continuityFromPrevious:
        finalizedCount === 0 ? "unknown_left_boundary" : "contiguous",
      progress: {
        completedBaseIntervals: timeframe === "60m" ? 6 : 144,
        scheduledBaseIntervals: timeframe === "60m" ? 12 : 288,
        progressStatus: "verified",
      },
      sourceContentHash: sha("a"),
      sourceProfileHash,
      alignmentId:
        timeframe === "60m"
          ? "alignment:60m:epoch"
          : "alignment:1d:utc-midnight",
    });
  }
  return {
    availability: "supplied" as const,
    historyStart: options.historyStart ?? ("unknown" as const),
    bars,
  };
}

function makeCase(
  options: Readonly<{
    primaryCount?: number;
    sixtyMinuteCount?: number;
    dailyCount?: number;
    sixtyMinuteProvisional?: boolean;
    dailyProvisional?: boolean;
  }> = {},
) {
  const sourceProfile = makeSourceProfile();
  const decisionCutoffEpochMs = 1_800_000_000;
  const sixtyMinute =
    options.sixtyMinuteCount === undefined
      ? ({ availability: "not_supplied" } as const)
      : makeSuppliedReference(
          "60m",
          options.sixtyMinuteCount,
          decisionCutoffEpochMs,
          sourceProfile.profileHash,
          { provisional: options.sixtyMinuteProvisional ?? false },
        );
  const daily =
    options.dailyCount === undefined
      ? ({ availability: "not_supplied" } as const)
      : makeSuppliedReference(
          "1d",
          options.dailyCount,
          decisionCutoffEpochMs,
          sourceProfile.profileHash,
          { provisional: options.dailyProvisional ?? false },
        );
  return createBrooksMultiTimeframeCaseV1({
    caseId: "case:synthetic-mtf",
    policyStreamId: "stream:synthetic-mtf",
    decisionCutoffEpochMs,
    sourceProfile,
    primaryBars: makeBars(
      "5m",
      options.primaryCount ?? 40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    ),
    references: { sixtyMinute, daily },
  });
}

describe("Brooks multi-timeframe input V1", () => {
  it("creates the smallest valid five-minute-only left-censored Case and anonymous market input", () => {
    const policyCase = makeFiveMinuteOnlyCase();
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);

    assert.equal(policyCase.schemaVersion, "brooks-multi-timeframe-case.v1");
    assert.equal(policyCase.primaryBars.length, 40);
    assert.equal(policyCase.isPrimaryLeftCensored, true);
    assert.equal(Object.isFrozen(policyCase), true);
    assert.match(policyCase.caseHash, /^sha256:[0-9a-f]{64}$/);

    assert.equal(market.schemaVersion, "anonymous-multi-timeframe-market.v1");
    assert.equal(market.normalization.base, 100);
    assert.equal(market.primary.bars[0]?.close, 100);
    assert.equal(market.primary.bars[0]?.barId, "bar:5m:finalized:000");
    assert.equal(market.primary.isLeftCensored, true);
    assert.deepEqual(market.references, {
      sixtyMinute: { availability: "not_supplied" },
      daily: { availability: "not_supplied" },
    });
    assert.equal(Object.isFrozen(market), true);
  });

  it("enforces the accepted primary and optional reference count boundaries", () => {
    assert.throws(() => makeCase({ primaryCount: 39 }), {
      message: /between 40 and 120 finalized bars/,
    });
    assert.equal(makeCase({ primaryCount: 40 }).isPrimaryLeftCensored, true);
    assert.equal(makeCase({ primaryCount: 119 }).isPrimaryLeftCensored, true);
    assert.equal(makeCase({ primaryCount: 120 }).isPrimaryLeftCensored, false);
    assert.throws(() => makeCase({ primaryCount: 121 }), {
      message: /between 40 and 120 finalized bars/,
    });

    for (const count of [0, 1, 119, 120]) {
      assert.equal(
        makeCase({ sixtyMinuteCount: count }).references.sixtyMinute
          .availability,
        "supplied",
      );
      assert.equal(
        makeCase({ dailyCount: count }).references.daily.availability,
        "supplied",
      );
    }
    assert.throws(() => makeCase({ sixtyMinuteCount: 121 }), {
      message: /reference context accepts at most 120 visible bars/,
    });
    assert.throws(() => makeCase({ dailyCount: 121 }), {
      message: /reference context accepts at most 120 visible bars/,
    });
  });

  it("accepts exactly the four optional-reference combinations", () => {
    const combinations = [
      makeCase(),
      makeCase({ sixtyMinuteCount: 12 }),
      makeCase({ dailyCount: 3 }),
      makeCase({ sixtyMinuteCount: 12, dailyCount: 3 }),
    ];
    assert.deepEqual(
      combinations.map((policyCase) => [
        policyCase.references.sixtyMinute.availability,
        policyCase.references.daily.availability,
      ]),
      [
        ["not_supplied", "not_supplied"],
        ["supplied", "not_supplied"],
        ["not_supplied", "supplied"],
        ["supplied", "supplied"],
      ],
    );
  });

  it("admits one final cutoff-frozen provisional reference bar and rejects invalid lifecycle placement", () => {
    const early = makeCase({
      sixtyMinuteCount: 1,
      sixtyMinuteProvisional: true,
    });
    const full = makeCase({
      sixtyMinuteCount: 120,
      sixtyMinuteProvisional: true,
      dailyCount: 1,
      dailyProvisional: true,
    });
    assert.equal(
      early.references.sixtyMinute.availability === "supplied"
        ? early.references.sixtyMinute.bars[0]?.lifecycle
        : undefined,
      "provisional",
    );
    assert.equal(
      full.references.sixtyMinute.availability === "supplied"
        ? full.references.sixtyMinute.bars.length
        : undefined,
      120,
    );

    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const invalid = makeSuppliedReference(
      "60m",
      2,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
      { provisional: true },
    );
    invalid.bars.push({ ...invalid.bars[1]!, sequence: 2 });
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:two-provisional",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: makeBars(
            "5m",
            40,
            decisionCutoffEpochMs,
            sourceProfile.profileHash,
          ),
          references: {
            sixtyMinute: invalid,
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /at most one provisional bar/ },
    );

    const nonFinal = makeSuppliedReference(
      "60m",
      2,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
      { provisional: true },
    );
    nonFinal.bars.reverse();
    nonFinal.bars.forEach((bar, index) => {
      nonFinal.bars[index] = { ...bar, sequence: index };
    });
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:provisional-not-final",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: makeBars(
            "5m",
            40,
            decisionCutoffEpochMs,
            sourceProfile.profileHash,
          ),
          references: {
            sixtyMinute: nonFinal,
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /provisional bar must be the final visible reference bar/ },
    );
  });

  it("uses one five-minute normalization base and timeframe-aware anonymous identities", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const sixtyMinute = makeSuppliedReference(
      "60m",
      1,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    sixtyMinute.bars[0] = {
      ...sixtyMinute.bars[0]!,
      open: 398,
      high: 404,
      low: 397,
      close: 402,
    };
    const policyCase = createBrooksMultiTimeframeCaseV1({
      caseId: "case:common-normalization",
      policyStreamId: "stream:synthetic-mtf",
      decisionCutoffEpochMs,
      sourceProfile,
      primaryBars: makeBars(
        "5m",
        40,
        decisionCutoffEpochMs,
        sourceProfile.profileHash,
      ),
      references: {
        sixtyMinute,
        daily: { availability: "not_supplied" },
      },
    });
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    const reference = market.references.sixtyMinute;

    assert.equal(market.primary.bars[0]?.close, 100);
    assert.equal(reference.availability, "supplied");
    if (reference.availability === "supplied") {
      assert.equal(reference.bars[0]?.close, (402 / 201) * 100);
      assert.equal(reference.bars[0]?.barId, "bar:60m:finalized:000");
    }
    assert.equal(market.normalization.anchorBarId, "bar:5m:finalized:000");
  });

  it("preserves explicit continuity and history-start states without inventing closure data", () => {
    for (const historyStart of [
      "instrument_history_start",
      "window_truncated",
      "source_history_limit",
      "unknown",
    ] as const) {
      const sourceProfile = makeSourceProfile();
      const decisionCutoffEpochMs = 1_800_000_000;
      const reference = makeSuppliedReference(
        "60m",
        1,
        decisionCutoffEpochMs,
        sourceProfile.profileHash,
        { historyStart },
      );
      const policyCase = createBrooksMultiTimeframeCaseV1({
        caseId: `case:${historyStart}`,
        policyStreamId: "stream:synthetic-mtf",
        decisionCutoffEpochMs,
        sourceProfile,
        primaryBars: makeBars(
          "5m",
          40,
          decisionCutoffEpochMs,
          sourceProfile.profileHash,
        ),
        references: {
          sixtyMinute: reference,
          daily: { availability: "not_supplied" },
        },
      });
      assert.equal(
        policyCase.references.sixtyMinute.availability === "supplied"
          ? policyCase.references.sixtyMinute.historyStart
          : undefined,
        historyStart,
      );
    }

    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const bars = makeBars(
      "5m",
      40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    for (let index = 0; index < 20; index += 1) {
      bars[index] = {
        ...bars[index]!,
        periodStartEpochMs: bars[index]!.periodStartEpochMs - FIVE_MINUTES_MS,
        periodEndEpochMs: bars[index]!.periodEndEpochMs - FIVE_MINUTES_MS,
      };
    }
    bars[20] = {
      ...bars[20]!,
      continuityFromPrevious: "missing_data",
    };
    assert.doesNotThrow(() =>
      createBrooksMultiTimeframeCaseV1({
        caseId: "case:explicit-gap",
        policyStreamId: "stream:synthetic-mtf",
        decisionCutoffEpochMs,
        sourceProfile,
        primaryBars: bars,
        references: {
          sixtyMinute: { availability: "not_supplied" },
          daily: { availability: "not_supplied" },
        },
      }),
    );
    bars[20] = { ...bars[20]!, continuityFromPrevious: "contiguous" };
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:hidden-gap",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: bars,
          references: {
            sixtyMinute: { availability: "not_supplied" },
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /contiguous bar must start at the previous bar end/ },
    );
  });

  it("builds one complete exact-whitelist policy input without local identities", () => {
    const policyInput = makePolicyInput();
    assertBrooksMultiTimeframePolicyInputPrivacyV1(policyInput);
    const serialized = JSON.stringify(policyInput);

    assert.equal(policyInput.schemaVersion, "brooks-multi-timeframe-policy-input.v1");
    assert.match(policyInput.inputHash, /^sha256:[0-9a-f]{64}$/);
    assert.doesNotMatch(
      serialized,
      /source:synthetic|instrument:synthetic|synthetic-market|source-bar|epochMs|timezone|calendarVersion|rawPrice|account|outcome|pnl/i,
    );
    assert.equal(Object.isFrozen(policyInput), true);

    const injected = structuredClone(policyInput) as unknown as Record<string, unknown>;
    injected.symbol = "SYNTHETIC";
    assert.throws(() => assertBrooksMultiTimeframePolicyInputPrivacyV1(injected), {
      message: /unknown field: symbol/,
    });
  });

  it("requires exact five-minute duration and the final primary close at the immutable cutoff", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const primaryBars = makeBars(
      "5m",
      40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    const wrongDuration = primaryBars.map((bar, index) =>
      index === primaryBars.length - 1
        ? { ...bar, periodStartEpochMs: bar.periodStartEpochMs + 1 }
        : bar,
    );
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:wrong-5m-duration",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: wrongDuration,
          references: {
            sixtyMinute: { availability: "not_supplied" },
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /five-minute bar must span exactly 300 seconds/ },
    );

    const stalePrimary = primaryBars.map((bar) => ({
      ...bar,
      periodStartEpochMs: bar.periodStartEpochMs - FIVE_MINUTES_MS,
      periodEndEpochMs: bar.periodEndEpochMs - FIVE_MINUTES_MS,
    }));
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:stale-primary-cutoff",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: stalePrimary,
          references: {
            sixtyMinute: { availability: "not_supplied" },
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /final primary bar must end at the decision cutoff/ },
    );
  });

  it("rejects rehashed anonymous count, primary lifecycle, and reference lifecycle violations", () => {
    const belowFloor = rehashPolicyInput(makePolicyInput());
    const belowFloorMarket = belowFloor.market as unknown as {
      primary: {
        visibleBarCount: number;
        isLeftCensored: boolean;
        leftCensoredBarsMissing: number;
        bars: unknown[];
      };
    };
    belowFloorMarket.primary.bars = belowFloorMarket.primary.bars.slice(0, 39);
    belowFloorMarket.primary.visibleBarCount = 39;
    belowFloorMarket.primary.isLeftCensored = true;
    belowFloorMarket.primary.leftCensoredBarsMissing = 81;
    assert.throws(
      () => assertBrooksMultiTimeframePolicyInputPrivacyV1(rehashPolicyInput(belowFloor)),
      { message: /anonymous primary requires between 40 and 120 bars/ },
    );

    const provisionalPrimary = structuredClone(makePolicyInput()) as unknown as {
      market: { primary: { bars: Array<Record<string, unknown>> } };
    } & BrooksMultiTimeframePolicyInputV1;
    const lastPrimary = provisionalPrimary.market.primary.bars.at(-1)! as unknown as Record<string, unknown>;
    lastPrimary.lifecycle = "provisional";
    lastPrimary.barId = "bar:5m:provisional:119";
    lastPrimary.progress = {
      completedBaseIntervals: 1,
      scheduledBaseIntervals: 2,
      progressStatus: "verified",
    };
    assert.throws(
      () =>
        assertBrooksMultiTimeframePolicyInputPrivacyV1(
          rehashPolicyInput(provisionalPrimary),
        ),
      { message: /anonymous primary bars must be finalized/ },
    );

    const oversizedReference = structuredClone(makePolicyInput(
      makeCase({ primaryCount: 120, sixtyMinuteCount: 120 }),
    )) as unknown as {
      market: {
        references: {
          sixtyMinute: { visibleBarCount: number; bars: Array<Record<string, unknown>> };
        };
      };
    } & BrooksMultiTimeframePolicyInputV1;
    const finalReference = oversizedReference.market.references.sixtyMinute.bars.at(-1)!;
    oversizedReference.market.references.sixtyMinute.bars.push({
      ...finalReference,
      barId: "bar:60m:finalized:120",
      sequence: 120,
    });
    oversizedReference.market.references.sixtyMinute.visibleBarCount = 121;
    assert.throws(
      () =>
        assertBrooksMultiTimeframePolicyInputPrivacyV1(
          rehashPolicyInput(oversizedReference),
        ),
      { message: /anonymous reference accepts at most 120 bars/ },
    );

    const twoProvisional = structuredClone(makePolicyInput(
      makeCase({
        primaryCount: 120,
        sixtyMinuteCount: 2,
        sixtyMinuteProvisional: true,
      }),
    )) as unknown as {
      market: {
        references: {
          sixtyMinute: { bars: Array<Record<string, unknown>> };
        };
      };
    } & BrooksMultiTimeframePolicyInputV1;
    const firstReference = twoProvisional.market.references.sixtyMinute.bars[0]! as unknown as Record<string, unknown>;
    firstReference.lifecycle = "provisional";
    firstReference.barId = "bar:60m:provisional:000";
    firstReference.progress = {
      completedBaseIntervals: 1,
      scheduledBaseIntervals: 12,
      progressStatus: "verified",
    };
    assert.throws(
      () =>
        assertBrooksMultiTimeframePolicyInputPrivacyV1(
          rehashPolicyInput(twoProvisional),
        ),
      { message: /at most one provisional anonymous reference bar/ },
    );
  });

  it("rejects chart/reference drift and rehashed local Case shape injection", () => {
    const policyCase = makeCase({ primaryCount: 120, sixtyMinuteCount: 0 });
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    const primaryIds = market.primary.bars.map((bar) => bar.barId);
    assert.throws(
      () =>
        createBrooksMultiTimeframePolicyInputV1({
          policyCase,
          charts: {
            primary: {
              context: makeChartManifest("5m", "context", primaryIds, "1"),
              detail: makeChartManifest("5m", "detail", primaryIds.slice(-40), "2"),
            },
            references: { sixtyMinute: null, daily: null },
          },
          doctrine: [],
        }),
      { message: /supplied 60m reference requires a context chart/ },
    );

    const injected = structuredClone(policyCase) as unknown as Record<string, unknown> & {
      caseHash: `sha256:${string}`;
    };
    injected.symbol = "SYNTHETIC";
    assert.throws(() => assertBrooksMultiTimeframeCaseIntegrityV1(injected), {
      message: /unknown field: symbol/,
    });
  });

  it("covers early, nearly complete, and unverified provisional progress without inventing a calendar", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const primaryBars = makeBars(
      "5m",
      40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    const provisional = makeSuppliedReference(
      "60m",
      1,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
      { provisional: true },
    );
    const progressCases = [
      {
        completedBaseIntervals: 0,
        scheduledBaseIntervals: 12,
        progressStatus: "verified" as const,
      },
      {
        completedBaseIntervals: 11,
        scheduledBaseIntervals: 12,
        progressStatus: "verified" as const,
      },
      {
        completedBaseIntervals: null,
        scheduledBaseIntervals: null,
        progressStatus: "unverified_special_session" as const,
      },
    ];
    for (const progress of progressCases) {
      const reference = structuredClone(provisional);
      reference.bars[0] = { ...reference.bars[0]!, progress };
      assert.doesNotThrow(() =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:provisional-progress",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars,
          references: {
            sixtyMinute: reference,
            daily: { availability: "not_supplied" },
          },
        }),
      );
    }

    for (const progress of [
      {
        completedBaseIntervals: 12,
        scheduledBaseIntervals: 12,
        progressStatus: "verified" as const,
      },
      {
        completedBaseIntervals: null,
        scheduledBaseIntervals: 12,
        progressStatus: "unverified_special_session" as const,
      },
    ]) {
      const reference = structuredClone(provisional);
      reference.bars[0] = { ...reference.bars[0]!, progress };
      assert.throws(() =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:invalid-provisional-progress",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars,
          references: {
            sixtyMinute: reference,
            daily: { availability: "not_supplied" },
          },
        }),
      );
    }

    const afterCutoff = structuredClone(provisional);
    afterCutoff.bars[0] = {
      ...afterCutoff.bars[0]!,
      periodStartEpochMs: decisionCutoffEpochMs,
      periodEndEpochMs: decisionCutoffEpochMs + 3_600_000,
    };
    assert.throws(
      () =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:post-cutoff-provisional",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars,
          references: {
            sixtyMinute: afterCutoff,
            daily: { availability: "not_supplied" },
          },
        }),
      { message: /provisional bar must contain the immutable decision cutoff/ },
    );
  });

  it("binds every source, market, instrument, price, session, alignment, cutoff, and content identity through hashes", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const primaryBars = makeBars(
      "5m",
      40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    const profileVariants = [
      { sourceId: "source:other" },
      { sourceVersion: "synthetic-native.v2" },
      { marketSurface: "other-market" },
      { instrumentId: "instrument:other" },
      { priceBasis: "adjusted-price.v1" },
    ];
    for (const patch of profileVariants) {
      const alternate = createBrooksMultiTimeframeSourceProfileV1({
        sourceId: patch.sourceId ?? sourceProfile.sourceId,
        sourceVersion: patch.sourceVersion ?? sourceProfile.sourceVersion,
        marketSurface: patch.marketSurface ?? sourceProfile.marketSurface,
        instrumentId: patch.instrumentId ?? sourceProfile.instrumentId,
        priceBasis: patch.priceBasis ?? sourceProfile.priceBasis,
        sessionProfile: sourceProfile.sessionProfile,
      });
      const reference = makeSuppliedReference(
        "60m",
        1,
        decisionCutoffEpochMs,
        alternate.profileHash,
      );
      assert.throws(() =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:identity-mismatch",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars,
          references: {
            sixtyMinute: reference,
            daily: { availability: "not_supplied" },
          },
        }),
      );
    }

    for (const sessionPatch of [
      { profileId: "session:other" },
      { profileVersion: "synthetic-24x7.v2" },
      { timezone: "Etc/GMT" },
      { calendarVersion: "synthetic-calendar.v2" },
      { fiveMinuteAlignmentId: "alignment:5m:other" },
      { sixtyMinuteAlignmentId: "alignment:60m:other" },
      { dailyAlignmentId: "alignment:1d:other" },
    ]) {
      const alternate = createBrooksMultiTimeframeSourceProfileV1({
        sourceId: sourceProfile.sourceId,
        sourceVersion: sourceProfile.sourceVersion,
        marketSurface: sourceProfile.marketSurface,
        instrumentId: sourceProfile.instrumentId,
        priceBasis: sourceProfile.priceBasis,
        sessionProfile: {
          ...sourceProfile.sessionProfile,
          ...sessionPatch,
        },
      });
      assert.notEqual(alternate.profileHash, sourceProfile.profileHash);
    }

    const policyCase = makeCase({ primaryCount: 120, sixtyMinuteCount: 1 });
    const contentTamper = {
      ...structuredClone(policyCase),
      primaryBars: policyCase.primaryBars.map((bar, index) =>
        index === 0 ? { ...bar, sourceContentHash: sha("f") } : { ...bar },
      ),
    };
    assert.throws(() => assertBrooksMultiTimeframeCaseIntegrityV1(contentTamper), {
      message: /Case hash does not match its content/,
    });
    const cutoffTamper = {
      ...structuredClone(policyCase),
      decisionCutoffEpochMs: policyCase.decisionCutoffEpochMs + 1,
    };
    assert.throws(() => assertBrooksMultiTimeframeCaseIntegrityV1(cutoffTamper));
  });

  it("accepts expected and scheduled breaks while keeping explicit missing data distinct", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const primaryBars = makeBars(
      "5m",
      40,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    primaryBars[10] = {
      ...primaryBars[10]!,
      continuityFromPrevious: "expected_session_boundary",
    };
    primaryBars[20] = {
      ...primaryBars[20]!,
      continuityFromPrevious: "scheduled_break",
    };
    const policyCase = createBrooksMultiTimeframeCaseV1({
      caseId: "case:expected-closures",
      policyStreamId: "stream:synthetic-mtf",
      decisionCutoffEpochMs,
      sourceProfile,
      primaryBars,
      references: {
        sixtyMinute: { availability: "not_supplied" },
        daily: { availability: "not_supplied" },
      },
    });
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    assert.equal(
      market.primary.bars[10]?.continuityFromPrevious,
      "expected_session_boundary",
    );
    assert.equal(
      market.primary.bars[20]?.continuityFromPrevious,
      "scheduled_break",
    );
  });

  it("uses the same exact scale for simultaneously supplied 60m and daily bars", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const sixtyMinute = makeSuppliedReference(
      "60m",
      1,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    const daily = makeSuppliedReference(
      "1d",
      1,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    sixtyMinute.bars[0] = { ...sixtyMinute.bars[0]!, close: 402, high: 403 };
    daily.bars[0] = { ...daily.bars[0]!, close: 603, high: 604 };
    const policyCase = createBrooksMultiTimeframeCaseV1({
      caseId: "case:all-timeframes-normalized",
      policyStreamId: "stream:synthetic-mtf",
      decisionCutoffEpochMs,
      sourceProfile,
      primaryBars: makeBars(
        "5m",
        40,
        decisionCutoffEpochMs,
        sourceProfile.profileHash,
      ),
      references: { sixtyMinute, daily },
    });
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    assert.equal(
      market.references.sixtyMinute.availability === "supplied"
        ? market.references.sixtyMinute.bars[0]?.close
        : undefined,
      200,
    );
    assert.equal(
      market.references.daily.availability === "supplied"
        ? market.references.daily.bars[0]?.close
        : undefined,
      300,
    );
  });

  it("rejects any supplied reference with wrong identity, alignment, or cutoff instead of dropping it", () => {
    const sourceProfile = makeSourceProfile();
    const decisionCutoffEpochMs = 1_800_000_000;
    const baseReference = makeSuppliedReference(
      "60m",
      1,
      decisionCutoffEpochMs,
      sourceProfile.profileHash,
    );
    const variants = [
      { sourceProfileHash: sha("f") },
      { alignmentId: "alignment:rolling-window" },
      { snapshotCutoffEpochMs: decisionCutoffEpochMs + 1 },
      { timeframe: "1d" as const },
      { periodEndEpochMs: decisionCutoffEpochMs + 1 },
    ];

    for (const patch of variants) {
      const reference = structuredClone(baseReference);
      reference.bars[0] = { ...reference.bars[0]!, ...patch };
      assert.throws(() =>
        createBrooksMultiTimeframeCaseV1({
          caseId: "case:invalid-supplied-reference",
          policyStreamId: "stream:synthetic-mtf",
          decisionCutoffEpochMs,
          sourceProfile,
          primaryBars: makeBars(
            "5m",
            40,
            decisionCutoffEpochMs,
            sourceProfile.profileHash,
          ),
          references: {
            sixtyMinute: reference,
            daily: { availability: "not_supplied" },
          },
        }),
      );
    }
  });
});
