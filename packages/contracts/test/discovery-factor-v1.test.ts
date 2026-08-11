import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "../src/contract-utils-v1.ts";
import {
  DISCOVERY_COOLDOWN_BARS_V1,
  DISCOVERY_MIN_HISTORY_BARS_V1,
  DISCOVERY_PROVISIONAL_PARAMETERS_V1,
  DISCOVERY_QUANTILE_METHOD_VERSION_V1,
  DISCOVERY_STANDARD_CONTEXT_BARS_V1,
  DISCOVERY_TTL_BARS_V1,
  assertDiscoveryAuditIntegrityV1,
  assertDiscoveryCandidateIntegrityV1,
  calculateDiscoveryR7QuantileV1,
  compareDiscoveryPriorityTupleV1,
  createDiscoveryAuditResultV1,
  createDiscoveryCandidateV1,
  createDiscoveryDedupGroupKeyV1,
  createDiscoveryEventFingerprintV1,
  type CreateDiscoveryCandidateInputV1,
} from "../src/discovery-factor-v1.ts";

const fingerprintInput = {
  instrumentId: "instrument:synthetic-a",
  primaryEventType: "breakout_attempt" as const,
  anchorIds: ["anchor:range-high"],
  effectiveBarId: "bar:119",
  observedPolarity: "upward" as const,
  normalizationVersion: "discovery-normalization.v1",
};

const dedupInput = {
  instrumentId: "instrument:synthetic-a",
  canonicalAnchorGroupId: "anchor-group:range-a",
  observedPolarity: "upward" as const,
  eventFamily: "range_boundary_lifecycle" as const,
  normalizationVersion: "discovery-normalization.v1",
};

const candidateInput: CreateDiscoveryCandidateInputV1 = {
  sourceId: "source:synthetic",
  instrumentId: "instrument:synthetic-a",
  barDurationSeconds: 300,
  evaluationCutoffBarId: "bar:119",
  effectiveBarSequence: 119,
  contextState: "normal",
  volumeState: "valid",
  primaryEventType: "breakout_attempt",
  secondaryEventTypes: ["range_boundary_interaction"],
  contextEnhancers: ["compression_expansion"],
  observedPolarity: "upward",
  anchorIds: ["anchor:range-high"],
  canonicalAnchorGroupId: "anchor-group:range-a",
  eventFamily: "range_boundary_lifecycle",
  evidenceRefs: ["bar:119", "anchor:range-high"],
  reasonText: "Price crossed a prior range boundary on a closed bar.",
  compressionBasis: ["range activity expanded relative to prior closed bars"],
  normalizationVersion: "discovery-normalization.v1",
  candidateRevision: 1,
  predecessorEventFingerprint: null,
  activityBucket: "expanded",
  contextSupportBucket: "single_context",
  eventStagePriority: "fresh_core_event",
};

const auditInput = {
  status: "candidate_emitted" as const,
  reasonCode: "candidate_emitted" as const,
  inputHash: canonicalHash({ fixture: "candidate-emitted" }),
  normalizationVersion: "discovery-normalization.v1",
  cutoffBarId: "bar:119",
  evaluationSequence: 119,
  candidateId: null,
  anchorRefs: ["anchor:range-high"],
  factorObservations: ["breakout_attempt"],
  currentCandidateIds: [],
  details: ["synthetic fixture emitted one candidate"],
};

describe("Discovery Factor V1 contract", () => {
  it("exports the provisional V1 parameter set with deterministic R-7 quantiles", () => {
    assert.equal(DISCOVERY_MIN_HISTORY_BARS_V1, 40);
    assert.equal(DISCOVERY_STANDARD_CONTEXT_BARS_V1, 120);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.referenceWindowObservations, 20);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.parameterStatus, "PROVISIONAL");
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.toleranceMedianRangeMultiple, 0.5);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.movementLookbackObservations, 3);
    assert.deepEqual(DISCOVERY_PROVISIONAL_PARAMETERS_V1.pivotConfirmation, { left: 2, right: 2 });
    assert.deepEqual(DISCOVERY_PROVISIONAL_PARAMETERS_V1.activityBuckets, {
      contractedAtOrBelowQuantile: 0.25,
      typicalBetweenQuantiles: [0.25, 0.75],
      expandedAtOrAboveQuantile: 0.75,
    });
    assert.deepEqual(DISCOVERY_PROVISIONAL_PARAMETERS_V1.locationBuckets, [
      "lower_third",
      "middle_third",
      "upper_third",
    ]);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.ttlBars, DISCOVERY_TTL_BARS_V1);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.cooldownBars, DISCOVERY_COOLDOWN_BARS_V1);
    assert.equal(DISCOVERY_PROVISIONAL_PARAMETERS_V1.quantileMethodVersion, DISCOVERY_QUANTILE_METHOD_VERSION_V1);
    assert.equal(
      calculateDiscoveryR7QuantileV1(Array.from({ length: 20 }, (_, index) => index + 1), 0.25),
      5.75,
    );
    assert.equal(
      calculateDiscoveryR7QuantileV1(Array.from({ length: 20 }, (_, index) => index + 1), 0.75),
      15.25,
    );
  });

  it("separates per-bar event identity from the cross-bar dedup thread", () => {
    const firstEvent = createDiscoveryEventFingerprintV1(fingerprintInput);
    const laterEvent = createDiscoveryEventFingerprintV1({
      ...fingerprintInput,
      effectiveBarId: "bar:120",
    });
    const firstGroup = createDiscoveryDedupGroupKeyV1(dedupInput);
    const laterGroup = createDiscoveryDedupGroupKeyV1(dedupInput);

    assert.notEqual(firstEvent, laterEvent);
    assert.equal(firstGroup, laterGroup);
  });

  it("creates immutable revisions with provisional 3/6 closed-bar lifecycle defaults", () => {
    const first = createDiscoveryCandidateV1(candidateInput);
    const correction = createDiscoveryCandidateV1({
      ...candidateInput,
      candidateRevision: 2,
    });

    assert.equal(first.ttlBars, DISCOVERY_TTL_BARS_V1);
    assert.equal(first.cooldownBars, DISCOVERY_COOLDOWN_BARS_V1);
    assert.equal(first.ttlParameterStatus, "PROVISIONAL_BOOTSTRAP_DEFAULT");
    assert.equal(first.cooldownParameterStatus, "PROVISIONAL_BOOTSTRAP_DEFAULT");
    assert.notEqual(first.ttlParameterStatus, DISCOVERY_PROVISIONAL_PARAMETERS_V1.parameterStatus);
    assert.notEqual(first.cooldownParameterStatus, DISCOVERY_PROVISIONAL_PARAMETERS_V1.parameterStatus);
    assert.equal(first.expiresAfterSequence, 122);
    assert.equal(first.cooldownThroughSequence, 125);
    assert.notEqual(first.candidateId, correction.candidateId);
    assert.equal(first.eventFingerprint, correction.eventFingerprint);
    assert.equal(first.dedupGroupKey, correction.dedupGroupKey);
    assert.ok(Object.isFrozen(first));
    assert.ok(Object.isFrozen(first.anchorIds));
    assertDiscoveryCandidateIntegrityV1(first);
  });

  it("rejects factor reasons that claim directional trade authority", () => {
    assert.throws(
      () =>
        createDiscoveryCandidateV1({
          ...candidateInput,
          primaryEventType: "magnet_proximity",
          secondaryEventTypes: [],
          contextEnhancers: [],
          volumeState: "unavailable",
          reasonText: "High probability long entry at the magnet.",
          activityBucket: "unavailable",
          contextSupportBucket: "no_context",
        }),
      { message: /reasonText contains forbidden trade-authority language/ },
    );
  });

  it("rejects removed context-only event-stage priorities", () => {
    assert.throws(
      () =>
        createDiscoveryCandidateV1({
          ...candidateInput,
          eventStagePriority: "context_only_update",
        } as unknown as CreateDiscoveryCandidateInputV1),
      { message: /eventStagePriority is unsupported: context_only_update/ },
    );
  });

  it("uses deterministic tuple comparison without numeric alpha scores", () => {
    const failed = createDiscoveryCandidateV1({
      ...candidateInput,
      primaryEventType: "failed_breakout_candidate",
      secondaryEventTypes: ["breakout_attempt", "range_boundary_interaction"],
      eventStagePriority: "semantic_escalation",
      predecessorEventFingerprint: createDiscoveryEventFingerprintV1(fingerprintInput),
    });
    const breakout = createDiscoveryCandidateV1(candidateInput);

    assert.equal(
      compareDiscoveryPriorityTupleV1(failed.priorityTuple, breakout.priorityTuple),
      -1,
    );
    assert.equal("score" in failed.priorityTuple, false);
  });

  it("hashes audit results and detects candidate tampering", () => {
    const candidate = createDiscoveryCandidateV1(candidateInput);
    const audit = createDiscoveryAuditResultV1({
      ...auditInput,
      candidateId: candidate.candidateId,
      currentCandidateIds: [candidate.candidateId],
    });
    const tampered = {
      ...candidate,
      reasonText: "Price was changed after hashing.",
    };

    assert.equal(audit.status, "candidate_emitted");
    assert.equal(audit.normalizationVersion, "discovery-normalization.v1");
    assert.equal(audit.evaluationSequence, 119);
    assert.deepEqual(audit.anchorRefs, ["anchor:range-high"]);
    assert.deepEqual(audit.factorObservations, ["breakout_attempt"]);
    assert.equal(audit.auditContentHash, audit.auditHash);
    assert.match(audit.auditHash, /^sha256:[0-9a-f]{64}$/);
    assertDiscoveryAuditIntegrityV1(audit);
    assert.throws(() => assertDiscoveryCandidateIntegrityV1(tampered), {
      message: /candidate content does not match its candidateHash/,
    });
    assert.throws(() => assertDiscoveryAuditIntegrityV1({ ...audit, details: ["changed"] }), {
      message: /audit content does not match its auditHash/,
    });
  });

  it("rejects invalid audit status/reason pairs and directional audit details", () => {
    assert.throws(
      () =>
        createDiscoveryAuditResultV1({
          ...auditInput,
          status: "candidate_emitted",
          reasonCode: "no_trigger",
        }),
      { message: /audit status and reasonCode are incompatible/ },
    );
    assert.throws(
      () =>
        createDiscoveryAuditResultV1({
          ...auditInput,
          details: ["buy the breakout"],
        }),
      { message: /details contains forbidden trade-authority language/ },
    );
  });
});
