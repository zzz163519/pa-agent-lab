import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBrooksMultiTimeframeCaseV1,
  createBrooksMultiTimeframePolicyInputV1,
  createBrooksMultiTimeframeSourceProfileV1,
  createAnonymousMultiTimeframeMarketInputV1,
  type BrooksMultiTimeframePolicyInputV1,
  type LocalMultiTimeframeBarV1,
} from "../../contracts/src/brooks-multi-timeframe-input-v1.ts";
import type { BrooksDecisionInputV1 } from "../../contracts/src/brooks-decision-v1.ts";
import type { BrooksIdentityFreeResponseV2 } from "../../contracts/src/brooks-identity-free-response-v2.ts";
import type {
  BrooksMultiTimeframeEvidenceReferenceV1,
  BrooksMultiTimeframeIdentityFreeResponseV1,
} from "../../contracts/src/brooks-multi-timeframe-response-v1.ts";
import {
  makeValidLongDecision,
  makeValidNoTradeDecision,
  retrievedDoctrine,
} from "../../contracts/test/fixtures/brooks-decision-v1.fixture.ts";
import {
  parseBrooksMultiTimeframeResponseJsonV1,
  validateOfflineBrooksMultiTimeframeResponseV1,
} from "../src/brooks-multi-timeframe-response-validation-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;
const CUTOFF = 2_000_000_000_000;
const FIVE_MINUTES_MS = 300_000;

function makeProfile() {
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
  profileHash: `sha256:${string}`,
): LocalMultiTimeframeBarV1[] {
  const duration =
    timeframe === "5m" ? FIVE_MINUTES_MS : timeframe === "60m" ? 3_600_000 : 86_400_000;
  const firstStart = CUTOFF - count * duration;
  return Array.from({ length: count }, (_, index) => {
    const fixture =
      timeframe === "5m" && index === 117
        ? { open: 104, high: 112, low: 99, close: 105 }
        : timeframe === "5m" && index === 118
          ? { open: 103, high: 104, low: 101, close: 102 }
          : timeframe === "5m" && index === 119
            ? { open: 102, high: 103, low: 100.5, close: 102.5 }
            : timeframe !== "5m" && index === count - 1
              ? { open: 100, high: 106, low: 98, close: 104 }
              : { open: 100, high: 101, low: 99, close: 100 };
    return {
      sourceBarId: `source-bar:${timeframe}:${index}`,
      sequence: index,
      timeframe,
      lifecycle: "finalized",
      periodStartEpochMs: firstStart + index * duration,
      periodEndEpochMs: firstStart + (index + 1) * duration,
      snapshotCutoffEpochMs: CUTOFF,
      ...fixture,
      continuityFromPrevious:
        index === 0 ? "unknown_left_boundary" : "contiguous",
      progress: null,
      sourceContentHash: sha(((index % 9) + 1).toString()),
      sourceProfileHash: profileHash,
      alignmentId:
        timeframe === "5m"
          ? "alignment:5m:epoch"
          : timeframe === "60m"
            ? "alignment:60m:epoch"
            : "alignment:1d:utc-midnight",
    };
  });
}

function makePolicyInput(options: Readonly<{
  sixtyMinute?: boolean;
  sixtyMinuteCount?: number;
  sixtyMinuteProvisional?: boolean;
  sixtyMinuteGap?: boolean;
  daily?: boolean;
  dailyCount?: number;
  primaryGap?: boolean;
}> = {}): BrooksMultiTimeframePolicyInputV1 {
  const profile = makeProfile();
  const primaryBars = makeBars("5m", 120, profile.profileHash);
  if (options.primaryGap) {
    for (let index = 0; index < 60; index += 1) {
      primaryBars[index] = {
        ...primaryBars[index]!,
        periodStartEpochMs: primaryBars[index]!.periodStartEpochMs - FIVE_MINUTES_MS,
        periodEndEpochMs: primaryBars[index]!.periodEndEpochMs - FIVE_MINUTES_MS,
      };
    }
    primaryBars[60] = {
      ...primaryBars[60]!,
      continuityFromPrevious: "missing_data",
    };
  }
  const reference = (
    timeframe: "60m" | "1d",
    supplied: boolean | undefined,
    count: number,
    provisional = false,
    gap = false,
  ) => {
    if (!supplied) return { availability: "not_supplied" } as const;
    const bars = makeBars(timeframe, count, profile.profileHash);
    if (gap) {
      if (bars.length < 2) throw new Error("gap fixture requires two bars");
      const duration = timeframe === "60m" ? 3_600_000 : 86_400_000;
      bars[0] = {
        ...bars[0]!,
        periodStartEpochMs: bars[0]!.periodStartEpochMs - duration,
        periodEndEpochMs: bars[0]!.periodEndEpochMs - duration,
      };
      bars[1] = {
        ...bars[1]!,
        continuityFromPrevious: "missing_data",
      };
    }
    if (provisional) {
      const duration = timeframe === "60m" ? 3_600_000 : 86_400_000;
      bars[0] = {
        ...bars[0]!,
        lifecycle: "provisional",
        periodStartEpochMs: CUTOFF - duration / 2,
        periodEndEpochMs: CUTOFF + duration / 2,
        open: 100,
        high: 103,
        low: 99,
        close: 102,
        progress: {
          completedBaseIntervals: timeframe === "60m" ? 6 : 144,
          scheduledBaseIntervals: timeframe === "60m" ? 12 : 288,
          progressStatus: "verified",
        },
      };
    }
    return {
      availability: "supplied" as const,
      historyStart: "window_truncated" as const,
      bars,
    };
  };
  const policyCase = createBrooksMultiTimeframeCaseV1({
    caseId: "case:synthetic-mtf-response",
    policyStreamId: "stream:synthetic-mtf-response",
    decisionCutoffEpochMs: CUTOFF,
    sourceProfile: profile,
    primaryBars,
    references: {
      sixtyMinute: reference(
        "60m",
        options.sixtyMinute,
        options.sixtyMinuteCount ?? 1,
        options.sixtyMinuteProvisional,
        options.sixtyMinuteGap,
      ),
      daily: reference(
        "1d",
        options.daily,
        options.dailyCount ?? 1,
      ),
    },
  });
  const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
  const manifest = (
    timeframe: "5m" | "60m" | "1d",
    panel: "context" | "detail",
    barIds: readonly string[],
    digit: string,
  ) => ({
    timeframe,
    panel,
    mediaType: "image/png" as const,
    contentHash: sha(digit),
    barIds: [...barIds],
    lastVisibleBarId: barIds.at(-1) ?? null,
  });
  const primaryIds = market.primary.bars.map((bar) => bar.barId);
  const sixtyIds =
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
        context: manifest("5m", "context", primaryIds, "1"),
        detail: manifest("5m", "detail", primaryIds.slice(-40), "2"),
      },
      references: {
        sixtyMinute: options.sixtyMinute
          ? manifest("60m", "context", sixtyIds, "3")
          : null,
        daily: options.daily ? manifest("1d", "context", dailyIds, "4") : null,
      },
    },
    doctrine: retrievedDoctrine.map((unit) => ({
      doctrineId: unit.doctrineId,
      concept: unit.concept,
      rule: unit.rule,
      appliesWhen: [...unit.appliesWhen],
      avoidWhen: [...unit.avoidWhen],
      decisionEffect: [...unit.decisionEffect],
    })),
  });
}

function transformPrimary(
  full: BrooksDecisionInputV1,
  plannedGeometry: BrooksIdentityFreeResponseV2["plannedGeometry"],
): BrooksIdentityFreeResponseV2 {
  const {
    decisionId: _decisionId,
    caseId: _caseId,
    inputHash: _inputHash,
    lastVisibleBarId: _lastVisibleBarId,
    barDurationSeconds: _barDurationSeconds,
    ...semantic
  } = full;
  return transformBarIds({ ...semantic, plannedGeometry }) as BrooksIdentityFreeResponseV2;
}

function transformBarIds(value: unknown): unknown {
  if (typeof value === "string") {
    const match = /^bar:([0-9]{3})$/.exec(value);
    return match === null ? value : `bar:5m:finalized:${match[1]}`;
  }
  if (Array.isArray(value)) return value.map((item) => transformBarIds(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, transformBarIds(item)]),
    );
  }
  return value;
}

function makeResponse(options: Readonly<{
  trade?: boolean;
  sixtyMinute?: boolean;
  daily?: boolean;
  primaryGap?: boolean;
}> = {}): BrooksMultiTimeframeIdentityFreeResponseV1 {
  const primaryDecision = options.trade
    ? transformPrimary(makeValidLongDecision(), {
        entryNormalizedPrice: 103.1,
        protectionNormalizedPrice: 100.4,
        objectiveNormalizedPrice: 112,
      })
    : transformPrimary(makeValidNoTradeDecision(), null);
  const timeframeEvidence: BrooksMultiTimeframeEvidenceReferenceV1[] =
    primaryDecision.claims.map((claim) => ({
    evidenceId: `timeframe:${claim.claimId}`,
    timeframe: "5m" as const,
    barId: "bar:5m:finalized:119",
    field: "close" as const,
    normalizedValue: 102.5,
    lifecycle: "finalized" as const,
    claimScope: [claim.claimId],
    doctrineClaimReferences: [...claim.doctrineIds],
  }));
  if (options.sixtyMinute) {
    timeframeEvidence.push({
      evidenceId: "timeframe:60m-context",
      timeframe: "60m",
      barId: "bar:60m:finalized:000",
      field: "close",
      normalizedValue: 104,
      lifecycle: "finalized",
      claimScope: [primaryDecision.claims[0]!.claimId],
      doctrineClaimReferences: ["D-context"],
    });
  }
  if (options.daily) {
    timeframeEvidence.push({
      evidenceId: "timeframe:1d-context",
      timeframe: "1d",
      barId: "bar:1d:finalized:000",
      field: "close",
      normalizedValue: 104,
      lifecycle: "finalized",
      claimScope: [primaryDecision.claims[0]!.claimId],
      doctrineClaimReferences: ["D-context"],
    });
  }
  if (options.primaryGap) {
    timeframeEvidence.push({
      evidenceId: "timeframe:5m-gap",
      timeframe: "5m",
      barId: "bar:5m:finalized:060",
      field: "relationship",
      normalizedValue: null,
      lifecycle: "finalized",
      claimScope: ["claim-setup"],
      doctrineClaimReferences: ["D-setup"],
    });
  }
  if (options.trade) {
    timeframeEvidence.push(
      {
        evidenceId: "timeframe:geometry-entry",
        timeframe: "5m",
        barId: "bar:5m:finalized:119",
        field: "high",
        normalizedValue: 103,
        lifecycle: "finalized",
        claimScope: ["claim-entry"],
        doctrineClaimReferences: ["D-trigger"],
      },
      {
        evidenceId: "timeframe:geometry-protection",
        timeframe: "5m",
        barId: "bar:5m:finalized:119",
        field: "low",
        normalizedValue: 100.5,
        lifecycle: "finalized",
        claimScope: ["claim-protection"],
        doctrineClaimReferences: ["D-risk"],
      },
      {
        evidenceId: "timeframe:geometry-objective",
        timeframe: "5m",
        barId: "bar:5m:finalized:117",
        field: "high",
        normalizedValue: 112,
        lifecycle: "finalized",
        claimScope: ["claim-objective"],
        doctrineClaimReferences: ["D-holding"],
      },
    );
  }
  return {
    primaryDecision,
    timeframeEvidence,
    referenceAssessments: {
      sixtyMinute: options.sixtyMinute
        ? {
            timeframe: "60m",
            relationship: "supports",
            summaryCode: "sixty_minute_supports_primary_context",
            evidenceReferences: ["timeframe:60m-context"],
            doctrineClaimReferences: ["D-context"],
          }
        : null,
      daily: options.daily
        ? {
            timeframe: "1d",
            relationship: "no_material_effect",
            summaryCode: "daily_has_no_material_effect",
            evidenceReferences: ["timeframe:1d-context"],
            doctrineClaimReferences: ["D-context"],
          }
        : null,
    },
    gapAssessments: options.primaryGap
      ? [
          {
            gapId: "gap:5m:060",
            timeframe: "5m",
            materiality: "immaterial",
            affectedClaims: ["claim-setup"],
            evidenceReferences: ["timeframe:5m-gap"],
            doctrineClaimReferences: ["D-setup"],
            resolutionCondition: "decision_does_not_depend_on_missing_structure",
          },
        ]
      : [],
    crossTimeframeConflictAssessment: {
      state:
        options.sixtyMinute && options.daily
          ? "no_material_conflict"
          : "not_applicable",
      summaryCode:
        options.sixtyMinute && options.daily
          ? "references_do_not_create_material_conflict"
          : "fewer_than_two_reference_timeframes",
      evidenceReferences:
        options.sixtyMinute && options.daily
          ? ["timeframe:60m-context", "timeframe:1d-context"]
          : [],
      doctrineClaimReferences:
        options.sixtyMinute && options.daily ? ["D-context"] : [],
    },
    geometryAnchors: options.trade
      ? {
          entry: {
            timeframe: "5m",
            barId: "bar:5m:finalized:119",
            field: "high",
            lifecycle: "finalized",
            normalizedValue: 103,
          },
          protection: {
            timeframe: "5m",
            barId: "bar:5m:finalized:119",
            field: "low",
            lifecycle: "finalized",
            normalizedValue: 100.5,
          },
          objective: {
            timeframe: "5m",
            barId: "bar:5m:finalized:117",
            field: "high",
            lifecycle: "finalized",
            normalizedValue: 112,
          },
        }
      : { entry: null, protection: null, objective: null },
  };
}

function validate(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
  policyInput: BrooksMultiTimeframePolicyInputV1,
) {
  return validateOfflineBrooksMultiTimeframeResponseV1({
    json: JSON.stringify(response),
    policyInput,
    binding: {
      decisionId: "decision:synthetic-mtf",
      caseId: "case:synthetic-mtf-response",
      inputHash: policyInput.inputHash,
      lastVisibleBarId: "bar:5m:finalized:119",
      barDurationSeconds: 300,
    },
    retrievedDoctrine,
  });
}

describe("strict offline Brooks multi-timeframe response validation V1", () => {
  it("strictly parses one invented response and freezes every branch", () => {
    const exact = makeResponse({ sixtyMinute: true });
    const parsed = parseBrooksMultiTimeframeResponseJsonV1(JSON.stringify(exact));

    assert.deepEqual(parsed, exact);
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(Object.isFrozen(parsed.primaryDecision), true);
    assert.equal(Object.isFrozen(parsed.timeframeEvidence), true);
  });

  it("rejects syntax ambiguity, duplicate keys, prose, unknown fields, and coercion", () => {
    const exact = makeResponse();
    assert.throws(() => parseBrooksMultiTimeframeResponseJsonV1(""), /empty/i);
    assert.throws(
      () => parseBrooksMultiTimeframeResponseJsonV1('{"primaryDecision":{},}'),
      /invalid JSON syntax/,
    );
    assert.throws(
      () =>
        parseBrooksMultiTimeframeResponseJsonV1(
          '{"primaryDecision":{},"primaryDecision":{}}',
        ),
      /duplicate object key/,
    );
    assert.throws(
      () =>
        parseBrooksMultiTimeframeResponseJsonV1(
          `\`\`\`json\n${JSON.stringify(exact)}\n\`\`\``,
        ),
      /invalid JSON syntax/,
    );
    assert.throws(
      () =>
        parseBrooksMultiTimeframeResponseJsonV1(
          JSON.stringify({ ...exact, timeframeVotes: [] }),
        ),
      /additional properties/i,
    );
    assert.throws(
      () =>
        parseBrooksMultiTimeframeResponseJsonV1(
          JSON.stringify({
            ...exact,
            timeframeEvidence: [
              { ...exact.timeframeEvidence[0], normalizedValue: "102.5" },
            ],
          }),
        ),
      /must be number/i,
    );
  });

  it("validates visible evidence, reference completeness, Doctrine, and conflict evidence", () => {
    const policyInput = makePolicyInput({ sixtyMinute: true, daily: true });
    const result = validate(
      makeResponse({ sixtyMinute: true, daily: true }),
      policyInput,
    );
    assert.equal(result.response.primaryDecision.verdict, "no_trade");
    assert.equal(result.rewardRiskAudit, null);
    assert.match(result.validationResultHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(result), true);

    const missingAssessment = makeResponse();
    assert.throws(() => validate(missingAssessment, policyInput), {
      message: /supplied 60m reference requires an assessment/,
    });

    const absentPolicyInput = makePolicyInput();
    const absentBase = makeResponse();
    const assessmentWithoutInput: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...absentBase,
      referenceAssessments: {
        ...absentBase.referenceAssessments,
        sixtyMinute: {
          timeframe: "60m",
          relationship: "unavailable_for_this_decision",
          summaryCode: "reference_not_available_for_decision",
          evidenceReferences: [],
          doctrineClaimReferences: [],
        },
      },
    };
    assert.throws(
      () => validate(assessmentWithoutInput, absentPolicyInput),
      { message: /absent 60m reference forbids an assessment/ },
    );
  });

  it("rejects nonexistent, wrong-lifecycle, wrong-value, and unknown-Doctrine evidence", () => {
    const policyInput = makePolicyInput({ sixtyMinute: true });
    const base = makeResponse({ sixtyMinute: true });
    const variants = [
      {
        ...base.timeframeEvidence[0]!,
        barId: "bar:5m:finalized:999",
      },
      {
        ...base.timeframeEvidence[0]!,
        barId: "bar:5m:provisional:119",
        lifecycle: "provisional" as const,
      },
      {
        ...base.timeframeEvidence[0]!,
        normalizedValue: 999,
      },
      {
        ...base.timeframeEvidence[0]!,
        doctrineClaimReferences: ["D-unknown"],
      },
    ];
    for (const evidence of variants) {
      assert.throws(() =>
        validate(
          {
            ...base,
            timeframeEvidence: [evidence, ...base.timeframeEvidence.slice(1)],
          },
          policyInput,
        ),
      );
    }
  });

  it("requires one materiality assessment for every visible gap and closes actionable branches", () => {
    const policyInput = makePolicyInput({ primaryGap: true });
    assert.throws(() => validate(makeResponse(), policyInput), {
      message: /missing-data gap requires exactly one assessment/,
    });
    assert.doesNotThrow(() =>
      validate(makeResponse({ primaryGap: true }), policyInput),
    );

    const actionable = makeResponse({ trade: true, primaryGap: true });
    const material: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...actionable,
      gapAssessments: actionable.gapAssessments.map((gap) => ({
        ...gap,
        materiality: "material",
      })),
    };
    assert.throws(() => validate(material, policyInput), {
      message: /material or uncertain primary gap forbids an actionable plan/,
    });
  });

  it("accepts two supplied zero-observation references as unavailable with no applicable conflict", () => {
    const policyInput = makePolicyInput({
      sixtyMinute: true,
      sixtyMinuteCount: 0,
      daily: true,
      dailyCount: 0,
    });
    const base = makeResponse({ sixtyMinute: true, daily: true });
    const response: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...base,
      timeframeEvidence: base.timeframeEvidence.filter(
        (entry) => entry.timeframe === "5m",
      ),
      referenceAssessments: {
        sixtyMinute: {
          timeframe: "60m",
          relationship: "unavailable_for_this_decision",
          summaryCode: "no_visible_sixty_minute_observation",
          evidenceReferences: [],
          doctrineClaimReferences: [],
        },
        daily: {
          timeframe: "1d",
          relationship: "unavailable_for_this_decision",
          summaryCode: "no_visible_daily_observation",
          evidenceReferences: [],
          doctrineClaimReferences: [],
        },
      },
      crossTimeframeConflictAssessment: {
        state: "not_applicable",
        summaryCode: "fewer_than_two_evidence_bearing_references",
        evidenceReferences: [],
        doctrineClaimReferences: [],
      },
    };
    assert.doesNotThrow(() => validate(response, policyInput));

    assert.throws(
      () =>
        validate(
          {
            ...response,
            crossTimeframeConflictAssessment: {
              ...response.crossTimeframeConflictAssessment,
              evidenceReferences: ["timeframe:missing"],
            },
          },
          policyInput,
        ),
      { message: /references unknown evidence: timeframe:missing/ },
    );
    assert.throws(
      () =>
        validate(
          {
            ...response,
            crossTimeframeConflictAssessment: {
              ...response.crossTimeframeConflictAssessment,
              doctrineClaimReferences: ["D-unknown"],
            },
          },
          policyInput,
        ),
      { message: /conflict Doctrine references unknown ID: D-unknown/ },
    );
  });

  it("forbids an actionable plan from retaining claims affected by any reference gap materiality", () => {
    const policyInput = makePolicyInput({
      sixtyMinute: true,
      sixtyMinuteCount: 2,
      sixtyMinuteGap: true,
    });
    const base = makeResponse({ trade: true, sixtyMinute: true });
    for (const materiality of ["material", "uncertain"] as const) {
      const response: BrooksMultiTimeframeIdentityFreeResponseV1 = {
        ...base,
        timeframeEvidence: [
          ...base.timeframeEvidence.map((entry) =>
            entry.evidenceId === "timeframe:60m-context"
              ? {
                  ...entry,
                  barId: "bar:60m:finalized:001",
                }
              : entry,
          ),
          {
            evidenceId: "timeframe:60m-gap",
            timeframe: "60m",
            barId: "bar:60m:finalized:001",
            field: "relationship",
            normalizedValue: null,
            lifecycle: "finalized",
            claimScope: ["claim-entry"],
            doctrineClaimReferences: ["D-trigger"],
          },
        ],
        gapAssessments: [
          {
            gapId: "gap:60m:001",
            timeframe: "60m",
            materiality,
            affectedClaims: ["claim-entry"],
            evidenceReferences: ["timeframe:60m-gap"],
            doctrineClaimReferences: ["D-trigger"],
            resolutionCondition: "missing_reference_structure_must_not_drive_entry",
          },
        ],
      };
      assert.throws(() => validate(response, policyInput), {
        message: /actionable plan cannot depend on a reference gap's affected claims/,
      });
    }
  });

  it("validates all four accepted timeframe combinations without a priority or vote rule", () => {
    const combinations = [
      {},
      { sixtyMinute: true },
      { daily: true },
      { sixtyMinute: true, daily: true },
    ] as const;
    for (const options of combinations) {
      const result = validate(makeResponse(options), makePolicyInput(options));
      assert.equal(result.response.primaryDecision.verdict, "no_trade");
    }
  });

  it("accepts an exact cutoff-frozen provisional higher-timeframe anchor and rejects finalized misrepresentation", () => {
    const policyInput = makePolicyInput({
      sixtyMinute: true,
      sixtyMinuteProvisional: true,
    });
    const base = makeResponse({ trade: true, sixtyMinute: true });
    const plan = base.primaryDecision.tradePlan;
    if (plan === null || plan.entry.entryType !== "stop") {
      throw new Error("fixture requires a stop-entry trade plan");
    }
    const response: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...base,
      primaryDecision: {
        ...base.primaryDecision,
        tradePlan: {
          ...plan,
          entry: {
            ...plan.entry,
            anchor: {
              barId: "bar:60m:provisional:000",
              field: "high",
              normalizedReferencePrice: 103,
            },
          },
        },
      },
      timeframeEvidence: base.timeframeEvidence.map((entry) =>
        entry.evidenceId === "timeframe:60m-context"
          ? {
              ...entry,
              barId: "bar:60m:provisional:000",
              lifecycle: "provisional" as const,
              normalizedValue: 102,
            }
          : entry.evidenceId === "timeframe:geometry-entry"
            ? {
                ...entry,
                timeframe: "60m" as const,
                barId: "bar:60m:provisional:000",
                lifecycle: "provisional" as const,
              }
            : entry,
      ),
      geometryAnchors: {
        ...base.geometryAnchors,
        entry: {
          timeframe: "60m",
          barId: "bar:60m:provisional:000",
          field: "high",
          lifecycle: "provisional",
          normalizedValue: 103,
        },
      },
    };
    const result = validate(response, policyInput);
    assert.equal(result.rewardRiskAudit?.passed, true);

    const misrepresented: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...response,
      geometryAnchors: {
        ...response.geometryAnchors,
        entry: {
          ...response.geometryAnchors.entry!,
          barId: "bar:60m:finalized:000",
          lifecycle: "finalized",
        },
      },
    };
    assert.throws(() => validate(misrepresented, policyInput), {
      message: /geometry anchor references a nonexistent visible bar/,
    });
  });

  it("binds frozen geometry to visible bars and delegates accepted Swing geometry", () => {
    const policyInput = makePolicyInput();
    const validTrade = makeResponse({ trade: true });
    const result = validate(validTrade, policyInput);
    assert.equal(result.rewardRiskAudit?.passed, true);
    assert.equal(result.rewardRiskAudit?.minimumRequired, 2);

    const wrongAnchor: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...validTrade,
      geometryAnchors: {
        ...validTrade.geometryAnchors,
        entry: { ...validTrade.geometryAnchors.entry!, normalizedValue: 999 },
      },
    };
    assert.throws(() => validate(wrongAnchor, policyInput), {
      message: /geometry anchor value does not match the visible bar/,
    });

    const invalidStop: BrooksMultiTimeframeIdentityFreeResponseV1 = {
      ...validTrade,
      primaryDecision: {
        ...validTrade.primaryDecision,
        plannedGeometry: {
          ...validTrade.primaryDecision.plannedGeometry!,
          entryNormalizedPrice: 103,
        },
      },
    };
    assert.throws(() => validate(invalidStop, policyInput), {
      message: /long stop entry must be strictly above its visible anchor/,
    });
  });
});
