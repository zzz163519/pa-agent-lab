import {
  createBrooksDecision,
  type BrooksDecisionInputV1,
  type BrooksDecisionValidationContextV1,
  type RewardRiskAuditV1,
} from "./brooks-decision-v1.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import { BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION } from "./brooks-prompt-package-v1.ts";

export const BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION =
  "brooks-offline-response-validation.v1" as const;

export const BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1 = [
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

export const BROOKS_LOCAL_DECISION_BINDING_KEYS_V1 = [
  "decisionId",
  "caseId",
  "inputHash",
  "lastVisibleBarId",
  "barDurationSeconds",
] as const;

export type BrooksIdentityFreeResponseV1 = Omit<
  BrooksDecisionInputV1,
  | "decisionId"
  | "caseId"
  | "inputHash"
  | "lastVisibleBarId"
  | "barDurationSeconds"
>;

export type BrooksLocalDecisionBindingV1 = Pick<
  BrooksDecisionInputV1,
  | "decisionId"
  | "caseId"
  | "inputHash"
  | "lastVisibleBarId"
  | "barDurationSeconds"
>;

export interface CreateOfflineBrooksResponseValidationInputV1 {
  readonly response: BrooksIdentityFreeResponseV1;
  readonly binding: BrooksLocalDecisionBindingV1;
  readonly context: BrooksDecisionValidationContextV1;
}

export interface BrooksOfflineResponseValidationV1 {
  readonly schemaVersion: typeof BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION;
  readonly validatorVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION;
  readonly responseHash: ContractSha256;
  readonly localBindingHash: ContractSha256;
  readonly validationContextHash: ContractSha256;
  readonly rewardRiskAudit: Readonly<RewardRiskAuditV1> | null;
  readonly validationResultHash: ContractSha256;
}

export class BrooksIdentityFreeResponseContractError extends Error {
  override readonly name = "BrooksIdentityFreeResponseContractError";
}

export function createOfflineBrooksResponseValidation(
  input: CreateOfflineBrooksResponseValidationInputV1,
): Readonly<BrooksOfflineResponseValidationV1> {
  try {
    exactRecord("offline Brooks response validation input", input, [
      "response",
      "binding",
      "context",
    ]);
    const response = exactRecord<BrooksIdentityFreeResponseV1>(
      "identity-free Brooks response",
      input.response,
      BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1,
    );
    const binding = exactRecord<BrooksLocalDecisionBindingV1>(
      "local Brooks decision binding",
      input.binding,
      BROOKS_LOCAL_DECISION_BINDING_KEYS_V1,
    );
    const responseClone = structuredClone(response);
    const bindingClone = structuredClone(binding);
    const contextClone = structuredClone(input.context);
    const validated = createBrooksDecision(
      { ...bindingClone, ...responseClone },
      contextClone,
    );
    const body = {
      schemaVersion: BROOKS_OFFLINE_RESPONSE_VALIDATION_SCHEMA_VERSION,
      validatorVersion: BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION,
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
  const actualKeys = Object.keys(value);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actualKeys.includes(key))
  ) {
    fail(`${name} must contain exact keys`);
  }
  return value as T;
}

function fail(message: string): never {
  throw new BrooksIdentityFreeResponseContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksIdentityFreeResponseContractError) throw error;
  if (error instanceof Error) {
    throw new BrooksIdentityFreeResponseContractError(error.message);
  }
  throw new BrooksIdentityFreeResponseContractError(
    "identity-free Brooks response validation failed",
  );
}
