import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DISCOVERY_COOLDOWN_BARS_V1,
  DISCOVERY_MIN_HISTORY_BARS_V1,
  DISCOVERY_NORMALIZATION_VERSION_V1,
  DISCOVERY_PROVISIONAL_PARAMETERS_V1,
  DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1,
  DISCOVERY_STANDARD_CONTEXT_BARS_V1,
  assertDiscoveryCandidateIntegrityV1,
  type DiscoveryCandidateV1,
  type DiscoveryCoreEventTypeV1,
} from "@pa-agent-lab/contracts/discovery-factor-v1";
import {
  evaluateDiscoveryCandidateAdmissionV1,
  evaluateDiscoveryFactorsV1,
  type DiscoveryEngineBarV1,
} from "../src/discovery-engine-v1.ts";

const sourceId = "source:synthetic";
const instrumentId = "instrument:synthetic-a";
const timeframeId = "5m";
const normalizationVersion = DISCOVERY_NORMALIZATION_VERSION_V1;
const minBars = DISCOVERY_MIN_HISTORY_BARS_V1;
const standardContextBars = DISCOVERY_STANDARD_CONTEXT_BARS_V1;

function eventIndex(count: number = minBars): number {
  return count - 1;
}

function makeBars(
  count: number,
  overrides: Record<number, Partial<DiscoveryEngineBarV1>> = {},
): DiscoveryEngineBarV1[] {
  return Array.from({ length: count }, (_, index) => {
    const base: DiscoveryEngineBarV1 = {
      barId: `bar:${index.toString().padStart(3, "0")}`,
      sequence: index,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      isClosed: true,
      continuityFromPrevious: index === 0 ? "unknown" : "contiguous",
      volume: 100,
      volumeSourceId: sourceId,
      volumeInstrumentId: instrumentId,
      volumeTimeframeId: timeframeId,
      volumeReliable: true,
    };
    return { ...base, ...overrides[index] };
  });
}

function makeInsideEvent(count: number): DiscoveryEngineBarV1[] {
  return makeBars(count, {
    [count - 1]: { open: 100, high: 100.5, low: 99.5, close: 100 },
  });
}

function makeRangeQuantileFixture(): DiscoveryEngineBarV1[] {
  const overrides: Record<number, Partial<DiscoveryEngineBarV1>> = {};
  const firstReferenceIndex = minBars - DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1 - 1;
  for (let offset = 0; offset < DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1; offset += 1) {
    const range = offset + 1;
    overrides[firstReferenceIndex + offset] = {
      open: 100,
      high: 100 + range / 2,
      low: 100 - range / 2,
      close: 100,
    };
  }
  overrides[eventIndex()] = { open: 100, high: 100.25, low: 99.75, close: 100 };
  return makeBars(minBars, overrides);
}

function makePriorReferenceRangeOverrides(): Record<number, Partial<DiscoveryEngineBarV1>> {
  const overrides: Record<number, Partial<DiscoveryEngineBarV1>> = {};
  const firstReferenceIndex = minBars - DISCOVERY_PROVISIONAL_PARAMETERS_V1.referenceWindowObservations - 1;
  for (let offset = 0; offset < DISCOVERY_PROVISIONAL_PARAMETERS_V1.referenceWindowObservations; offset += 1) {
    const range = offset + 1;
    overrides[firstReferenceIndex + offset] = {
      open: 100,
      high: 100 + range / 2,
      low: 100 - range / 2,
      close: 100,
      volume: undefined,
    };
  }
  return overrides;
}

function evaluate(
  bars: readonly DiscoveryEngineBarV1[],
  priorCandidates: readonly DiscoveryCandidateV1[] = [],
) {
  return evaluateDiscoveryFactorsV1({
    sourceId,
    instrumentId,
    timeframeId,
    barDurationSeconds: 300,
    bars,
    normalizationVersion,
    priorCandidates,
  });
}

function candidateWithPrimary(
  candidates: readonly DiscoveryCandidateV1[],
  primaryEventType: DiscoveryCoreEventTypeV1,
): DiscoveryCandidateV1 | undefined {
  return candidates.find((candidate) => candidate.primaryEventType === primaryEventType);
}

function tamper(candidate: DiscoveryCandidateV1): DiscoveryCandidateV1 {
  return { ...candidate, reasonText: "changed after hashing" } as DiscoveryCandidateV1;
}

describe("Discovery Engine V1", () => {
  it("smoke-loads public contract and engine package root and subpath exports", async () => {
    const contractRoot = await import("@pa-agent-lab/contracts");
    const contractSubpath = await import("@pa-agent-lab/contracts/discovery-factor-v1");
    const engineRoot = await import("@pa-agent-lab/discovery-engine");
    const engineSubpath = await import("@pa-agent-lab/discovery-engine/discovery-engine-v1");

    assert.equal(typeof contractRoot.createDiscoveryCandidateV1, "function");
    assert.equal(typeof contractSubpath.createDiscoveryCandidateV1, "function");
    assert.equal(typeof engineRoot.evaluateDiscoveryFactorsV1, "function");
    assert.equal(typeof engineSubpath.evaluateDiscoveryFactorsV1, "function");
  });

  it("uses only the exact prior-20 reference and exact R-7 range statistics", () => {
    const staleWideBars = evaluate(makeBars(minBars, {
      ...Object.fromEntries(Array.from({ length: minBars - DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1 - 1 }, (_, index) => [
        index,
        { open: 100, high: 200, low: 50, close: 100 },
      ])),
      [eventIndex()]: { open: 100, high: 100.5, low: 99.5, close: 100 },
    }));
    const quantiles = evaluate(makeRangeQuantileFixture());

    assert.equal(staleWideBars.rollingReference.priorRangeHigh, 101);
    assert.equal(staleWideBars.rollingReference.priorRangeLow, 99);
    assert.equal(staleWideBars.rollingReference.priorRangeMidpoint, 100);
    assert.equal(staleWideBars.rollingReference.boundaryTolerance, 1);
    assert.equal(quantiles.rollingReference.priorRangeHigh, 110);
    assert.equal(quantiles.rollingReference.priorRangeLow, 90);
    assert.equal(quantiles.rollingReference.priorRangeMidpoint, 100);
    assert.equal(quantiles.rollingReference.lowerThirdBoundary, 96.66666666666667);
    assert.equal(quantiles.rollingReference.upperThirdBoundary, 103.33333333333333);
    assert.equal(quantiles.rollingReference.priorRangeMedian, 10.5);
    assert.equal(quantiles.rollingReference.priorRangeP25, 5.75);
    assert.equal(quantiles.rollingReference.priorRangeP75, 15.25);
    assert.equal(quantiles.rollingReference.boundaryTolerance, 5.25);
  });

  it("enforces defensive closed-bar gates without throwing on malformed runtime input", () => {
    assert.equal(evaluate(makeInsideEvent(minBars - 1)).audit.reasonCode, "insufficient_history");
    assert.equal(evaluate(makeInsideEvent(minBars)).contextState, "left_censored");
    assert.equal(evaluate(makeInsideEvent(standardContextBars - 1)).contextState, "left_censored");
    assert.equal(evaluate(makeInsideEvent(standardContextBars)).contextState, "normal");
    assert.equal(evaluate(makeBars(minBars, { [eventIndex()]: { isClosed: false } })).audit.reasonCode, "bar_not_closed");
    assert.equal(evaluate(makeBars(minBars, { [eventIndex()]: { high: Number.POSITIVE_INFINITY } })).audit.reasonCode, "invalid_ohlc");
    assert.equal(evaluate(makeBars(minBars, { [eventIndex()]: { continuityFromPrevious: "unknown" } })).audit.reasonCode, "missing_continuity");
    assert.equal(evaluate(makeBars(minBars, { [eventIndex()]: { sequence: eventIndex() + 2 } })).audit.reasonCode, "sequence_conflict");
    assert.equal(evaluate(makeBars(minBars, { 7: { barId: "bar:006" }, [eventIndex()]: { high: 100.5, low: 99.5 } })).audit.reasonCode, "sequence_conflict");

    const sparse = makeInsideEvent(minBars);
    delete (sparse as Partial<DiscoveryEngineBarV1>[])[5];
    assert.doesNotThrow(() => evaluateDiscoveryFactorsV1({
      sourceId,
      instrumentId,
      timeframeId,
      barDurationSeconds: 300,
      bars: sparse,
      normalizationVersion,
    }));
    assert.equal(evaluate(sparse).status, "rejected_data_quality");
    assert.equal(
      evaluateDiscoveryFactorsV1({
        sourceId,
        instrumentId,
        timeframeId,
        barDurationSeconds: 300,
        bars: makeInsideEvent(minBars),
        normalizationVersion: "unknown-discovery-normalization",
      }).audit.reasonCode,
      "unknown_state",
    );
  });

  it("preserves exact zero ranges without epsilon substitution", () => {
    const zero = evaluate(makeBars(minBars, Object.fromEntries(Array.from({ length: minBars }, (_, index) => [
      index,
      { open: 100, high: 100, low: 100, close: 100 },
    ]))));

    assert.equal(zero.rollingReference.priorRangeHigh, 100);
    assert.equal(zero.rollingReference.priorRangeLow, 100);
    assert.equal(zero.rollingReference.priorRangeMedian, 0);
    assert.equal(zero.rollingReference.boundaryTolerance, 0);
    assert.equal(zero.status, "no_trigger");
    assert.equal(zero.candidates.length, 0);
  });

  it("buckets range activity from prior-20 R-7 ranges independent of optional volume", () => {
    const priorRanges = makePriorReferenceRangeOverrides();
    const expanded = evaluate(makeBars(minBars, {
      ...priorRanges,
      [eventIndex()]: { open: 108, high: 116, low: 100, close: 113, volume: undefined },
    }));
    const typical = evaluate(makeBars(minBars, {
      ...priorRanges,
      [eventIndex()]: { open: 105, high: 110, low: 100, close: 108, volume: undefined },
    }));
    const contracted = evaluate(makeBars(minBars, {
      ...priorRanges,
      [eventIndex()]: { open: 108, high: 110, low: 105, close: 109.5, volume: undefined },
    }));
    const zeroEventRange = evaluate(makeBars(minBars, {
      ...priorRanges,
      [eventIndex()]: { open: 110, high: 110, low: 110, close: 110, volume: undefined },
    }));

    assert.equal(expanded.volumeState, "unavailable");
    assert.equal(expanded.rollingReference.priorRangeP25, 5.75);
    assert.equal(expanded.rollingReference.priorRangeP75, 15.25);
    assert.equal(expanded.candidates[0]?.priorityTuple.activityBucket, "expanded");
    assert.equal(typical.candidates[0]?.priorityTuple.activityBucket, "typical");
    assert.equal(contracted.candidates[0]?.priorityTuple.activityBucket, "contracted");
    assert.equal(zeroEventRange.status, "candidate_emitted");
    assert.equal(zeroEventRange.candidates[0]?.priorityTuple.activityBucket, "unavailable");
  });

  it("treats optional bar metrics as all-or-nothing across prior-20 plus event", () => {
    const baseOverrides = { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8, volume: 400 } };
    const cases: Record<string, Record<number, Partial<DiscoveryEngineBarV1>>> = {
      missing: { ...baseOverrides, 20: { volume: undefined } },
      nan: { ...baseOverrides, 20: { volume: Number.NaN } },
      unreliable: { ...baseOverrides, 20: { volumeReliable: false } },
      mismatched: { ...baseOverrides, 20: { volumeSourceId: "source:other" } },
    };

    for (const [name, overrides] of Object.entries(cases)) {
      const result = evaluate(makeBars(minBars, overrides));
      assert.equal(result.status, "candidate_emitted", name);
      assert.equal(result.volumeState, "unavailable", name);
      assert.equal(result.candidates[0]?.priorityTuple.activityBucket, "contracted", name);
      assert.equal(result.candidates[0]?.volumeState, "unavailable", name);
      assert.equal(result.candidates[0]?.compressionBasis.some((basis) => basis.includes("metric")), false, name);
    }
  });

  it("emits all five core factors as primary observations including rolling midpoint magnets", () => {
    const boundary = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const breakout = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const failed = evaluate(makeBars(minBars, {
      [eventIndex() - 1]: { open: 100, high: 102, low: 100, close: 101.6 },
      [eventIndex()]: { open: 101.1, high: 101.1, low: 100.2, close: 100.7 },
    }));
    const pullback = evaluate(makeBars(minBars, {
      [eventIndex() - 3]: { open: 100, high: 102, low: 100, close: 101.6 },
      [eventIndex() - 2]: { open: 101.6, high: 102, low: 101.2, close: 101.7 },
      [eventIndex() - 1]: { open: 101.7, high: 102, low: 101.2, close: 101.4 },
      [eventIndex()]: { open: 101.4, high: 101.5, low: 100.7, close: 101.1 },
    }));
    const magnet = evaluate(makeBars(minBars, { [eventIndex()]: { open: 99.9, high: 100.2, low: 99.8, close: 100.1 } }));

    assert.equal(boundary.candidates[0]?.primaryEventType, "range_boundary_interaction");
    assert.equal(breakout.candidates[0]?.primaryEventType, "breakout_attempt");
    assert.equal(failed.candidates[0]?.primaryEventType, "failed_breakout_candidate");
    assert.equal(pullback.candidates[0]?.primaryEventType, "pullback_to_structure");
    assert.equal(magnet.candidates[0]?.primaryEventType, "magnet_proximity");
    assert.ok(magnet.candidates[0]?.anchorIds.some((anchorId) => anchorId.includes("rolling-midpoint")));
    for (const result of [boundary, breakout, failed, pullback, magnet]) {
      assert.equal(result.status, "candidate_emitted");
      assert.doesNotMatch(result.candidates[0]?.reasonText ?? "", /long|short|buy|sell|entry|stop|target/i);
      assertDiscoveryCandidateIntegrityV1(result.candidates[0]!);
    }
  });

  it("requires confirmed pivots and keeps disjoint pivot and rolling anchors split", () => {
    const confirmed = evaluate(makeBars(minBars, {
      22: { low: 90 },
      27: { open: 100, high: 101, low: 96, close: 100 },
      28: { low: 98 },
      29: { low: 98 },
      34: { open: 100, high: 101, low: 96, close: 100 },
      35: { low: 98 },
      36: { low: 98 },
      [eventIndex()]: { open: 97, high: 97.4, low: 96.4, close: 96.8 },
    }));
    const unconfirmed = evaluate(makeBars(minBars, {
      22: { low: 90 },
      [eventIndex() - 1]: { open: 100, high: 101, low: 96, close: 100 },
      [eventIndex()]: { open: 97, high: 97.4, low: 96.4, close: 96.8 },
    }));

    assert.equal(confirmed.status, "candidate_emitted");
    assert.equal(confirmed.candidates.filter((candidate) => candidate.primaryEventType === "magnet_proximity").length, 2);
    assert.equal(new Set(confirmed.candidates.map((candidate) => candidate.canonicalAnchorGroupId)).size, 2);
    assert.equal(unconfirmed.status, "no_trigger");
  });

  it("attaches context enhancers only to core events and respects prior-20 thirds", () => {
    const enhanced = evaluate(makeBars(minBars, {
      [eventIndex() - 3]: { open: 100, high: 100.4, low: 99.8, close: 100.2 },
      [eventIndex() - 2]: { open: 100.2, high: 100.5, low: 100, close: 100.3 },
      [eventIndex() - 1]: { open: 100.3, high: 100.6, low: 100.2, close: 100.4 },
      [eventIndex()]: { open: 100.4, high: 103.2, low: 99, close: 101.6, volume: 500 },
    }));
    const enhancerOnly = evaluate(makeBars(minBars, {
      [eventIndex() - 3]: { open: 100, high: 100.4, low: 99.8, close: 100.2 },
      [eventIndex() - 2]: { open: 100.2, high: 100.5, low: 100, close: 100.3 },
      [eventIndex() - 1]: { open: 100.3, high: 100.6, low: 100.2, close: 100.4 },
      [eventIndex()]: { open: 100.2, high: 100.8, low: 99.4, close: 100.3, volume: 500 },
    }));

    assert.equal(enhanced.status, "candidate_emitted");
    assert.ok(enhanced.candidates[0]?.contextEnhancers.includes("compression_expansion"));
    assert.ok(enhanced.candidates[0]?.contextEnhancers.includes("trading_range_top_bottom_context"));
    assert.ok(enhanced.candidates[0]?.compressionBasis.includes("closed-bar price range expanded after prior compressed bars"));
    assert.ok(enhanced.candidates[0]?.compressionBasis.includes("same-source optional activity metric expanded with price compression context"));
    assert.equal(enhancerOnly.status, "no_trigger");
    assert.equal(enhancerOnly.candidates.length, 0);
  });

  it("does not classify a boundary touch as breakout and rejects opposite-boundary ambiguity", () => {
    const boundaryTouch = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const breakout = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const ambiguous = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 98, close: 100 } }));

    assert.equal(boundaryTouch.candidates[0]?.primaryEventType, "range_boundary_interaction");
    assert.equal(boundaryTouch.candidates[0]?.secondaryEventTypes.includes("breakout_attempt"), false);
    assert.equal(breakout.candidates[0]?.primaryEventType, "breakout_attempt");
    assert.equal(breakout.candidates[0]?.secondaryEventTypes.includes("range_boundary_interaction"), false);
    assert.equal(ambiguous.status, "rejected_ambiguity");
    assert.equal(ambiguous.audit.reasonCode, "same_bar_ambiguity");
  });

  it("allows cooldown bypass only for breakout-to-failed same-thread transitions", () => {
    const boundary = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const boundaryToBreakout = evaluate(makeBars(minBars + 1, {
      [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 },
      [eventIndex(minBars + 1)]: { open: 100.8, high: 102, low: 100.4, close: 101.6 },
    }), boundary.candidates);
    const breakout = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const breakoutToFailed = evaluate(makeBars(minBars + 1, {
      [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 },
      [eventIndex(minBars + 1)]: { open: 100.8, high: 101, low: 100.1, close: 100.7 },
    }), breakout.candidates);

    assert.equal(boundaryToBreakout.status, "suppressed_cooldown");
    assert.equal(breakoutToFailed.status, "candidate_emitted");
    assert.equal(breakoutToFailed.candidates[0]?.primaryEventType, "failed_breakout_candidate");
    assert.equal(breakoutToFailed.candidates[0]?.predecessorEventFingerprint, breakout.candidates[0]?.eventFingerprint);
  });

  it("does not attach predecessor links to ordinary repeated candidates after cooldown", () => {
    const first = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const repeated = evaluate(makeBars(minBars + DISCOVERY_COOLDOWN_BARS_V1 + 1, {
      [eventIndex(minBars + DISCOVERY_COOLDOWN_BARS_V1 + 1)]: { open: 100, high: 101, low: 100, close: 100.8 },
    }), first.candidates);

    assert.equal(repeated.status, "candidate_emitted");
    assert.equal(repeated.candidates[0]?.primaryEventType, "range_boundary_interaction");
    assert.equal(repeated.candidates[0]?.predecessorEventFingerprint, null);
    assert.equal(repeated.candidates[0]?.priorityTuple.eventStagePriority, "fresh_core_event");
  });

  it("rejects future, equal-sequence, tampered, and cross-identity prior candidates before linking or cooldown", () => {
    const emitted = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const prior = emitted.candidates[0]!;
    const currentBars = makeBars(minBars + 1, { [eventIndex(minBars + 1)]: { open: 100, high: 101, low: 100.2, close: 100.7 } });
    const equalSequence = { ...prior, effectiveBarSequence: eventIndex(minBars + 1) } as DiscoveryCandidateV1;
    const future = { ...prior, effectiveBarSequence: eventIndex(minBars + 1) + 1 } as DiscoveryCandidateV1;
    const crossIdentity = { ...prior, sourceId: "source:other" } as DiscoveryCandidateV1;

    for (const invalidPrior of [equalSequence, future, tamper(prior), crossIdentity]) {
      const result = evaluate(currentBars, [invalidPrior]);
      assert.equal(result.status, "rejected_data_quality");
      assert.equal(result.candidates.length, 0);
    }
  });

  it("rejects prior candidates with non-causal cutoff, sequence, or duplicate records", () => {
    const emitted = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const prior = emitted.candidates[0]!;
    const changedCutoff = makeBars(minBars + 1, {
      [prior.effectiveBarSequence]: { barId: "bar:renamed" },
      [eventIndex(minBars + 1)]: { open: 100, high: 101, low: 100.2, close: 100.7 },
    });
    const shiftedSequence = makeBars(minBars + 1, Object.fromEntries([
      ...Array.from({ length: minBars + 1 }, (_, index) => [index, { sequence: index + 100 }]),
      [eventIndex(minBars + 1), { open: 100, high: 101, low: 100.2, close: 100.7, sequence: eventIndex(minBars + 1) + 100 }],
    ]));

    for (const result of [
      evaluate(changedCutoff, [prior]),
      evaluate(shiftedSequence, [prior]),
      evaluate(makeBars(minBars + 1, { [eventIndex(minBars + 1)]: { open: 100, high: 101, low: 100.2, close: 100.7 } }), [prior, prior]),
    ]) {
      assert.equal(result.status, "rejected_data_quality");
      assert.equal(result.candidates.length, 0);
    }
  });

  it("binds prior candidate content identities into deterministic input hashes", () => {
    const emitted = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const prior = emitted.candidates[0]!;
    const currentBars = makeBars(minBars + 1, { [eventIndex(minBars + 1)]: { open: 100, high: 101, low: 100.2, close: 100.7 } });
    const acceptedPrior = evaluate(currentBars, [prior]);
    const tamperedPrior = evaluate(currentBars, [tamper(prior)]);

    assert.notEqual(tamperedPrior.inputHash, acceptedPrior.inputHash);
    assert.equal(tamperedPrior.status, "rejected_data_quality");
  });

  it("applies inclusive cooldown per candidate and keeps eligible disjoint split candidates", () => {
    const first = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const atPlusSix = evaluate(makeBars(minBars + 6, { [eventIndex(minBars + 6)]: { open: 100, high: 101, low: 100, close: 100.8 } }), first.candidates);
    const atPlusSeven = evaluate(makeBars(minBars + 7, { [eventIndex(minBars + 7)]: { open: 100, high: 101, low: 100, close: 100.8 } }), first.candidates);
    const split = evaluate(makeBars(minBars + 6, {
      22: { low: 90 },
      34: { open: 100, high: 101, low: 96, close: 100 },
      35: { low: 98 },
      36: { low: 98 },
      [eventIndex(minBars + 6)]: { open: 100, high: 100.8, low: 96.4, close: 100.2 },
    }), first.candidates);

    assert.equal(first.candidates[0]?.cooldownBars, DISCOVERY_COOLDOWN_BARS_V1);
    assert.equal(atPlusSix.status, "suppressed_cooldown");
    assert.equal(atPlusSix.audit.candidateId, atPlusSix.audit.currentCandidateIds[0]);
    assert.equal(atPlusSeven.status, "candidate_emitted");
    assert.equal(split.status, "candidate_emitted");
    assert.ok(candidateWithPrimary(split.candidates, "magnet_proximity"));
    assert.equal(candidateWithPrimary(split.candidates, "range_boundary_interaction"), undefined);
  });

  it("filters cooldown per candidate while retaining disjoint eligible candidates", () => {
    const first = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 101, low: 100, close: 100.8 } }));
    const mixed = evaluate(makeBars(minBars + DISCOVERY_COOLDOWN_BARS_V1, {
      22: { low: 90 },
      34: { open: 100, high: 101, low: 96, close: 100 },
      35: { low: 98 },
      36: { low: 98 },
      [eventIndex(minBars + DISCOVERY_COOLDOWN_BARS_V1)]: { open: 100, high: 101, low: 96.4, close: 100.8 },
    }), first.candidates);

    assert.equal(mixed.status, "candidate_emitted");
    assert.ok(candidateWithPrimary(mixed.candidates, "magnet_proximity"));
    assert.equal(candidateWithPrimary(mixed.candidates, "range_boundary_interaction"), undefined);
    assert.equal(mixed.candidates.every((candidate) => candidate.predecessorEventFingerprint === null), true);
  });

  it("rejects malformed evaluator and admission runtime inputs deterministically", () => {
    const invalidEvaluations = [
      null,
      {},
      { sourceId, instrumentId, timeframeId, barDurationSeconds: 300, bars: null, normalizationVersion },
      { sourceId: 5, instrumentId, timeframeId, barDurationSeconds: 300, bars: makeInsideEvent(minBars), normalizationVersion },
    ];

    for (const invalidInput of invalidEvaluations) {
      assert.doesNotThrow(() => evaluateDiscoveryFactorsV1(invalidInput as never));
      const first = evaluateDiscoveryFactorsV1(invalidInput as never);
      const second = evaluateDiscoveryFactorsV1(invalidInput as never);
      assert.equal(first.status, "rejected_data_quality");
      assert.equal(first.audit.reasonCode, "unknown_state");
      assert.equal(first.inputHash, second.inputHash);
      assert.equal(first.audit.inputHash, first.inputHash);
      assert.equal(first.candidates.length, 0);
    }

    const emitted = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const candidate = emitted.candidates[0]!;
    const invalidAdmissions = [
      null,
      {},
      { candidate, currentBarSequence: candidate.effectiveBarSequence, paBudgetAvailable: true, inputHash: "not-a-hash" },
    ];

    for (const invalidInput of invalidAdmissions) {
      assert.doesNotThrow(() => evaluateDiscoveryCandidateAdmissionV1(invalidInput as never));
      const first = evaluateDiscoveryCandidateAdmissionV1(invalidInput as never);
      const second = evaluateDiscoveryCandidateAdmissionV1(invalidInput as never);
      assert.equal(first.status, "rejected_data_quality");
      assert.equal(first.audit.reasonCode, "unknown_state");
      assert.equal(first.audit.inputHash, second.audit.inputHash);
      assert.equal(first.candidate, null);
    }
  });

  it("evaluates admission boundaries and rejects malformed or tampered candidates", () => {
    const emitted = evaluate(makeBars(minBars, { [eventIndex()]: { open: 100, high: 102, low: 100, close: 101.6 } }));
    const candidate = emitted.candidates[0]!;
    const preEffective = evaluateDiscoveryCandidateAdmissionV1({
      candidate,
      currentBarSequence: candidate.effectiveBarSequence - 1,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const effective = evaluateDiscoveryCandidateAdmissionV1({
      candidate,
      currentBarSequence: candidate.effectiveBarSequence,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const expires = evaluateDiscoveryCandidateAdmissionV1({
      candidate,
      currentBarSequence: candidate.expiresAfterSequence,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const expired = evaluateDiscoveryCandidateAdmissionV1({
      candidate,
      currentBarSequence: candidate.expiresAfterSequence + 1,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const noninteger = evaluateDiscoveryCandidateAdmissionV1({
      candidate,
      currentBarSequence: candidate.effectiveBarSequence + 0.5,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const tampered = evaluateDiscoveryCandidateAdmissionV1({
      candidate: tamper(candidate),
      currentBarSequence: candidate.effectiveBarSequence,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });
    const prefixedCandidateId = `sha256:${"a".repeat(64)}`;
    const prefixedAuditId = evaluateDiscoveryCandidateAdmissionV1({
      candidate: { ...tamper(candidate), candidateId: prefixedCandidateId } as DiscoveryCandidateV1,
      currentBarSequence: candidate.effectiveBarSequence,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    });

    assert.equal(preEffective.status, "rejected_data_quality");
    assert.equal(effective.status, "candidate_emitted");
    assert.equal(expires.status, "candidate_emitted");
    assert.equal(expired.status, "expired_before_admission");
    assert.equal(noninteger.status, "rejected_data_quality");
    assert.equal(tampered.status, "rejected_data_quality");
    assert.equal(prefixedAuditId.status, "rejected_data_quality");
    assert.equal(prefixedAuditId.audit.candidateId, prefixedCandidateId);
    assert.doesNotThrow(() => evaluateDiscoveryCandidateAdmissionV1({
      candidate: null as unknown as DiscoveryCandidateV1,
      currentBarSequence: candidate.effectiveBarSequence,
      paBudgetAvailable: true,
      inputHash: emitted.inputHash,
    }));
  });
});
