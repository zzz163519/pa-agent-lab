import { createHash } from "node:crypto";

import {
  assertNonEmpty,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION =
  "brooks-prompt-package-manifest.v1" as const;
export const BROOKS_PROMPT_PACKAGE_VERSION = "brooks-prompt-package.v1" as const;
export const BROOKS_PROMPT_PACKAGE_APPROVAL_SCHEMA_VERSION =
  "brooks-prompt-package-approval.v1" as const;
export const BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION =
  "brooks-identity-free-response.schema.v1" as const;
export const BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION =
  "brooks-identity-free-response-validator.v1" as const;
export const BROOKS_DECISION_CONTRACT_VERSION = "brooks-decision.v1" as const;
export const BROOKS_PROMPT_PACKAGE_ACTIVATION_SCHEMA_VERSION =
  "brooks-prompt-package-activation.v1" as const;
export const BROOKS_PROMPT_PACKAGE_ROLLBACK_ACTIVATION_SCHEMA_VERSION =
  "brooks-prompt-package-rollback-activation.v1" as const;
export const BROOKS_PROMPT_PACKAGE_ROLLBACK_REASON_SCHEMA_VERSION =
  "brooks-prompt-package-rollback-reason.v1" as const;
export const BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL =
  "local:phase2-operator" as const;

export interface BrooksPromptPackageManifestV1 {
  readonly schemaVersion: typeof BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION;
  readonly packageVersion: typeof BROOKS_PROMPT_PACKAGE_VERSION;
  readonly prompt: Readonly<{
    readonly mediaType: "text/plain; charset=utf-8";
    readonly byteLength: number;
    readonly contentHash: ContractSha256;
  }>;
  readonly responseSchema: Readonly<{
    readonly schemaId: string;
    readonly schemaVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION;
    readonly mediaType: "application/schema+json";
    readonly byteLength: number;
    readonly contentHash: ContractSha256;
  }>;
  readonly brooksDecisionContractVersion: typeof BROOKS_DECISION_CONTRACT_VERSION;
  readonly validatorVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION;
  readonly packageHash: ContractSha256;
}

export interface BrooksPromptPackageApprovalV1 {
  readonly schemaVersion: typeof BROOKS_PROMPT_PACKAGE_APPROVAL_SCHEMA_VERSION;
  readonly approvalId: string;
  readonly packageVersion: typeof BROOKS_PROMPT_PACKAGE_VERSION;
  readonly packageHash: ContractSha256;
  readonly approvedBy: "Calvin";
  readonly approvedAt: string;
  readonly approvalMethod: "direct-calvin-instruction";
  readonly approvalScope: "exact-package-content-only";
  readonly phase5b1ImplementationAuthorized: false;
  readonly packageActivationPerformed: false;
  readonly providerCallsAuthorized: false;
  readonly approvalRecordHash: ContractSha256;
}

export interface VerifyBrooksPromptPackageArtifactsInputV1 {
  readonly promptBytes: Uint8Array;
  readonly responseSchemaBytes: Uint8Array;
  readonly manifest: BrooksPromptPackageManifestV1;
  readonly approval: BrooksPromptPackageApprovalV1;
}

export interface VerifiedBrooksPromptPackageV1 {
  readonly manifest: Readonly<BrooksPromptPackageManifestV1>;
  readonly approval: Readonly<BrooksPromptPackageApprovalV1>;
}

export interface BrooksPromptPackageActivationV1 {
  readonly schemaVersion: typeof BROOKS_PROMPT_PACKAGE_ACTIVATION_SCHEMA_VERSION;
  readonly activationKind: "standard";
  readonly activationSequence: number;
  readonly packageHash: ContractSha256;
  readonly approvalRecordHash: ContractSha256;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
  readonly activationId: ContractSha256;
}

export interface BrooksPromptPackageRollbackActivationV1 {
  readonly schemaVersion: typeof BROOKS_PROMPT_PACKAGE_ROLLBACK_ACTIVATION_SCHEMA_VERSION;
  readonly activationKind: "rollback";
  readonly activationSequence: number;
  readonly replacesActivationId: ContractSha256;
  readonly targetActivationId: ContractSha256;
  readonly packageHash: ContractSha256;
  readonly approvalRecordHash: ContractSha256;
  readonly reason: string;
  readonly reasonHash: ContractSha256;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
  readonly activationId: ContractSha256;
}

export type BrooksPromptPackageActivationAuthorityV1 =
  | BrooksPromptPackageActivationV1
  | BrooksPromptPackageRollbackActivationV1;

export interface CreateBrooksPromptPackageActivationInputV1 {
  readonly activationSequence: number;
  readonly promptPackage: VerifiedBrooksPromptPackageV1;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
}

export interface CreateBrooksPromptPackageRollbackActivationInputV1 {
  readonly activationSequence: number;
  readonly replacesActivationId: ContractSha256;
  readonly targetActivation: BrooksPromptPackageActivationV1;
  readonly reason: string;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
}

export class BrooksPromptPackageContractError extends Error {
  override readonly name = "BrooksPromptPackageContractError";
}

export function verifyBrooksPromptPackageArtifacts(
  input: VerifyBrooksPromptPackageArtifactsInputV1,
): Readonly<VerifiedBrooksPromptPackageV1> {
  try {
    exactRecord("Prompt Package artifacts", input, [
      "promptBytes",
      "responseSchemaBytes",
      "manifest",
      "approval",
    ]);
    assertBrooksPromptPackageManifestIntegrity(input.manifest);
    verifyComponent("prompt", input.promptBytes, input.manifest.prompt);
    verifyComponent(
      "response schema",
      input.responseSchemaBytes,
      input.manifest.responseSchema,
    );
    assertBrooksPromptPackageApprovalIntegrity(input.approval, input.manifest);
    return deepFreeze({
      manifest: structuredClone(input.manifest),
      approval: structuredClone(input.approval),
    });
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPromptPackageManifestIntegrity(
  value: unknown,
): asserts value is BrooksPromptPackageManifestV1 {
  try {
    const manifest = exactRecord<BrooksPromptPackageManifestV1>(
      "Prompt Package manifest",
      value,
      [
        "schemaVersion",
        "packageVersion",
        "prompt",
        "responseSchema",
        "brooksDecisionContractVersion",
        "validatorVersion",
        "packageHash",
      ],
    );
    if (manifest.schemaVersion !== BROOKS_PROMPT_PACKAGE_MANIFEST_SCHEMA_VERSION) {
      fail("Prompt Package manifest schemaVersion is unsupported");
    }
    if (manifest.packageVersion !== BROOKS_PROMPT_PACKAGE_VERSION) {
      fail("Prompt Package version is unsupported");
    }
    if (manifest.brooksDecisionContractVersion !== BROOKS_DECISION_CONTRACT_VERSION) {
      fail("BrooksDecision contract version is unsupported");
    }
    if (manifest.validatorVersion !== BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION) {
      fail("identity-free response validator version is unsupported");
    }
    const prompt = exactRecord<BrooksPromptPackageManifestV1["prompt"]>(
      "Prompt Package prompt identity",
      manifest.prompt,
      ["mediaType", "byteLength", "contentHash"],
    );
    if (prompt.mediaType !== "text/plain; charset=utf-8") {
      fail("prompt mediaType is unsupported");
    }
    validateComponentIdentity("prompt", prompt);
    const responseSchema = exactRecord<BrooksPromptPackageManifestV1["responseSchema"]>(
      "Prompt Package response schema identity",
      manifest.responseSchema,
      ["schemaId", "schemaVersion", "mediaType", "byteLength", "contentHash"],
    );
    assertNonEmpty("responseSchema.schemaId", responseSchema.schemaId);
    if (responseSchema.schemaVersion !== BROOKS_IDENTITY_FREE_RESPONSE_SCHEMA_VERSION) {
      fail("response schema version is unsupported");
    }
    if (responseSchema.mediaType !== "application/schema+json") {
      fail("response schema mediaType is unsupported");
    }
    validateComponentIdentity("response schema", responseSchema);
    assertSha256("packageHash", manifest.packageHash);
    const { packageHash: _packageHash, ...body } = manifest;
    if (manifest.packageHash !== canonicalHash(body)) {
      fail("Prompt Package package hash does not match its manifest body");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPromptPackageApprovalIntegrity(
  value: unknown,
  manifest: BrooksPromptPackageManifestV1,
): asserts value is BrooksPromptPackageApprovalV1 {
  try {
    assertBrooksPromptPackageManifestIntegrity(manifest);
    const approval = exactRecord<BrooksPromptPackageApprovalV1>(
      "Prompt Package approval",
      value,
      [
        "schemaVersion",
        "approvalId",
        "packageVersion",
        "packageHash",
        "approvedBy",
        "approvedAt",
        "approvalMethod",
        "approvalScope",
        "phase5b1ImplementationAuthorized",
        "packageActivationPerformed",
        "providerCallsAuthorized",
        "approvalRecordHash",
      ],
    );
    if (approval.schemaVersion !== BROOKS_PROMPT_PACKAGE_APPROVAL_SCHEMA_VERSION) {
      fail("Prompt Package approval schemaVersion is unsupported");
    }
    assertNonEmpty("approvalId", approval.approvalId);
    if (approval.packageVersion !== BROOKS_PROMPT_PACKAGE_VERSION) {
      fail("approved package version is unsupported");
    }
    assertSha256("approval.packageHash", approval.packageHash);
    if (approval.packageHash !== manifest.packageHash) {
      fail("approval does not bind the approved package");
    }
    if (approval.approvedBy !== "Calvin") {
      fail("Prompt Package approval must be by Calvin");
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(approval.approvedAt)) {
      fail("approvedAt must be an ISO-8601 timestamp with timezone");
    }
    if (approval.approvalMethod !== "direct-calvin-instruction") {
      fail("Prompt Package approval method is unsupported");
    }
    if (approval.approvalScope !== "exact-package-content-only") {
      fail("Prompt Package approval scope is unsupported");
    }
    if (approval.phase5b1ImplementationAuthorized !== false) {
      fail("Prompt Package approval does not authorize implementation");
    }
    if (approval.packageActivationPerformed !== false) {
      fail("Prompt Package approval does not perform activation");
    }
    if (approval.providerCallsAuthorized !== false) {
      fail("Prompt Package approval does not authorize provider calls");
    }
    assertSha256("approvalRecordHash", approval.approvalRecordHash);
    const { approvalRecordHash: _approvalRecordHash, ...body } = approval;
    if (approval.approvalRecordHash !== canonicalHash(body)) {
      fail("Prompt Package approval record hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createBrooksPromptPackageActivation(
  input: CreateBrooksPromptPackageActivationInputV1,
): Readonly<BrooksPromptPackageActivationV1> {
  try {
    exactRecord("Prompt Package activation input", input, [
      "activationSequence",
      "promptPackage",
      "operatorPrincipal",
    ]);
    assertActivationSequence(input.activationSequence);
    assertBrooksPromptPackageManifestIntegrity(input.promptPackage.manifest);
    assertBrooksPromptPackageApprovalIntegrity(
      input.promptPackage.approval,
      input.promptPackage.manifest,
    );
    assertOperatorPrincipal(input.operatorPrincipal);
    const body = {
      schemaVersion: BROOKS_PROMPT_PACKAGE_ACTIVATION_SCHEMA_VERSION,
      activationKind: "standard" as const,
      activationSequence: input.activationSequence,
      packageHash: input.promptPackage.manifest.packageHash,
      approvalRecordHash: input.promptPackage.approval.approvalRecordHash,
      operatorPrincipal: input.operatorPrincipal,
    };
    return deepFreeze({ ...body, activationId: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function createBrooksPromptPackageRollbackActivation(
  input: CreateBrooksPromptPackageRollbackActivationInputV1,
): Readonly<BrooksPromptPackageRollbackActivationV1> {
  try {
    exactRecord("Prompt Package rollback activation input", input, [
      "activationSequence",
      "replacesActivationId",
      "targetActivation",
      "reason",
      "operatorPrincipal",
    ]);
    assertActivationSequence(input.activationSequence);
    assertBrooksPromptPackageActivationIntegrity(input.targetActivation);
    assertSha256("replacesActivationId", input.replacesActivationId);
    if (input.activationSequence <= input.targetActivation.activationSequence) {
      fail("rollback activation sequence must be later than the target");
    }
    if (input.replacesActivationId === input.targetActivation.activationId) {
      fail("replacesActivationId must differ from targetActivationId");
    }
    assertOperatorPrincipal(input.operatorPrincipal);
    const reason = normalizeBrooksPromptPackageRollbackReason(input.reason);
    const reasonHash = canonicalHash({
      schemaVersion: BROOKS_PROMPT_PACKAGE_ROLLBACK_REASON_SCHEMA_VERSION,
      reason,
    });
    const body = {
      schemaVersion: BROOKS_PROMPT_PACKAGE_ROLLBACK_ACTIVATION_SCHEMA_VERSION,
      activationKind: "rollback" as const,
      activationSequence: input.activationSequence,
      replacesActivationId: input.replacesActivationId,
      targetActivationId: input.targetActivation.activationId,
      packageHash: input.targetActivation.packageHash,
      approvalRecordHash: input.targetActivation.approvalRecordHash,
      reason,
      reasonHash,
      operatorPrincipal: input.operatorPrincipal,
    };
    return deepFreeze({ ...body, activationId: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPromptPackageActivationIntegrity(
  value: unknown,
): asserts value is BrooksPromptPackageActivationV1 {
  try {
    const activation = exactRecord<BrooksPromptPackageActivationV1>(
      "Prompt Package activation",
      value,
      [
        "schemaVersion",
        "activationKind",
        "activationSequence",
        "packageHash",
        "approvalRecordHash",
        "operatorPrincipal",
        "activationId",
      ],
    );
    if (
      activation.schemaVersion !== BROOKS_PROMPT_PACKAGE_ACTIVATION_SCHEMA_VERSION ||
      activation.activationKind !== "standard"
    ) {
      fail("Prompt Package activation kind or schemaVersion is unsupported");
    }
    assertActivationSequence(activation.activationSequence);
    assertSha256("packageHash", activation.packageHash);
    assertSha256("approvalRecordHash", activation.approvalRecordHash);
    assertOperatorPrincipal(activation.operatorPrincipal);
    assertSha256("activationId", activation.activationId);
    const { activationId, ...body } = activation;
    if (activationId !== canonicalHash(body)) {
      fail("Prompt Package activation identity does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPromptPackageActivationAuthorityIntegrity(
  value: unknown,
): asserts value is BrooksPromptPackageActivationAuthorityV1 {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { activationKind?: unknown }).activationKind === "rollback"
  ) {
    assertBrooksPromptPackageRollbackActivationIntegrity(value);
    return;
  }
  assertBrooksPromptPackageActivationIntegrity(value);
}

export function assertBrooksPromptPackageRollbackActivationIntegrity(
  value: unknown,
): asserts value is BrooksPromptPackageRollbackActivationV1 {
  try {
    const activation = exactRecord<BrooksPromptPackageRollbackActivationV1>(
      "Prompt Package rollback activation",
      value,
      [
        "schemaVersion",
        "activationKind",
        "activationSequence",
        "replacesActivationId",
        "targetActivationId",
        "packageHash",
        "approvalRecordHash",
        "reason",
        "reasonHash",
        "operatorPrincipal",
        "activationId",
      ],
    );
    if (
      activation.schemaVersion !== BROOKS_PROMPT_PACKAGE_ROLLBACK_ACTIVATION_SCHEMA_VERSION ||
      activation.activationKind !== "rollback"
    ) {
      fail("Prompt Package rollback kind or schemaVersion is unsupported");
    }
    assertActivationSequence(activation.activationSequence);
    assertSha256("replacesActivationId", activation.replacesActivationId);
    assertSha256("targetActivationId", activation.targetActivationId);
    if (activation.replacesActivationId === activation.targetActivationId) {
      fail("replacesActivationId must differ from targetActivationId");
    }
    assertSha256("packageHash", activation.packageHash);
    assertSha256("approvalRecordHash", activation.approvalRecordHash);
    const normalized = normalizeBrooksPromptPackageRollbackReason(activation.reason);
    if (normalized !== activation.reason) {
      fail("rollback reason must be canonically normalized");
    }
    assertSha256("reasonHash", activation.reasonHash);
    if (
      activation.reasonHash !==
      canonicalHash({
        schemaVersion: BROOKS_PROMPT_PACKAGE_ROLLBACK_REASON_SCHEMA_VERSION,
        reason: activation.reason,
      })
    ) {
      fail("rollback reasonHash does not match its content");
    }
    assertOperatorPrincipal(activation.operatorPrincipal);
    assertSha256("activationId", activation.activationId);
    const { activationId, ...body } = activation;
    if (activationId !== canonicalHash(body)) {
      fail("Prompt Package rollback identity does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function normalizeBrooksPromptPackageRollbackReason(value: string): string {
  if (typeof value !== "string") fail("rollback reason must be a string");
  if (/\p{Cc}/u.test(value.replace(/[\t\n\r]/g, ""))) {
    fail("rollback reason must not contain control characters");
  }
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (Array.from(normalized).length < 1 || Array.from(normalized).length > 500) {
    fail("rollback reason must contain 1 through 500 characters");
  }
  return normalized;
}

function assertActivationSequence(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail("activationSequence must be a positive safe integer");
  }
}

function assertOperatorPrincipal(value: string): void {
  if (value !== BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL) {
    fail("operatorPrincipal must be the local Phase 2 operator");
  }
}

function validateComponentIdentity(
  name: string,
  value: { readonly byteLength: number; readonly contentHash: string },
): void {
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength <= 0) {
    fail(`${name} byteLength must be a positive safe integer`);
  }
  assertSha256(`${name} contentHash`, value.contentHash);
}

function verifyComponent(
  name: string,
  bytes: Uint8Array,
  identity: { readonly byteLength: number; readonly contentHash: string },
): void {
  if (!(bytes instanceof Uint8Array)) {
    fail(`${name} bytes must be a Uint8Array`);
  }
  if (bytes.byteLength !== identity.byteLength) {
    fail(`${name} byte length does not match the manifest`);
  }
  const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (contentHash !== identity.contentHash) {
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
  throw new BrooksPromptPackageContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksPromptPackageContractError) throw error;
  if (error instanceof Error) throw new BrooksPromptPackageContractError(error.message);
  throw new BrooksPromptPackageContractError("Prompt Package validation failed");
}
