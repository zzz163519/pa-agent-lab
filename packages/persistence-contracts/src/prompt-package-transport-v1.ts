import {
  assertSha256,
  deepFreeze,
  normalizeBrooksPromptPackageRollbackReason,
  type BrooksPromptPackageActivationAuthorityV1,
  type ContractSha256,
  type PreparedPolicyPayloadV1,
} from "@pa-agent-lab/contracts";

import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";

export type ActivateBrooksPromptPackageCommandV1 = Record<string, never>;

export interface RollbackBrooksPromptPackageCommandV1 {
  readonly targetActivationId: ContractSha256;
  readonly reason: string;
}

export interface PreparePolicyPayloadCommandV1 {
  readonly assemblyId: ContractSha256;
}

export type BrooksPromptPackageActivationResponseV1 =
  BrooksPromptPackageActivationAuthorityV1;
export type PreparedPolicyPayloadResponseV1 = PreparedPolicyPayloadV1;

export interface Phase5B1PromptPackageRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication: "operator_token";
  readonly transport: "request_response";
}

export const PHASE5B1_PROMPT_PACKAGE_ROUTE_MANIFEST_V1 = deepFreeze([
  route("POST", "/v1/prompt-package-activations", "activateBrooksPromptPackage"),
  route(
    "POST",
    "/v1/prompt-package-rollback-activations",
    "rollbackBrooksPromptPackage",
  ),
  route(
    "GET",
    "/v1/prompt-package-activations/current",
    "getCurrentBrooksPromptPackageActivation",
  ),
  route("POST", "/v1/prepared-policy-payloads", "preparePolicyPayload"),
  route(
    "GET",
    "/v1/prepared-policy-payloads/:preparationId",
    "getPreparedPolicyPayload",
  ),
] as const satisfies readonly Phase5B1PromptPackageRouteManifestEntryV1[]);

export function assertActivateBrooksPromptPackageCommand(
  value: unknown,
): asserts value is ActivateBrooksPromptPackageCommandV1 {
  exactRecord("ActivateBrooksPromptPackageCommand", value, []);
}

export function assertRollbackBrooksPromptPackageCommand(
  value: unknown,
): asserts value is RollbackBrooksPromptPackageCommandV1 {
  const command = exactRecord<RollbackBrooksPromptPackageCommandV1>(
    "RollbackBrooksPromptPackageCommand",
    value,
    ["targetActivationId", "reason"],
  );
  try {
    assertSha256("targetActivationId", command.targetActivationId);
    normalizeBrooksPromptPackageRollbackReason(command.reason);
  } catch (error) {
    fail(error instanceof Error ? error.message : "rollback command is invalid");
  }
}

export function assertPreparePolicyPayloadCommand(
  value: unknown,
): asserts value is PreparePolicyPayloadCommandV1 {
  const command = exactRecord<PreparePolicyPayloadCommandV1>(
    "PreparePolicyPayloadCommand",
    value,
    ["assemblyId"],
  );
  try {
    assertSha256("assemblyId", command.assemblyId);
  } catch (error) {
    fail(error instanceof Error ? error.message : "preparation command is invalid");
  }
}

function route(
  method: "GET" | "POST",
  path: string,
  operationId: string,
): Phase5B1PromptPackageRouteManifestEntryV1 {
  return {
    method,
    path,
    openapiPath: path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
    operationId,
    authentication: "operator_token",
    transport: "request_response",
  };
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
  throw new PersistenceContractError(message);
}
