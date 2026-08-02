import {
  createDoctrineUnit,
  type DoctrineUnitV1,
} from "../../src/doctrine-v1.ts";
import type {
  BrooksDecisionInputV1,
  BrooksDecisionValidationContextV1,
} from "../../src/brooks-decision-v1.ts";

const doctrineConcepts = [
  "context",
  "setup",
  "signal",
  "trigger",
  "risk",
  "holding",
] as const;

export const retrievedDoctrine: readonly DoctrineUnitV1[] = doctrineConcepts.map(
  (concept) =>
    createDoctrineUnit({
      doctrineId: `D-${concept}`,
      sourceId: "source:fixture",
      concept,
      rule: `Fixture rule for ${concept}.`,
      appliesWhen: [`${concept} applies.`],
      avoidWhen: [`${concept} does not apply.`],
      decisionEffect: [`${concept} affects the decision.`],
      status: "approved",
    }),
);

const visibleBars = [
  { barId: "bar:117", open: 104, high: 112, low: 99, close: 105 },
  { barId: "bar:118", open: 103, high: 104, low: 101, close: 102 },
  { barId: "bar:119", open: 102, high: 103, low: 100.5, close: 102.5 },
] as const;

const evidence = [
  ["e-context", ["bar:117", "bar:118", "bar:119"]],
  ["e-pressure", ["bar:118", "bar:119"]],
  ["e-setup", ["bar:117", "bar:119"]],
  ["e-signal", ["bar:119"]],
  ["e-trigger", ["bar:119"]],
  ["e-entry", ["bar:119"]],
  ["e-protection", ["bar:119"]],
  ["e-invalidation", ["bar:118", "bar:119"]],
  ["e-objective", ["bar:117"]],
  ["e-verdict", ["bar:117", "bar:119"]],
  ["e-short", ["bar:118", "bar:119"]],
] as const;

const claimDefinitions = [
  ["claim-context", "broad_context_trend", "e-context", "D-context"],
  ["claim-pressure", "buying_pressure_present", "e-pressure", "D-context"],
  ["claim-setup", "long_setup_confirmed", "e-setup", "D-setup"],
  ["claim-signal", "long_signal_confirmed", "e-signal", "D-signal"],
  ["claim-trigger", "long_trigger_pending", "e-trigger", "D-trigger"],
  ["claim-entry", "long_entry_defined", "e-entry", "D-trigger"],
  ["claim-protection", "long_protection_defined", "e-protection", "D-risk"],
  ["claim-invalidation", "long_invalidation_defined", "e-invalidation", "D-risk"],
  ["claim-objective", "long_objective_defined", "e-objective", "D-holding"],
  ["claim-verdict", "long_trade_permitted", "e-verdict", "D-setup"],
  ["claim-short", "short_case_absent", "e-short", "D-context"],
] as const;

export function makeValidLongDecision(
  holdingIntent: "scalp" | "swing" = "swing",
): BrooksDecisionInputV1 {
  return {
    decisionId: "decision:fixture-long",
    caseId: "case:fixture",
    inputHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastVisibleBarId: "bar:119",
    barDurationSeconds: 300,
    verdict: "long",
    evidenceBalance: "favors_long",
    broadContext: {
      marketState: "trend",
      trendDirection: "bull",
      claimIds: ["claim-context"],
    },
    currentLeg: {
      direction: "up",
      claimIds: ["claim-context"],
    },
    alwaysIn: {
      state: "long",
      claimIds: ["claim-context"],
    },
    pressure: {
      buying: { state: "present", claimIds: ["claim-pressure"] },
      selling: { state: "absent", claimIds: ["claim-short"] },
      balance: "favors_long",
    },
    breakoutLifecycle: {
      state: "none",
      direction: "none",
      structureId: null,
      claimIds: ["claim-context"],
    },
    reversalLifecycle: {
      state: "none",
      fromDirection: "none",
      toDirection: "none",
      claimIds: ["claim-context"],
    },
    structures: [
      {
        structureId: "structure:support",
        kind: "prior_low",
        anchors: [
          {
            barId: "bar:119",
            field: "low",
            normalizedReferencePrice: 100.5,
          },
        ],
        claimIds: ["claim-protection"],
      },
      {
        structureId: "structure:target",
        kind: "prior_high",
        anchors: [
          {
            barId: "bar:117",
            field: "high",
            normalizedReferencePrice: 112,
          },
        ],
        claimIds: ["claim-objective"],
      },
    ],
    magnets: [
      {
        magnetId: "magnet:target",
        structureId: "structure:target",
        side: "above",
        relevance: "primary",
        claimIds: ["claim-objective"],
      },
    ],
    marketEvidence: evidence.map(([evidenceId, barIds]) => ({
      evidenceId,
      barIds: [...barIds],
      observedFields: ["relationship"],
      observationCode: evidenceId,
    })),
    claims: claimDefinitions.map(
      ([claimId, statementCode, marketEvidenceId, doctrineId]) => ({
        claimId,
        statementCode,
        marketEvidenceIds: [marketEvidenceId],
        doctrineIds: [doctrineId],
      }),
    ),
    longCase: {
      direction: "long",
      state: "actionable",
      evidenceBalance: "favors_long",
      setupCandidates: [
        {
          setupId: "setup:long-primary",
          doctrineId: "D-setup",
          state: "confirmed",
          role: "primary",
          claimIds: ["claim-setup"],
        },
      ],
      signalBasis: {
        kind: "discrete_bar",
        state: "confirmed",
        signalBarIds: ["bar:119"],
        doctrineIds: ["D-signal"],
        claimIds: ["claim-signal"],
      },
      triggerState: "pending",
      claimIds: ["claim-setup", "claim-signal", "claim-trigger"],
    },
    shortCase: {
      direction: "short",
      state: "absent",
      evidenceBalance: "insufficient",
      setupCandidates: [],
      signalBasis: {
        kind: "discrete_bar",
        state: "absent",
        signalBarIds: [],
        doctrineIds: [],
        claimIds: ["claim-short"],
      },
      triggerState: "not_applicable",
      claimIds: ["claim-short"],
    },
    tradePlan: {
      direction: "long",
      setupId: "setup:long-primary",
      entry: {
        entryType: "stop",
        relation: "break_above",
        anchor: {
          barId: "bar:119",
          field: "high",
          normalizedReferencePrice: 103,
        },
        validAfterBarId: "bar:119",
        validForClosedBars: 1,
        claimIds: ["claim-entry"],
      },
      entryCancellation: {
        conditionCode: "close_below_signal_low",
        anchor: {
          barId: "bar:119",
          field: "low",
          normalizedReferencePrice: 100.5,
        },
        claimIds: ["claim-invalidation"],
      },
      premiseInvalidation: {
        conditionCode: "long_premise_invalid",
        anchor: {
          barId: "bar:119",
          field: "low",
          normalizedReferencePrice: 100.5,
        },
        claimIds: ["claim-invalidation"],
      },
      protection: {
        relation: "below",
        anchor: {
          barId: "bar:119",
          field: "low",
          normalizedReferencePrice: 100.5,
        },
        claimIds: ["claim-protection"],
      },
      holdingIntent,
      objective: {
        magnetId: "magnet:target",
        claimIds: ["claim-objective"],
      },
      claimIds: [
        "claim-entry",
        "claim-protection",
        "claim-invalidation",
        "claim-objective",
        "claim-verdict",
      ],
    },
    noTrade: null,
    uncertainty: null,
    humanSummary: "A confirmed long setup has a pending stop entry and a structural objective.",
  };
}

export function makeValidationContext(
  overrides: Partial<BrooksDecisionValidationContextV1> = {},
): BrooksDecisionValidationContextV1 {
  return {
    visibleBars: [...visibleBars],
    retrievedDoctrine,
    plannedGeometry: {
      entryNormalizedPrice: 103.1,
      protectionNormalizedPrice: 100.4,
      objectiveNormalizedPrice: 112,
    },
    ...overrides,
  };
}
