import { createHash } from "node:crypto";

import {
  assertProviderRequestEnvelopeIntegrity,
  type ProviderRequestEnvelopeV1,
} from "./provider-request-envelope-v1.ts";
import {
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const PROVIDER_TERMINAL_EVIDENCE_SCHEMA_VERSION =
  "provider-terminal-evidence.v1" as const;

export const PROVIDER_TERMINAL_REJECTION_CODES_V1 = [
  "MODEL_ID_UNAVAILABLE",
  "CAPABILITY_PREFLIGHT_FAILED",
  "PRIVACY_CONFIGURATION_UNVERIFIED",
  "EXTERNAL_RETENTION_UNVERIFIED",
  "HIDDEN_RETRY_UNVERIFIED",
  "INPUT_HASH_MISMATCH",
  "CHART_HASH_MISMATCH",
  "UNAUTHORIZED_CONTEXT_SOURCE",
  "TOOL_OR_SUBAGENT_USED",
  "TIMEOUT",
  "TRANSPORT_ERROR",
  "OUTPUT_RESOURCE_LIMIT",
  "INVALID_UTF8",
  "STRICT_JSON_REJECTED",
  "SCHEMA_REJECTED",
  "REFERENCE_REJECTED",
  "GEOMETRY_REJECTED",
  "SEMANTIC_REJECTED",
] as const;

export type ProviderTerminalRejectionCodeV1 =
  (typeof PROVIDER_TERMINAL_REJECTION_CODES_V1)[number];
export type ProviderTerminalStatusV1 =
  | "response_received"
  | "timeout"
  | "transport_error"
  | "output_resource_limit";

export interface ProviderUsageEvidenceV1 {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cacheReadTokens: number | null;
}

export interface ProviderValidationEvidenceV1 {
  readonly status: "not_run" | "accepted" | "rejected";
  readonly rejectionCodes: readonly ProviderTerminalRejectionCodeV1[];
  readonly validationResultHash: ContractSha256 | null;
}

export interface CreateProviderTerminalEvidenceInputV1 {
  readonly requestEnvelope: ProviderRequestEnvelopeV1;
  readonly attemptNumber: 1;
  readonly terminalStatus: ProviderTerminalStatusV1;
  readonly terminalJson: string | null;
  readonly latencyMs: number;
  readonly usage: ProviderUsageEvidenceV1 | null;
  readonly validation: ProviderValidationEvidenceV1;
}

export interface ProviderTerminalEvidenceV1 {
  readonly schemaVersion: typeof PROVIDER_TERMINAL_EVIDENCE_SCHEMA_VERSION;
  readonly requestEnvelopeHash: ContractSha256;
  readonly candidateProfileHash: ContractSha256;
  readonly candidateId: ProviderRequestEnvelopeV1["candidateId"];
  readonly providerSurface: ProviderRequestEnvelopeV1["providerSurface"];
  readonly modelId: ProviderRequestEnvelopeV1["modelId"];
  readonly attemptNumber: 1;
  readonly terminalStatus: ProviderTerminalStatusV1;
  readonly terminalJson: string | null;
  readonly terminalJsonByteLength: number | null;
  readonly responseHash: ContractSha256 | null;
  readonly latencyMs: number;
  readonly usage: Readonly<ProviderUsageEvidenceV1> | null;
  readonly validation: Readonly<ProviderValidationEvidenceV1>;
  readonly monetaryCostAvailability: "unavailable";
  readonly evidenceHash: ContractSha256;
}

export class ProviderTerminalEvidenceContractError extends Error {
  override readonly name = "ProviderTerminalEvidenceContractError";
}

export function createProviderTerminalEvidence(
  input: CreateProviderTerminalEvidenceInputV1,
): Readonly<ProviderTerminalEvidenceV1> {
  try {
    exactRecord("provider terminal evidence input", input, [
      "requestEnvelope",
      "attemptNumber",
      "terminalStatus",
      "terminalJson",
      "latencyMs",
      "usage",
      "validation",
    ]);
    assertProviderRequestEnvelopeIntegrity(input.requestEnvelope);
    if (input.attemptNumber !== 1) {
      fail("attemptNumber must be exactly 1");
    }
    if (
      !Number.isSafeInteger(input.latencyMs) ||
      input.latencyMs < 0 ||
      input.latencyMs > 300000
    ) {
      fail("latencyMs must be a safe integer from 0 through 300000");
    }
    const response = validateTerminalResponse(input);
    const usage = validateUsage(input.usage, input.terminalStatus);
    const validation = validateValidation(input.validation, input.terminalStatus);
    const body = {
      schemaVersion: PROVIDER_TERMINAL_EVIDENCE_SCHEMA_VERSION,
      requestEnvelopeHash: input.requestEnvelope.requestEnvelopeHash,
      candidateProfileHash: input.requestEnvelope.candidateProfileHash,
      candidateId: input.requestEnvelope.candidateId,
      providerSurface: input.requestEnvelope.providerSurface,
      modelId: input.requestEnvelope.modelId,
      attemptNumber: 1 as const,
      terminalStatus: input.terminalStatus,
      terminalJson: response.terminalJson,
      terminalJsonByteLength: response.terminalJsonByteLength,
      responseHash: response.responseHash,
      latencyMs: input.latencyMs,
      usage,
      validation,
      monetaryCostAvailability: "unavailable" as const,
    };
    return deepFreeze({ ...body, evidenceHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

function validateTerminalResponse(input: CreateProviderTerminalEvidenceInputV1): {
  readonly terminalJson: string | null;
  readonly terminalJsonByteLength: number | null;
  readonly responseHash: ContractSha256 | null;
} {
  if (input.terminalStatus === "response_received") {
    if (typeof input.terminalJson !== "string" || input.terminalJson.length === 0) {
      fail("response_received requires non-empty terminalJson");
    }
    const bytes = Buffer.from(input.terminalJson, "utf8");
    if (bytes.byteLength > 131072) {
      fail("terminalJson exceeds the fixed output resource limit");
    }
    return {
      terminalJson: input.terminalJson,
      terminalJsonByteLength: bytes.byteLength,
      responseHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    };
  }
  if (input.terminalJson !== null) {
    fail(`${input.terminalStatus} requires terminalJson to be null`);
  }
  return { terminalJson: null, terminalJsonByteLength: null, responseHash: null };
}

function validateUsage(
  value: ProviderUsageEvidenceV1 | null,
  status: ProviderTerminalStatusV1,
): Readonly<ProviderUsageEvidenceV1> | null {
  if (value === null) return null;
  if (status !== "response_received") {
    fail("usage must be null without a received response");
  }
  const usage = exactRecord<ProviderUsageEvidenceV1>("provider usage", value, [
    "inputTokens",
    "outputTokens",
    "cacheReadTokens",
  ]);
  for (const [key, count] of Object.entries(usage)) {
    if (count !== null && (!Number.isSafeInteger(count) || count < 0)) {
      fail(`usage.${key} must be a non-negative safe integer or null`);
    }
  }
  return structuredClone(usage);
}

function validateValidation(
  value: ProviderValidationEvidenceV1,
  terminalStatus: ProviderTerminalStatusV1,
): Readonly<ProviderValidationEvidenceV1> {
  const validation = exactRecord<ProviderValidationEvidenceV1>(
    "provider validation evidence",
    value,
    ["status", "rejectionCodes", "validationResultHash"],
  );
  if (!Array.isArray(validation.rejectionCodes)) {
    fail("validation rejectionCodes must be an array");
  }
  const codes = [...validation.rejectionCodes];
  if (
    new Set(codes).size !== codes.length ||
    codes.some(
      (code) =>
        !(PROVIDER_TERMINAL_REJECTION_CODES_V1 as readonly string[]).includes(code),
    )
  ) {
    fail("validation rejectionCodes are unsupported or duplicated");
  }
  if (terminalStatus === "response_received") {
    if (validation.status === "not_run") {
      fail("received responses require accepted or rejected validation");
    }
    if (validation.status === "accepted" && codes.length !== 0) {
      fail("accepted validation cannot contain rejection codes");
    }
    if (validation.status === "rejected" && codes.length === 0) {
      fail("rejected validation requires rejection codes");
    }
    if (validation.validationResultHash === null) {
      fail("received responses require a validationResultHash");
    }
    assertSha256("validationResultHash", validation.validationResultHash);
  } else {
    const expectedCode =
      terminalStatus === "timeout"
        ? "TIMEOUT"
        : terminalStatus === "transport_error"
          ? "TRANSPORT_ERROR"
          : "OUTPUT_RESOURCE_LIMIT";
    if (
      validation.status !== "not_run" ||
      codes.length !== 1 ||
      codes[0] !== expectedCode ||
      validation.validationResultHash !== null
    ) {
      fail(`${terminalStatus} requires one exact terminal rejection code`);
    }
  }
  return structuredClone(validation);
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
  throw new ProviderTerminalEvidenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderTerminalEvidenceContractError) throw error;
  if (error instanceof Error) {
    throw new ProviderTerminalEvidenceContractError(error.message);
  }
  throw new ProviderTerminalEvidenceContractError(
    "provider terminal evidence validation failed",
  );
}
