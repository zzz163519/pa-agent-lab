import {
  assertProviderRequestEnvelopeIntegrity,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
  type ProviderRequestEnvelopeV1,
  type ProviderTerminalRejectionCodeV1,
} from "@pa-agent-lab/contracts";

export interface CodexOfflineCapabilityEvidenceV1 {
  readonly schemaVersion: "codex-offline-capability-evidence.v1";
  readonly candidateProfileHash: ContractSha256;
  readonly helpText: string;
  readonly modelCatalogText: string;
  readonly configReferenceText: string;
  readonly hiddenRetryDisposition:
    | "unverified"
    | "disabled"
    | "observable_per_attempt";
}

export interface CodexCapabilityProofV1 {
  readonly schemaVersion: "codex-capability-proof.v1";
  readonly candidateProfileHash: ContractSha256;
  readonly helpEvidenceHash: ContractSha256;
  readonly exactModelAvailable: boolean;
  readonly highEffortSupported: boolean;
  readonly exactTwoImageAttachmentSupported: boolean;
  readonly outputSchemaSupported: boolean;
  readonly machineOutputSupported: boolean;
  readonly ephemeralSupported: boolean;
  readonly isolatedHomeSupported: boolean;
  readonly userConfigAndRulesExcluded: boolean;
  readonly readOnlySandboxSupported: boolean;
  readonly networkDisabled: boolean;
  readonly toolEventsObservable: boolean;
  readonly hiddenRetryDisabledOrObservable: boolean;
  readonly proofHash: ContractSha256;
}

export interface AntigravityCapabilityProofV1 {
  readonly schemaVersion: "antigravity-capability-proof.v1";
  readonly candidateProfileHash: ContractSha256;
  readonly helpEvidenceHash: ContractSha256;
  readonly exactModelAvailable: boolean;
  readonly highEffortSupported: boolean;
  readonly nonInteractivePrintSupported: boolean;
  readonly exactTwoImageAttachmentSupported: boolean;
  readonly outputSchemaSupported: boolean;
  readonly machineOutputSupported: boolean;
  readonly strictSandboxSupported: boolean;
  readonly isolatedWorkspaceSupported: boolean;
  readonly pluginsMcpRulesHooksSkillsHistoryExcluded: boolean;
  readonly toolsAndSubagentsDisabledOrObservable: boolean;
  readonly interactionDataCollectionDisabled: boolean;
  readonly externalRetentionAccepted: boolean;
  readonly hiddenRetryDisabledOrObservable: boolean;
  readonly proofHash: ContractSha256;
}

interface CreateCodexInvocationProfileInputV1 {
  readonly requestEnvelope: ProviderRequestEnvelopeV1;
  readonly capabilityProof: CodexCapabilityProofV1;
}

interface CreateAntigravityInvocationProfileInputV1 {
  readonly requestEnvelope: ProviderRequestEnvelopeV1;
  readonly capabilityProof: AntigravityCapabilityProofV1;
}

export interface ProviderInvocationProfileV1 {
  readonly schemaVersion: "provider-invocation-profile.v1";
  readonly candidateId:
    | "candidate:gpt-codex-v1"
    | "candidate:gemini-antigravity-v1";
  readonly candidateProfileHash: `sha256:${string}`;
  readonly availability: "available" | "unavailable";
  readonly executable: "codex" | "agy" | null;
  readonly argv: readonly string[] | null;
  readonly stdinFileName: "prompt.txt" | null;
  readonly terminalOutputFileName: "terminal.json" | null;
  readonly shell: false;
  readonly rejectionCodes: readonly ProviderTerminalRejectionCodeV1[];
  readonly unavailableReason: string | null;
  readonly realInvocationAuthorized: false;
}

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

const CODEX_EVIDENCE_KEYS = [
  "schemaVersion",
  "candidateProfileHash",
  "helpText",
  "modelCatalogText",
  "configReferenceText",
  "hiddenRetryDisposition",
] as const;

const CODEX_PROOF_KEYS = [
  "schemaVersion",
  "candidateProfileHash",
  "helpEvidenceHash",
  "exactModelAvailable",
  "highEffortSupported",
  "exactTwoImageAttachmentSupported",
  "outputSchemaSupported",
  "machineOutputSupported",
  "ephemeralSupported",
  "isolatedHomeSupported",
  "userConfigAndRulesExcluded",
  "readOnlySandboxSupported",
  "networkDisabled",
  "toolEventsObservable",
  "hiddenRetryDisabledOrObservable",
  "proofHash",
] as const;

const ANTIGRAVITY_PROOF_KEYS = [
  "schemaVersion",
  "candidateProfileHash",
  "helpEvidenceHash",
  "exactModelAvailable",
  "highEffortSupported",
  "nonInteractivePrintSupported",
  "exactTwoImageAttachmentSupported",
  "outputSchemaSupported",
  "machineOutputSupported",
  "strictSandboxSupported",
  "isolatedWorkspaceSupported",
  "pluginsMcpRulesHooksSkillsHistoryExcluded",
  "toolsAndSubagentsDisabledOrObservable",
  "interactionDataCollectionDisabled",
  "externalRetentionAccepted",
  "hiddenRetryDisabledOrObservable",
  "proofHash",
] as const;

export function createCodexCapabilityProofFromOfflineEvidence(
  evidence: CodexOfflineCapabilityEvidenceV1,
): Readonly<CodexCapabilityProofV1> {
  exactRecord("Codex offline capability evidence", evidence, CODEX_EVIDENCE_KEYS);
  if (evidence.schemaVersion !== "codex-offline-capability-evidence.v1") {
    throw new Error("Codex offline capability evidence schemaVersion is invalid");
  }
  assertHash(
    "Codex offline capability evidence candidateProfileHash",
    evidence.candidateProfileHash,
  );
  validateEvidenceText("Codex help text", evidence.helpText);
  validateEvidenceText("Codex model catalog text", evidence.modelCatalogText);
  validateEvidenceText("Codex config reference text", evidence.configReferenceText);
  if (
    !["unverified", "disabled", "observable_per_attempt"].includes(
      evidence.hiddenRetryDisposition,
    )
  ) {
    throw new Error("Codex hidden retry disposition is unsupported");
  }

  const help = evidence.helpText;
  const config = evidence.configReferenceText;
  const body = {
    schemaVersion: "codex-capability-proof.v1" as const,
    candidateProfileHash: evidence.candidateProfileHash,
    helpEvidenceHash: canonicalHash(evidence),
    exactModelAvailable: hasExactToken(evidence.modelCatalogText, "gpt-5.6"),
    highEffortSupported:
      /model_reasoning_effort[^\n]*\bhigh\b/i.test(config),
    exactTwoImageAttachmentSupported:
      hasOption(help, "--image") && /--image[^\n]*<FILE>\.\.\./i.test(help),
    outputSchemaSupported: hasOption(help, "--output-schema"),
    machineOutputSupported: hasOption(help, "--json"),
    ephemeralSupported: hasOption(help, "--ephemeral"),
    isolatedHomeSupported: hasOption(help, "--cd"),
    userConfigAndRulesExcluded: hasOption(help, "--cd"),
    readOnlySandboxSupported:
      hasOption(help, "--sandbox") && /\bread-only\b/i.test(config),
    networkDisabled:
      /\bnetwork\b[^\n]*\bdisabled\b/i.test(config) &&
      /\bweb_search\b[^\n]*\bdisabled\b/i.test(config),
    toolEventsObservable: hasOption(help, "--json"),
    hiddenRetryDisabledOrObservable:
      evidence.hiddenRetryDisposition === "disabled" ||
      evidence.hiddenRetryDisposition === "observable_per_attempt",
  };
  return deepFreeze({ ...body, proofHash: canonicalHash(body) });
}

export function createCodexInvocationProfile(
  input: CreateCodexInvocationProfileInputV1,
): Readonly<ProviderInvocationProfileV1> {
  exactRecord("Codex invocation profile input", input, [
    "requestEnvelope",
    "capabilityProof",
  ]);
  assertProviderRequestEnvelopeIntegrity(input.requestEnvelope);
  if (input.requestEnvelope.candidateId !== "candidate:gpt-codex-v1") {
    throw new Error("Codex invocation profile requires the approved Codex candidate");
  }
  validateProof(
    input.capabilityProof,
    CODEX_PROOF_KEYS,
    "codex-capability-proof.v1",
    input.requestEnvelope.candidateProfileHash,
  );

  const rejectionCodes: ProviderTerminalRejectionCodeV1[] = [];
  if (!input.capabilityProof.exactModelAvailable) {
    rejectionCodes.push("MODEL_ID_UNAVAILABLE");
  }
  if (!input.capabilityProof.hiddenRetryDisabledOrObservable) {
    rejectionCodes.push("HIDDEN_RETRY_UNVERIFIED");
  }
  if (
    !input.capabilityProof.highEffortSupported ||
    !input.capabilityProof.exactTwoImageAttachmentSupported ||
    !input.capabilityProof.outputSchemaSupported ||
    !input.capabilityProof.machineOutputSupported ||
    !input.capabilityProof.ephemeralSupported ||
    !input.capabilityProof.isolatedHomeSupported ||
    !input.capabilityProof.userConfigAndRulesExcluded ||
    !input.capabilityProof.readOnlySandboxSupported ||
    !input.capabilityProof.networkDisabled ||
    !input.capabilityProof.toolEventsObservable
  ) {
    rejectionCodes.push("CAPABILITY_PREFLIGHT_FAILED");
  }

  if (rejectionCodes.length !== 0) {
    return unavailableProfile(
      input.requestEnvelope,
      uniqueCodes(rejectionCodes),
      "Codex capability preflight did not prove every fixed requirement",
    );
  }

  return deepFreeze({
    schemaVersion: "provider-invocation-profile.v1",
    candidateId: input.requestEnvelope.candidateId,
    candidateProfileHash: input.requestEnvelope.candidateProfileHash,
    availability: "available",
    executable: "codex",
    argv: [
      "--model",
      "gpt-5.6",
      "--config",
      'model_reasoning_effort="high"',
      "--config",
      "mcp_servers={}",
      "--config",
      'web_search="disabled"',
      "--ask-for-approval",
      "never",
      "--sandbox",
      "read-only",
      "--cd",
      ".",
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--image",
      "context.png",
      "--image",
      "detail.png",
      "--output-schema",
      "response.schema.json",
      "--output-last-message",
      "terminal.json",
      "--json",
    ],
    stdinFileName: "prompt.txt",
    terminalOutputFileName: "terminal.json",
    shell: false,
    rejectionCodes: [],
    unavailableReason: null,
    realInvocationAuthorized: false,
  });
}

export function createAntigravityInvocationProfile(
  input: CreateAntigravityInvocationProfileInputV1,
): Readonly<ProviderInvocationProfileV1> {
  exactRecord("Antigravity invocation profile input", input, [
    "requestEnvelope",
    "capabilityProof",
  ]);
  assertProviderRequestEnvelopeIntegrity(input.requestEnvelope);
  if (input.requestEnvelope.candidateId !== "candidate:gemini-antigravity-v1") {
    throw new Error(
      "Antigravity invocation profile requires the approved Antigravity candidate",
    );
  }
  validateProof(
    input.capabilityProof,
    ANTIGRAVITY_PROOF_KEYS,
    "antigravity-capability-proof.v1",
    input.requestEnvelope.candidateProfileHash,
  );

  const rejectionCodes: ProviderTerminalRejectionCodeV1[] = [];
  if (!input.capabilityProof.exactModelAvailable) {
    rejectionCodes.push("MODEL_ID_UNAVAILABLE");
  }
  if (!input.capabilityProof.interactionDataCollectionDisabled) {
    rejectionCodes.push("PRIVACY_CONFIGURATION_UNVERIFIED");
  }
  if (!input.capabilityProof.externalRetentionAccepted) {
    rejectionCodes.push("EXTERNAL_RETENTION_UNVERIFIED");
  }
  if (!input.capabilityProof.hiddenRetryDisabledOrObservable) {
    rejectionCodes.push("HIDDEN_RETRY_UNVERIFIED");
  }
  if (
    !input.capabilityProof.highEffortSupported ||
    !input.capabilityProof.nonInteractivePrintSupported ||
    !input.capabilityProof.exactTwoImageAttachmentSupported ||
    !input.capabilityProof.outputSchemaSupported ||
    !input.capabilityProof.machineOutputSupported ||
    !input.capabilityProof.strictSandboxSupported ||
    !input.capabilityProof.isolatedWorkspaceSupported ||
    !input.capabilityProof.pluginsMcpRulesHooksSkillsHistoryExcluded ||
    !input.capabilityProof.toolsAndSubagentsDisabledOrObservable
  ) {
    rejectionCodes.push("CAPABILITY_PREFLIGHT_FAILED");
  }

  if (rejectionCodes.length !== 0) {
    return unavailableProfile(
      input.requestEnvelope,
      uniqueCodes(rejectionCodes),
      "Antigravity capability and privacy preflight did not prove every fixed requirement",
    );
  }

  return unavailableProfile(
    input.requestEnvelope,
    ["CAPABILITY_PREFLIGHT_FAILED"],
    "Antigravity exact non-interactive PNG transport is not implemented or proved",
  );
}

function unavailableProfile(
  requestEnvelope: ProviderRequestEnvelopeV1,
  rejectionCodes: readonly ProviderTerminalRejectionCodeV1[],
  unavailableReason: string,
): Readonly<ProviderInvocationProfileV1> {
  return deepFreeze({
    schemaVersion: "provider-invocation-profile.v1",
    candidateId: requestEnvelope.candidateId,
    candidateProfileHash: requestEnvelope.candidateProfileHash,
    availability: "unavailable",
    executable: null,
    argv: null,
    stdinFileName: null,
    terminalOutputFileName: null,
    shell: false,
    rejectionCodes: [...rejectionCodes],
    unavailableReason,
    realInvocationAuthorized: false,
  });
}

function validateProof(
  proof: unknown,
  keys: readonly string[],
  schemaVersion: string,
  candidateProfileHash: string,
): void {
  exactRecord("provider capability proof", proof, keys);
  const record = proof as Record<string, unknown>;
  if (record.schemaVersion !== schemaVersion) {
    throw new Error("provider capability proof schemaVersion is invalid");
  }
  if (
    typeof record.candidateProfileHash !== "string" ||
    !HASH_PATTERN.test(record.candidateProfileHash) ||
    record.candidateProfileHash !== candidateProfileHash
  ) {
    throw new Error("provider capability proof candidateProfileHash is invalid");
  }
  if (
    typeof record.helpEvidenceHash !== "string" ||
    !HASH_PATTERN.test(record.helpEvidenceHash)
  ) {
    throw new Error("provider capability proof helpEvidenceHash is invalid");
  }
  const booleanKeys = keys.filter(
    (key) =>
      key !== "schemaVersion" &&
      key !== "candidateProfileHash" &&
      key !== "helpEvidenceHash" &&
      key !== "proofHash",
  );
  for (const key of booleanKeys) {
    if (typeof record[key] !== "boolean") {
      throw new Error(`provider capability proof ${key} must be boolean`);
    }
  }
  assertHash("provider capability proof proofHash", record.proofHash);
  const { proofHash, ...body } = record;
  if (proofHash !== canonicalHash(body)) {
    throw new Error("provider capability proof hash does not match its content");
  }
}

function validateEvidenceText(name: string, value: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > 65536 ||
    /[\u0000\u001b]/u.test(value)
  ) {
    throw new Error(
      `${name} must be bounded plain text without NUL or ANSI escape`,
    );
  }
}

function hasOption(text: string, option: string): boolean {
  return text
    .split(/\s+/u)
    .some((token) => token === option || token.startsWith(`${option}=`));
}

function hasExactToken(text: string, expected: string): boolean {
  return text.split(/[\s|,]+/u).some((token) => token === expected);
}

function assertHash(
  name: string,
  value: unknown,
): asserts value is ContractSha256 {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new Error(`${name} must be a lowercase SHA-256`);
  }
}

function exactRecord(name: string, value: unknown, keys: readonly string[]): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${name} must be a plain object with exact keys`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actual.includes(key))
  ) {
    throw new Error(`${name} must contain exact keys`);
  }
}

function uniqueCodes(
  codes: readonly ProviderTerminalRejectionCodeV1[],
): readonly ProviderTerminalRejectionCodeV1[] {
  return [...new Set(codes)];
}
