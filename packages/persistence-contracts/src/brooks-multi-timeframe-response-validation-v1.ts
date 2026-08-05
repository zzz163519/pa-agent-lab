import { readFileSync } from "node:fs";

import type { ErrorObject, ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";

import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "@pa-agent-lab/contracts/contract-utils-v1";
import type { DoctrineUnitV1 } from "@pa-agent-lab/contracts/doctrine-v1";
import type { RewardRiskAuditV1 } from "@pa-agent-lab/contracts/brooks-decision-v1";
import {
  createOfflineBrooksResponseValidationV2,
  type BrooksDecisionSemanticContextV2,
} from "@pa-agent-lab/contracts/brooks-identity-free-response-v2";
import type { BrooksLocalDecisionBindingV1 } from "@pa-agent-lab/contracts/brooks-identity-free-response-v1";
import {
  assertBrooksMultiTimeframePolicyInputPrivacyV1,
  type AnonymousMultiTimeframeMarketV1,
  type BrooksMultiTimeframePolicyInputV1,
  type NormalizedMultiTimeframeBarV1,
} from "@pa-agent-lab/contracts/brooks-multi-timeframe-input-v1";
import {
  assertBrooksMultiTimeframeIdentityFreeResponseShapeV1,
  type BrooksMultiTimeframeEvidenceReferenceV1,
  type BrooksMultiTimeframeGeometryAnchorV1,
  type BrooksMultiTimeframeIdentityFreeResponseV1,
  type BrooksMultiTimeframeReferenceAssessmentV1,
} from "@pa-agent-lab/contracts/brooks-multi-timeframe-response-v1";
import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";
import { parseStrictJsonText } from "./persisted-json-v1.ts";

export const BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V1 =
  "brooks-multi-timeframe-offline-response-validation.v1" as const;
export const BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATOR_VERSION_V1 =
  "brooks-multi-timeframe-offline-response-validator.v1" as const;

const responseSchema = parseStrictJsonText(
  readFileSync(
    new URL(
      "../../../docs/prompts/BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_V1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const responseV2Schema = parseStrictJsonText(
  readFileSync(
    new URL(
      "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V2.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  strict: true,
});
ajv.addSchema(responseV2Schema);
const structuralValidator: ValidateFunction = ajv.compile(responseSchema);

export interface ValidateOfflineBrooksMultiTimeframeResponseInputV1 {
  readonly json: string;
  readonly policyInput: BrooksMultiTimeframePolicyInputV1;
  readonly binding: BrooksLocalDecisionBindingV1;
  readonly retrievedDoctrine: readonly DoctrineUnitV1[];
}

export interface BrooksMultiTimeframeOfflineResponseValidationV1 {
  readonly schemaVersion: typeof BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V1;
  readonly validatorVersion: typeof BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATOR_VERSION_V1;
  readonly response: Readonly<BrooksMultiTimeframeIdentityFreeResponseV1>;
  readonly responseHash: ContractSha256;
  readonly policyInputHash: ContractSha256;
  readonly localBindingHash: ContractSha256;
  readonly retrievedDoctrineHash: ContractSha256;
  readonly rewardRiskAudit: Readonly<RewardRiskAuditV1> | null;
  readonly validationResultHash: ContractSha256;
}

export function parseBrooksMultiTimeframeResponseJsonV1(
  json: string,
): Readonly<BrooksMultiTimeframeIdentityFreeResponseV1> {
  try {
    const parsed = parseStrictJsonText(json);
    if (!structuralValidator(parsed)) {
      fail(
        `multi-timeframe response structure is invalid: ${formatAjvErrors(
          structuralValidator.errors,
        )}`,
      );
    }
    assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(parsed);
    return deepFreeze(parsed);
  } catch (error) {
    rethrow(error);
  }
}

export function validateOfflineBrooksMultiTimeframeResponseV1(
  input: ValidateOfflineBrooksMultiTimeframeResponseInputV1,
): Readonly<BrooksMultiTimeframeOfflineResponseValidationV1> {
  try {
    const response = parseBrooksMultiTimeframeResponseJsonV1(input.json);
    assertBrooksMultiTimeframePolicyInputPrivacyV1(input.policyInput);
    validateBinding(input.binding, input.policyInput);
    validateDoctrineBinding(input.retrievedDoctrine, input.policyInput);

    const visibleBars = collectVisibleBars(input.policyInput.market);
    const claims = new Set(
      response.primaryDecision.claims.map((claim) => claim.claimId),
    );
    const doctrineIds = new Set(
      input.policyInput.doctrine.map((record) => record.doctrineId),
    );
    const evidence = validateEvidenceCatalog(
      response.timeframeEvidence,
      visibleBars,
      claims,
      doctrineIds,
    );
    validateReferenceAssessments(response, input.policyInput.market, evidence, doctrineIds);
    validateConflictAssessment(response, input.policyInput.market, evidence, doctrineIds);
    validateGapAssessments(
      response,
      input.policyInput.market,
      evidence,
      claims,
      doctrineIds,
    );
    validateGeometry(response, visibleBars, evidence);

    const primaryBarIds = new Set(
      input.policyInput.market.primary.bars.map((bar) => bar.barId),
    );
    const semanticBars = [
      ...[...visibleBars.values()].filter((bar) => !primaryBarIds.has(bar.barId)),
      ...input.policyInput.market.primary.bars,
    ];
    const semanticContext: BrooksDecisionSemanticContextV2 = {
      visibleBars: semanticBars.map((bar) => ({
        barId: bar.barId,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
      retrievedDoctrine: input.retrievedDoctrine.map((unit) =>
        structuredClone(unit),
      ),
    };
    const primaryValidation = createOfflineBrooksResponseValidationV2({
      response: response.primaryDecision,
      binding: structuredClone(input.binding),
      context: semanticContext,
    });
    const auditBody = {
      schemaVersion:
        BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V1,
      validatorVersion:
        BROOKS_MULTI_TIMEFRAME_OFFLINE_RESPONSE_VALIDATOR_VERSION_V1,
      responseHash: canonicalHash(response),
      policyInputHash: input.policyInput.inputHash,
      localBindingHash: canonicalHash(input.binding),
      retrievedDoctrineHash: canonicalHash(input.retrievedDoctrine),
      rewardRiskAudit:
        primaryValidation.rewardRiskAudit === null
          ? null
          : structuredClone(primaryValidation.rewardRiskAudit),
    } as const;
    return deepFreeze({
      ...auditBody,
      response,
      validationResultHash: canonicalHash(auditBody),
    });
  } catch (error) {
    rethrow(error);
  }
}

function validateBinding(
  binding: BrooksLocalDecisionBindingV1,
  policyInput: BrooksMultiTimeframePolicyInputV1,
): void {
  if (binding.inputHash !== policyInput.inputHash) {
    fail("local binding inputHash does not match the policy input");
  }
  if (
    binding.lastVisibleBarId !== policyInput.market.primary.bars.at(-1)?.barId
  ) {
    fail("local binding lastVisibleBarId does not match the primary context");
  }
  if (binding.barDurationSeconds !== 300) {
    fail("local binding barDurationSeconds must remain 300");
  }
  for (const [name, value] of [
    ["decisionId", binding.decisionId],
    ["caseId", binding.caseId],
  ] as const) {
    if (value.trim().length === 0) fail(`local binding ${name} must not be empty`);
  }
}

function validateDoctrineBinding(
  retrievedDoctrine: readonly DoctrineUnitV1[],
  policyInput: BrooksMultiTimeframePolicyInputV1,
): void {
  const fullIds = retrievedDoctrine.map((unit) => unit.doctrineId);
  const inputIds = policyInput.doctrine.map((record) => record.doctrineId);
  if (
    new Set(fullIds).size !== fullIds.length ||
    fullIds.length !== inputIds.length ||
    !inputIds.every((id) => fullIds.includes(id))
  ) {
    fail("retrieved Doctrine units do not match the anonymous policy input");
  }
}

type VisibleBar = Readonly<NormalizedMultiTimeframeBarV1>;

function collectVisibleBars(
  market: AnonymousMultiTimeframeMarketV1,
): ReadonlyMap<string, VisibleBar> {
  const bars: VisibleBar[] = [...market.primary.bars];
  if (market.references.sixtyMinute.availability === "supplied") {
    bars.push(...market.references.sixtyMinute.bars);
  }
  if (market.references.daily.availability === "supplied") {
    bars.push(...market.references.daily.bars);
  }
  const map = new Map(bars.map((bar) => [bar.barId, bar]));
  if (map.size !== bars.length) fail("anonymous visible bar identities must be unique");
  return map;
}

function validateEvidenceCatalog(
  entries: readonly Readonly<BrooksMultiTimeframeEvidenceReferenceV1>[],
  visibleBars: ReadonlyMap<string, VisibleBar>,
  claims: ReadonlySet<string>,
  doctrineIds: ReadonlySet<string>,
): ReadonlyMap<string, Readonly<BrooksMultiTimeframeEvidenceReferenceV1>> {
  const evidence = new Map<string, BrooksMultiTimeframeEvidenceReferenceV1>();
  for (const entry of entries) {
    if (evidence.has(entry.evidenceId)) fail("timeframe evidence IDs must be unique");
    const bar = visibleBars.get(entry.barId);
    if (bar === undefined) fail(`timeframe evidence references a nonexistent bar: ${entry.barId}`);
    if (bar.timeframe !== entry.timeframe) {
      fail("timeframe evidence timeframe does not match the visible bar");
    }
    if (bar.lifecycle !== entry.lifecycle) {
      fail("timeframe evidence lifecycle does not match the visible bar");
    }
    if (
      entry.field !== "relationship" &&
      entry.normalizedValue !== bar[entry.field]
    ) {
      fail(
        `timeframe evidence normalized value does not match the visible bar: ${entry.evidenceId} expected ${String(bar[entry.field])} received ${String(entry.normalizedValue)}`,
      );
    }
    assertKnownReferences("timeframe evidence claimScope", entry.claimScope, claims);
    assertKnownReferences(
      "timeframe evidence Doctrine",
      entry.doctrineClaimReferences,
      doctrineIds,
    );
    evidence.set(entry.evidenceId, entry);
  }
  for (const claim of claims) {
    if (![...evidence.values()].some((entry) => entry.claimScope.includes(claim))) {
      fail(`primary decision claim lacks timeframe-aware evidence: ${claim}`);
    }
  }
  return evidence;
}

function validateReferenceAssessments(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
  market: AnonymousMultiTimeframeMarketV1,
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
  doctrineIds: ReadonlySet<string>,
): void {
  validateReferenceAssessment(
    response.referenceAssessments.sixtyMinute,
    market.references.sixtyMinute.availability,
    "60m",
    evidence,
    doctrineIds,
  );
  validateReferenceAssessment(
    response.referenceAssessments.daily,
    market.references.daily.availability,
    "1d",
    evidence,
    doctrineIds,
  );
}

function validateReferenceAssessment(
  assessment: Readonly<BrooksMultiTimeframeReferenceAssessmentV1> | null,
  availability: "supplied" | "not_supplied",
  timeframe: "60m" | "1d",
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
  doctrineIds: ReadonlySet<string>,
): void {
  if (availability === "not_supplied") {
    if (assessment !== null) fail(`absent ${timeframe} reference forbids an assessment`);
    return;
  }
  if (assessment === null) fail(`supplied ${timeframe} reference requires an assessment`);
  if (assessment.timeframe !== timeframe) {
    fail(`${timeframe} reference assessment has the wrong timeframe`);
  }
  if (
    assessment.relationship !== "unavailable_for_this_decision" &&
    (assessment.evidenceReferences.length === 0 ||
      assessment.doctrineClaimReferences.length === 0)
  ) {
    fail(`non-unavailable ${timeframe} relationship requires evidence and Doctrine`);
  }
  const entries = resolveEvidence(
    `${timeframe} reference assessment`,
    assessment.evidenceReferences,
    evidence,
  );
  if (entries.some((entry) => entry.timeframe !== timeframe)) {
    fail(`${timeframe} reference assessment cites wrong-timeframe evidence`);
  }
  assertKnownReferences(
    `${timeframe} reference assessment Doctrine`,
    assessment.doctrineClaimReferences,
    doctrineIds,
  );
}

function validateConflictAssessment(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
  market: AnonymousMultiTimeframeMarketV1,
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
  doctrineIds: ReadonlySet<string>,
): void {
  const supplied = [
    market.references.sixtyMinute.availability === "supplied" &&
    market.references.sixtyMinute.bars.length > 0
      ? "60m"
      : null,
    market.references.daily.availability === "supplied" &&
    market.references.daily.bars.length > 0
      ? "1d"
      : null,
  ].filter((value): value is "60m" | "1d" => value !== null);
  const assessment = response.crossTimeframeConflictAssessment;
  const entries = resolveEvidence(
    "cross-timeframe conflict assessment",
    assessment.evidenceReferences,
    evidence,
  );
  assertKnownReferences(
    "cross-timeframe conflict Doctrine",
    assessment.doctrineClaimReferences,
    doctrineIds,
  );
  if (supplied.length < 2) {
    if (assessment.state !== "not_applicable") {
      fail("cross-timeframe conflict must be not_applicable with fewer than two references");
    }
    return;
  }
  if (assessment.state === "not_applicable") {
    fail("two supplied references require a cross-timeframe conflict assessment");
  }
  for (const timeframe of supplied) {
    if (!entries.some((entry) => entry.timeframe === timeframe)) {
      fail("cross-timeframe conflict assessment requires evidence from both references");
    }
  }
}

function validateGapAssessments(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
  market: AnonymousMultiTimeframeMarketV1,
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
  claims: ReadonlySet<string>,
  doctrineIds: ReadonlySet<string>,
): void {
  const visibleGaps = visibleMarketBars(market).filter(
    (bar) => bar.continuityFromPrevious === "missing_data",
  );
  const assessedBars = new Map<string, number>();
  for (const assessment of response.gapAssessments) {
    assertKnownReferences("gap affectedClaims", assessment.affectedClaims, claims);
    assertKnownReferences(
      "gap Doctrine",
      assessment.doctrineClaimReferences,
      doctrineIds,
    );
    const entries = resolveEvidence(
      `gap assessment ${assessment.gapId}`,
      assessment.evidenceReferences,
      evidence,
    );
    const gapBars = entries
      .filter((entry) => entry.timeframe === assessment.timeframe)
      .map((entry) => entry.barId)
      .filter((barId) =>
        visibleGaps.some((bar) => bar.barId === barId),
      );
    if (gapBars.length === 0) {
      fail(`gap assessment ${assessment.gapId} does not cite a visible missing-data gap`);
    }
    for (const barId of new Set(gapBars)) {
      assessedBars.set(barId, (assessedBars.get(barId) ?? 0) + 1);
    }
    if (
      assessment.timeframe === "5m" &&
      (assessment.materiality === "material" ||
        assessment.materiality === "uncertain") &&
      response.primaryDecision.tradePlan !== null
    ) {
      fail("material or uncertain primary gap forbids an actionable plan");
    }
    if (response.primaryDecision.tradePlan !== null) {
      const planClaims = collectPlanClaimIds(response);
      const dependsOnGap = assessment.affectedClaims.some((claim) =>
        planClaims.has(claim),
      );
      if (assessment.timeframe !== "5m" && dependsOnGap) {
        fail("an actionable plan cannot depend on a reference gap's affected claims");
      }
      if (assessment.materiality === "immaterial" && dependsOnGap) {
        fail("an actionable plan cannot depend on an immaterial gap's affected claims");
      }
    }
  }
  for (const gap of visibleGaps) {
    if (assessedBars.get(gap.barId) !== 1) {
      fail(`missing-data gap requires exactly one assessment: ${gap.barId}`);
    }
  }
  if (assessedBars.size !== visibleGaps.length) {
    fail("gap assessments must bind one-to-one to visible missing-data gaps");
  }
}

function visibleMarketBars(
  market: AnonymousMultiTimeframeMarketV1,
): readonly VisibleBar[] {
  const bars: VisibleBar[] = [...market.primary.bars];
  if (market.references.sixtyMinute.availability === "supplied") {
    bars.push(...market.references.sixtyMinute.bars);
  }
  if (market.references.daily.availability === "supplied") {
    bars.push(...market.references.daily.bars);
  }
  return bars;
}

function collectPlanClaimIds(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
): ReadonlySet<string> {
  const plan = response.primaryDecision.tradePlan;
  if (plan === null) return new Set();
  return new Set([
    ...plan.claimIds,
    ...plan.entry.claimIds,
    ...plan.entryCancellation.claimIds,
    ...plan.premiseInvalidation.claimIds,
    ...plan.protection.claimIds,
    ...plan.objective.claimIds,
  ]);
}

function validateGeometry(
  response: BrooksMultiTimeframeIdentityFreeResponseV1,
  visibleBars: ReadonlyMap<string, VisibleBar>,
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
): void {
  const trade =
    response.primaryDecision.verdict === "long" ||
    response.primaryDecision.verdict === "short";
  const anchors = response.geometryAnchors;
  const entryAnchor = anchors.entry;
  const protectionAnchor = anchors.protection;
  const objectiveAnchor = anchors.objective;
  if (trade) {
    if (
      entryAnchor === null ||
      protectionAnchor === null ||
      objectiveAnchor === null
    ) {
      fail("an actionable trade requires all three timeframe-aware geometry anchors");
    }
  } else if (
    entryAnchor !== null ||
    protectionAnchor !== null ||
    objectiveAnchor !== null
  ) {
    fail("non-actionable decisions require null geometry anchors");
  }
  for (const [name, anchor] of [
    ["entry", entryAnchor],
    ["protection", protectionAnchor],
    ["objective", objectiveAnchor],
  ] as const) {
    if (anchor !== null) {
      validateVisibleAnchor(anchor, visibleBars);
      if (
        ![...evidence.values()].some(
          (entry) =>
            entry.barId === anchor.barId &&
            entry.timeframe === anchor.timeframe &&
            entry.lifecycle === anchor.lifecycle &&
            entry.field === anchor.field &&
            entry.normalizedValue === anchor.normalizedValue,
        )
      ) {
        fail(`${name} geometry anchor lacks exact timeframe-aware evidence`);
      }
    }
  }
  if (!trade) return;
  if (
    entryAnchor === null ||
    protectionAnchor === null ||
    objectiveAnchor === null
  ) {
    fail("actionable timeframe-aware geometry is incomplete");
  }
  const plan = response.primaryDecision.tradePlan;
  const geometry = response.primaryDecision.plannedGeometry;
  if (plan === null || geometry === null) {
    fail("actionable primary decision geometry is incomplete");
  }
  if (plan.entry.entryType === "stop") {
    assertLegacyAnchorMatches(entryAnchor, plan.entry.anchor, "entry");
  } else if (
    plan.entry.entryType === "limit" &&
    geometry.entryNormalizedPrice !== entryAnchor.normalizedValue
  ) {
    fail("limit entry must equal its timeframe-aware visible anchor");
  }
  assertLegacyAnchorMatches(
    protectionAnchor,
    plan.protection.anchor,
    "protection",
  );
  if (geometry.objectiveNormalizedPrice !== objectiveAnchor.normalizedValue) {
    fail("objective must equal its timeframe-aware visible anchor");
  }
}

function validateVisibleAnchor(
  anchor: Readonly<BrooksMultiTimeframeGeometryAnchorV1>,
  visibleBars: ReadonlyMap<string, VisibleBar>,
): void {
  const bar = visibleBars.get(anchor.barId);
  if (bar === undefined) fail("geometry anchor references a nonexistent visible bar");
  if (bar.timeframe !== anchor.timeframe || bar.lifecycle !== anchor.lifecycle) {
    fail("geometry anchor timeframe or lifecycle does not match the visible bar");
  }
  if (bar[anchor.field] !== anchor.normalizedValue) {
    fail("geometry anchor value does not match the visible bar");
  }
}

function assertLegacyAnchorMatches(
  anchor: Readonly<BrooksMultiTimeframeGeometryAnchorV1>,
  legacy: Readonly<{
    barId: string;
    field: "open" | "high" | "low" | "close";
    normalizedReferencePrice: number;
  }>,
  name: string,
): void {
  if (
    anchor.barId !== legacy.barId ||
    anchor.field !== legacy.field ||
    anchor.normalizedValue !== legacy.normalizedReferencePrice
  ) {
    fail(`${name} timeframe-aware anchor does not match the primary decision anchor`);
  }
}

function resolveEvidence(
  name: string,
  ids: readonly string[],
  evidence: ReadonlyMap<string, BrooksMultiTimeframeEvidenceReferenceV1>,
): BrooksMultiTimeframeEvidenceReferenceV1[] {
  return ids.map((id) => {
    const entry = evidence.get(id);
    if (entry === undefined) fail(`${name} references unknown evidence: ${id}`);
    return entry;
  });
}

function assertKnownReferences(
  name: string,
  references: readonly string[],
  known: ReadonlySet<string>,
): void {
  for (const reference of references) {
    if (!known.has(reference)) fail(`${name} references unknown ID: ${reference}`);
  }
}

function formatAjvErrors(
  errors: readonly ErrorObject[] | null | undefined,
): string {
  if (errors === null || errors === undefined || errors.length === 0) {
    return "unknown schema violation";
  }
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message ?? error.keyword}`)
    .join("; ");
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  throw new PersistenceContractError(
    error instanceof Error
      ? error.message
      : "multi-timeframe response validation failed",
  );
}
