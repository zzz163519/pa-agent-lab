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
import {
  resolveApprovedDoctrineReferences,
  type DoctrineUnitV1,
} from "./doctrine-v1.ts";
import { FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS } from "./model-call-schedule-v1.ts";

export const BROOKS_DECISION_SCHEMA_VERSION = "brooks-decision.v1" as const;

export const BROOKS_VERDICTS = [
  "long",
  "short",
  "no_trade",
  "uncertain",
] as const;
export const EVIDENCE_BALANCES = [
  "favors_long",
  "favors_short",
  "balanced",
  "insufficient",
  "conflicting",
] as const;
export const NO_TRADE_REASON_CODES = [
  "no_setup",
  "setup_forming",
  "signal_absent",
  "signal_rejected",
  "poor_location",
  "opposing_pressure",
  "balanced_evidence",
  "breakout_unconfirmed",
  "reversal_unconfirmed",
  "entry_condition_not_permitted",
  "trade_plan_incomplete",
  "doctrine_prohibits_entry",
  "swing_reward_insufficient",
] as const;
export const UNCERTAINTY_REASON_CODES = [
  "insufficient_causal_evidence",
  "missing_data",
  "continuity_unknown",
  "left_censored_context",
  "same_bar_order_unknown",
  "market_structure_conflict",
  "doctrine_evidence_conflict",
  "source_provenance_uncertain",
] as const;

const MARKET_STATES = [
  "trend",
  "trading_range",
  "breakout_mode",
  "transition",
  "uncertain",
] as const;
const TREND_DIRECTIONS = ["bull", "bear", "none", "uncertain"] as const;
const LEG_DIRECTIONS = ["up", "down", "sideways", "uncertain"] as const;
const ALWAYS_IN_STATES = [
  "long",
  "short",
  "not_established",
  "uncertain",
] as const;
const PRESSURE_STATES = ["absent", "present", "dominant", "uncertain"] as const;
const BREAKOUT_STATES = [
  "none",
  "attempt",
  "provisional",
  "confirmed",
  "failed",
  "testing",
  "uncertain",
] as const;
const BREAKOUT_DIRECTIONS = ["up", "down", "both", "none", "uncertain"] as const;
const REVERSAL_STATES = [
  "none",
  "potential",
  "transitioning",
  "confirmed",
  "failed",
  "uncertain",
] as const;
const DIRECTIONAL_CASE_STATES = [
  "absent",
  "forming",
  "actionable",
  "invalidated",
  "uncertain",
] as const;
const SETUP_STATES = [
  "forming",
  "confirmed",
  "invalidated",
  "expired",
  "uncertain",
] as const;
const SIGNAL_KINDS = [
  "discrete_bar",
  "multi_bar_structure",
  "no_separate_signal",
] as const;
const SIGNAL_STATES = [
  "absent",
  "forming",
  "confirmed",
  "rejected",
  "expired",
  "uncertain",
] as const;
const TRIGGER_STATES = [
  "not_applicable",
  "pending",
  "triggered",
  "cancelled",
  "expired",
  "ambiguous",
] as const;
const STRUCTURE_KINDS = [
  "prior_high",
  "prior_low",
  "trading_range_high",
  "trading_range_low",
  "trading_range_midpoint",
  "breakout_point",
  "gap_boundary",
  "trend_channel_boundary",
  "measured_move_structure",
] as const;
const PRICE_FIELDS = ["open", "high", "low", "close"] as const;
const OBSERVED_FIELDS = [...PRICE_FIELDS, "relationship"] as const;
const ENTRY_TYPES = ["stop", "limit", "market_next_event"] as const;
const HOLDING_INTENTS = ["scalp", "swing"] as const;

export type BrooksVerdictV1 = (typeof BROOKS_VERDICTS)[number];
export type EvidenceBalanceV1 = (typeof EVIDENCE_BALANCES)[number];
export type NoTradeReasonCodeV1 = (typeof NO_TRADE_REASON_CODES)[number];
export type UncertaintyReasonCodeV1 =
  (typeof UNCERTAINTY_REASON_CODES)[number];
export type PriceFieldV1 = (typeof PRICE_FIELDS)[number];

export interface NormalizedBarV1 {
  readonly barId: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export interface PriceAnchorV1 {
  readonly barId: string;
  readonly field: PriceFieldV1;
  readonly normalizedReferencePrice: number;
}

export interface MarketEvidenceV1 {
  readonly evidenceId: string;
  readonly barIds: readonly string[];
  readonly observedFields: readonly (typeof OBSERVED_FIELDS)[number][];
  readonly observationCode: string;
}

export interface DecisionClaimV1 {
  readonly claimId: string;
  readonly statementCode: string;
  readonly marketEvidenceIds: readonly string[];
  readonly doctrineIds: readonly string[];
}

export interface BroadContextV1 {
  readonly marketState: (typeof MARKET_STATES)[number];
  readonly trendDirection: (typeof TREND_DIRECTIONS)[number];
  readonly claimIds: readonly string[];
}

export interface CurrentLegV1 {
  readonly direction: (typeof LEG_DIRECTIONS)[number];
  readonly claimIds: readonly string[];
}

export interface AlwaysInV1 {
  readonly state: (typeof ALWAYS_IN_STATES)[number];
  readonly claimIds: readonly string[];
}

export interface PressureSideV1 {
  readonly state: (typeof PRESSURE_STATES)[number];
  readonly claimIds: readonly string[];
}

export interface PressureAssessmentV1 {
  readonly buying: PressureSideV1;
  readonly selling: PressureSideV1;
  readonly balance: EvidenceBalanceV1;
}

export interface BreakoutLifecycleV1 {
  readonly state: (typeof BREAKOUT_STATES)[number];
  readonly direction: (typeof BREAKOUT_DIRECTIONS)[number];
  readonly structureId: string | null;
  readonly claimIds: readonly string[];
}

export interface ReversalLifecycleV1 {
  readonly state: (typeof REVERSAL_STATES)[number];
  readonly fromDirection: (typeof TREND_DIRECTIONS)[number];
  readonly toDirection: (typeof TREND_DIRECTIONS)[number];
  readonly claimIds: readonly string[];
}

export interface MarketStructureV1 {
  readonly structureId: string;
  readonly kind: (typeof STRUCTURE_KINDS)[number];
  readonly anchors: readonly PriceAnchorV1[];
  readonly claimIds: readonly string[];
}

export interface MagnetV1 {
  readonly magnetId: string;
  readonly structureId: string;
  readonly side: "above" | "below";
  readonly relevance: "primary" | "secondary";
  readonly claimIds: readonly string[];
}

export interface SetupCandidateV1 {
  readonly setupId: string;
  readonly doctrineId: string;
  readonly state: (typeof SETUP_STATES)[number];
  readonly role: "primary" | "confluence";
  readonly claimIds: readonly string[];
}

export interface SignalBasisV1 {
  readonly kind: (typeof SIGNAL_KINDS)[number];
  readonly state: (typeof SIGNAL_STATES)[number];
  readonly signalBarIds: readonly string[];
  readonly doctrineIds: readonly string[];
  readonly claimIds: readonly string[];
}

export interface DirectionalCaseV1 {
  readonly direction: "long" | "short";
  readonly state: (typeof DIRECTIONAL_CASE_STATES)[number];
  readonly evidenceBalance: EvidenceBalanceV1;
  readonly setupCandidates: readonly SetupCandidateV1[];
  readonly signalBasis: SignalBasisV1;
  readonly triggerState: (typeof TRIGGER_STATES)[number];
  readonly claimIds: readonly string[];
}

interface EntryBaseV1 {
  readonly validAfterBarId: string;
  readonly validForClosedBars: 1;
  readonly claimIds: readonly string[];
}

export interface StopEntryV1 extends EntryBaseV1 {
  readonly entryType: "stop";
  readonly relation: "break_above" | "break_below";
  readonly anchor: PriceAnchorV1;
}

export interface LimitEntryV1 extends EntryBaseV1 {
  readonly entryType: "limit";
  readonly relation: "pullback_to";
  readonly structureId: string;
}

export interface MarketNextEventEntryV1 extends EntryBaseV1 {
  readonly entryType: "market_next_event";
}

export type EntryPlanV1 = StopEntryV1 | LimitEntryV1 | MarketNextEventEntryV1;

export interface StructuralConditionV1 {
  readonly conditionCode: string;
  readonly anchor: PriceAnchorV1;
  readonly claimIds: readonly string[];
}

export interface ProtectionV1 {
  readonly relation: "below" | "above";
  readonly anchor: PriceAnchorV1;
  readonly claimIds: readonly string[];
}

export interface TradeObjectiveV1 {
  readonly magnetId: string;
  readonly claimIds: readonly string[];
}

export interface TradePlanV1 {
  readonly direction: "long" | "short";
  readonly setupId: string;
  readonly entry: EntryPlanV1;
  readonly entryCancellation: StructuralConditionV1;
  readonly premiseInvalidation: StructuralConditionV1;
  readonly protection: ProtectionV1;
  readonly holdingIntent: (typeof HOLDING_INTENTS)[number];
  readonly objective: TradeObjectiveV1;
  readonly claimIds: readonly string[];
}

export interface NoTradeDecisionV1 {
  readonly reasonCodes: readonly NoTradeReasonCodeV1[];
  readonly claimIds: readonly string[];
  readonly nextObservableCondition: string;
}

export interface UncertainDecisionV1 {
  readonly reasonCodes: readonly UncertaintyReasonCodeV1[];
  readonly conflictingClaimIds: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly resolutionCondition: string;
}

export interface BrooksDecisionInputV1 {
  readonly decisionId: string;
  readonly caseId: string;
  readonly inputHash: ContractSha256;
  readonly lastVisibleBarId: string;
  readonly barDurationSeconds: number;
  readonly verdict: BrooksVerdictV1;
  readonly evidenceBalance: EvidenceBalanceV1;
  readonly broadContext: BroadContextV1;
  readonly currentLeg: CurrentLegV1;
  readonly alwaysIn: AlwaysInV1;
  readonly pressure: PressureAssessmentV1;
  readonly breakoutLifecycle: BreakoutLifecycleV1;
  readonly reversalLifecycle: ReversalLifecycleV1;
  readonly structures: readonly MarketStructureV1[];
  readonly magnets: readonly MagnetV1[];
  readonly marketEvidence: readonly MarketEvidenceV1[];
  readonly claims: readonly DecisionClaimV1[];
  readonly longCase: DirectionalCaseV1;
  readonly shortCase: DirectionalCaseV1;
  readonly tradePlan: TradePlanV1 | null;
  readonly noTrade: NoTradeDecisionV1 | null;
  readonly uncertainty: UncertainDecisionV1 | null;
  readonly humanSummary: string | null;
}

export interface BrooksDecisionV1 extends BrooksDecisionInputV1 {
  readonly schemaVersion: typeof BROOKS_DECISION_SCHEMA_VERSION;
  readonly decisionHash: ContractSha256;
}

export interface BrooksDecisionPersistenceBindingV1 {
  readonly caseId: string;
  readonly inputHash: ContractSha256;
  readonly lastVisibleBarId: string;
  readonly barDurationSeconds: number;
}

export interface PlannedTradeGeometryV1 {
  readonly entryNormalizedPrice: number;
  readonly protectionNormalizedPrice: number;
  readonly objectiveNormalizedPrice: number;
}

export interface BrooksDecisionValidationContextV1 {
  readonly visibleBars: readonly NormalizedBarV1[];
  readonly retrievedDoctrine: readonly DoctrineUnitV1[];
  readonly plannedGeometry: PlannedTradeGeometryV1 | null;
}

export interface RewardRiskAuditV1 {
  readonly ratio: number;
  readonly minimumRequired: 2 | null;
  readonly passed: true;
}

export interface ValidatedBrooksDecisionV1 {
  readonly decision: Readonly<BrooksDecisionV1>;
  readonly rewardRiskAudit: Readonly<RewardRiskAuditV1> | null;
}

export class BrooksDecisionContractError extends Error {
  override readonly name = "BrooksDecisionContractError";
}

export function createBrooksDecision(
  input: BrooksDecisionInputV1,
  context: BrooksDecisionValidationContextV1,
): Readonly<ValidatedBrooksDecisionV1> {
  try {
    assertNoForbiddenProbabilityFields(input);
    validateIdentity(input, context);
    const validation = validateEvidenceAndSemantics(input, context);
    const rewardRiskAudit = validateVerdictAndTradePlan(
      input,
      context,
      validation,
    );
    validateHumanSummary(input.humanSummary);

    const decisionData = structuredClone({
      schemaVersion: BROOKS_DECISION_SCHEMA_VERSION,
      ...input,
    });
    const decisionHash = canonicalHash(decisionData);
    const decision = deepFreeze({ ...decisionData, decisionHash });

    return deepFreeze({ decision, rewardRiskAudit });
  } catch (error) {
    throw asBrooksDecisionError(error);
  }
}

interface ValidationMaps {
  readonly barsById: ReadonlyMap<string, NormalizedBarV1>;
  readonly claimsById: ReadonlyMap<string, DecisionClaimV1>;
  readonly structuresById: ReadonlyMap<string, MarketStructureV1>;
  readonly magnetsById: ReadonlyMap<string, MagnetV1>;
}

function validateIdentity(
  input: BrooksDecisionInputV1,
  context: BrooksDecisionValidationContextV1,
): void {
  assertNonEmpty("decisionId", input.decisionId);
  assertNonEmpty("caseId", input.caseId);
  assertSha256("inputHash", input.inputHash);
  assertNonEmpty("lastVisibleBarId", input.lastVisibleBarId);
  if (input.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS) {
    throw new Error("BrooksDecision V1 requires 300-second bars");
  }
  if (context.visibleBars.length === 0) {
    throw new Error("visibleBars must not be empty");
  }
  const barIds = context.visibleBars.map((bar) => bar.barId);
  assertUnique("visible barId", barIds);
  if (barIds.at(-1) !== input.lastVisibleBarId) {
    throw new Error("lastVisibleBarId must be the final visible bar");
  }
  for (const bar of context.visibleBars) {
    assertNonEmpty("barId", bar.barId);
    for (const [field, value] of Object.entries(bar).filter(
      ([field]) => field !== "barId",
    )) {
      assertFiniteNumber(`bar.${field}`, value as number);
    }
    if (
      bar.high < Math.max(bar.open, bar.low, bar.close) ||
      bar.low > Math.min(bar.open, bar.high, bar.close)
    ) {
      throw new Error(`invalid normalized OHLC geometry: ${bar.barId}`);
    }
  }
}

function validateEvidenceAndSemantics(
  input: BrooksDecisionInputV1,
  context: BrooksDecisionValidationContextV1,
): ValidationMaps {
  assertOneOf("verdict", input.verdict, BROOKS_VERDICTS);
  assertOneOf("evidenceBalance", input.evidenceBalance, EVIDENCE_BALANCES);

  const barsById = new Map(context.visibleBars.map((bar) => [bar.barId, bar]));
  const evidenceIds = input.marketEvidence.map((item) => item.evidenceId);
  assertUnique("market evidenceId", evidenceIds);
  const evidenceById = new Map(
    input.marketEvidence.map((item) => [item.evidenceId, item]),
  );

  for (const item of input.marketEvidence) {
    assertNonEmpty("evidenceId", item.evidenceId);
    assertStringList("marketEvidence.barIds", item.barIds, { min: 1, max: 120 });
    assertUnique("market evidence barId", item.barIds);
    for (const barId of item.barIds) {
      assertVisibleBar(barId, barsById);
    }
    if (item.observedFields.length === 0) {
      throw new Error("market evidence requires observedFields");
    }
    for (const field of item.observedFields) {
      assertOneOf("observedField", field, OBSERVED_FIELDS);
    }
    assertNonEmpty("observationCode", item.observationCode);
  }

  const claimIds = input.claims.map((claim) => claim.claimId);
  assertUnique("claimId", claimIds);
  const claimsById = new Map(input.claims.map((claim) => [claim.claimId, claim]));
  for (const claim of input.claims) {
    assertNonEmpty("claimId", claim.claimId);
    assertNonEmpty("statementCode", claim.statementCode);
    assertStringList("claim.marketEvidenceIds", claim.marketEvidenceIds, {
      min: 1,
      max: 12,
    });
    assertStringList("claim.doctrineIds", claim.doctrineIds, { min: 1, max: 8 });
    assertUnique("claim marketEvidenceId", claim.marketEvidenceIds);
    assertUnique("claim doctrineId", claim.doctrineIds);
    for (const evidenceId of claim.marketEvidenceIds) {
      if (!evidenceById.has(evidenceId)) {
        throw new Error(`claim references unknown market evidence: ${evidenceId}`);
      }
    }
    resolveApprovedDoctrineReferences(claim.doctrineIds, context.retrievedDoctrine);
  }

  validateContextAssessments(input, claimsById);

  if (input.structures.length > 5) {
    throw new Error("at most 5 active structures are allowed");
  }
  const structureIds = input.structures.map((structure) => structure.structureId);
  assertUnique("structureId", structureIds);
  const structuresById = new Map(
    input.structures.map((structure) => [structure.structureId, structure]),
  );
  for (const structure of input.structures) {
    assertNonEmpty("structureId", structure.structureId);
    assertOneOf("structure.kind", structure.kind, STRUCTURE_KINDS);
    const minimumAnchors =
      structure.kind === "trend_channel_boundary" ||
      structure.kind === "measured_move_structure"
        ? 2
        : 1;
    if (structure.anchors.length < minimumAnchors) {
      throw new Error(`${structure.kind} requires ${minimumAnchors} anchors`);
    }
    for (const anchor of structure.anchors) {
      validatePriceAnchor(anchor, barsById);
    }
    assertClaimReferences("structure.claimIds", structure.claimIds, claimsById);
  }
  if (input.breakoutLifecycle.state === "none") {
    if (input.breakoutLifecycle.structureId !== null) {
      throw new Error("inactive breakout lifecycle cannot reference a structure");
    }
  } else if (input.breakoutLifecycle.structureId === null) {
    throw new Error("active breakout lifecycle requires a structure");
  } else if (!structuresById.has(input.breakoutLifecycle.structureId)) {
    throw new Error(
      `breakout lifecycle references unknown structure: ${input.breakoutLifecycle.structureId}`,
    );
  }

  if (input.magnets.length > 3) {
    throw new Error("at most 3 magnets are allowed");
  }
  const magnetIds = input.magnets.map((magnet) => magnet.magnetId);
  assertUnique("magnetId", magnetIds);
  const magnetsById = new Map(
    input.magnets.map((magnet) => [magnet.magnetId, magnet]),
  );
  for (const magnet of input.magnets) {
    assertNonEmpty("magnetId", magnet.magnetId);
    if (!structuresById.has(magnet.structureId)) {
      throw new Error(`magnet references unknown structure: ${magnet.structureId}`);
    }
    assertOneOf("magnet.side", magnet.side, ["above", "below"] as const);
    assertOneOf("magnet.relevance", magnet.relevance, [
      "primary",
      "secondary",
    ] as const);
    assertClaimReferences("magnet.claimIds", magnet.claimIds, claimsById);
  }

  validateDirectionalCase(
    input.longCase,
    "long",
    barsById,
    claimsById,
    context.retrievedDoctrine,
  );
  validateDirectionalCase(
    input.shortCase,
    "short",
    barsById,
    claimsById,
    context.retrievedDoctrine,
  );

  return { barsById, claimsById, structuresById, magnetsById };
}

function validateContextAssessments(
  input: BrooksDecisionInputV1,
  claimsById: ReadonlyMap<string, DecisionClaimV1>,
): void {
  assertOneOf("broadContext.marketState", input.broadContext.marketState, MARKET_STATES);
  assertOneOf(
    "broadContext.trendDirection",
    input.broadContext.trendDirection,
    TREND_DIRECTIONS,
  );
  assertClaimReferences("broadContext.claimIds", input.broadContext.claimIds, claimsById);
  assertOneOf("currentLeg.direction", input.currentLeg.direction, LEG_DIRECTIONS);
  assertClaimReferences("currentLeg.claimIds", input.currentLeg.claimIds, claimsById);
  assertOneOf("alwaysIn.state", input.alwaysIn.state, ALWAYS_IN_STATES);
  assertClaimReferences("alwaysIn.claimIds", input.alwaysIn.claimIds, claimsById);

  for (const [name, side] of [
    ["buying", input.pressure.buying],
    ["selling", input.pressure.selling],
  ] as const) {
    assertOneOf(`pressure.${name}.state`, side.state, PRESSURE_STATES);
    assertClaimReferences(`pressure.${name}.claimIds`, side.claimIds, claimsById);
  }
  assertOneOf("pressure.balance", input.pressure.balance, EVIDENCE_BALANCES);

  assertOneOf("breakoutLifecycle.state", input.breakoutLifecycle.state, BREAKOUT_STATES);
  assertOneOf(
    "breakoutLifecycle.direction",
    input.breakoutLifecycle.direction,
    BREAKOUT_DIRECTIONS,
  );
  assertClaimReferences(
    "breakoutLifecycle.claimIds",
    input.breakoutLifecycle.claimIds,
    claimsById,
  );

  assertOneOf("reversalLifecycle.state", input.reversalLifecycle.state, REVERSAL_STATES);
  assertOneOf(
    "reversalLifecycle.fromDirection",
    input.reversalLifecycle.fromDirection,
    TREND_DIRECTIONS,
  );
  assertOneOf(
    "reversalLifecycle.toDirection",
    input.reversalLifecycle.toDirection,
    TREND_DIRECTIONS,
  );
  assertClaimReferences(
    "reversalLifecycle.claimIds",
    input.reversalLifecycle.claimIds,
    claimsById,
  );
}

function validateDirectionalCase(
  directionalCase: DirectionalCaseV1,
  expectedDirection: "long" | "short",
  barsById: ReadonlyMap<string, NormalizedBarV1>,
  claimsById: ReadonlyMap<string, DecisionClaimV1>,
  retrievedDoctrine: readonly DoctrineUnitV1[],
): void {
  if (directionalCase.direction !== expectedDirection) {
    throw new Error(`${expectedDirection}Case direction is invalid`);
  }
  assertOneOf(`${expectedDirection}Case.state`, directionalCase.state, DIRECTIONAL_CASE_STATES);
  assertOneOf(
    `${expectedDirection}Case.evidenceBalance`,
    directionalCase.evidenceBalance,
    EVIDENCE_BALANCES,
  );
  if (directionalCase.setupCandidates.length > 3) {
    throw new Error(`${expectedDirection}Case allows at most 3 setup candidates`);
  }
  const setupIds = directionalCase.setupCandidates.map((setup) => setup.setupId);
  assertUnique(`${expectedDirection} setupId`, setupIds);
  let primaryCount = 0;
  for (const setup of directionalCase.setupCandidates) {
    assertNonEmpty("setupId", setup.setupId);
    assertNonEmpty("setup.doctrineId", setup.doctrineId);
    assertOneOf("setup.state", setup.state, SETUP_STATES);
    assertOneOf("setup.role", setup.role, ["primary", "confluence"] as const);
    if (setup.role === "primary") primaryCount += 1;
    resolveApprovedDoctrineReferences([setup.doctrineId], retrievedDoctrine);
    assertClaimReferences("setup.claimIds", setup.claimIds, claimsById);
  }
  if (primaryCount > 1) {
    throw new Error(`${expectedDirection}Case allows at most one primary setup`);
  }

  const signal = directionalCase.signalBasis;
  assertOneOf("signalBasis.kind", signal.kind, SIGNAL_KINDS);
  assertOneOf("signalBasis.state", signal.state, SIGNAL_STATES);
  for (const barId of signal.signalBarIds) {
    assertVisibleBar(barId, barsById);
  }
  if (signal.state === "confirmed") {
    if (signal.kind === "discrete_bar" && signal.signalBarIds.length !== 1) {
      throw new Error("confirmed discrete signal requires one signal bar");
    }
    if (signal.kind === "multi_bar_structure" && signal.signalBarIds.length < 2) {
      throw new Error("confirmed multi-bar signal requires at least two bars");
    }
    if (signal.kind === "no_separate_signal" && signal.signalBarIds.length !== 0) {
      throw new Error("no_separate_signal cannot name a signal bar");
    }
    resolveApprovedDoctrineReferences(signal.doctrineIds, retrievedDoctrine);
  }
  assertClaimReferences("signalBasis.claimIds", signal.claimIds, claimsById);
  assertOneOf("triggerState", directionalCase.triggerState, TRIGGER_STATES);
  assertClaimReferences(`${expectedDirection}Case.claimIds`, directionalCase.claimIds, claimsById);
}

function validateVerdictAndTradePlan(
  input: BrooksDecisionInputV1,
  context: BrooksDecisionValidationContextV1,
  maps: ValidationMaps,
): Readonly<RewardRiskAuditV1> | null {
  if (input.verdict === "long" || input.verdict === "short") {
    if (input.tradePlan === null) {
      throw new Error("long or short verdict requires a trade plan");
    }
    if (input.noTrade !== null || input.uncertainty !== null) {
      throw new Error("trade verdict cannot include noTrade or uncertainty");
    }
    const selectedCase = input.verdict === "long" ? input.longCase : input.shortCase;
    const opposingCase = input.verdict === "long" ? input.shortCase : input.longCase;
    if (selectedCase.state !== "actionable") {
      throw new Error("selected directional case must be actionable");
    }
    const primary = selectedCase.setupCandidates.filter(
      (setup) => setup.role === "primary" && setup.state === "confirmed",
    );
    if (primary.length !== 1) {
      throw new Error("selected case requires one confirmed primary setup");
    }
    if (selectedCase.signalBasis.state !== "confirmed") {
      throw new Error("selected signal must be confirmed");
    }
    if (selectedCase.triggerState !== "pending") {
      throw new Error("new V1 trade trigger must be pending");
    }
    if (opposingCase.state === "actionable") {
      throw new Error("opposing directional case cannot also be actionable");
    }
    const expectedBalance = input.verdict === "long" ? "favors_long" : "favors_short";
    if (
      input.evidenceBalance !== expectedBalance ||
      selectedCase.evidenceBalance !== expectedBalance
    ) {
      throw new Error("trade verdict must match the evidence balance");
    }
    if (input.tradePlan.direction !== input.verdict) {
      throw new Error("trade plan direction must match verdict");
    }
    if (input.tradePlan.setupId !== primary[0]?.setupId) {
      throw new Error("trade plan must reference the confirmed primary setup");
    }
    return validateTradePlan(input, context, maps);
  }

  if (input.tradePlan !== null) {
    throw new Error("no_trade or uncertain verdict cannot include a trade plan");
  }
  if (context.plannedGeometry !== null) {
    throw new Error("non-trade verdict cannot include planned geometry");
  }

  if (input.verdict === "no_trade") {
    if (input.noTrade === null || input.uncertainty !== null) {
      throw new Error("no_trade requires noTrade details only");
    }
    if (input.longCase.state === "actionable" || input.shortCase.state === "actionable") {
      throw new Error("no_trade cannot leave an actionable directional case");
    }
    for (const code of input.noTrade.reasonCodes) {
      assertOneOf("noTrade reason", code, NO_TRADE_REASON_CODES);
    }
    assertStringList("noTrade.reasonCodes", input.noTrade.reasonCodes, {
      min: 1,
      max: 5,
    });
    assertUnique("noTrade reason", input.noTrade.reasonCodes);
    assertClaimReferences("noTrade.claimIds", input.noTrade.claimIds, maps.claimsById);
    assertNonEmpty(
      "noTrade.nextObservableCondition",
      input.noTrade.nextObservableCondition,
    );
    return null;
  }

  if (input.uncertainty === null || input.noTrade !== null) {
    throw new Error("uncertain verdict requires uncertainty details only");
  }
  for (const code of input.uncertainty.reasonCodes) {
    assertOneOf("uncertainty reason", code, UNCERTAINTY_REASON_CODES);
  }
  assertStringList("uncertainty.reasonCodes", input.uncertainty.reasonCodes, {
    min: 1,
    max: 5,
  });
  assertUnique("uncertainty reason", input.uncertainty.reasonCodes);
  assertClaimReferences(
    "uncertainty.conflictingClaimIds",
    input.uncertainty.conflictingClaimIds,
    maps.claimsById,
  );
  assertStringList("uncertainty.missingEvidence", input.uncertainty.missingEvidence, {
    min: 1,
    max: 12,
  });
  assertNonEmpty("uncertainty.resolutionCondition", input.uncertainty.resolutionCondition);
  const hasCriticalUncertainty =
    input.evidenceBalance === "conflicting" ||
    input.evidenceBalance === "insufficient" ||
    input.longCase.state === "uncertain" ||
    input.shortCase.state === "uncertain" ||
    input.longCase.signalBasis.state === "uncertain" ||
    input.shortCase.signalBasis.state === "uncertain" ||
    input.longCase.triggerState === "ambiguous" ||
    input.shortCase.triggerState === "ambiguous";
  if (!hasCriticalUncertainty) {
    throw new Error("uncertain verdict requires a critical uncertain state");
  }
  return null;
}

function validateTradePlan(
  input: BrooksDecisionInputV1,
  context: BrooksDecisionValidationContextV1,
  maps: ValidationMaps,
): Readonly<RewardRiskAuditV1> {
  const plan = input.tradePlan;
  if (plan === null || context.plannedGeometry === null) {
    throw new Error("trade plan requires deterministic planned geometry");
  }
  assertClaimReferences("tradePlan.claimIds", plan.claimIds, maps.claimsById);
  validateEntry(plan.entry, plan.direction, input.lastVisibleBarId, maps);
  validateStructuralCondition(plan.entryCancellation, "entryCancellation", maps);
  validateStructuralCondition(plan.premiseInvalidation, "premiseInvalidation", maps);
  validatePriceAnchor(plan.protection.anchor, maps.barsById);
  assertClaimReferences("protection.claimIds", plan.protection.claimIds, maps.claimsById);
  const expectedProtectionRelation = plan.direction === "long" ? "below" : "above";
  if (plan.protection.relation !== expectedProtectionRelation) {
    throw new Error("protection relation is invalid for trade direction");
  }
  assertOneOf("holdingIntent", plan.holdingIntent, HOLDING_INTENTS);
  const objectiveMagnet = maps.magnetsById.get(plan.objective.magnetId);
  if (objectiveMagnet === undefined) {
    throw new Error(`objective references unknown magnet: ${plan.objective.magnetId}`);
  }
  const expectedMagnetSide = plan.direction === "long" ? "above" : "below";
  if (objectiveMagnet.side !== expectedMagnetSide) {
    throw new Error("objective magnet is on the wrong side for trade direction");
  }
  if (
    plan.holdingIntent === "scalp" &&
    objectiveMagnet.relevance !== "primary"
  ) {
    throw new Error("scalp objective requires a primary magnet");
  }
  assertClaimReferences("objective.claimIds", plan.objective.claimIds, maps.claimsById);

  const geometry = context.plannedGeometry;
  assertFiniteNumber("entryNormalizedPrice", geometry.entryNormalizedPrice);
  assertFiniteNumber("protectionNormalizedPrice", geometry.protectionNormalizedPrice);
  assertFiniteNumber("objectiveNormalizedPrice", geometry.objectiveNormalizedPrice);
  const validOrder =
    plan.direction === "long"
      ? geometry.protectionNormalizedPrice < geometry.entryNormalizedPrice &&
        geometry.entryNormalizedPrice < geometry.objectiveNormalizedPrice
      : geometry.objectiveNormalizedPrice < geometry.entryNormalizedPrice &&
        geometry.entryNormalizedPrice < geometry.protectionNormalizedPrice;
  if (!validOrder) {
    throw new Error("trade geometry is invalid for the selected direction");
  }

  const risk = Math.abs(
    geometry.entryNormalizedPrice - geometry.protectionNormalizedPrice,
  );
  const reward = Math.abs(
    geometry.objectiveNormalizedPrice - geometry.entryNormalizedPrice,
  );
  const ratio = reward / risk;
  if (plan.holdingIntent === "swing" && ratio < 2) {
    throw new Error("swing plan requires at least 2R");
  }

  return deepFreeze({
    ratio,
    minimumRequired: plan.holdingIntent === "swing" ? 2 : null,
    passed: true,
  });
}

function validateEntry(
  entry: EntryPlanV1,
  direction: "long" | "short",
  lastVisibleBarId: string,
  maps: ValidationMaps,
): void {
  assertOneOf("entryType", entry.entryType, ENTRY_TYPES);
  if (entry.validAfterBarId !== lastVisibleBarId) {
    throw new Error("entry must become valid after the last visible bar");
  }
  if (entry.validForClosedBars !== 1) {
    throw new Error("entry must be valid for exactly one closed bar");
  }
  assertClaimReferences("entry.claimIds", entry.claimIds, maps.claimsById);
  if (entry.entryType === "stop") {
    const expected = direction === "long" ? "break_above" : "break_below";
    if (entry.relation !== expected) {
      throw new Error("stop entry relation is invalid for trade direction");
    }
    validatePriceAnchor(entry.anchor, maps.barsById);
  } else if (entry.entryType === "limit") {
    if (entry.relation !== "pullback_to") {
      throw new Error("limit entry relation must be pullback_to");
    }
    if (!maps.structuresById.has(entry.structureId)) {
      throw new Error(`limit entry references unknown structure: ${entry.structureId}`);
    }
  }
}

function validateStructuralCondition(
  condition: StructuralConditionV1,
  name: string,
  maps: ValidationMaps,
): void {
  assertNonEmpty(`${name}.conditionCode`, condition.conditionCode);
  validatePriceAnchor(condition.anchor, maps.barsById);
  assertClaimReferences(`${name}.claimIds`, condition.claimIds, maps.claimsById);
}

function validatePriceAnchor(
  anchor: PriceAnchorV1,
  barsById: ReadonlyMap<string, NormalizedBarV1>,
): void {
  const bar = assertVisibleBar(anchor.barId, barsById);
  assertOneOf("price anchor field", anchor.field, PRICE_FIELDS);
  assertFiniteNumber("normalizedReferencePrice", anchor.normalizedReferencePrice);
  if (bar[anchor.field] !== anchor.normalizedReferencePrice) {
    throw new Error(`normalized reference does not match visible OHLC: ${anchor.barId}`);
  }
}

function assertVisibleBar(
  barId: string,
  barsById: ReadonlyMap<string, NormalizedBarV1>,
): NormalizedBarV1 {
  const bar = barsById.get(barId);
  if (bar === undefined) {
    throw new Error(`bar is outside the visible causal prefix: ${barId}`);
  }
  return bar;
}

function assertClaimReferences(
  name: string,
  claimIds: readonly string[],
  claimsById: ReadonlyMap<string, DecisionClaimV1>,
): void {
  assertStringList(name, claimIds, { min: 1, max: 20 });
  assertUnique(name, claimIds);
  for (const claimId of claimIds) {
    if (!claimsById.has(claimId)) {
      throw new Error(`${name} references unknown claim: ${claimId}`);
    }
  }
}

function validateHumanSummary(summary: string | null): void {
  if (summary === null) return;
  if (Array.from(summary).length > 600) {
    throw new Error("humanSummary must be at most 600 characters");
  }
}

function assertNoForbiddenProbabilityFields(value: unknown): void {
  const forbidden = new Set([
    "winProbability",
    "probability",
    "confidence",
    "confidenceScore",
    "expectedReturn",
    "successChance",
  ]);
  const visit = (nested: unknown): void => {
    if (Array.isArray(nested)) {
      for (const item of nested) visit(item);
      return;
    }
    if (nested === null || typeof nested !== "object") return;
    for (const [key, child] of Object.entries(nested)) {
      if (forbidden.has(key)) {
        throw new Error("numeric probability and confidence fields are forbidden");
      }
      visit(child);
    }
  };
  visit(value);
}

export function assertBrooksDecisionIntegrity(
  value: unknown,
  binding: BrooksDecisionPersistenceBindingV1,
): asserts value is BrooksDecisionV1 {
  try {
    const decision = exactDecisionRecord(value);
    if (decision.schemaVersion !== BROOKS_DECISION_SCHEMA_VERSION) {
      throw new Error("BrooksDecision schemaVersion is unsupported");
    }
    assertSha256("decisionHash", decision.decisionHash);
    assertNoForbiddenProbabilityFields(decision);
    const { decisionHash, ...body } = decision;
    if (canonicalHash(body) !== decisionHash) {
      throw new Error("BrooksDecision decision hash does not match its content");
    }
    if (
      decision.caseId !== binding.caseId ||
      decision.inputHash !== binding.inputHash ||
      decision.lastVisibleBarId !== binding.lastVisibleBarId ||
      decision.barDurationSeconds !== binding.barDurationSeconds
    ) {
      throw new Error(
        "BrooksDecision does not match its persisted Case and input binding",
      );
    }
    if (
      decision.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS
    ) {
      throw new Error("BrooksDecision V1 requires 300-second bars");
    }
  } catch (error) {
    throw asBrooksDecisionError(error);
  }
}

function exactDecisionRecord(value: unknown): BrooksDecisionV1 {
  const allowedKeys = [
    "schemaVersion",
    "decisionHash",
    "decisionId",
    "caseId",
    "inputHash",
    "lastVisibleBarId",
    "barDurationSeconds",
    "verdict",
    "evidenceBalance",
    "broadContext",
    "currentLeg",
    "alwaysIn",
    "pressure",
    "breakoutLifecycle",
    "reversalLifecycle",
    "structures",
    "magnets",
    "marketEvidence",
    "claims",
    "longCase",
    "shortCase",
    "tradePlan",
    "noTrade",
    "uncertainty",
    "humanSummary",
  ] as const;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error("BrooksDecision must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const names = Object.getOwnPropertyNames(record);
  if (
    names.length !== allowedKeys.length ||
    names.some((name) => !(allowedKeys as readonly string[]).includes(name)) ||
    allowedKeys.some((name) => !Object.hasOwn(record, name))
  ) {
    throw new Error("BrooksDecision fields must match the exact V1 contract");
  }
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(record, name);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      !descriptor.enumerable
    ) {
      throw new Error("BrooksDecision fields must be enumerable data properties");
    }
  }
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    throw new Error("BrooksDecision cannot contain symbol fields");
  }
  return record as unknown as BrooksDecisionV1;
}

function asBrooksDecisionError(error: unknown): BrooksDecisionContractError {
  if (error instanceof BrooksDecisionContractError) return error;
  return new BrooksDecisionContractError(
    error instanceof Error ? error.message : String(error),
  );
}
