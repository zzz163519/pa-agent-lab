import {
  createBrooksDecision,
  type BrooksDecisionValidationContextV1,
  type PlannedTradeGeometryV1,
  type RewardRiskAuditV1,
} from "./brooks-decision-v1.ts";
import {
  BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1,
  BROOKS_LOCAL_DECISION_BINDING_KEYS_V1,
  type BrooksIdentityFreeResponseV1,
  type BrooksLocalDecisionBindingV1,
} from "./brooks-identity-free-response-v1.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V2 =
  "brooks-offline-response-validation.v2" as const;
export const BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2 =
  "brooks-identity-free-response-validator.v2" as const;

export const BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2 = [
  ...BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1,
  "plannedGeometry",
] as const;

export interface BrooksIdentityFreeResponseV2
  extends BrooksIdentityFreeResponseV1 {
  readonly plannedGeometry: Readonly<PlannedTradeGeometryV1> | null;
}

export type BrooksDecisionSemanticContextV2 = Omit<
  BrooksDecisionValidationContextV1,
  "plannedGeometry"
>;

export interface CreateOfflineBrooksResponseValidationInputV2 {
  readonly response: BrooksIdentityFreeResponseV2;
  readonly binding: BrooksLocalDecisionBindingV1;
  readonly context: BrooksDecisionSemanticContextV2;
}

export interface BrooksOfflineResponseValidationV2 {
  readonly schemaVersion: typeof BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V2;
  readonly validatorVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2;
  readonly responseHash: ContractSha256;
  readonly localBindingHash: ContractSha256;
  readonly validationContextHash: ContractSha256;
  readonly rewardRiskAudit: Readonly<RewardRiskAuditV1> | null;
  readonly validationResultHash: ContractSha256;
}

export class BrooksIdentityFreeResponseV2ContractError extends Error {
  override readonly name = "BrooksIdentityFreeResponseV2ContractError";
}

export function createOfflineBrooksResponseValidationV2(
  input: CreateOfflineBrooksResponseValidationInputV2,
): Readonly<BrooksOfflineResponseValidationV2> {
  try {
    exactRecord("offline Brooks response V2 validation input", input, [
      "response",
      "binding",
      "context",
    ]);
    const response = exactRecord<BrooksIdentityFreeResponseV2>(
      "identity-free Brooks response V2",
      input.response,
      BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2,
    );
    const binding = exactRecord<BrooksLocalDecisionBindingV1>(
      "local Brooks decision binding",
      input.binding,
      BROOKS_LOCAL_DECISION_BINDING_KEYS_V1,
    );
    const context = exactRecord<BrooksDecisionSemanticContextV2>(
      "Brooks response V2 semantic context",
      input.context,
      ["visibleBars", "retrievedDoctrine"],
    );

    validateGeometryBranch(response);
    validateEntryGeometryRelation(response);
    validateProtectionGeometryRelation(response);
    validateObjectiveGeometryRelation(response);
    if (response.tradePlan?.entry.entryType === "market_next_event") {
      fail("market_next_event is unsupported by the provider-bound V2 profile");
    }

    const responseClone = structuredClone(response);
    const bindingClone = structuredClone(binding);
    const contextClone = structuredClone(context);
    const { plannedGeometry, ...semanticResponse } = responseClone;
    const validated = createBrooksDecision(
      { ...bindingClone, ...semanticResponse },
      { ...contextClone, plannedGeometry },
    );
    const body = {
      schemaVersion: BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION_V2,
      validatorVersion: BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2,
      responseHash: canonicalHash(responseClone),
      localBindingHash: canonicalHash(bindingClone),
      validationContextHash: canonicalHash(contextClone),
      rewardRiskAudit:
        validated.rewardRiskAudit === null
          ? null
          : structuredClone(validated.rewardRiskAudit),
    } as const;
    return deepFreeze({
      ...body,
      validationResultHash: canonicalHash(body),
    });
  } catch (error) {
    rethrow(error);
  }
}

function validateGeometryBranch(response: BrooksIdentityFreeResponseV2): void {
  const tradeVerdict = response.verdict === "long" || response.verdict === "short";
  if (tradeVerdict && response.plannedGeometry === null) {
    fail("plannedGeometry is required for a trade verdict");
  }
  if (!tradeVerdict && response.plannedGeometry !== null) {
    fail("plannedGeometry must be null for no_trade or uncertain");
  }
  if (response.plannedGeometry === null) return;

  const geometry = exactRecord<PlannedTradeGeometryV1>(
    "plannedGeometry",
    response.plannedGeometry,
    [
      "entryNormalizedPrice",
      "protectionNormalizedPrice",
      "objectiveNormalizedPrice",
    ],
  );
  for (const [field, value] of Object.entries(geometry)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      fail(`plannedGeometry.${field} must be finite`);
    }
  }
}

function validateEntryGeometryRelation(response: BrooksIdentityFreeResponseV2): void {
  const plan = response.tradePlan;
  const geometry = response.plannedGeometry;
  if (plan === null || geometry === null) return;

  if (plan.entry.entryType === "stop") {
    const anchorPrice = plan.entry.anchor.normalizedReferencePrice;
    if (
      plan.direction === "long" &&
      geometry.entryNormalizedPrice <= anchorPrice
    ) {
      fail("long stop entry must be strictly above its visible anchor");
    }
    if (
      plan.direction === "short" &&
      geometry.entryNormalizedPrice >= anchorPrice
    ) {
      fail("short stop entry must be strictly below its visible anchor");
    }
    return;
  }

  if (plan.entry.entryType === "limit") {
    const structureId = plan.entry.structureId;
    const structure = response.structures.find(
      (candidate) => candidate.structureId === structureId,
    );
    if (
      structure !== undefined &&
      !structure.anchors.some(
        (anchor) =>
          anchor.normalizedReferencePrice === geometry.entryNormalizedPrice,
      )
    ) {
      fail("limit entry must equal an anchor in its referenced structure");
    }
  }
}

function validateProtectionGeometryRelation(
  response: BrooksIdentityFreeResponseV2,
): void {
  const plan = response.tradePlan;
  const geometry = response.plannedGeometry;
  if (plan === null || geometry === null) return;

  const anchorPrice = plan.protection.anchor.normalizedReferencePrice;
  if (
    plan.direction === "long" &&
    geometry.protectionNormalizedPrice >= anchorPrice
  ) {
    fail("long protection must be strictly below its visible anchor");
  }
  if (
    plan.direction === "short" &&
    geometry.protectionNormalizedPrice <= anchorPrice
  ) {
    fail("short protection must be strictly above its visible anchor");
  }
}

function validateObjectiveGeometryRelation(
  response: BrooksIdentityFreeResponseV2,
): void {
  const plan = response.tradePlan;
  const geometry = response.plannedGeometry;
  if (plan === null || geometry === null) return;

  const magnet = response.magnets.find(
    (candidate) => candidate.magnetId === plan.objective.magnetId,
  );
  const structure = response.structures.find(
    (candidate) => candidate.structureId === magnet?.structureId,
  );
  if (
    structure !== undefined &&
    !structure.anchors.some(
      (anchor) =>
        anchor.normalizedReferencePrice === geometry.objectiveNormalizedPrice,
    )
  ) {
    fail("objective must equal an anchor in its magnet structure");
  }
}

function exactRecord<T extends object>(
  name: string,
  value: unknown,
  keys: readonly string[],
): T {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object with exact keys`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actual.includes(key))
  ) {
    fail(`${name} must contain exact keys`);
  }
  return value as T;
}

function fail(message: string): never {
  throw new BrooksIdentityFreeResponseV2ContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksIdentityFreeResponseV2ContractError) throw error;
  if (error instanceof Error) {
    throw new BrooksIdentityFreeResponseV2ContractError(error.message);
  }
  throw new BrooksIdentityFreeResponseV2ContractError(
    "identity-free Brooks response V2 validation failed",
  );
}
