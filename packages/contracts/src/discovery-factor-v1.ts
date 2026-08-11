import {
  assertFiniteNumber,
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  assertStringList,
  assertUnique,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const DISCOVERY_FACTOR_SCHEMA_VERSION = "discovery-factor.v1" as const;
export const DISCOVERY_AUDIT_SCHEMA_VERSION = "discovery-factor-audit.v1" as const;
export const DISCOVERY_NORMALIZATION_VERSION_V1 = "discovery-normalization.v1" as const;
export const DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1 = 300 as const;
export const DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1 = 20 as const;
export const DISCOVERY_MIN_HISTORY_BARS_V1 = 40 as const;
export const DISCOVERY_STANDARD_CONTEXT_BARS_V1 = 120 as const;
export const DISCOVERY_TTL_BARS_V1 = 3 as const;
export const DISCOVERY_COOLDOWN_BARS_V1 = 6 as const;
export const DISCOVERY_PARAMETER_STATUS_V1 = "PROVISIONAL" as const;
export const DISCOVERY_TTL_COOLDOWN_PARAMETER_STATUS_V1 =
  "PROVISIONAL_BOOTSTRAP_DEFAULT" as const;
export const DISCOVERY_QUANTILE_METHOD_VERSION_V1 =
  "R7_LINEAR_INTERPOLATION_V1" as const;
export const DISCOVERY_ANCHOR_RULE_VERSION_V1 = "discovery-anchor-rule.v1" as const;

export const DISCOVERY_PROVISIONAL_PARAMETERS_V1 = deepFreeze({
  parameterStatus: DISCOVERY_PARAMETER_STATUS_V1,
  referenceWindowObservations: DISCOVERY_REFERENCE_WINDOW_OBSERVATIONS_V1,
  toleranceMedianRangeMultiple: 0.5,
  movementLookbackObservations: 3,
  pivotConfirmation: { left: 2, right: 2 },
  activityBuckets: {
    contractedAtOrBelowQuantile: 0.25,
    typicalBetweenQuantiles: [0.25, 0.75] as const,
    expandedAtOrAboveQuantile: 0.75,
  },
  locationBuckets: ["lower_third", "middle_third", "upper_third"] as const,
  ttlBars: DISCOVERY_TTL_BARS_V1,
  cooldownBars: DISCOVERY_COOLDOWN_BARS_V1,
  quantileMethodVersion: DISCOVERY_QUANTILE_METHOD_VERSION_V1,
});

export const DISCOVERY_CORE_EVENT_TYPES_V1 = [
  "range_boundary_interaction",
  "breakout_attempt",
  "failed_breakout_candidate",
  "pullback_to_structure",
  "magnet_proximity",
] as const;

export const DISCOVERY_CONTEXT_ENHANCERS_V1 = [
  "compression_expansion",
  "trend_leg_first_pullback",
  "trading_range_top_bottom_context",
] as const;

export const DISCOVERY_AUDIT_STATUSES_V1 = [
  "candidate_emitted",
  "no_trigger",
  "no_applicable_anchor",
  "suppressed_cooldown",
  "deferred_budget",
  "expired_before_admission",
  "rejected_data_quality",
  "rejected_ambiguity",
] as const;

export const DISCOVERY_PRIMARY_EVENT_PRIORITY_V1 = [
  "failed_breakout_candidate",
  "breakout_attempt",
  "range_boundary_interaction",
  "pullback_to_structure",
  "magnet_proximity",
] as const;

export type DiscoveryCoreEventTypeV1 =
  (typeof DISCOVERY_CORE_EVENT_TYPES_V1)[number];
export type DiscoveryContextEnhancerV1 =
  (typeof DISCOVERY_CONTEXT_ENHANCERS_V1)[number];
export type DiscoveryAuditStatusV1 =
  (typeof DISCOVERY_AUDIT_STATUSES_V1)[number];
export type DiscoveryObservedPolarityV1 = "upward" | "downward" | "neutral";
export type DiscoveryContextStateV1 = "left_censored" | "normal";
export type DiscoveryVolumeStateV1 = "valid" | "unavailable";
export type DiscoveryEventFamilyV1 =
  | "range_boundary_lifecycle"
  | "structure_return";
export type DiscoveryActivityBucketV1 =
  | "expanded"
  | "typical"
  | "contracted"
  | "unavailable";
export type DiscoveryContextSupportBucketV1 =
  | "multiple_independent_contexts"
  | "single_context"
  | "no_context";
export type DiscoveryEventStagePriorityV1 =
  | "semantic_escalation"
  | "fresh_core_event";
export type DiscoveryAuditReasonCodeV1 =
  | "candidate_emitted"
  | "no_trigger"
  | "no_applicable_anchor"
  | "suppressed_cooldown"
  | "deferred_budget"
  | "expired_before_admission"
  | "insufficient_history"
  | "bar_not_closed"
  | "invalid_ohlc"
  | "sequence_conflict"
  | "missing_continuity"
  | "ambiguous_anchor"
  | "same_bar_ambiguity"
  | "unknown_state";

export interface DiscoveryEventFingerprintInputV1 {
  readonly instrumentId: string;
  readonly primaryEventType: DiscoveryCoreEventTypeV1;
  readonly anchorIds: readonly string[];
  readonly effectiveBarId: string;
  readonly observedPolarity: DiscoveryObservedPolarityV1;
  readonly normalizationVersion: string;
}

export interface DiscoveryDedupGroupKeyInputV1 {
  readonly instrumentId: string;
  readonly canonicalAnchorGroupId: string;
  readonly observedPolarity: DiscoveryObservedPolarityV1;
  readonly eventFamily: DiscoveryEventFamilyV1;
  readonly normalizationVersion: string;
}

export interface DiscoveryPriorityTupleV1 {
  readonly eligibilityClass: "eligible";
  readonly eventStagePriority: DiscoveryEventStagePriorityV1;
  readonly ttlUrgencyBucket: "fresh";
  readonly structuralSpecificity: number;
  readonly contextSupportBucket: DiscoveryContextSupportBucketV1;
  readonly activityBucket: DiscoveryActivityBucketV1;
  readonly queueAge: 0;
  readonly tieBreaker: ContractSha256;
}

export interface CreateDiscoveryCandidateInputV1 {
  readonly sourceId: string;
  readonly instrumentId: string;
  readonly barDurationSeconds: number;
  readonly evaluationCutoffBarId: string;
  readonly effectiveBarSequence: number;
  readonly contextState: DiscoveryContextStateV1;
  readonly volumeState: DiscoveryVolumeStateV1;
  readonly primaryEventType: DiscoveryCoreEventTypeV1;
  readonly secondaryEventTypes: readonly DiscoveryCoreEventTypeV1[];
  readonly contextEnhancers: readonly DiscoveryContextEnhancerV1[];
  readonly observedPolarity: DiscoveryObservedPolarityV1;
  readonly anchorIds: readonly string[];
  readonly canonicalAnchorGroupId: string;
  readonly eventFamily: DiscoveryEventFamilyV1;
  readonly evidenceRefs: readonly string[];
  readonly reasonText: string;
  readonly compressionBasis: readonly string[];
  readonly normalizationVersion: string;
  readonly candidateRevision: number;
  readonly predecessorEventFingerprint: ContractSha256 | null;
  readonly activityBucket: DiscoveryActivityBucketV1;
  readonly contextSupportBucket: DiscoveryContextSupportBucketV1;
  readonly eventStagePriority: DiscoveryEventStagePriorityV1;
}

export interface DiscoveryCandidateV1 {
  readonly schemaVersion: typeof DISCOVERY_FACTOR_SCHEMA_VERSION;
  readonly sourceId: string;
  readonly instrumentId: string;
  readonly barDurationSeconds: typeof DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1;
  readonly evaluationCutoffBarId: string;
  readonly effectiveBarSequence: number;
  readonly contextState: DiscoveryContextStateV1;
  readonly volumeState: DiscoveryVolumeStateV1;
  readonly primaryEventType: DiscoveryCoreEventTypeV1;
  readonly secondaryEventTypes: readonly DiscoveryCoreEventTypeV1[];
  readonly contextEnhancers: readonly DiscoveryContextEnhancerV1[];
  readonly observedPolarity: DiscoveryObservedPolarityV1;
  readonly anchorIds: readonly string[];
  readonly canonicalAnchorGroupId: string;
  readonly eventFamily: DiscoveryEventFamilyV1;
  readonly evidenceRefs: readonly string[];
  readonly reasonText: string;
  readonly compressionBasis: readonly string[];
  readonly normalizationVersion: string;
  readonly candidateRevision: number;
  readonly predecessorEventFingerprint: ContractSha256 | null;
  readonly eventFingerprint: ContractSha256;
  readonly dedupGroupKey: ContractSha256;
  readonly candidateId: ContractSha256;
  readonly candidateHash: ContractSha256;
  readonly ttlBars: typeof DISCOVERY_TTL_BARS_V1;
  readonly ttlParameterStatus: typeof DISCOVERY_TTL_COOLDOWN_PARAMETER_STATUS_V1;
  readonly expiresAfterSequence: number;
  readonly cooldownBars: typeof DISCOVERY_COOLDOWN_BARS_V1;
  readonly cooldownParameterStatus: typeof DISCOVERY_TTL_COOLDOWN_PARAMETER_STATUS_V1;
  readonly cooldownThroughSequence: number;
  readonly priorityTuple: Readonly<DiscoveryPriorityTupleV1>;
}

export interface CreateDiscoveryAuditResultInputV1 {
  readonly status: DiscoveryAuditStatusV1;
  readonly reasonCode: DiscoveryAuditReasonCodeV1;
  readonly inputHash: ContractSha256;
  readonly normalizationVersion: string;
  readonly cutoffBarId: string | null;
  readonly evaluationSequence: number | null;
  readonly candidateId: ContractSha256 | null;
  readonly anchorRefs: readonly string[];
  readonly factorObservations: readonly string[];
  readonly currentCandidateIds: readonly ContractSha256[];
  readonly details: readonly string[];
}

export interface DiscoveryAuditResultV1 {
  readonly schemaVersion: typeof DISCOVERY_AUDIT_SCHEMA_VERSION;
  readonly status: DiscoveryAuditStatusV1;
  readonly reasonCode: DiscoveryAuditReasonCodeV1;
  readonly inputHash: ContractSha256;
  readonly normalizationVersion: string;
  readonly cutoffBarId: string | null;
  readonly evaluationSequence: number | null;
  readonly candidateId: ContractSha256 | null;
  readonly anchorRefs: readonly string[];
  readonly factorObservations: readonly string[];
  readonly currentCandidateIds: readonly ContractSha256[];
  readonly details: readonly string[];
  readonly auditContentHash: ContractSha256;
  readonly auditHash: ContractSha256;
}

export class DiscoveryFactorContractError extends Error {
  override readonly name = "DiscoveryFactorContractError";
}

export function calculateDiscoveryR7QuantileV1(
  values: readonly number[],
  quantile: number,
): number {
  assertFiniteNumber("quantile", quantile);
  if (quantile < 0 || quantile > 1) {
    throw new DiscoveryFactorContractError("quantile must be between 0 and 1");
  }
  if (values.length === 0) {
    throw new DiscoveryFactorContractError("quantile values must not be empty");
  }
  for (const value of values) assertFiniteNumber("quantile value", value);
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  if (lower === undefined || upper === undefined) {
    throw new DiscoveryFactorContractError("quantile index was out of range");
  }
  return lower + (upper - lower) * (position - lowerIndex);
}

export function createDiscoveryEventFingerprintV1(
  input: DiscoveryEventFingerprintInputV1,
): ContractSha256 {
  assertEventFingerprintInput(input);
  return canonicalHash([
    "discovery-event-fingerprint-v1",
    input.instrumentId,
    input.primaryEventType,
    [...input.anchorIds].sort(),
    input.effectiveBarId,
    input.observedPolarity,
    input.normalizationVersion,
  ]);
}

export function createDiscoveryDedupGroupKeyV1(
  input: DiscoveryDedupGroupKeyInputV1,
): ContractSha256 {
  assertNonEmpty("instrumentId", input.instrumentId);
  assertNonEmpty("canonicalAnchorGroupId", input.canonicalAnchorGroupId);
  assertObservedPolarity(input.observedPolarity);
  assertOneOf("eventFamily", input.eventFamily, [
    "range_boundary_lifecycle",
    "structure_return",
  ] as const);
  assertNonEmpty("normalizationVersion", input.normalizationVersion);
  return canonicalHash([
    "discovery-dedup-group-v1",
    input.instrumentId,
    input.canonicalAnchorGroupId,
    input.observedPolarity,
    input.eventFamily,
    input.normalizationVersion,
  ]);
}

export function createDiscoveryCandidateV1(
  input: CreateDiscoveryCandidateInputV1,
): Readonly<DiscoveryCandidateV1> {
  assertCandidateInput(input);
  const anchorIds = [...input.anchorIds].sort();
  const secondaryEventTypes = [...input.secondaryEventTypes].sort();
  const contextEnhancers = [...input.contextEnhancers].sort();
  const evidenceRefs = [...input.evidenceRefs];
  const compressionBasis = [...input.compressionBasis];
  const eventFingerprint = createDiscoveryEventFingerprintV1({
    instrumentId: input.instrumentId,
    primaryEventType: input.primaryEventType,
    anchorIds,
    effectiveBarId: input.evaluationCutoffBarId,
    observedPolarity: input.observedPolarity,
    normalizationVersion: input.normalizationVersion,
  });
  const dedupGroupKey = createDiscoveryDedupGroupKeyV1({
    instrumentId: input.instrumentId,
    canonicalAnchorGroupId: input.canonicalAnchorGroupId,
    observedPolarity: input.observedPolarity,
    eventFamily: input.eventFamily,
    normalizationVersion: input.normalizationVersion,
  });
  const candidateId = canonicalHash([
    "discovery-candidate-id-v1",
    eventFingerprint,
    input.candidateRevision,
    DISCOVERY_FACTOR_SCHEMA_VERSION,
  ]);
  const priorityTuple: DiscoveryPriorityTupleV1 = {
    eligibilityClass: "eligible",
    eventStagePriority: input.eventStagePriority,
    ttlUrgencyBucket: "fresh",
    structuralSpecificity: structuralSpecificity(input.primaryEventType),
    contextSupportBucket: input.contextSupportBucket,
    activityBucket: input.activityBucket,
    queueAge: 0,
    tieBreaker: candidateId,
  };

  const body = {
    schemaVersion: DISCOVERY_FACTOR_SCHEMA_VERSION,
    sourceId: input.sourceId,
    instrumentId: input.instrumentId,
    barDurationSeconds: DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1,
    evaluationCutoffBarId: input.evaluationCutoffBarId,
    effectiveBarSequence: input.effectiveBarSequence,
    contextState: input.contextState,
    volumeState: input.volumeState,
    primaryEventType: input.primaryEventType,
    secondaryEventTypes,
    contextEnhancers,
    observedPolarity: input.observedPolarity,
    anchorIds,
    canonicalAnchorGroupId: input.canonicalAnchorGroupId,
    eventFamily: input.eventFamily,
    evidenceRefs,
    reasonText: input.reasonText,
    compressionBasis,
    normalizationVersion: input.normalizationVersion,
    candidateRevision: input.candidateRevision,
    predecessorEventFingerprint: input.predecessorEventFingerprint,
    eventFingerprint,
    dedupGroupKey,
    candidateId,
    ttlBars: DISCOVERY_TTL_BARS_V1,
    ttlParameterStatus: DISCOVERY_TTL_COOLDOWN_PARAMETER_STATUS_V1,
    expiresAfterSequence: input.effectiveBarSequence + DISCOVERY_TTL_BARS_V1,
    cooldownBars: DISCOVERY_COOLDOWN_BARS_V1,
    cooldownParameterStatus: DISCOVERY_TTL_COOLDOWN_PARAMETER_STATUS_V1,
    cooldownThroughSequence: input.effectiveBarSequence + DISCOVERY_COOLDOWN_BARS_V1,
    priorityTuple,
  } as const;

  return deepFreeze({
    ...body,
    candidateHash: canonicalHash(body),
  });
}

export function createDiscoveryAuditResultV1(
  input: CreateDiscoveryAuditResultInputV1,
): Readonly<DiscoveryAuditResultV1> {
  assertOneOf("status", input.status, DISCOVERY_AUDIT_STATUSES_V1);
  assertAuditReasonCode(input.reasonCode);
  assertStatusReasonPair(input.status, input.reasonCode);
  assertSha256("inputHash", input.inputHash);
  assertNonEmpty("normalizationVersion", input.normalizationVersion);
  if (input.cutoffBarId !== null) assertNonEmpty("cutoffBarId", input.cutoffBarId);
  if (input.evaluationSequence !== null) {
    assertNonNegativeInteger("evaluationSequence", input.evaluationSequence);
  }
  if (input.candidateId !== null) assertSha256("candidateId", input.candidateId);
  assertStringList("anchorRefs", input.anchorRefs);
  assertUnique("anchorRefs", input.anchorRefs);
  assertStringList("factorObservations", input.factorObservations);
  assertUnique("factorObservations", input.factorObservations);
  for (const candidateId of input.currentCandidateIds) {
    assertSha256("currentCandidateIds", candidateId);
  }
  assertUnique("currentCandidateIds", input.currentCandidateIds);
  assertStringList("details", input.details);
  for (const detail of input.details) assertNeutralText("details", detail);

  const body = {
    schemaVersion: DISCOVERY_AUDIT_SCHEMA_VERSION,
    status: input.status,
    reasonCode: input.reasonCode,
    inputHash: input.inputHash,
    normalizationVersion: input.normalizationVersion,
    cutoffBarId: input.cutoffBarId,
    evaluationSequence: input.evaluationSequence,
    candidateId: input.candidateId,
    anchorRefs: [...input.anchorRefs].sort(),
    factorObservations: [...input.factorObservations].sort(),
    currentCandidateIds: [...input.currentCandidateIds].sort(),
    details: [...input.details],
  } as const;
  const auditContentHash = canonicalHash(body);
  return deepFreeze({ ...body, auditContentHash, auditHash: auditContentHash });
}

export function assertDiscoveryCandidateIntegrityV1(
  candidate: DiscoveryCandidateV1,
): void {
  const recreated = createDiscoveryCandidateV1({
    sourceId: candidate.sourceId,
    instrumentId: candidate.instrumentId,
    barDurationSeconds: candidate.barDurationSeconds,
    evaluationCutoffBarId: candidate.evaluationCutoffBarId,
    effectiveBarSequence: candidate.effectiveBarSequence,
    contextState: candidate.contextState,
    volumeState: candidate.volumeState,
    primaryEventType: candidate.primaryEventType,
    secondaryEventTypes: candidate.secondaryEventTypes,
    contextEnhancers: candidate.contextEnhancers,
    observedPolarity: candidate.observedPolarity,
    anchorIds: candidate.anchorIds,
    canonicalAnchorGroupId: candidate.canonicalAnchorGroupId,
    eventFamily: candidate.eventFamily,
    evidenceRefs: candidate.evidenceRefs,
    reasonText: candidate.reasonText,
    compressionBasis: candidate.compressionBasis,
    normalizationVersion: candidate.normalizationVersion,
    candidateRevision: candidate.candidateRevision,
    predecessorEventFingerprint: candidate.predecessorEventFingerprint,
    activityBucket: candidate.priorityTuple.activityBucket,
    contextSupportBucket: candidate.priorityTuple.contextSupportBucket,
    eventStagePriority: candidate.priorityTuple.eventStagePriority,
  });
  if (candidate.candidateHash !== recreated.candidateHash) {
    throw new DiscoveryFactorContractError(
      "candidate content does not match its candidateHash",
    );
  }
  if (canonicalHash(candidateBody(candidate)) !== candidate.candidateHash) {
    throw new DiscoveryFactorContractError(
      "candidate content does not match its candidateHash",
    );
  }
}

export function assertDiscoveryAuditIntegrityV1(
  audit: DiscoveryAuditResultV1,
): void {
  const recreated = createDiscoveryAuditResultV1({
    status: audit.status,
    reasonCode: audit.reasonCode,
    inputHash: audit.inputHash,
    normalizationVersion: audit.normalizationVersion,
    cutoffBarId: audit.cutoffBarId,
    evaluationSequence: audit.evaluationSequence,
    candidateId: audit.candidateId,
    anchorRefs: audit.anchorRefs,
    factorObservations: audit.factorObservations,
    currentCandidateIds: audit.currentCandidateIds,
    details: audit.details,
  });
  if (
    audit.auditContentHash !== recreated.auditContentHash ||
    audit.auditHash !== recreated.auditHash ||
    canonicalHash(auditBody(audit)) !== audit.auditContentHash
  ) {
    throw new DiscoveryFactorContractError(
      "audit content does not match its auditHash",
    );
  }
}

export function compareDiscoveryPriorityTupleV1(
  left: DiscoveryPriorityTupleV1,
  right: DiscoveryPriorityTupleV1,
): number {
  return comparePriority(left.eventStagePriority, right.eventStagePriority, [
    "semantic_escalation",
    "fresh_core_event",
  ])
    || compareNumber(right.structuralSpecificity, left.structuralSpecificity)
    || comparePriority(left.contextSupportBucket, right.contextSupportBucket, [
      "multiple_independent_contexts",
      "single_context",
      "no_context",
    ])
    || comparePriority(left.activityBucket, right.activityBucket, [
      "expanded",
      "typical",
      "contracted",
      "unavailable",
    ])
    || left.tieBreaker.localeCompare(right.tieBreaker);
}

function candidateBody(candidate: DiscoveryCandidateV1): Omit<DiscoveryCandidateV1, "candidateHash"> {
  const { candidateHash: _candidateHash, ...body } = candidate;
  void _candidateHash;
  return body;
}

function auditBody(audit: DiscoveryAuditResultV1): Omit<DiscoveryAuditResultV1, "auditContentHash" | "auditHash"> {
  const { auditContentHash: _auditContentHash, auditHash: _auditHash, ...body } = audit;
  void _auditContentHash;
  void _auditHash;
  return body;
}

function assertCandidateInput(input: CreateDiscoveryCandidateInputV1): void {
  assertNonEmpty("sourceId", input.sourceId);
  assertNonEmpty("instrumentId", input.instrumentId);
  if (input.barDurationSeconds !== DISCOVERY_PRIMARY_BAR_DURATION_SECONDS_V1) {
    throw new DiscoveryFactorContractError(
      "barDurationSeconds must equal 300 for Discovery V1",
    );
  }
  assertNonEmpty("evaluationCutoffBarId", input.evaluationCutoffBarId);
  assertNonNegativeInteger("effectiveBarSequence", input.effectiveBarSequence);
  assertOneOf("contextState", input.contextState, ["left_censored", "normal"] as const);
  assertOneOf("volumeState", input.volumeState, ["valid", "unavailable"] as const);
  assertCoreEventType(input.primaryEventType);
  assertCoreEventTypes("secondaryEventTypes", input.secondaryEventTypes);
  if (input.secondaryEventTypes.includes(input.primaryEventType)) {
    throw new DiscoveryFactorContractError(
      "secondaryEventTypes must not contain primaryEventType",
    );
  }
  assertContextEnhancers(input.contextEnhancers);
  assertObservedPolarity(input.observedPolarity);
  assertStringList("anchorIds", input.anchorIds, { min: 1 });
  assertUnique("anchorIds", input.anchorIds);
  assertNonEmpty("canonicalAnchorGroupId", input.canonicalAnchorGroupId);
  assertOneOf("eventFamily", input.eventFamily, [
    "range_boundary_lifecycle",
    "structure_return",
  ] as const);
  assertStringList("evidenceRefs", input.evidenceRefs, { min: 1 });
  assertUnique("evidenceRefs", input.evidenceRefs);
  assertNeutralText("reasonText", input.reasonText);
  assertStringList("compressionBasis", input.compressionBasis);
  for (const basis of input.compressionBasis) assertNeutralText("compressionBasis", basis);
  assertNonEmpty("normalizationVersion", input.normalizationVersion);
  assertPositiveInteger("candidateRevision", input.candidateRevision);
  if (input.predecessorEventFingerprint !== null) {
    assertSha256("predecessorEventFingerprint", input.predecessorEventFingerprint);
  }
  assertOneOf("activityBucket", input.activityBucket, [
    "expanded",
    "typical",
    "contracted",
    "unavailable",
  ] as const);
  assertOneOf("contextSupportBucket", input.contextSupportBucket, [
    "multiple_independent_contexts",
    "single_context",
    "no_context",
  ] as const);
  assertOneOf("eventStagePriority", input.eventStagePriority, [
    "semantic_escalation",
    "fresh_core_event",
  ] as const);
}

function assertEventFingerprintInput(
  input: DiscoveryEventFingerprintInputV1,
): void {
  assertNonEmpty("instrumentId", input.instrumentId);
  assertCoreEventType(input.primaryEventType);
  assertStringList("anchorIds", input.anchorIds, { min: 1 });
  assertUnique("anchorIds", input.anchorIds);
  assertNonEmpty("effectiveBarId", input.effectiveBarId);
  assertObservedPolarity(input.observedPolarity);
  assertNonEmpty("normalizationVersion", input.normalizationVersion);
}

function assertCoreEventType(value: DiscoveryCoreEventTypeV1): void {
  assertOneOf("coreEventType", value, DISCOVERY_CORE_EVENT_TYPES_V1);
}

function assertCoreEventTypes(
  name: string,
  values: readonly DiscoveryCoreEventTypeV1[],
): void {
  assertUnique(name, values);
  for (const value of values) assertCoreEventType(value);
}

function assertContextEnhancers(values: readonly DiscoveryContextEnhancerV1[]): void {
  assertUnique("contextEnhancers", values);
  for (const value of values) {
    assertOneOf("contextEnhancer", value, DISCOVERY_CONTEXT_ENHANCERS_V1);
  }
}

function assertObservedPolarity(value: DiscoveryObservedPolarityV1): void {
  assertOneOf("observedPolarity", value, ["upward", "downward", "neutral"] as const);
}

function assertAuditReasonCode(value: DiscoveryAuditReasonCodeV1): void {
  assertOneOf("reasonCode", value, [
    "candidate_emitted",
    "no_trigger",
    "no_applicable_anchor",
    "suppressed_cooldown",
    "deferred_budget",
    "expired_before_admission",
    "insufficient_history",
    "bar_not_closed",
    "invalid_ohlc",
    "sequence_conflict",
    "missing_continuity",
    "ambiguous_anchor",
    "same_bar_ambiguity",
    "unknown_state",
  ] as const);
}

function assertStatusReasonPair(
  status: DiscoveryAuditStatusV1,
  reasonCode: DiscoveryAuditReasonCodeV1,
): void {
  const allowedByStatus: Record<DiscoveryAuditStatusV1, readonly DiscoveryAuditReasonCodeV1[]> = {
    candidate_emitted: ["candidate_emitted"],
    no_trigger: ["no_trigger"],
    no_applicable_anchor: ["no_applicable_anchor"],
    suppressed_cooldown: ["suppressed_cooldown"],
    deferred_budget: ["deferred_budget"],
    expired_before_admission: ["expired_before_admission"],
    rejected_data_quality: [
      "insufficient_history",
      "bar_not_closed",
      "invalid_ohlc",
      "sequence_conflict",
      "missing_continuity",
      "unknown_state",
    ],
    rejected_ambiguity: ["ambiguous_anchor", "same_bar_ambiguity"],
  };
  if (!allowedByStatus[status].includes(reasonCode)) {
    throw new DiscoveryFactorContractError(
      "audit status and reasonCode are incompatible",
    );
  }
}

function assertNeutralText(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (
    /\b(long|short|buy|sell|entry|stop|target)\b|trade-ready|high probability|confirmed setup|pa-approved|execution-worthy|bullish confirmation|bearish confirmation|probability/i.test(
      value,
    )
  ) {
    throw new DiscoveryFactorContractError(
      `${name} contains forbidden trade-authority language`,
    );
  }
}

function structuralSpecificity(value: DiscoveryCoreEventTypeV1): number {
  const rank = DISCOVERY_PRIMARY_EVENT_PRIORITY_V1.indexOf(value);
  return DISCOVERY_PRIMARY_EVENT_PRIORITY_V1.length - rank;
}

function comparePriority<T extends string>(left: T, right: T, order: readonly T[]): number {
  return compareNumber(order.indexOf(left), order.indexOf(right));
}

function compareNumber(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertNonNegativeInteger(name: string, value: number): void {
  assertFiniteNumber(name, value);
  if (!Number.isInteger(value) || value < 0) {
    throw new DiscoveryFactorContractError(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(name: string, value: number): void {
  assertFiniteNumber(name, value);
  if (!Number.isInteger(value) || value <= 0) {
    throw new DiscoveryFactorContractError(`${name} must be a positive integer`);
  }
}
