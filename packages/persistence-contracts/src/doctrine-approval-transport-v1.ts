import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  deepFreeze,
  type ContractSha256,
  type DoctrineApprovalV1,
  type DoctrineProposalBundleV1,
  type DoctrineRetirementV1,
  type DoctrineStatusV1,
} from "@pa-agent-lab/contracts";

import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";

export const DOCTRINE_WORK_QUEUE_SCHEMA_VERSION =
  "doctrine-work-queue.v1" as const;
export const DOCTRINE_WORK_ITEM_SCHEMA_VERSION =
  "doctrine-work-item.v1" as const;
export const DOCTRINE_APPROVAL_MUTATION_RESULT_SCHEMA_VERSION =
  "doctrine-approval-mutation-result.v1" as const;

export interface DoctrineWorkItemSummaryV1 {
  readonly proposalHash: ContractSha256;
  readonly doctrineId: string;
  readonly sourceId: string;
  readonly concept: string;
  readonly status: DoctrineStatusV1;
  readonly approverPrincipal: DoctrineApprovalV1["approverPrincipal"] | null;
}

export interface DoctrineWorkQueueV1 {
  readonly schemaVersion: typeof DOCTRINE_WORK_QUEUE_SCHEMA_VERSION;
  readonly items: readonly Readonly<DoctrineWorkItemSummaryV1>[];
}

export interface DoctrineWorkItemV1 {
  readonly schemaVersion: typeof DOCTRINE_WORK_ITEM_SCHEMA_VERSION;
  readonly proposal: DoctrineProposalBundleV1;
  readonly status: DoctrineStatusV1;
  readonly approval: DoctrineApprovalV1 | null;
  readonly retirement: DoctrineRetirementV1 | null;
}

export interface ApproveDoctrineCommandV1 {
  readonly proposalHash: ContractSha256;
}

export interface RetireDoctrineCommandV1 {
  readonly approvalHash: ContractSha256;
  readonly reason: string;
}

export interface DoctrineApprovalMutationResultV1 {
  readonly schemaVersion: typeof DOCTRINE_APPROVAL_MUTATION_RESULT_SCHEMA_VERSION;
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind:
    | "doctrine_proposal"
    | "doctrine_approval"
    | "doctrine_retirement";
  readonly resourceHash: ContractSha256;
  readonly workItem: DoctrineWorkItemV1;
}

export interface DoctrineApprovalRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication:
    | "operator_token"
    | "operator_or_reviewer_token";
  readonly transport: "request_response";
}

export const DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1 = deepFreeze([
  route("POST", "/v1/doctrine/proposals", "appendDoctrineProposal", "operator_token"),
  route("GET", "/v1/doctrine/proposals", "listDoctrineProposals", "operator_or_reviewer_token"),
  route("GET", "/v1/doctrine/proposals/:doctrineId", "getDoctrineProposal", "operator_or_reviewer_token"),
  route("POST", "/v1/doctrine/proposals/:doctrineId/approve", "approveDoctrineProposal", "operator_or_reviewer_token"),
  route("POST", "/v1/doctrine/proposals/:doctrineId/retire", "retireDoctrineProposal", "operator_or_reviewer_token"),
] as const satisfies readonly DoctrineApprovalRouteManifestEntryV1[]);

export function assertApproveDoctrineCommand(
  value: unknown,
): asserts value is ApproveDoctrineCommandV1 {
  try {
    const command = exactRecord<ApproveDoctrineCommandV1>(
      "ApproveDoctrineCommand",
      value,
      ["proposalHash"],
    );
    assertSha256("proposalHash", command.proposalHash);
  } catch (error) {
    rethrow(error);
  }
}

export function assertRetireDoctrineCommand(
  value: unknown,
): asserts value is RetireDoctrineCommandV1 {
  try {
    const command = exactRecord<RetireDoctrineCommandV1>(
      "RetireDoctrineCommand",
      value,
      ["approvalHash", "reason"],
    );
    assertSha256("approvalHash", command.approvalHash);
    assertNonEmpty("reason", command.reason);
    if (command.reason.length > 400) {
      fail("reason must contain at most 400 characters");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createDoctrineApprovalMutationResult(input: {
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind: DoctrineApprovalMutationResultV1["resourceKind"];
  readonly resourceHash: ContractSha256;
  readonly workItem: DoctrineWorkItemV1;
}): Readonly<DoctrineApprovalMutationResultV1> {
  assertNonEmpty("requestId", input.requestId);
  assertOneOf("mutation status", input.status, ["inserted", "existing"] as const);
  assertOneOf("resourceKind", input.resourceKind, [
    "doctrine_proposal",
    "doctrine_approval",
    "doctrine_retirement",
  ] as const);
  assertSha256("resourceHash", input.resourceHash);
  return deepFreeze({
    schemaVersion: DOCTRINE_APPROVAL_MUTATION_RESULT_SCHEMA_VERSION,
    ...structuredClone(input),
  });
}

function route(
  method: "GET" | "POST",
  path: string,
  operationId: string,
  authentication: DoctrineApprovalRouteManifestEntryV1["authentication"],
): DoctrineApprovalRouteManifestEntryV1 {
  return {
    method,
    path,
    openapiPath: path.replace(":doctrineId", "{doctrineId}"),
    operationId,
    authentication,
    transport: "request_response",
  };
}

function exactRecord<T extends object>(
  name: string,
  value: unknown,
  keys: readonly string[],
): T {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  const actual = Object.keys(value as object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${name} must contain exact keys: ${expected.join(", ")}`);
  }
  return value as T;
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  throw new PersistenceContractError(
    error instanceof Error ? error.message : String(error),
  );
}
