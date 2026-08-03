import {
  assertSha256,
  deepFreeze,
  normalizeDoctrineRollbackReason,
  type ContractSha256,
  type DoctrineActivationAuthorityV1,
  type PolicyAssemblyFailureV1,
  type PolicyAssemblyV1,
} from "@pa-agent-lab/contracts";
import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";

export interface DoctrineCorpusRollbackCommandV1 {
  readonly targetActivationId: ContractSha256;
  readonly reason: string;
}

export interface CreatePolicyAssemblyCommandV1 {
  readonly caseHash: ContractSha256;
}

export type DoctrineActivationAuthorityResponseV1 = DoctrineActivationAuthorityV1;
export type PolicyAssemblyTerminalV1 = PolicyAssemblyV1 | PolicyAssemblyFailureV1;
export type PolicyAssemblyResponseV1 = PolicyAssemblyV1;
export type PolicyAssemblyFailureResponseV1 = PolicyAssemblyFailureV1;

export interface Phase5APolicyAssemblyRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication: "operator_token";
  readonly transport: "request_response";
}

export const PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1 = deepFreeze([
  route(
    "POST",
    "/v1/doctrine/rollback-activations",
    "createDoctrineCorpusRollbackActivation",
  ),
  route(
    "GET",
    "/v1/doctrine/activations/:activationId",
    "getDoctrineActivation",
  ),
  route("POST", "/v1/policy-assemblies", "createPolicyAssembly"),
  route("GET", "/v1/policy-assemblies/:assemblyId", "getPolicyAssembly"),
  route(
    "GET",
    "/v1/policy-assembly-failures/:failureId",
    "getPolicyAssemblyFailure",
  ),
] as const satisfies readonly Phase5APolicyAssemblyRouteManifestEntryV1[]);

export function assertCreatePolicyAssemblyCommand(
  value: unknown,
): asserts value is CreatePolicyAssemblyCommandV1 {
  const command = exactRecord<CreatePolicyAssemblyCommandV1>(
    "CreatePolicyAssemblyCommand",
    value,
    ["caseHash"],
  );
  try {
    assertSha256("caseHash", command.caseHash);
  } catch (error) {
    fail(error instanceof Error ? error.message : "assembly command is invalid");
  }
}

export function assertDoctrineCorpusRollbackCommand(
  value: unknown,
): asserts value is DoctrineCorpusRollbackCommandV1 {
  const command = exactRecord<DoctrineCorpusRollbackCommandV1>(
    "DoctrineCorpusRollbackCommand",
    value,
    ["targetActivationId", "reason"],
  );
  try {
    assertSha256("targetActivationId", command.targetActivationId);
    normalizeDoctrineRollbackReason(command.reason);
  } catch (error) {
    fail(error instanceof Error ? error.message : "rollback command is invalid");
  }
}

function route(
  method: "GET" | "POST",
  path: string,
  operationId: string,
): Phase5APolicyAssemblyRouteManifestEntryV1 {
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
