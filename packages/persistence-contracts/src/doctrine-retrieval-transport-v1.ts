import {
  assertNonEmpty,
  assertSha256,
  deepFreeze,
  normalizeDoctrineQuery,
  type ContractSha256,
  type DoctrineCorpusActivationV1,
  type DoctrineCorpusSnapshotV1,
  type DoctrineIngestionRunV1,
  type DoctrineRetrievalEvidenceV1,
  type DoctrineRetrievalResponseV1,
} from "@pa-agent-lab/contracts";
import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";

export const DOCTRINE_RETRIEVAL_MUTATION_RESULT_SCHEMA_VERSION =
  "doctrine-retrieval-mutation-result.v1" as const;

export interface DoctrineIngestionCommandV1 {
  readonly snapshotId?: ContractSha256;
  readonly attemptIndex?: number;
}
export interface DoctrineActivationCommandV1 {
  readonly runId: ContractSha256;
  readonly qualityReportHash: ContractSha256;
}
export interface DoctrineRetrievalQueryCommandV1 {
  readonly query: string;
  readonly limit?: number;
  readonly repeatIndex?: number;
  readonly activationId?: ContractSha256;
  readonly snapshotId?: ContractSha256;
  readonly profileHash?: ContractSha256;
}
export interface DoctrineRetrievalMutationResultV1 {
  readonly schemaVersion: typeof DOCTRINE_RETRIEVAL_MUTATION_RESULT_SCHEMA_VERSION;
  readonly requestId: string;
  readonly status: "inserted" | "existing";
  readonly resourceKind: "doctrine_ingestion_run" | "doctrine_corpus_activation";
  readonly resourceHash: ContractSha256;
}
export interface DoctrineRetrievalRouteManifestEntryV1 {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly openapiPath: string;
  readonly operationId: string;
  readonly authentication: "operator_token";
  readonly transport: "request_response";
}

export const DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1 = deepFreeze([
  route("POST", "/v1/doctrine/ingestion-runs", "createDoctrineIngestionRun"),
  route("GET", "/v1/doctrine/corpus-snapshots/:snapshotId", "getDoctrineCorpusSnapshot"),
  route("GET", "/v1/doctrine/ingestion-runs/:runId", "getDoctrineIngestionRun"),
  route("POST", "/v1/doctrine/activations", "createDoctrineCorpusActivation"),
  route("GET", "/v1/doctrine/activations/current", "getCurrentDoctrineActivation"),
  route("POST", "/v1/doctrine/retrieval-queries", "createDoctrineRetrievalQuery"),
  route("GET", "/v1/doctrine/retrieval-evidence/:evidenceId", "getDoctrineRetrievalEvidence"),
] as const satisfies readonly DoctrineRetrievalRouteManifestEntryV1[]);

export function assertDoctrineIngestionCommand(value: unknown): asserts value is DoctrineIngestionCommandV1 {
  const command = exactRecord<DoctrineIngestionCommandV1>(
    "DoctrineIngestionCommand",
    value,
    ["snapshotId", "attemptIndex"],
    [],
  );
  if (command.snapshotId !== undefined) assertSha256("snapshotId", command.snapshotId);
  if (command.attemptIndex !== undefined) nonNegativeInteger("attemptIndex", command.attemptIndex);
}
export function assertDoctrineActivationCommand(value: unknown): asserts value is DoctrineActivationCommandV1 {
  const command = exactRecord<DoctrineActivationCommandV1>("DoctrineActivationCommand", value, ["runId", "qualityReportHash"]);
  assertSha256("runId", command.runId);
  assertSha256("qualityReportHash", command.qualityReportHash);
}
export function assertDoctrineRetrievalQueryCommand(value: unknown): asserts value is DoctrineRetrievalQueryCommandV1 {
  const command = exactRecord<DoctrineRetrievalQueryCommandV1>(
    "DoctrineRetrievalQueryCommand",
    value,
    ["query", "limit", "repeatIndex", "activationId", "snapshotId", "profileHash"],
    ["query"],
  );
  normalizeDoctrineQuery(command.query);
  if (command.limit !== undefined && (!Number.isInteger(command.limit) || command.limit < 1 || command.limit > 8)) fail("limit must be between 1 and 8");
  if (command.repeatIndex !== undefined) nonNegativeInteger("repeatIndex", command.repeatIndex);
  for (const [name, hash] of [["activationId", command.activationId], ["snapshotId", command.snapshotId], ["profileHash", command.profileHash]] as const) if (hash !== undefined) assertSha256(name, hash);
}
export function createDoctrineRetrievalMutationResult(input: Omit<DoctrineRetrievalMutationResultV1, "schemaVersion">): Readonly<DoctrineRetrievalMutationResultV1> {
  assertNonEmpty("requestId", input.requestId);
  assertSha256("resourceHash", input.resourceHash);
  if (input.status !== "inserted" && input.status !== "existing") fail("mutation status is unsupported");
  if (input.resourceKind !== "doctrine_ingestion_run" && input.resourceKind !== "doctrine_corpus_activation") fail("resourceKind is unsupported");
  return deepFreeze({ schemaVersion: DOCTRINE_RETRIEVAL_MUTATION_RESULT_SCHEMA_VERSION, ...structuredClone(input) });
}

export type DoctrineRetrievalSnapshotResponseV1 = DoctrineCorpusSnapshotV1;
export type DoctrineRetrievalRunResponseV1 = DoctrineIngestionRunV1;
export type DoctrineRetrievalActivationResponseV1 = DoctrineCorpusActivationV1;
export type DoctrineRetrievalEvidenceResponseV1 = DoctrineRetrievalEvidenceV1;
export type DoctrineRetrievalQueryResponseV1 = DoctrineRetrievalResponseV1;

function route(method: "GET" | "POST", path: string, operationId: string): DoctrineRetrievalRouteManifestEntryV1 {
  return { method, path, openapiPath: path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"), operationId, authentication: "operator_token", transport: "request_response" };
}
function exactRecord<T extends object>(
  name: string,
  value: unknown,
  keys: readonly string[],
  requiredKeys: readonly string[] = keys,
): T {
  if (value === null || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail(`${name} must be a plain object`);
  const actual = Object.keys(value as object);
  if (actual.some((key) => !keys.includes(key)) || requiredKeys.some((key) => !actual.includes(key))) fail(`${name} must contain exact keys`);
  return value as T;
}
function nonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) fail(`${name} must be non-negative`);
}
function fail(message: string): never {
  throw new PersistenceContractError(message);
}
