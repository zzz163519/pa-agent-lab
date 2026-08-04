import { createHash } from "node:crypto";

import {
  BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2,
} from "./brooks-identity-free-response-v2.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION_V2 =
  "brooks-prompt-package-manifest.v2" as const;
export const BROOKS_PROMPT_PACKAGE_VERSION_V2 =
  "brooks-prompt-package.v2" as const;
export const BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION_V2 =
  "brooks-identity-free-response.schema.v2" as const;

export interface BrooksPromptPackageManifestV2 {
  readonly schemaVersion: typeof BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION_V2;
  readonly packageVersion: typeof BROOKS_PROMPT_PACKAGE_VERSION_V2;
  readonly proposalStatus: "unapproved";
  readonly prompt: Readonly<{
    readonly mediaType: "text/plain; charset=utf-8";
    readonly byteLength: number;
    readonly contentHash: ContractSha256;
  }>;
  readonly responseSchema: Readonly<{
    readonly schemaId: "https://pa-agent-lab.local/schemas/brooks-identity-free-response-v2";
    readonly schemaVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION_V2;
    readonly mediaType: "application/schema+json";
    readonly byteLength: number;
    readonly contentHash: ContractSha256;
  }>;
  readonly brooksDecisionContractVersion: "brooks-decision.v1";
  readonly validatorVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2;
  readonly supportedEntryTypes: readonly ["stop", "limit"];
  readonly marketNextEventAccepted: false;
  readonly providerCallsAuthorized: false;
  readonly packageHash: ContractSha256;
}

export interface VerifyBrooksPromptPackageV2ProposalInput {
  readonly promptBytes: Uint8Array;
  readonly responseSchemaBytes: Uint8Array;
  readonly manifest: BrooksPromptPackageManifestV2;
}

export interface VerifiedBrooksPromptPackageV2Proposal {
  readonly manifest: Readonly<BrooksPromptPackageManifestV2>;
}

export class BrooksPromptPackageV2ContractError extends Error {
  override readonly name = "BrooksPromptPackageV2ContractError";
}

const MANIFEST_KEYS = [
  "schemaVersion",
  "packageVersion",
  "proposalStatus",
  "prompt",
  "responseSchema",
  "brooksDecisionContractVersion",
  "validatorVersion",
  "supportedEntryTypes",
  "marketNextEventAccepted",
  "providerCallsAuthorized",
  "packageHash",
] as const;

export function verifyBrooksPromptPackageV2Proposal(
  input: VerifyBrooksPromptPackageV2ProposalInput,
): Readonly<VerifiedBrooksPromptPackageV2Proposal> {
  try {
    exactRecord("Prompt Package V2 proposal artifacts", input, [
      "promptBytes",
      "responseSchemaBytes",
      "manifest",
    ]);
    assertBrooksPromptPackageV2ManifestIntegrity(input.manifest);
    verifyComponent("prompt", input.promptBytes, input.manifest.prompt);
    verifyComponent(
      "response schema",
      input.responseSchemaBytes,
      input.manifest.responseSchema,
    );
    return deepFreeze({ manifest: structuredClone(input.manifest) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPromptPackageV2ManifestIntegrity(
  value: unknown,
): asserts value is BrooksPromptPackageManifestV2 {
  try {
    const manifest = exactRecord<BrooksPromptPackageManifestV2>(
      "Prompt Package V2 manifest",
      value,
      MANIFEST_KEYS,
    );
    if (
      manifest.schemaVersion !== BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION_V2 ||
      manifest.packageVersion !== BROOKS_PROMPT_PACKAGE_VERSION_V2
    ) {
      fail("Prompt Package V2 manifest version is unsupported");
    }
    if (manifest.proposalStatus !== "unapproved") {
      fail("Prompt Package V2 proposal must remain unapproved");
    }
    const prompt = exactRecord<BrooksPromptPackageManifestV2["prompt"]>(
      "Prompt Package V2 prompt identity",
      manifest.prompt,
      ["mediaType", "byteLength", "contentHash"],
    );
    if (prompt.mediaType !== "text/plain; charset=utf-8") {
      fail("Prompt Package V2 prompt mediaType is unsupported");
    }
    validateComponentIdentity("prompt", prompt);
    const schema = exactRecord<BrooksPromptPackageManifestV2["responseSchema"]>(
      "Prompt Package V2 response schema identity",
      manifest.responseSchema,
      ["schemaId", "schemaVersion", "mediaType", "byteLength", "contentHash"],
    );
    if (
      schema.schemaId !==
        "https://pa-agent-lab.local/schemas/brooks-identity-free-response-v2" ||
      schema.schemaVersion !== BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION_V2 ||
      schema.mediaType !== "application/schema+json"
    ) {
      fail("Prompt Package V2 response schema identity is unsupported");
    }
    validateComponentIdentity("response schema", schema);
    if (manifest.brooksDecisionContractVersion !== "brooks-decision.v1") {
      fail("Prompt Package V2 BrooksDecision version is unsupported");
    }
    if (
      manifest.validatorVersion !==
      BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION_V2
    ) {
      fail("Prompt Package V2 validator version is unsupported");
    }
    if (
      !Array.isArray(manifest.supportedEntryTypes) ||
      manifest.supportedEntryTypes.length !== 2 ||
      manifest.supportedEntryTypes[0] !== "stop" ||
      manifest.supportedEntryTypes[1] !== "limit"
    ) {
      fail("Prompt Package V2 supports exactly stop then limit entry types");
    }
    if (manifest.marketNextEventAccepted !== false) {
      fail("Prompt Package V2 must reject market_next_event");
    }
    if (manifest.providerCallsAuthorized !== false) {
      fail("Prompt Package V2 proposal does not authorize provider calls");
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(manifest.packageHash)) {
      fail("Prompt Package V2 packageHash must be a lowercase SHA-256");
    }
    const { packageHash, ...body } = manifest;
    if (packageHash !== canonicalHash(body)) {
      fail("Prompt Package V2 package hash does not match its manifest body");
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateComponentIdentity(
  name: string,
  component: { readonly byteLength: number; readonly contentHash: string },
): void {
  if (!Number.isSafeInteger(component.byteLength) || component.byteLength < 1) {
    fail(`${name} byteLength must be a positive safe integer`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(component.contentHash)) {
    fail(`${name} contentHash must be a lowercase SHA-256`);
  }
}

function verifyComponent(
  name: string,
  bytes: Uint8Array,
  component: { readonly byteLength: number; readonly contentHash: string },
): void {
  if (!(bytes instanceof Uint8Array)) fail(`${name} bytes must be Uint8Array`);
  if (bytes.byteLength !== component.byteLength) {
    fail(`${name} byte length does not match the manifest`);
  }
  const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (hash !== component.contentHash) {
    fail(`${name} content hash does not match the manifest`);
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
  throw new BrooksPromptPackageV2ContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksPromptPackageV2ContractError) throw error;
  if (error instanceof Error) {
    throw new BrooksPromptPackageV2ContractError(error.message);
  }
  throw new BrooksPromptPackageV2ContractError(
    "Prompt Package V2 proposal validation failed",
  );
}
