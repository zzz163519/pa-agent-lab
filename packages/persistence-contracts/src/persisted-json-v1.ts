import { readFileSync } from "node:fs";

import type { ErrorObject, ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  printParseErrorCode,
  visit,
  type ParseErrorCode,
} from "jsonc-parser";

import {
  assertBrooksPolicyCaseIntegrity,
  assertBrooksPolicyInputIntegrity,
  assertModelRunAuditRecordIntegrity,
  assertModelRunRecordIntegrity,
  assertProviderAttemptRecordIntegrity,
  canonicalStringify,
  deepFreeze,
  type BrooksPolicyCaseV1,
  type BrooksPolicyInputV1,
  type ModelRunAuditRecordV1,
  type ModelRunRecordV1,
  type ProviderAttemptRecordV1,
} from "@pa-agent-lab/contracts";

import {
  assertAnonymousChartArtifactMetadataIntegrity,
  createAnonymousChartArtifactMetadata,
  PersistenceContractError,
  type AnonymousChartArtifactMetadataV1,
} from "./chart-artifact-metadata-v1.ts";

export { createAnonymousChartArtifactMetadata };
export type { AnonymousChartArtifactMetadataV1 };

export const PERSISTED_RECORD_KINDS = [
  "policy_case",
  "policy_input",
  "chart_artifact_metadata",
  "model_run",
  "provider_attempt",
  "model_run_audit",
] as const;

export type PersistedRecordKindV1 = (typeof PERSISTED_RECORD_KINDS)[number];

export interface PersistedRecordMapV1 {
  readonly policy_case: BrooksPolicyCaseV1;
  readonly policy_input: BrooksPolicyInputV1;
  readonly chart_artifact_metadata: AnonymousChartArtifactMetadataV1;
  readonly model_run: ModelRunRecordV1;
  readonly provider_attempt: ProviderAttemptRecordV1;
  readonly model_run_audit: ModelRunAuditRecordV1;
}

const RECORD_COMPONENTS: Readonly<
  Record<PersistedRecordKindV1, string>
> = {
  policy_case: "BrooksPolicyCaseV1",
  policy_input: "BrooksPolicyInputV1",
  chart_artifact_metadata: "AnonymousChartArtifactMetadataV1",
  model_run: "ModelRunRecordV1",
  provider_attempt: "ProviderAttemptRecordV1",
  model_run_audit: "ModelRunAuditRecordV1",
};

const SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase1-persisted-records-v1";
const schemaBundle = JSON.parse(
  readFileSync(
    new URL(
      "../schemas/phase1-persisted-records-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
ajv.addSchema(schemaBundle, SCHEMA_ID);
const structuralValidators = Object.fromEntries(
  PERSISTED_RECORD_KINDS.map((kind) => {
    const component = RECORD_COMPONENTS[kind];
    const validator = ajv.compile({ $ref: `${SCHEMA_ID}#/$defs/${component}` });
    return [kind, validator];
  }),
) as Record<PersistedRecordKindV1, ValidateFunction>;

export function parsePersistedRecordJson<K extends PersistedRecordKindV1>(
  kind: K,
  json: string,
): Readonly<PersistedRecordMapV1[K]> {
  try {
    const parsed = parseStrictJson(json);
    validatePersistedRecord(kind, parsed);
    return deepFreeze(parsed) as Readonly<PersistedRecordMapV1[K]>;
  } catch (error) {
    rethrow(error);
  }
}

export function serializePersistedRecord<K extends PersistedRecordKindV1>(
  kind: K,
  record: PersistedRecordMapV1[K],
): string {
  try {
    validatePersistedRecord(kind, record);
    return canonicalStringify(record);
  } catch (error) {
    rethrow(error);
  }
}

function parseStrictJson(json: string): unknown {
  if (typeof json !== "string" || json.length === 0) {
    fail("persisted JSON must be a non-empty string");
  }
  const objectKeys: Set<string>[] = [];
  let duplicateKey: string | undefined;
  let syntaxError: ParseErrorCode | undefined;
  visit(
    json,
    {
      onObjectBegin: () => {
        objectKeys.push(new Set());
      },
      onObjectProperty: (property) => {
        const keys = objectKeys.at(-1);
        if (keys?.has(property)) duplicateKey ??= property;
        keys?.add(property);
      },
      onObjectEnd: () => {
        objectKeys.pop();
      },
      onError: (error) => {
        syntaxError ??= error;
      },
    },
    {
      disallowComments: true,
      allowTrailingComma: false,
      allowEmptyContent: false,
    },
  );
  if (duplicateKey !== undefined) {
    fail(`duplicate object key: ${duplicateKey}`);
  }
  if (syntaxError !== undefined) {
    fail(`invalid JSON syntax: ${printParseErrorCode(syntaxError)}`);
  }
  try {
    return JSON.parse(json) as unknown;
  } catch {
    fail("invalid JSON syntax");
  }
}

function validatePersistedRecord<K extends PersistedRecordKindV1>(
  kind: K,
  value: unknown,
): asserts value is PersistedRecordMapV1[K] {
  if (!(PERSISTED_RECORD_KINDS as readonly string[]).includes(kind)) {
    fail(`persisted record kind is unsupported: ${String(kind)}`);
  }
  const structural = structuralValidators[kind];
  if (!structural(value)) {
    fail(
      `${kind} structure is invalid: ${formatAjvErrors(structural.errors)}`,
    );
  }
  switch (kind) {
    case "policy_case":
      assertBrooksPolicyCaseIntegrity(value as BrooksPolicyCaseV1);
      return;
    case "policy_input":
      assertBrooksPolicyInputIntegrity(value as BrooksPolicyInputV1);
      return;
    case "chart_artifact_metadata":
      assertAnonymousChartArtifactMetadataIntegrity(value);
      return;
    case "model_run":
      assertModelRunRecordIntegrity(value);
      return;
    case "provider_attempt":
      assertProviderAttemptRecordIntegrity(value);
      return;
    case "model_run_audit":
      assertModelRunAuditRecordIntegrity(value);
      return;
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
  if (error instanceof Error) throw new PersistenceContractError(error.message);
  throw new PersistenceContractError("persisted JSON validation failed");
}
