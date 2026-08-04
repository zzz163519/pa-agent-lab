import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const PROVIDER_CANDIDATE_PROFILE_SCHEMA_VERSION =
  "provider-candidate-profile.v1" as const;

export const PROVIDER_CANDIDATE_IDS_V1 = [
  "candidate:gemini-antigravity-v1",
  "candidate:gpt-codex-v1",
] as const;

export type ProviderCandidateIdV1 = (typeof PROVIDER_CANDIDATE_IDS_V1)[number];
export type ProviderSurfaceV1 = "antigravity-cli" | "codex-cli";

export interface ProviderCandidateProfileV1 {
  readonly schemaVersion: typeof PROVIDER_CANDIDATE_PROFILE_SCHEMA_VERSION;
  readonly candidateId: ProviderCandidateIdV1;
  readonly providerSurface: ProviderSurfaceV1;
  readonly executable: "agy" | "codex";
  readonly modelId: "gemini-3.6-flash-high" | "gpt-5.6";
  readonly reasoningEffort: "high";
  readonly modelIdPinned: true;
  readonly cliVersionPinned: false;
  readonly cliBinaryHashPinned: false;
  readonly automaticModelFallbackAuthorized: false;
  readonly profileHash: ContractSha256;
}

export type CreateProviderCandidateProfileInputV1 = Omit<
  ProviderCandidateProfileV1,
  "profileHash"
>;

const PROFILE_KEYS = [
  "schemaVersion",
  "candidateId",
  "providerSurface",
  "executable",
  "modelId",
  "reasoningEffort",
  "modelIdPinned",
  "cliVersionPinned",
  "cliBinaryHashPinned",
  "automaticModelFallbackAuthorized",
] as const;

const STORED_PROFILE_KEYS = [...PROFILE_KEYS, "profileHash"] as const;

const DEFINITIONS: Readonly<
  Record<ProviderCandidateIdV1, CreateProviderCandidateProfileInputV1>
> = {
  "candidate:gemini-antigravity-v1": {
    schemaVersion: PROVIDER_CANDIDATE_PROFILE_SCHEMA_VERSION,
    candidateId: "candidate:gemini-antigravity-v1",
    providerSurface: "antigravity-cli",
    executable: "agy",
    modelId: "gemini-3.6-flash-high",
    reasoningEffort: "high",
    modelIdPinned: true,
    cliVersionPinned: false,
    cliBinaryHashPinned: false,
    automaticModelFallbackAuthorized: false,
  },
  "candidate:gpt-codex-v1": {
    schemaVersion: PROVIDER_CANDIDATE_PROFILE_SCHEMA_VERSION,
    candidateId: "candidate:gpt-codex-v1",
    providerSurface: "codex-cli",
    executable: "codex",
    modelId: "gpt-5.6",
    reasoningEffort: "high",
    modelIdPinned: true,
    cliVersionPinned: false,
    cliBinaryHashPinned: false,
    automaticModelFallbackAuthorized: false,
  },
};

export class ProviderCandidateProfileContractError extends Error {
  override readonly name = "ProviderCandidateProfileContractError";
}

export function approvedProviderCandidateProfile(
  candidateId: ProviderCandidateIdV1,
): Readonly<ProviderCandidateProfileV1> {
  const definition = DEFINITIONS[candidateId];
  if (definition === undefined) {
    fail(`candidateId is unsupported: ${candidateId}`);
  }
  return createProviderCandidateProfile(structuredClone(definition));
}

export function createProviderCandidateProfile(
  input: CreateProviderCandidateProfileInputV1,
): Readonly<ProviderCandidateProfileV1> {
  try {
    const profile = exactRecord<CreateProviderCandidateProfileInputV1>(
      "provider candidate profile input",
      input,
      PROFILE_KEYS,
    );
    const expected = DEFINITIONS[profile.candidateId];
    if (expected === undefined) fail("candidateId is unsupported");
    for (const key of PROFILE_KEYS) {
      if (profile[key] !== expected[key]) {
        if (key === "automaticModelFallbackAuthorized") {
          fail("automatic model fallback is forbidden");
        }
        fail(`candidate fields do not match the approved ${key}`);
      }
    }
    const body = structuredClone(profile);
    return deepFreeze({ ...body, profileHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertProviderCandidateProfileIntegrity(
  value: unknown,
): asserts value is ProviderCandidateProfileV1 {
  try {
    const profile = exactRecord<ProviderCandidateProfileV1>(
      "provider candidate profile",
      value,
      STORED_PROFILE_KEYS,
    );
    const { profileHash, ...body } = profile;
    const expected = createProviderCandidateProfile(body);
    if (profileHash !== expected.profileHash) {
      fail("provider candidate profile hash does not match its content");
    }
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
  throw new ProviderCandidateProfileContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderCandidateProfileContractError) throw error;
  if (error instanceof Error) {
    throw new ProviderCandidateProfileContractError(error.message);
  }
  throw new ProviderCandidateProfileContractError(
    "provider candidate profile validation failed",
  );
}
