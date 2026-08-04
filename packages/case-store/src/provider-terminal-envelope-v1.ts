import {
  deepFreeze,
  type ProviderTerminalRejectionCodeV1,
  type ProviderUsageEvidenceV1,
} from "@pa-agent-lab/contracts";
import { parseStrictJsonText } from "@pa-agent-lab/persistence-contracts";

export const PROVIDER_CLI_TERMINAL_ENVELOPE_SCHEMA_VERSION =
  "provider-cli-terminal-envelope.v1" as const;

export interface DecodedProviderCliTerminalEnvelopeV1 {
  readonly schemaVersion: typeof PROVIDER_CLI_TERMINAL_ENVELOPE_SCHEMA_VERSION;
  readonly terminalJson: string;
  readonly usage: Readonly<ProviderUsageEvidenceV1> | null;
  readonly toolOrSubagentUsed: false;
}

export class ProviderTerminalEnvelopeError extends Error {
  override readonly name = "ProviderTerminalEnvelopeError";
  readonly rejectionCode: ProviderTerminalRejectionCodeV1;

  constructor(
    message: string,
    rejectionCode: ProviderTerminalRejectionCodeV1,
  ) {
    super(message);
    this.rejectionCode = rejectionCode;
  }
}

interface RawEnvelopeV1 {
  readonly schemaVersion: string;
  readonly event: string;
  readonly terminalJson: string;
  readonly usage: ProviderUsageEvidenceV1 | null;
  readonly toolOrSubagentUsed: boolean;
}

export function decodeProviderCliTerminalEnvelope(
  stdoutBytes: Uint8Array,
): Readonly<DecodedProviderCliTerminalEnvelopeV1> {
  try {
    if (!(stdoutBytes instanceof Uint8Array) || stdoutBytes.byteLength === 0) {
      fail("provider output must be non-empty bytes", "STRICT_JSON_REJECTED");
    }
    if (stdoutBytes.byteLength > 262144) {
      fail("provider output exceeds the fixed resource limit", "OUTPUT_RESOURCE_LIMIT");
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(stdoutBytes);
    } catch {
      fail("provider output is not valid UTF-8", "INVALID_UTF8");
    }
    let parsed: unknown;
    try {
      parsed = parseStrictJsonText(text);
    } catch {
      fail("provider output is not one closed canonical envelope", "STRICT_JSON_REJECTED");
    }
    const envelope = exactRecord<RawEnvelopeV1>(
      "provider CLI terminal envelope",
      parsed,
      ["schemaVersion", "event", "terminalJson", "usage", "toolOrSubagentUsed"],
    );
    if (JSON.stringify(envelope) !== text) {
      fail("provider output is not one closed canonical envelope", "STRICT_JSON_REJECTED");
    }
    if (envelope.schemaVersion !== PROVIDER_CLI_TERMINAL_ENVELOPE_SCHEMA_VERSION) {
      fail("provider terminal envelope schemaVersion is unsupported", "STRICT_JSON_REJECTED");
    }
    if (envelope.event !== "terminal_result") {
      fail("provider terminal envelope event must be terminal_result", "STRICT_JSON_REJECTED");
    }
    if (envelope.toolOrSubagentUsed !== false) {
      fail("provider terminal envelope reports tool or subagent use", "TOOL_OR_SUBAGENT_USED");
    }
    if (typeof envelope.terminalJson !== "string" || envelope.terminalJson.length === 0) {
      fail("terminalJson must be a non-empty string", "STRICT_JSON_REJECTED");
    }
    const terminalBytes = Buffer.from(envelope.terminalJson, "utf8");
    if (terminalBytes.byteLength > 131072) {
      fail("terminalJson exceeds the fixed resource limit", "OUTPUT_RESOURCE_LIMIT");
    }
    let terminalValue: unknown;
    try {
      terminalValue = parseStrictJsonText(envelope.terminalJson);
    } catch {
      fail("terminalJson is not strict JSON", "STRICT_JSON_REJECTED");
    }
    if (
      terminalValue === null ||
      typeof terminalValue !== "object" ||
      Array.isArray(terminalValue)
    ) {
      fail("terminalJson must contain exactly one JSON object", "STRICT_JSON_REJECTED");
    }
    const usage = validateUsage(envelope.usage);
    return deepFreeze({
      schemaVersion: PROVIDER_CLI_TERMINAL_ENVELOPE_SCHEMA_VERSION,
      terminalJson: envelope.terminalJson,
      usage,
      toolOrSubagentUsed: false,
    });
  } catch (error) {
    rethrow(error);
  }
}

function validateUsage(
  value: ProviderUsageEvidenceV1 | null,
): Readonly<ProviderUsageEvidenceV1> | null {
  if (value === null) return null;
  const usage = exactRecord<ProviderUsageEvidenceV1>("provider usage", value, [
    "inputTokens",
    "outputTokens",
    "cacheReadTokens",
  ]);
  for (const [key, count] of Object.entries(usage)) {
    if (count !== null && (!Number.isSafeInteger(count) || count < 0)) {
      fail(`usage.${key} must be a non-negative safe integer or null`, "STRICT_JSON_REJECTED");
    }
  }
  return structuredClone(usage);
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
    fail(`${name} must be a plain object with exact keys`, "STRICT_JSON_REJECTED");
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actual.includes(key))
  ) {
    fail(`${name} must contain exact keys`, "STRICT_JSON_REJECTED");
  }
  return value as T;
}

function fail(
  message: string,
  rejectionCode: ProviderTerminalRejectionCodeV1,
): never {
  throw new ProviderTerminalEnvelopeError(message, rejectionCode);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderTerminalEnvelopeError) throw error;
  if (error instanceof Error) {
    throw new ProviderTerminalEnvelopeError(
      error.message,
      "STRICT_JSON_REJECTED",
    );
  }
  throw new ProviderTerminalEnvelopeError(
    "provider terminal envelope validation failed",
    "STRICT_JSON_REJECTED",
  );
}
