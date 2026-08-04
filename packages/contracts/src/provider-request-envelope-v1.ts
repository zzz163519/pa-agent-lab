import {
  approvedProviderCandidateProfile,
  assertProviderCandidateProfileIntegrity,
  type ProviderCandidateIdV1,
  type ProviderCandidateProfileV1,
  type ProviderSurfaceV1,
} from "./provider-candidate-profile-v1.ts";
import {
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const PROVIDER_REQUEST_ENVELOPE_SCHEMA_VERSION =
  "provider-request-envelope.v1" as const;
export const PROVIDER_REQUEST_OUTPUT_SCHEMA_VERSION =
  "brooks-identity-free-response.schema.v2" as const;

export const PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1 = [
  "request.json",
  "prompt.txt",
  "response.schema.json",
  "context.png",
  "detail.png",
] as const;

export type ProviderRequestArtifactFileNameV1 =
  (typeof PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1)[number];

export interface ProviderRequestAuthorityV1 {
  readonly sourceScope: "synthetic_fixture_only";
  readonly preparationId: ContractSha256;
  readonly assemblyId: ContractSha256;
  readonly packageActivationId: ContractSha256;
  readonly packageHash: ContractSha256;
  readonly packageApprovalRecordHash: ContractSha256;
  readonly promptHash: ContractSha256;
  readonly responseSchemaHash: ContractSha256;
  readonly payloadHash: ContractSha256;
  readonly outputSchemaVersion: typeof PROVIDER_REQUEST_OUTPUT_SCHEMA_VERSION;
}

export interface ProviderRequestArtifactV1 {
  readonly fileName: ProviderRequestArtifactFileNameV1;
  readonly mediaType:
    | "application/json"
    | "text/plain; charset=utf-8"
    | "application/schema+json"
    | "image/png";
  readonly byteLength: number;
  readonly contentHash: ContractSha256;
}

export interface CreateProviderRequestEnvelopeInputV1 {
  readonly authority: ProviderRequestAuthorityV1;
  readonly candidateProfile: ProviderCandidateProfileV1;
  readonly artifacts: readonly ProviderRequestArtifactV1[];
}

export interface ProviderRequestEnvelopeV1 {
  readonly schemaVersion: typeof PROVIDER_REQUEST_ENVELOPE_SCHEMA_VERSION;
  readonly authority: Readonly<ProviderRequestAuthorityV1>;
  readonly candidateProfileHash: ContractSha256;
  readonly candidateId: ProviderCandidateIdV1;
  readonly providerSurface: ProviderSurfaceV1;
  readonly modelId: "gemini-3.6-flash-high" | "gpt-5.6";
  readonly reasoningEffort: "high";
  readonly artifacts: readonly Readonly<ProviderRequestArtifactV1>[];
  readonly repositoryControlledInputHash: ContractSha256;
  readonly isolationProfile: Readonly<{
    readonly freshWorkspace: true;
    readonly shellAllowed: false;
    readonly repositoryAccessAllowed: false;
    readonly ordinaryHomeAccessAllowed: false;
    readonly toolsAllowed: false;
    readonly pluginsMcpRulesHistoryAllowed: false;
    readonly childEnvironmentKeys: readonly [
      "HOME",
      "TMPDIR",
      "LANG",
      "LC_ALL",
      "NO_COLOR",
    ];
  }>;
  readonly resourcePolicy: Readonly<{
    readonly hardTimeoutSeconds: 300;
    readonly maxStdoutBytes: 262144;
    readonly maxStderrBytes: 65536;
    readonly maxTerminalJsonBytes: 131072;
    readonly attemptLimit: 1;
    readonly globalConcurrencyLimit: 1;
    readonly batchingAuthorized: false;
    readonly automaticRetryAuthorized: false;
  }>;
  readonly retentionProfile: Readonly<{
    readonly finalRawJson: true;
    readonly requestHash: true;
    readonly responseHash: true;
    readonly modelId: true;
    readonly usage: true;
    readonly latency: true;
    readonly validationResult: true;
    readonly chainOfThought: false;
    readonly toolTrajectory: false;
    readonly cliConversationHistory: false;
  }>;
  readonly requestEnvelopeHash: ContractSha256;
}

const AUTHORITY_KEYS = [
  "sourceScope",
  "preparationId",
  "assemblyId",
  "packageActivationId",
  "packageHash",
  "packageApprovalRecordHash",
  "promptHash",
  "responseSchemaHash",
  "payloadHash",
  "outputSchemaVersion",
] as const;
const ARTIFACT_KEYS = ["fileName", "mediaType", "byteLength", "contentHash"] as const;
const ENVELOPE_KEYS = [
  "schemaVersion",
  "authority",
  "candidateProfileHash",
  "candidateId",
  "providerSurface",
  "modelId",
  "reasoningEffort",
  "artifacts",
  "repositoryControlledInputHash",
  "isolationProfile",
  "resourcePolicy",
  "retentionProfile",
  "requestEnvelopeHash",
] as const;

const ISOLATION_PROFILE = {
  freshWorkspace: true,
  shellAllowed: false,
  repositoryAccessAllowed: false,
  ordinaryHomeAccessAllowed: false,
  toolsAllowed: false,
  pluginsMcpRulesHistoryAllowed: false,
  childEnvironmentKeys: ["HOME", "TMPDIR", "LANG", "LC_ALL", "NO_COLOR"],
} as const;

const RESOURCE_POLICY = {
  hardTimeoutSeconds: 300,
  maxStdoutBytes: 262144,
  maxStderrBytes: 65536,
  maxTerminalJsonBytes: 131072,
  attemptLimit: 1,
  globalConcurrencyLimit: 1,
  batchingAuthorized: false,
  automaticRetryAuthorized: false,
} as const;

const RETENTION_PROFILE = {
  finalRawJson: true,
  requestHash: true,
  responseHash: true,
  modelId: true,
  usage: true,
  latency: true,
  validationResult: true,
  chainOfThought: false,
  toolTrajectory: false,
  cliConversationHistory: false,
} as const;

const MEDIA_TYPES: Readonly<
  Record<ProviderRequestArtifactFileNameV1, ProviderRequestArtifactV1["mediaType"]>
> = {
  "request.json": "application/json",
  "prompt.txt": "text/plain; charset=utf-8",
  "response.schema.json": "application/schema+json",
  "context.png": "image/png",
  "detail.png": "image/png",
};

export class ProviderRequestEnvelopeContractError extends Error {
  override readonly name = "ProviderRequestEnvelopeContractError";
}

export function createProviderRequestEnvelope(
  input: CreateProviderRequestEnvelopeInputV1,
): Readonly<ProviderRequestEnvelopeV1> {
  try {
    exactRecord("provider request envelope input", input, [
      "authority",
      "candidateProfile",
      "artifacts",
    ]);
    const authority = validateAuthority(input.authority);
    assertProviderCandidateProfileIntegrity(input.candidateProfile);
    const artifacts = validateArtifacts(input.artifacts, authority);
    const repositoryControlledInputHash = canonicalHash({ authority, artifacts });
    const body = {
      schemaVersion: PROVIDER_REQUEST_ENVELOPE_SCHEMA_VERSION,
      authority,
      candidateProfileHash: input.candidateProfile.profileHash,
      candidateId: input.candidateProfile.candidateId,
      providerSurface: input.candidateProfile.providerSurface,
      modelId: input.candidateProfile.modelId,
      reasoningEffort: input.candidateProfile.reasoningEffort,
      artifacts,
      repositoryControlledInputHash,
      isolationProfile: structuredClone(ISOLATION_PROFILE),
      resourcePolicy: structuredClone(RESOURCE_POLICY),
      retentionProfile: structuredClone(RETENTION_PROFILE),
    } as const;
    return deepFreeze({
      ...body,
      requestEnvelopeHash: canonicalHash(body),
    });
  } catch (error) {
    rethrow(error);
  }
}

export function assertProviderRequestEnvelopeIntegrity(
  value: unknown,
): asserts value is ProviderRequestEnvelopeV1 {
  try {
    const envelope = exactRecord<ProviderRequestEnvelopeV1>(
      "provider request envelope",
      value,
      ENVELOPE_KEYS,
    );
    if (envelope.schemaVersion !== PROVIDER_REQUEST_ENVELOPE_SCHEMA_VERSION) {
      fail("provider request envelope schemaVersion is unsupported");
    }
    const authority = validateAuthority(envelope.authority);
    const artifacts = validateArtifacts(envelope.artifacts, authority);
    const expectedInputHash = canonicalHash({ authority, artifacts });
    if (envelope.repositoryControlledInputHash !== expectedInputHash) {
      fail("repository-controlled input hash does not match its content");
    }
    assertSha256("candidateProfileHash", envelope.candidateProfileHash);
    validateCandidateProjection(envelope);
    if (canonicalHash(envelope.isolationProfile) !== canonicalHash(ISOLATION_PROFILE)) {
      fail("isolation profile does not match the fixed policy");
    }
    if (canonicalHash(envelope.resourcePolicy) !== canonicalHash(RESOURCE_POLICY)) {
      fail("resource policy does not match the fixed policy");
    }
    if (canonicalHash(envelope.retentionProfile) !== canonicalHash(RETENTION_PROFILE)) {
      fail("retention profile does not match the fixed policy");
    }
    const { requestEnvelopeHash, ...body } = envelope;
    if (requestEnvelopeHash !== canonicalHash(body)) {
      fail("provider request envelope hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateAuthority(value: unknown): Readonly<ProviderRequestAuthorityV1> {
  const authority = exactRecord<ProviderRequestAuthorityV1>(
    "provider request authority",
    value,
    AUTHORITY_KEYS,
  );
  if (authority.sourceScope !== "synthetic_fixture_only") {
    fail("provider request sourceScope must be synthetic_fixture_only");
  }
  for (const key of AUTHORITY_KEYS.filter((key) => key.endsWith("Id") || key.endsWith("Hash"))) {
    assertSha256(`authority.${key}`, authority[key] as string);
  }
  if (authority.outputSchemaVersion !== PROVIDER_REQUEST_OUTPUT_SCHEMA_VERSION) {
    fail("provider request requires the V2 output schema");
  }
  return structuredClone(authority);
}

function validateArtifacts(
  values: readonly ProviderRequestArtifactV1[],
  authority: ProviderRequestAuthorityV1,
): readonly Readonly<ProviderRequestArtifactV1>[] {
  if (!Array.isArray(values) || values.length !== PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1.length) {
    fail("provider request requires exactly five generic files");
  }
  const artifacts = values.map((value, index) => {
    const artifact = exactRecord<ProviderRequestArtifactV1>(
      "provider request artifact",
      value,
      ARTIFACT_KEYS,
    );
    const expectedName = PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1[index];
    if (artifact.fileName !== expectedName) {
      fail("provider request artifact filenames must be the exact generic files");
    }
    if (artifact.mediaType !== MEDIA_TYPES[expectedName]) {
      fail(`provider request artifact mediaType is invalid for ${expectedName}`);
    }
    if (
      !Number.isSafeInteger(artifact.byteLength) ||
      artifact.byteLength < 1 ||
      artifact.byteLength > 16 * 1024 * 1024
    ) {
      fail("provider request artifact byteLength is out of bounds");
    }
    assertSha256("artifact.contentHash", artifact.contentHash);
    return structuredClone(artifact);
  });
  const byName = new Map(artifacts.map((artifact) => [artifact.fileName, artifact]));
  if (byName.get("request.json")?.contentHash !== authority.payloadHash) {
    fail("request artifact hash does not match payloadHash");
  }
  if (byName.get("prompt.txt")?.contentHash !== authority.promptHash) {
    fail("prompt hash does not match the authority binding");
  }
  if (
    byName.get("response.schema.json")?.contentHash !==
    authority.responseSchemaHash
  ) {
    fail("response schema hash does not match the authority binding");
  }
  return artifacts;
}

function validateCandidateProjection(envelope: ProviderRequestEnvelopeV1): void {
  const approved = approvedProviderCandidateProfile(envelope.candidateId);
  if (envelope.candidateProfileHash !== approved.profileHash) {
    fail("candidateProfileHash does not match the approved candidate profile");
  }
  const gemini = envelope.candidateId === "candidate:gemini-antigravity-v1";
  const expected = gemini
    ? {
        providerSurface: "antigravity-cli",
        modelId: "gemini-3.6-flash-high",
      }
    : envelope.candidateId === "candidate:gpt-codex-v1"
      ? { providerSurface: "codex-cli", modelId: "gpt-5.6" }
      : null;
  if (
    expected === null ||
    envelope.providerSurface !== expected.providerSurface ||
    envelope.modelId !== expected.modelId ||
    envelope.reasoningEffort !== "high"
  ) {
    fail("provider request candidate projection is invalid");
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
  throw new ProviderRequestEnvelopeContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderRequestEnvelopeContractError) throw error;
  if (error instanceof Error) {
    throw new ProviderRequestEnvelopeContractError(error.message);
  }
  throw new ProviderRequestEnvelopeContractError(
    "provider request envelope validation failed",
  );
}
