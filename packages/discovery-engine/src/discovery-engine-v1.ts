import {
  DISCOVERY_CONTEXT_ENHANCERS_V1,
  DISCOVERY_MIN_HISTORY_BARS_V1,
  DISCOVERY_NORMALIZATION_VERSION_V1,
  DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1,
  DISCOVERY_PRIMARY_EVENT_PRIORITY_V1,
  DISCOVERY_PROVISIONAL_PARAMETERS_V1,
  DISCOVERY_STANDARD_CONTEXT_BARS_V1,
  assertDiscoveryCandidateIntegrityV1,
  type DiscoveryActivityBucketV1,
  type DiscoveryAuditReasonCodeV1,
  type DiscoveryAuditResultV1,
  type DiscoveryAuditStatusV1,
  type DiscoveryCandidateV1,
  type DiscoveryContextEnhancerV1,
  type DiscoveryContextStateV1,
  type DiscoveryCoreEventTypeV1,
  type DiscoveryEventFamilyV1,
  type DiscoveryObservedPolarityV1,
  type DiscoveryVolumeStateV1,
  compareDiscoveryPriorityTupleV1,
  createDiscoveryAuditResultV1,
  createDiscoveryCandidateV1,
} from "../../contracts/src/discovery-factor-v1.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "../../contracts/src/contract-utils-v1.ts";

const REFERENCE_WINDOW_OBSERVATIONS_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.referenceWindowObservations;
const PIVOT_CONFIRMATION_LEFT_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.pivotConfirmation.left;
const PIVOT_CONFIRMATION_RIGHT_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.pivotConfirmation.right;
const MOVEMENT_LOOKBACK_OBSERVATIONS_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.movementLookbackObservations;
const ACTIVITY_CONTRACTED_QUANTILE_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.activityBuckets.contractedAtOrBelowQuantile;
const ACTIVITY_EXPANDED_QUANTILE_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.activityBuckets.expandedAtOrAboveQuantile;
const RANGE_MEDIAN_QUANTILE_V1 = 0.5;
const BOUNDARY_TOLERANCE_MEDIAN_RANGE_MULTIPLE_V1 =
  DISCOVERY_PROVISIONAL_PARAMETERS_V1.toleranceMedianRangeMultiple;
const BREAKOUT_DISPLACEMENT_RANGE_FRACTION_V1 = 0.25;
const COMPRESSION_EXPANSION_MULTIPLE_V1 = 2.0;
const COMPRESSION_AVERAGE_MULTIPLE_V1 = 0.75;
const VOLUME_EXPANSION_MULTIPLE_V1 = 1.5;

export type DiscoveryEngineContinuityV1 = "contiguous" | "gap" | "unknown";

export interface DiscoveryEngineBarV1 {
  readonly barId: string;
  readonly sequence: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly isClosed: boolean;
  readonly continuityFromPrevious: DiscoveryEngineContinuityV1;
  readonly volume?: number | undefined;
  readonly volumeSourceId?: string;
  readonly volumeInstrumentId?: string;
  readonly volumeTimeframeId?: string;
  readonly volumeReliable?: boolean;
}

export interface EvaluateDiscoveryFactorsInputV1 {
  readonly sourceId: string;
  readonly instrumentId: string;
  readonly timeframeId: string;
  readonly barDurationSeconds: number;
  readonly bars: readonly DiscoveryEngineBarV1[];
  readonly normalizationVersion: string;
  readonly priorCandidates?: readonly DiscoveryCandidateV1[];
}

export interface DiscoveryRollingReferenceV1 {
  readonly priorRangeHigh: number | null;
  readonly priorRangeLow: number | null;
  readonly priorRangeMidpoint: number | null;
  readonly lowerThirdBoundary: number | null;
  readonly upperThirdBoundary: number | null;
  readonly priorRangeP25: number | null;
  readonly priorRangeMedian: number | null;
  readonly priorRangeP75: number | null;
  readonly boundaryTolerance: number | null;
}

export interface DiscoveryEngineEvaluationResultV1 {
  readonly status: DiscoveryAuditStatusV1;
  readonly inputHash: ContractSha256;
  readonly contextState: DiscoveryContextStateV1 | null;
  readonly volumeState: DiscoveryVolumeStateV1;
  readonly rollingReference: DiscoveryRollingReferenceV1;
  readonly candidates: readonly DiscoveryCandidateV1[];
  readonly audit: DiscoveryAuditResultV1;
}

export interface DiscoveryCandidateAdmissionInputV1 {
  readonly candidate: DiscoveryCandidateV1;
  readonly currentBarSequence: number;
  readonly paBudgetAvailable: boolean;
  readonly inputHash: ContractSha256;
}

export interface DiscoveryCandidateAdmissionResultV1 {
  readonly status: DiscoveryAuditStatusV1;
  readonly candidate: DiscoveryCandidateV1 | null;
  readonly audit: DiscoveryAuditResultV1;
}

interface CoreHitV1 {
  readonly eventType: DiscoveryCoreEventTypeV1;
  readonly polarity: Exclude<DiscoveryObservedPolarityV1, "neutral">;
  readonly anchorIds: readonly string[];
  readonly canonicalAnchorGroupId: string;
  readonly eventFamily: DiscoveryEventFamilyV1;
  readonly evidenceRefs: readonly string[];
}

interface RangeReferenceV1 {
  readonly high: number;
  readonly low: number;
  readonly midpoint: number;
  readonly lowerThirdBoundary: number;
  readonly upperThirdBoundary: number;
  readonly rangeP25: number;
  readonly rangeMedian: number;
  readonly rangeP75: number;
  readonly tolerance: number;
  readonly breakoutDisplacement: number;
}

interface PivotV1 {
  readonly id: string;
  readonly kind: "high" | "low";
  readonly sequence: number;
  readonly price: number;
}

export function evaluateDiscoveryFactorsV1(
  input: EvaluateDiscoveryFactorsInputV1,
): Readonly<DiscoveryEngineEvaluationResultV1> {
  const inputHash = createInputHash(input);
  const emptyReference: DiscoveryRollingReferenceV1 = {
    priorRangeHigh: null,
    priorRangeLow: null,
    priorRangeMidpoint: null,
    lowerThirdBoundary: null,
    upperThirdBoundary: null,
    priorRangeP25: null,
    priorRangeMedian: null,
    priorRangeP75: null,
    boundaryTolerance: null,
  };
  const rejected = validateInput(input, inputHash, emptyReference);
  if (rejected !== null) return rejected;

  const bars = input.bars;
  const eventBar = bars[bars.length - 1];
  if (eventBar === undefined) {
    return result(
      "rejected_data_quality",
      "unknown_state",
      inputHash,
      null,
      null,
      "no event bar was available",
      null,
      "unavailable",
      emptyReference,
      [],
      { normalizationVersion: input.normalizationVersion, evaluationSequence: null },
    );
  }
  const priorBars = bars.slice(0, -1);
  const rangeReference = buildRangeReference(priorBars);
  const rollingReference: DiscoveryRollingReferenceV1 = {
    priorRangeHigh: rangeReference.high,
    priorRangeLow: rangeReference.low,
    priorRangeMidpoint: rangeReference.midpoint,
    lowerThirdBoundary: rangeReference.lowerThirdBoundary,
    upperThirdBoundary: rangeReference.upperThirdBoundary,
    priorRangeP25: rangeReference.rangeP25,
    priorRangeMedian: rangeReference.rangeMedian,
    priorRangeP75: rangeReference.rangeP75,
    boundaryTolerance: rangeReference.tolerance,
  };
  const contextState: DiscoveryContextStateV1 =
    bars.length >= DISCOVERY_STANDARD_CONTEXT_BARS_V1 ? "normal" : "left_censored";
  const volumeState = determineVolumeState(input, priorBars, eventBar);
  const priorCandidateRejection = validatePriorCandidates(
    input,
    eventBar,
    inputHash,
    rollingReference,
    contextState,
    volumeState,
  );
  if (priorCandidateRejection !== null) return priorCandidateRejection;

  if (hasSameBarAmbiguity(eventBar, rangeReference)) {
    return result(
      "rejected_ambiguity",
      "same_bar_ambiguity",
      inputHash,
      eventBar.barId,
      null,
      "event bar crossed both prior range boundaries",
      contextState,
      volumeState,
      rollingReference,
      [],
      { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
    );
  }

  const hits = detectCoreHits(eventBar, priorBars, rangeReference);
  if (hits.length === 0) {
    return result(
      "no_trigger",
      "no_trigger",
      inputHash,
      eventBar.barId,
      null,
      "no approved core discovery factor triggered",
      contextState,
      volumeState,
      rollingReference,
      [],
      { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
    );
  }

  const candidates = buildCandidates({
    input,
    eventBar,
    priorBars,
    hits,
    contextState,
    volumeState,
    rangeReference,
  });
  if (candidates.length === 0) {
    return result(
      "no_trigger",
      "no_trigger",
      inputHash,
      eventBar.barId,
      null,
      "core hits were not compatible after deterministic grouping",
      contextState,
      volumeState,
      rollingReference,
      [],
      { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
    );
  }
  const cooldownEvaluation = applyCandidateCooldown(
    candidates,
    input.priorCandidates ?? [],
  );
  if (cooldownEvaluation.candidates.length === 0) {
    const blockedByCooldown = cooldownEvaluation.blockers[0] ?? null;
    return result(
      "suppressed_cooldown",
      "suppressed_cooldown",
      inputHash,
      eventBar.barId,
      blockedByCooldown?.candidateId ?? null,
      "dedup group remains inside the provisional cooldown window",
      contextState,
      volumeState,
      rollingReference,
      [],
      { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
    );
  }

  const bestCandidate = cooldownEvaluation.candidates[0];
  if (bestCandidate === undefined) throw new Error("candidate sorting failed");
  return result(
    "candidate_emitted",
    "candidate_emitted",
    inputHash,
    eventBar.barId,
    bestCandidate.candidateId,
    "synthetic closed-bar discovery emitted deterministic candidate(s)",
    contextState,
    volumeState,
    rollingReference,
    cooldownEvaluation.candidates,
    { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
  );
}

export function evaluateDiscoveryCandidateAdmissionV1(
  input: DiscoveryCandidateAdmissionInputV1,
): Readonly<DiscoveryCandidateAdmissionResultV1> {
  const validationFailure = validateAdmissionInput(input);
  if (validationFailure !== null) return validationFailure;

  if (input.currentBarSequence > input.candidate.expiresAfterSequence) {
    return admissionResult(
      "expired_before_admission",
      "expired_before_admission",
      input,
      null,
      "candidate exceeded provisional TTL before admission",
    );
  }
  if (!input.paBudgetAvailable) {
    return admissionResult(
      "deferred_budget",
      "deferred_budget",
      input,
      null,
      "candidate retained but PA evaluation budget was unavailable",
    );
  }
  return admissionResult(
    "candidate_emitted",
    "candidate_emitted",
    input,
    input.candidate,
    "candidate remained inside provisional TTL and was admitted",
  );
}

function validateAdmissionInput(
  input: DiscoveryCandidateAdmissionInputV1,
): Readonly<DiscoveryCandidateAdmissionResultV1> | null {
  const inputRecord = recordOrNull(input);
  if (
    inputRecord === null ||
    !isContractSha256Value(inputRecord.inputHash) ||
    typeof inputRecord.paBudgetAvailable !== "boolean"
  ) {
    return malformedAdmissionResult(input, "admission input failed deterministic runtime validation");
  }
  try {
    assertDiscoveryCandidateIntegrityV1(input.candidate);
  } catch {
    return admissionResult(
      "rejected_data_quality",
      "unknown_state",
      input,
      null,
      "candidate failed deterministic admission validation",
    );
  }
  if (
    !isNonNegativeInteger(input.currentBarSequence) ||
    input.currentBarSequence < input.candidate.effectiveBarSequence
  ) {
    return admissionResult(
      "rejected_data_quality",
      "unknown_state",
      input,
      null,
      "current bar sequence was outside the candidate admission window",
    );
  }
  return null;
}

function malformedAdmissionResult(
  input: unknown,
  detail: string,
): Readonly<DiscoveryCandidateAdmissionResultV1> {
  const inputRecord = recordOrNull(input);
  const candidateRecord = recordOrNull(inputRecord?.candidate);
  const rawCandidateId = candidateRecord?.candidateId;
  const rawEffectiveBarSequence = candidateRecord?.effectiveBarSequence;
  const candidateId = isContractSha256Value(rawCandidateId) ? rawCandidateId : null;
  const evaluationSequence = isNonNegativeInteger(rawEffectiveBarSequence)
    ? rawEffectiveBarSequence
    : null;
  const audit = createDiscoveryAuditResultV1({
    status: "rejected_data_quality",
    reasonCode: "unknown_state",
    inputHash: runtimeRejectInputHash("discovery-candidate-admission-input.v1", input),
    normalizationVersion: auditNormalizationVersion(stringOrUndefined(candidateRecord?.normalizationVersion)),
    cutoffBarId: nonEmptyStringOrNull(candidateRecord?.evaluationCutoffBarId),
    evaluationSequence,
    candidateId,
    anchorRefs: stringListOrEmpty(candidateRecord?.anchorIds),
    factorObservations: stringListOrEmpty([
      ...observationOrEmpty("primary", candidateRecord?.primaryEventType),
      ...observationOrEmpty("polarity", candidateRecord?.observedPolarity),
      ...observationOrEmpty("family", candidateRecord?.eventFamily),
    ]),
    currentCandidateIds: candidateId === null ? [] : [candidateId],
    details: [detail],
  });
  return deepFreeze({ status: "rejected_data_quality", candidate: null, audit });
}

function admissionResult(
  status: DiscoveryAuditStatusV1,
  reasonCode: DiscoveryAuditReasonCodeV1,
  input: DiscoveryCandidateAdmissionInputV1,
  candidate: DiscoveryCandidateV1 | null,
  detail: string,
): Readonly<DiscoveryCandidateAdmissionResultV1> {
  const candidateRecord = recordOrNull(input.candidate);
  const rawCandidateId = candidateRecord?.candidateId;
  const rawEffectiveBarSequence = candidateRecord?.effectiveBarSequence;
  const candidateId = isContractSha256Value(rawCandidateId) ? rawCandidateId : null;
  const evaluationSequence = isNonNegativeInteger(rawEffectiveBarSequence)
    ? rawEffectiveBarSequence
    : null;
  const audit = createDiscoveryAuditResultV1({
    status,
    reasonCode,
    inputHash: input.inputHash,
    normalizationVersion: auditNormalizationVersion(stringOrUndefined(candidateRecord?.normalizationVersion)),
    cutoffBarId: nonEmptyStringOrNull(candidateRecord?.evaluationCutoffBarId),
    evaluationSequence,
    candidateId,
    anchorRefs: stringListOrEmpty(candidateRecord?.anchorIds),
    factorObservations: stringListOrEmpty([
      ...observationOrEmpty("primary", candidateRecord?.primaryEventType),
      ...observationOrEmpty("polarity", candidateRecord?.observedPolarity),
      ...observationOrEmpty("family", candidateRecord?.eventFamily),
    ]),
    currentCandidateIds: candidateId === null ? [] : [candidateId],
    details: [detail],
  });
  return deepFreeze({ status, candidate, audit });
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function observationOrEmpty(prefix: string, value: unknown): readonly string[] {
  return typeof value === "string" && value.trim().length > 0 ? [`${prefix}:${value}`] : [];
}

function nonEmptyStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringListOrEmpty(values: readonly string[] | unknown): string[] {
  if (!Array.isArray(values)) return [];
  return uniqueStrings(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0,
  )).sort();
}

function isContractSha256Value(value: unknown): value is ContractSha256 {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function validateInput(
  input: EvaluateDiscoveryFactorsInputV1,
  inputHash: ContractSha256,
  reference: DiscoveryRollingReferenceV1,
): Readonly<DiscoveryEngineEvaluationResultV1> | null {
  const inputRecord = recordOrNull(input);
  const rawBars = inputRecord?.bars;
  const lastBar = Array.isArray(rawBars)
    ? rawBars[rawBars.length - 1] as DiscoveryEngineBarV1 | undefined
    : undefined;
  const auditNormalization = stringOrUndefined(inputRecord?.normalizationVersion);
  const auditContext: AuditBindingContextV1 = {
    ...(auditNormalization === undefined ? {} : { normalizationVersion: auditNormalization }),
    evaluationSequence: sequenceOrNull(lastBar),
  };
  if (
    inputRecord === null ||
    typeof inputRecord.sourceId !== "string" ||
    typeof inputRecord.instrumentId !== "string" ||
    typeof inputRecord.timeframeId !== "string" ||
    typeof inputRecord.barDurationSeconds !== "number" ||
    typeof inputRecord.normalizationVersion !== "string" ||
    !Array.isArray(rawBars)
  ) {
    return result(
      "rejected_data_quality",
      "unknown_state",
      inputHash,
      barIdOrNull(lastBar),
      null,
      "unsupported Discovery V1 input identity or normalization",
      null,
      "unavailable",
      reference,
      [],
      auditContext,
    );
  }
  if (
    input.barDurationSeconds !== DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1 ||
    input.timeframeId !== "5m" ||
    input.normalizationVersion !== DISCOVERY_NORMALIZATION_VERSION_V1 ||
    input.sourceId.trim().length === 0 ||
    input.instrumentId.trim().length === 0
  ) {
    return result(
      "rejected_data_quality",
      "unknown_state",
      inputHash,
      barIdOrNull(lastBar),
      null,
      "unsupported Discovery V1 input identity or normalization",
      null,
      "unavailable",
      reference,
      [],
      auditContext,
    );
  }
  if (input.bars.length < DISCOVERY_MIN_HISTORY_BARS_V1) {
    return result(
      "rejected_data_quality",
      "insufficient_history",
      inputHash,
      barIdOrNull(lastBar),
      null,
      `fewer than ${DISCOVERY_MIN_HISTORY_BARS_V1} closed five-minute bars were supplied`,
      null,
      "unavailable",
      reference,
      [],
      auditContext,
    );
  }

  let previousSequence: number | null = null;
  const seenBarIds = new Set<string>();
  for (let index = 0; index < input.bars.length; index += 1) {
    const bar = input.bars[index];
    if (bar === undefined) {
      return invalidBar("sequence_conflict", input, inputHash, null, null, reference);
    }
    const cutoffBarId = barIdOrNull(bar);
    const evaluationSequence = sequenceOrNull(bar);
    if (cutoffBarId === null || evaluationSequence === null) {
      return invalidBar("sequence_conflict", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
    if (seenBarIds.has(cutoffBarId)) {
      return invalidBar("sequence_conflict", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
    seenBarIds.add(cutoffBarId);
    if (previousSequence !== null && evaluationSequence !== previousSequence + 1) {
      return invalidBar("sequence_conflict", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
    previousSequence = evaluationSequence;
    if (!bar.isClosed) {
      return invalidBar("bar_not_closed", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
    if (index > 0 && bar.continuityFromPrevious !== "contiguous") {
      return invalidBar("missing_continuity", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
    if (!isValidOhlc(bar)) {
      return invalidBar("invalid_ohlc", input, inputHash, cutoffBarId, evaluationSequence, reference);
    }
  }
  return null;
}

function invalidBar(
  reasonCode: "bar_not_closed" | "invalid_ohlc" | "sequence_conflict" | "missing_continuity",
  input: EvaluateDiscoveryFactorsInputV1,
  inputHash: ContractSha256,
  cutoffBarId: string | null,
  evaluationSequence: number | null,
  reference: DiscoveryRollingReferenceV1,
): Readonly<DiscoveryEngineEvaluationResultV1> {
  return result(
    "rejected_data_quality",
    reasonCode,
    inputHash,
    cutoffBarId,
    null,
    `input failed ${reasonCode} validation`,
    null,
    "unavailable",
    reference,
    [],
    { normalizationVersion: input.normalizationVersion, evaluationSequence },
  );
}

function validatePriorCandidates(
  input: EvaluateDiscoveryFactorsInputV1,
  eventBar: DiscoveryEngineBarV1,
  inputHash: ContractSha256,
  reference: DiscoveryRollingReferenceV1,
  contextState: DiscoveryContextStateV1,
  volumeState: DiscoveryVolumeStateV1,
): Readonly<DiscoveryEngineEvaluationResultV1> | null {
  const priorCandidates = input.priorCandidates ?? [];
  if (!Array.isArray(priorCandidates)) {
    return priorCandidateRejected(input, eventBar, inputHash, reference, contextState, volumeState);
  }

  const barsBySequence = new Map<number, DiscoveryEngineBarV1>();
  for (const bar of input.bars) {
    if (bar.sequence < eventBar.sequence) barsBySequence.set(bar.sequence, bar);
  }

  const seenCandidateIds = new Set<ContractSha256>();
  for (const candidate of priorCandidates) {
    try {
      assertDiscoveryCandidateIntegrityV1(candidate);
    } catch {
      return priorCandidateRejected(input, eventBar, inputHash, reference, contextState, volumeState);
    }
    if (seenCandidateIds.has(candidate.candidateId)) {
      return priorCandidateRejected(input, eventBar, inputHash, reference, contextState, volumeState);
    }
    seenCandidateIds.add(candidate.candidateId);

    const cutoffBar = barsBySequence.get(candidate.effectiveBarSequence);
    if (
      candidate.sourceId !== input.sourceId ||
      candidate.instrumentId !== input.instrumentId ||
      candidate.barDurationSeconds !== input.barDurationSeconds ||
      candidate.normalizationVersion !== input.normalizationVersion ||
      candidate.effectiveBarSequence >= eventBar.sequence ||
      cutoffBar === undefined ||
      cutoffBar.barId !== candidate.evaluationCutoffBarId
    ) {
      return priorCandidateRejected(input, eventBar, inputHash, reference, contextState, volumeState);
    }
  }
  return null;
}

function priorCandidateRejected(
  input: EvaluateDiscoveryFactorsInputV1,
  eventBar: DiscoveryEngineBarV1,
  inputHash: ContractSha256,
  reference: DiscoveryRollingReferenceV1,
  contextState: DiscoveryContextStateV1,
  volumeState: DiscoveryVolumeStateV1,
): Readonly<DiscoveryEngineEvaluationResultV1> {
  return result(
    "rejected_data_quality",
    "unknown_state",
    inputHash,
    eventBar.barId,
    null,
    "prior candidate failed deterministic predecessor validation",
    contextState,
    volumeState,
    reference,
    [],
    { normalizationVersion: input.normalizationVersion, evaluationSequence: eventBar.sequence },
  );
}

function barIdOrNull(bar: DiscoveryEngineBarV1 | undefined): string | null {
  return typeof bar?.barId === "string" && bar.barId.trim().length > 0 ? bar.barId : null;
}

function sequenceOrNull(bar: DiscoveryEngineBarV1 | undefined): number | null {
  return bar !== undefined && isNonNegativeInteger(bar.sequence) ? bar.sequence : null;
}

function detectCoreHits(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
): readonly CoreHitV1[] {
  const hits: CoreHitV1[] = [];
  hits.push(...detectFailedBreakout(eventBar, priorBars));
  hits.push(...detectBreakoutAttempt(eventBar, rangeReference));
  hits.push(...detectRangeBoundaryInteraction(eventBar, rangeReference));
  hits.push(...detectPullbackToStructure(eventBar, priorBars));
  hits.push(...detectMagnetProximity(eventBar, priorBars, rangeReference));
  return dedupeHits(hits);
}

function detectFailedBreakout(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
): readonly CoreHitV1[] {
  const previousBar = priorBars[priorBars.length - 1];
  if (previousBar === undefined || priorBars.length < 2) return [];
  const beforePrevious = buildRangeReference(priorBars.slice(0, -1));
  const upwardFailed =
    previousBar.close > beforePrevious.high + beforePrevious.breakoutDisplacement &&
    eventBar.close <= beforePrevious.high + beforePrevious.tolerance &&
    eventBar.low <= beforePrevious.high + beforePrevious.tolerance;
  const downwardFailed =
    previousBar.close < beforePrevious.low - beforePrevious.breakoutDisplacement &&
    eventBar.close >= beforePrevious.low - beforePrevious.tolerance &&
    eventBar.high >= beforePrevious.low - beforePrevious.tolerance;
  if (upwardFailed) {
    return [
      coreHit("failed_breakout_candidate", "upward", "range_boundary_lifecycle", "upper", [previousBar.barId, eventBar.barId]),
      coreHit("breakout_attempt", "upward", "range_boundary_lifecycle", "upper", [previousBar.barId]),
      coreHit("range_boundary_interaction", "upward", "range_boundary_lifecycle", "upper", [eventBar.barId]),
    ];
  }
  if (downwardFailed) {
    return [
      coreHit("failed_breakout_candidate", "downward", "range_boundary_lifecycle", "lower", [previousBar.barId, eventBar.barId]),
      coreHit("breakout_attempt", "downward", "range_boundary_lifecycle", "lower", [previousBar.barId]),
      coreHit("range_boundary_interaction", "downward", "range_boundary_lifecycle", "lower", [eventBar.barId]),
    ];
  }
  return [];
}

function detectBreakoutAttempt(
  eventBar: DiscoveryEngineBarV1,
  rangeReference: RangeReferenceV1,
): readonly CoreHitV1[] {
  if (eventBar.close > rangeReference.high + rangeReference.breakoutDisplacement) {
    return [coreHit("breakout_attempt", "upward", "range_boundary_lifecycle", "upper", [eventBar.barId])];
  }
  if (eventBar.close < rangeReference.low - rangeReference.breakoutDisplacement) {
    return [coreHit("breakout_attempt", "downward", "range_boundary_lifecycle", "lower", [eventBar.barId])];
  }
  return [];
}

function detectRangeBoundaryInteraction(
  eventBar: DiscoveryEngineBarV1,
  rangeReference: RangeReferenceV1,
): readonly CoreHitV1[] {
  if (
    rangeReference.high === rangeReference.low &&
    eventBar.high === eventBar.low &&
    eventBar.close === rangeReference.high
  ) {
    return [];
  }

  const hits: CoreHitV1[] = [];
  const upwardBreakout = eventBar.close > rangeReference.high + rangeReference.breakoutDisplacement;
  const downwardBreakout = eventBar.close < rangeReference.low - rangeReference.breakoutDisplacement;
  if (
    !upwardBreakout &&
    eventBar.high >= rangeReference.high &&
    eventBar.close >= rangeReference.high - rangeReference.tolerance * 2 &&
    eventBar.close <= rangeReference.high + rangeReference.tolerance
  ) {
    hits.push(coreHit("range_boundary_interaction", "upward", "range_boundary_lifecycle", "upper", [eventBar.barId]));
  }
  if (
    !downwardBreakout &&
    eventBar.low <= rangeReference.low &&
    eventBar.close <= rangeReference.low + rangeReference.tolerance * 2 &&
    eventBar.close >= rangeReference.low - rangeReference.tolerance
  ) {
    hits.push(coreHit("range_boundary_interaction", "downward", "range_boundary_lifecycle", "lower", [eventBar.barId]));
  }
  return hits;
}

function detectPullbackToStructure(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
): readonly CoreHitV1[] {
  const start = Math.max(0, priorBars.length - 8);
  for (let index = priorBars.length - 2; index >= start; index -= 1) {
    const legBar = priorBars[index];
    if (legBar === undefined || index < 2) continue;
    const beforeLeg = buildRangeReference(priorBars.slice(0, index));
    if (
      legBar.close > beforeLeg.high + beforeLeg.breakoutDisplacement &&
      eventBar.low <= beforeLeg.high + beforeLeg.tolerance &&
      eventBar.close > beforeLeg.high
    ) {
      return [coreHit("pullback_to_structure", "upward", "structure_return", "upper", [legBar.barId, eventBar.barId])];
    }
    if (
      legBar.close < beforeLeg.low - beforeLeg.breakoutDisplacement &&
      eventBar.high >= beforeLeg.low - beforeLeg.tolerance &&
      eventBar.close < beforeLeg.low
    ) {
      return [coreHit("pullback_to_structure", "downward", "structure_return", "lower", [legBar.barId, eventBar.barId])];
    }
  }
  return [];
}

function detectMagnetProximity(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
): readonly CoreHitV1[] {
  const pivots = confirmedPivots(priorBars);
  const hits: CoreHitV1[] = [];
  if (
    rangeReference.tolerance > 0 &&
    barRange(eventBar) < rangeReference.tolerance &&
    Math.abs(eventBar.close - rangeReference.midpoint) <= rangeReference.tolerance
  ) {
    const polarity: Exclude<DiscoveryObservedPolarityV1, "neutral"> =
      eventBar.close >= eventBar.open ? "upward" : "downward";
    hits.push({
      ...coreHit("magnet_proximity", polarity, "structure_return", "midpoint", [eventBar.barId]),
      anchorIds: ["anchor:rolling-midpoint"],
      canonicalAnchorGroupId: "anchor-group:rolling-midpoint",
      evidenceRefs: ["anchor:rolling-midpoint", eventBar.barId],
    });
  }
  for (const pivot of pivots) {
    if (pivot.kind === "high" && Math.abs(eventBar.high - pivot.price) <= rangeReference.tolerance) {
      hits.push({
        ...coreHit("magnet_proximity", "upward", "structure_return", "upper", [pivot.id, eventBar.barId]),
        anchorIds: [`anchor:pivot-high:${pivot.sequence}`],
        canonicalAnchorGroupId: `anchor-group:pivot-high:${pivot.sequence}`,
        evidenceRefs: [`anchor:pivot-high:${pivot.sequence}`, pivot.id, eventBar.barId],
      });
    }
    if (pivot.kind === "low" && Math.abs(eventBar.low - pivot.price) <= rangeReference.tolerance) {
      hits.push({
        ...coreHit("magnet_proximity", "downward", "structure_return", "lower", [pivot.id, eventBar.barId]),
        anchorIds: [`anchor:pivot-low:${pivot.sequence}`],
        canonicalAnchorGroupId: `anchor-group:pivot-low:${pivot.sequence}`,
        evidenceRefs: [`anchor:pivot-low:${pivot.sequence}`, pivot.id, eventBar.barId],
      });
    }
  }
  return hits;
}

function buildCandidates(args: {
  readonly input: EvaluateDiscoveryFactorsInputV1;
  readonly eventBar: DiscoveryEngineBarV1;
  readonly priorBars: readonly DiscoveryEngineBarV1[];
  readonly hits: readonly CoreHitV1[];
  readonly contextState: DiscoveryContextStateV1;
  readonly volumeState: DiscoveryVolumeStateV1;
  readonly rangeReference: RangeReferenceV1;
}): readonly DiscoveryCandidateV1[] {
  const grouped = new Map<string, CoreHitV1[]>();
  for (const hit of args.hits) {
    const key = `${hit.polarity}:${hit.canonicalAnchorGroupId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), hit]);
  }
  const candidates: DiscoveryCandidateV1[] = [];
  for (const groupHits of grouped.values()) {
    const primaryHit = groupHits.slice().sort(compareHitsByPrimaryPriority)[0];
    if (primaryHit === undefined) continue;
    const secondaryEventTypes = uniqueStrings(
      groupHits
        .map((hit) => hit.eventType)
        .filter((eventType) => eventType !== primaryHit.eventType),
    ) as DiscoveryCoreEventTypeV1[];
    const contextEnhancers = detectContextEnhancers(
      primaryHit,
      args.eventBar,
      args.priorBars,
      args.rangeReference,
      args.volumeState,
    );
    const predecessor = semanticPredecessorFor(primaryHit, args.input.priorCandidates ?? []);
    const candidate = createDiscoveryCandidateV1({
      sourceId: args.input.sourceId,
      instrumentId: args.input.instrumentId,
      barDurationSeconds: args.input.barDurationSeconds,
      evaluationCutoffBarId: args.eventBar.barId,
      effectiveBarSequence: args.eventBar.sequence,
      contextState: args.contextState,
      volumeState: args.volumeState,
      primaryEventType: primaryHit.eventType,
      secondaryEventTypes,
      contextEnhancers,
      observedPolarity: primaryHit.polarity,
      anchorIds: uniqueStrings(groupHits.flatMap((hit) => hit.anchorIds)),
      canonicalAnchorGroupId: primaryHit.canonicalAnchorGroupId,
      eventFamily: primaryHit.eventFamily,
      evidenceRefs: uniqueStrings(groupHits.flatMap((hit) => hit.evidenceRefs)),
      reasonText: reasonFor(primaryHit, secondaryEventTypes.length),
      compressionBasis: compressionBasis(args.eventBar, args.priorBars, args.rangeReference, args.volumeState),
      normalizationVersion: args.input.normalizationVersion,
      candidateRevision: 1,
      predecessorEventFingerprint: predecessor?.eventFingerprint ?? null,
      activityBucket: activityBucket(args.eventBar, args.rangeReference),
      contextSupportBucket: contextEnhancers.length > 1 ? "multiple_independent_contexts" : contextEnhancers.length === 1 ? "single_context" : "no_context",
      eventStagePriority: isSemanticEscalation(primaryHit, predecessor) ? "semantic_escalation" : "fresh_core_event",
    });
    candidates.push(candidate);
  }
  return candidates.sort((left, right) =>
    compareDiscoveryPriorityTupleV1(left.priorityTuple, right.priorityTuple),
  );
}

interface CandidateCooldownEvaluationV1 {
  readonly candidates: readonly DiscoveryCandidateV1[];
  readonly blockers: readonly DiscoveryCandidateV1[];
}

function applyCandidateCooldown(
  candidates: readonly DiscoveryCandidateV1[],
  priorCandidates: readonly DiscoveryCandidateV1[],
): CandidateCooldownEvaluationV1 {
  const eligibleCandidates: DiscoveryCandidateV1[] = [];
  const blockers: DiscoveryCandidateV1[] = [];
  for (const candidate of candidates) {
    const blockedByCooldown = cooldownBlocker(candidate, priorCandidates);
    if (blockedByCooldown === null) {
      eligibleCandidates.push(candidate);
    } else {
      blockers.push(blockedByCooldown);
    }
  }
  return { candidates: eligibleCandidates, blockers };
}

function cooldownBlocker(
  candidate: DiscoveryCandidateV1,
  priorCandidates: readonly DiscoveryCandidateV1[],
): DiscoveryCandidateV1 | null {
  if (candidate.priorityTuple.eventStagePriority === "semantic_escalation") return null;
  const sortedPrior = priorCandidates
    .filter(
      (prior) =>
        prior.dedupGroupKey === candidate.dedupGroupKey &&
        candidate.effectiveBarSequence <= prior.cooldownThroughSequence,
    )
    .sort((left, right) => right.effectiveBarSequence - left.effectiveBarSequence);
  return sortedPrior[0] ?? null;
}

function semanticPredecessorFor(
  hit: CoreHitV1,
  priorCandidates: readonly DiscoveryCandidateV1[],
): DiscoveryCandidateV1 | null {
  if (hit.eventType !== "failed_breakout_candidate") return null;
  const candidates = priorCandidates
    .filter(
      (candidate) =>
        candidate.primaryEventType === "breakout_attempt" &&
        candidate.canonicalAnchorGroupId === hit.canonicalAnchorGroupId &&
        candidate.observedPolarity === hit.polarity &&
        candidate.eventFamily === hit.eventFamily &&
        hit.evidenceRefs.includes(candidate.evaluationCutoffBarId),
    )
    .sort((left, right) => right.effectiveBarSequence - left.effectiveBarSequence);
  return candidates[0] ?? null;
}

function isSemanticEscalation(
  hit: CoreHitV1,
  predecessor: DiscoveryCandidateV1 | null,
): boolean {
  if (predecessor === null) return false;
  return (
    predecessor.primaryEventType === "breakout_attempt" &&
    hit.eventType === "failed_breakout_candidate"
  );
}

function detectContextEnhancers(
  primaryHit: CoreHitV1,
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
  volumeState: DiscoveryVolumeStateV1,
): readonly DiscoveryContextEnhancerV1[] {
  const enhancers: DiscoveryContextEnhancerV1[] = [];
  if (hasCompressionExpansion(eventBar, priorBars, rangeReference, volumeState)) {
    enhancers.push("compression_expansion");
  }
  if (primaryHit.eventType === "pullback_to_structure") {
    enhancers.push("trend_leg_first_pullback");
  }
  if (hasTradingRangeTopBottomContext(primaryHit, eventBar, priorBars, rangeReference)) {
    enhancers.push("trading_range_top_bottom_context");
  }
  return DISCOVERY_CONTEXT_ENHANCERS_V1.filter((enhancer) => enhancers.includes(enhancer));
}

function hasCompressionExpansion(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
  volumeState: DiscoveryVolumeStateV1,
): boolean {
  const recent = priorBars.slice(-MOVEMENT_LOOKBACK_OBSERVATIONS_V1);
  const averageRecentRange = average(recent.map(barRange));
  const priceExpanded = barRange(eventBar) >= rangeReference.rangeMedian * COMPRESSION_EXPANSION_MULTIPLE_V1;
  const priorCompressed = averageRecentRange <= rangeReference.rangeMedian * COMPRESSION_AVERAGE_MULTIPLE_V1;
  if (priceExpanded && priorCompressed) return true;
  if (volumeState !== "valid" || eventBar.volume === undefined) return false;
  const priorVolumes = volumeValues(priorBars);
  const volumeMedian = quantileR7(priorVolumes, RANGE_MEDIAN_QUANTILE_V1);
  return volumeMedian > 0 && eventBar.volume >= volumeMedian * VOLUME_EXPANSION_MULTIPLE_V1;
}

function hasTradingRangeTopBottomContext(
  primaryHit: CoreHitV1,
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
): boolean {
  void priorBars;
  if (primaryHit.polarity === "upward") {
    return eventBar.close >= rangeReference.upperThirdBoundary;
  }
  return eventBar.close <= rangeReference.lowerThirdBoundary;
}

function compressionBasis(
  eventBar: DiscoveryEngineBarV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  rangeReference: RangeReferenceV1,
  volumeState: DiscoveryVolumeStateV1,
): readonly string[] {
  const basis: string[] = [];
  const recent = priorBars.slice(-MOVEMENT_LOOKBACK_OBSERVATIONS_V1);
  if (
    barRange(eventBar) >= rangeReference.rangeMedian * COMPRESSION_EXPANSION_MULTIPLE_V1 &&
    average(recent.map(barRange)) <= rangeReference.rangeMedian * COMPRESSION_AVERAGE_MULTIPLE_V1
  ) {
    basis.push("closed-bar price range expanded after prior compressed bars");
  }
  if (volumeState === "valid" && eventBar.volume !== undefined) {
    const priorVolumes = volumeValues(priorBars);
    const volumeMedian = quantileR7(priorVolumes, RANGE_MEDIAN_QUANTILE_V1);
    if (volumeMedian > 0 && eventBar.volume >= volumeMedian * VOLUME_EXPANSION_MULTIPLE_V1) {
      basis.push("same-source optional activity metric expanded with price compression context");
    }
  }
  return basis;
}

function determineVolumeState(
  input: EvaluateDiscoveryFactorsInputV1,
  priorBars: readonly DiscoveryEngineBarV1[],
  eventBar: DiscoveryEngineBarV1,
): DiscoveryVolumeStateV1 {
  const metricBars = [...priorBars.slice(-REFERENCE_WINDOW_OBSERVATIONS_V1), eventBar];
  if (metricBars.length !== REFERENCE_WINDOW_OBSERVATIONS_V1 + 1) return "unavailable";
  return metricBars.every((bar) => hasValidActivityMetric(input, bar)) ? "valid" : "unavailable";
}

function hasValidActivityMetric(
  input: EvaluateDiscoveryFactorsInputV1,
  bar: DiscoveryEngineBarV1,
): boolean {
  return (
    typeof bar.volume === "number" &&
    Number.isFinite(bar.volume) &&
    bar.volume >= 0 &&
    bar.volumeReliable === true &&
    bar.volumeSourceId === input.sourceId &&
    bar.volumeInstrumentId === input.instrumentId &&
    bar.volumeTimeframeId === input.timeframeId
  );
}

function hasSameBarAmbiguity(
  eventBar: DiscoveryEngineBarV1,
  rangeReference: RangeReferenceV1,
): boolean {
  if (rangeReference.high === rangeReference.low && eventBar.high === eventBar.low) return false;
  return (
    eventBar.high >= rangeReference.high + rangeReference.breakoutDisplacement &&
    eventBar.low <= rangeReference.low - rangeReference.breakoutDisplacement
  );
}

function buildRangeReference(priorBars: readonly DiscoveryEngineBarV1[]): RangeReferenceV1 {
  const referenceBars = priorBars.slice(-REFERENCE_WINDOW_OBSERVATIONS_V1);
  const ranges = referenceBars.map(barRange);
  const high = Math.max(...referenceBars.map((bar) => bar.high));
  const low = Math.min(...referenceBars.map((bar) => bar.low));
  const rangeWidth = high - low;
  const rangeMedian = quantileR7(ranges, RANGE_MEDIAN_QUANTILE_V1);
  const tolerance = rangeMedian * BOUNDARY_TOLERANCE_MEDIAN_RANGE_MULTIPLE_V1;
  return {
    high,
    low,
    midpoint: (high + low) / 2,
    lowerThirdBoundary: low + rangeWidth / 3,
    upperThirdBoundary: low + (rangeWidth * 2) / 3,
    rangeP25: quantileR7(ranges, ACTIVITY_CONTRACTED_QUANTILE_V1),
    rangeMedian,
    rangeP75: quantileR7(ranges, ACTIVITY_EXPANDED_QUANTILE_V1),
    tolerance,
    breakoutDisplacement: rangeMedian * BREAKOUT_DISPLACEMENT_RANGE_FRACTION_V1,
  };
}

function confirmedPivots(priorBars: readonly DiscoveryEngineBarV1[]): readonly PivotV1[] {
  const pivots: PivotV1[] = [];
  for (let index = PIVOT_CONFIRMATION_LEFT_V1; index < priorBars.length - PIVOT_CONFIRMATION_RIGHT_V1; index += 1) {
    const bar = priorBars[index];
    if (bar === undefined) continue;
    const left = priorBars.slice(index - PIVOT_CONFIRMATION_LEFT_V1, index);
    const right = priorBars.slice(index + 1, index + 1 + PIVOT_CONFIRMATION_RIGHT_V1);
    if (left.every((other) => bar.high > other.high) && right.every((other) => bar.high > other.high)) {
      pivots.push({ id: `pivot-high:${bar.barId}`, kind: "high", sequence: bar.sequence, price: bar.high });
    }
    if (left.every((other) => bar.low < other.low) && right.every((other) => bar.low < other.low)) {
      pivots.push({ id: `pivot-low:${bar.barId}`, kind: "low", sequence: bar.sequence, price: bar.low });
    }
  }
  return pivots.sort((left, right) => right.sequence - left.sequence);
}

function coreHit(
  eventType: DiscoveryCoreEventTypeV1,
  polarity: Exclude<DiscoveryObservedPolarityV1, "neutral">,
  eventFamily: DiscoveryEventFamilyV1,
  side: "upper" | "lower" | "midpoint",
  evidenceRefs: readonly string[],
): CoreHitV1 {
  return {
    eventType,
    polarity,
    anchorIds: [`anchor:rolling-range-${side}`],
    canonicalAnchorGroupId: `anchor-group:${side}-structure`,
    eventFamily,
    evidenceRefs: [`anchor:rolling-range-${side}`, ...evidenceRefs],
  };
}

function dedupeHits(hits: readonly CoreHitV1[]): readonly CoreHitV1[] {
  const seen = new Set<string>();
  const resultHits: CoreHitV1[] = [];
  for (const hit of hits) {
    const key = `${hit.eventType}:${hit.polarity}:${hit.canonicalAnchorGroupId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resultHits.push(hit);
  }
  return resultHits;
}

function compareHitsByPrimaryPriority(left: CoreHitV1, right: CoreHitV1): number {
  return primaryPriorityIndex(left.eventType) - primaryPriorityIndex(right.eventType);
}

function primaryPriorityIndex(eventType: DiscoveryCoreEventTypeV1): number {
  return DISCOVERY_PRIMARY_EVENT_PRIORITY_V1.indexOf(eventType);
}

function reasonFor(primaryHit: CoreHitV1, secondaryCount: number): string {
  return `Closed-bar discovery observation: ${primaryHit.eventType} with ${secondaryCount} related structure observation(s).`;
}

function activityBucket(
  eventBar: DiscoveryEngineBarV1,
  rangeReference: RangeReferenceV1,
): DiscoveryActivityBucketV1 {
  const currentRange = barRange(eventBar);
  if (currentRange <= 0 || rangeReference.rangeP75 <= 0) return "unavailable";
  if (currentRange >= rangeReference.rangeP75) return "expanded";
  if (currentRange <= rangeReference.rangeP25) return "contracted";
  return "typical";
}

function volumeValues(priorBars: readonly DiscoveryEngineBarV1[]): readonly number[] {
  return priorBars
    .slice(-REFERENCE_WINDOW_OBSERVATIONS_V1)
    .map((bar) => bar.volume as number);
}

interface AuditBindingContextV1 {
  readonly normalizationVersion?: string;
  readonly evaluationSequence?: number | null;
  readonly anchorRefs?: readonly string[];
  readonly factorObservations?: readonly string[];
  readonly currentCandidateIds?: readonly ContractSha256[];
}

function result(
  status: DiscoveryAuditStatusV1,
  reasonCode: DiscoveryAuditReasonCodeV1,
  inputHash: ContractSha256,
  cutoffBarId: string | null,
  candidateId: ContractSha256 | null,
  detail: string,
  contextState: DiscoveryContextStateV1 | null,
  volumeState: DiscoveryVolumeStateV1,
  rollingReference: DiscoveryRollingReferenceV1,
  candidates: readonly DiscoveryCandidateV1[],
  auditContext: AuditBindingContextV1 = {},
): Readonly<DiscoveryEngineEvaluationResultV1> {
  const candidateIds = uniqueContractHashes([
    ...candidates.map((candidate) => candidate.candidateId),
    ...(candidateId === null ? [] : [candidateId]),
    ...(auditContext.currentCandidateIds ?? []),
  ]);
  const audit = createDiscoveryAuditResultV1({
    status,
    reasonCode,
    inputHash,
    normalizationVersion: auditNormalizationVersion(auditContext.normalizationVersion),
    cutoffBarId,
    evaluationSequence: auditEvaluationSequence(auditContext.evaluationSequence, candidates),
    candidateId,
    anchorRefs: auditContext.anchorRefs ?? anchorRefsFor(candidates),
    factorObservations: auditContext.factorObservations ?? factorObservationsFor(candidates, rollingReference),
    currentCandidateIds: candidateIds,
    details: [detail],
  });
  return deepFreeze({
    status,
    inputHash,
    contextState,
    volumeState,
    rollingReference,
    candidates: [...candidates],
    audit,
  });
}

function auditNormalizationVersion(value: string | undefined): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : DISCOVERY_NORMALIZATION_VERSION_V1;
}

function auditEvaluationSequence(
  value: number | null | undefined,
  candidates: readonly DiscoveryCandidateV1[],
): number | null {
  if (value === null) return null;
  if (value !== undefined && isNonNegativeInteger(value)) return value;
  const firstCandidate = candidates[0];
  return firstCandidate === undefined ? null : firstCandidate.effectiveBarSequence;
}

function anchorRefsFor(candidates: readonly DiscoveryCandidateV1[]): readonly string[] {
  return uniqueStrings(candidates.flatMap((candidate) => candidate.anchorIds)).sort();
}

function factorObservationsFor(
  candidates: readonly DiscoveryCandidateV1[],
  rollingReference: DiscoveryRollingReferenceV1,
): readonly string[] {
  const observations = candidates.flatMap((candidate) => [
    `primary:${candidate.primaryEventType}`,
    `polarity:${candidate.observedPolarity}`,
    `family:${candidate.eventFamily}`,
    ...candidate.secondaryEventTypes.map((eventType) => `secondary:${eventType}`),
    ...candidate.contextEnhancers.map((enhancer) => `context:${enhancer}`),
  ]);
  if (rollingReference.priorRangeMedian !== null) {
    observations.push(
      `reference:prior-20:p25=${formatAuditNumber(rollingReference.priorRangeP25)}`,
      `reference:prior-20:median=${formatAuditNumber(rollingReference.priorRangeMedian)}`,
      `reference:prior-20:p75=${formatAuditNumber(rollingReference.priorRangeP75)}`,
      `reference:prior-20:tolerance=${formatAuditNumber(rollingReference.boundaryTolerance)}`,
    );
  }
  return uniqueStrings(observations).sort();
}

function formatAuditNumber(value: number | null): string {
  return value === null ? "null" : Number.isInteger(value) ? value.toString() : value.toPrecision(15);
}

function uniqueContractHashes(values: readonly ContractSha256[]): ContractSha256[] {
  return [...new Set(values)].sort();
}

function createInputHash(input: EvaluateDiscoveryFactorsInputV1): ContractSha256 {
  try {
    const inputRecord = recordOrNull(input);
    if (inputRecord === null) return runtimeRejectInputHash("discovery-engine-input.v1", input);
    return canonicalHash({
      schema: "discovery-engine-input.v1",
      sourceId: inputRecord.sourceId ?? null,
      instrumentId: inputRecord.instrumentId ?? null,
      timeframeId: inputRecord.timeframeId ?? null,
      barDurationSeconds: serializeNumber(inputRecord.barDurationSeconds),
      normalizationVersion: inputRecord.normalizationVersion ?? null,
      bars: barsForHash(inputRecord.bars),
      priorCandidates: priorCandidatesForHash(inputRecord.priorCandidates),
    });
  } catch {
    return runtimeRejectInputHash("discovery-engine-input.v1", input);
  }
}

function barsForHash(bars: unknown): unknown {
  if (!Array.isArray(bars)) return { invalidType: valueTypeName(bars) };
  return Array.from({ length: bars.length }, (_, index) => barForHash(bars[index], index));
}

function runtimeRejectInputHash(schema: string, input: unknown): ContractSha256 {
  return canonicalHash({
    schema,
    malformedInput: hashableRuntimeValue(input),
  });
}

function hashableRuntimeValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>(),
  depth: number = 0,
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return serializeNumber(value);
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (typeof value === "symbol") return `symbol:${String(value.description ?? "")}`;
  if (typeof value === "function") return "function";
  if (seen.has(value)) return "circular";
  if (depth >= 4) return { truncatedType: Array.isArray(value) ? "array" : "object" };

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => hashableRuntimeValue(item, seen, depth + 1));
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => {
    let fieldValue: unknown;
    try {
      fieldValue = record[key];
    } catch {
      fieldValue = "unreadable";
    }
    return [key, hashableRuntimeValue(fieldValue, seen, depth + 1)];
  }));
}

function priorCandidatesForHash(priorCandidates: unknown): unknown {
  if (priorCandidates === undefined) return [];
  if (!Array.isArray(priorCandidates)) {
    return { invalidType: valueTypeName(priorCandidates) };
  }
  return priorCandidates.map((candidate, index) => priorCandidateForHash(candidate, index));
}

function priorCandidateForHash(candidate: unknown, index: number): unknown {
  const candidateRecord = recordOrNull(candidate);
  if (candidateRecord === null) {
    return { index, invalidType: valueTypeName(candidate) };
  }
  return {
    index,
    candidateId: candidateRecord.candidateId ?? null,
    eventFingerprint: candidateRecord.eventFingerprint ?? null,
    contentIdentity: safeCanonicalHash(candidateRecord),
  };
}

function safeCanonicalHash(value: unknown): ContractSha256 | string {
  try {
    return canonicalHash(value);
  } catch {
    return `unhashable:${valueTypeName(value)}`;
  }
}

function valueTypeName(value: unknown): string {
  if (Array.isArray(value)) return "array";
  return value === null ? "null" : typeof value;
}

function optionalHashValue(value: unknown): unknown {
  return value === undefined ? null : hashableRuntimeValue(value);
}

function barForHash(bar: unknown, index: number): unknown {
  if (bar === undefined) return { index, missing: true };
  const barRecord = recordOrNull(bar);
  if (barRecord === null) return { index, invalidType: valueTypeName(bar) };
  return {
    barId: optionalHashValue(barRecord.barId),
    sequence: serializeNumber(barRecord.sequence),
    open: serializeNumber(barRecord.open),
    high: serializeNumber(barRecord.high),
    low: serializeNumber(barRecord.low),
    close: serializeNumber(barRecord.close),
    isClosed: optionalHashValue(barRecord.isClosed),
    continuityFromPrevious: optionalHashValue(barRecord.continuityFromPrevious),
    volume: barRecord.volume === undefined ? null : serializeNumber(barRecord.volume),
    volumeSourceId: optionalHashValue(barRecord.volumeSourceId),
    volumeInstrumentId: optionalHashValue(barRecord.volumeInstrumentId),
    volumeTimeframeId: optionalHashValue(barRecord.volumeTimeframeId),
    volumeReliable: optionalHashValue(barRecord.volumeReliable),
  };
}

function serializeNumber(value: unknown): number | string {
  if (typeof value !== "number") return `invalid:${valueTypeName(value)}`;
  return Number.isFinite(value) ? value : String(value);
}

function isValidOhlc(bar: DiscoveryEngineBarV1): boolean {
  return (
    [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) &&
    bar.high >= bar.low &&
    bar.high >= bar.open &&
    bar.high >= bar.close &&
    bar.low <= bar.open &&
    bar.low <= bar.close
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function barRange(bar: DiscoveryEngineBarV1): number {
  return bar.high - bar.low;
}

function quantileR7(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 1) return sorted[0] ?? 0;
  const h = 1 + (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(h) - 1;
  const upperIndex = Math.ceil(h) - 1;
  const lower = sorted[lowerIndex] ?? sorted[0] ?? 0;
  const upper = sorted[upperIndex] ?? sorted[sorted.length - 1] ?? lower;
  return lower + (h - Math.floor(h)) * (upper - lower);
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
