import {
  BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION,
  BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
  assertBrooksPromptPackageActivationAuthorityIntegrity,
  assertBrooksPromptPackageApprovalIntegrity,
  assertBrooksPromptPackageManifestIntegrity,
  type BrooksPromptPackageActivationAuthorityV1,
  type VerifiedBrooksPromptPackageV1,
} from "./brooks-prompt-package-v1.ts";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  POLICY_ASSEMBLY_SOURCE_SCOPE,
  assertPolicyAssemblyIntegrity,
  type PolicyAssemblyV1,
} from "./policy-assembly-v1.ts";
import {
  assertOutboundModelPayloadPrivacy,
  createOutboundModelPayload,
  type OutboundModelPayloadV1,
} from "./policy-input-v1.ts";

export const PREPARED_POLICY_PAYLOAD_SCHEMA_VERSION =
  "prepared-policy-payload.v1" as const;
export const PREPARED_POLICY_PAYLOAD_RULES_VERSION =
  "prepared-policy-payload-rules.v1" as const;

export interface CreatePreparedPolicyPayloadInputV1 {
  readonly assembly: PolicyAssemblyV1;
  readonly packageActivation: BrooksPromptPackageActivationAuthorityV1;
  readonly promptPackage: VerifiedBrooksPromptPackageV1;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
}

export interface PreparedPolicyPayloadV1 {
  readonly schemaVersion: typeof PREPARED_POLICY_PAYLOAD_SCHEMA_VERSION;
  readonly preparationRulesVersion: typeof PREPARED_POLICY_PAYLOAD_RULES_VERSION;
  readonly sourceScope: typeof POLICY_ASSEMBLY_SOURCE_SCOPE;
  readonly preparationId: ContractSha256;
  readonly assemblyId: ContractSha256;
  readonly packageActivationId: ContractSha256;
  readonly packageHash: ContractSha256;
  readonly promptHash: ContractSha256;
  readonly responseSchemaHash: ContractSha256;
  readonly outputSchemaVersion: string;
  readonly validatorVersion: typeof BROOKS_IDENTITY_FREE_RESPONSE_VALIDATOR_VERSION;
  readonly payload: Readonly<OutboundModelPayloadV1>;
  readonly payloadHash: ContractSha256;
  readonly operatorPrincipal: typeof BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL;
}

export interface PreparedPolicyPayloadValidationContextV1 {
  readonly assembly: PolicyAssemblyV1;
  readonly packageActivation: BrooksPromptPackageActivationAuthorityV1;
  readonly promptPackage: VerifiedBrooksPromptPackageV1;
}

export class PreparedPolicyPayloadContractError extends Error {
  override readonly name = "PreparedPolicyPayloadContractError";
}

export function createPreparedPolicyPayload(
  input: CreatePreparedPolicyPayloadInputV1,
): Readonly<PreparedPolicyPayloadV1> {
  try {
    exactRecord("prepared policy payload input", input, [
      "assembly",
      "packageActivation",
      "promptPackage",
      "operatorPrincipal",
    ]);
    validateContext({
      assembly: input.assembly,
      packageActivation: input.packageActivation,
      promptPackage: input.promptPackage,
    });
    assertOperatorPrincipal(input.operatorPrincipal);
    const payload = createOutboundModelPayload({
      policyInput: input.assembly.policyInput,
      promptHash: input.promptPackage.manifest.prompt.contentHash,
      outputSchemaVersion:
        input.promptPackage.manifest.responseSchema.schemaVersion,
    });
    const body = {
      schemaVersion: PREPARED_POLICY_PAYLOAD_SCHEMA_VERSION,
      preparationRulesVersion: PREPARED_POLICY_PAYLOAD_RULES_VERSION,
      sourceScope: POLICY_ASSEMBLY_SOURCE_SCOPE,
      assemblyId: input.assembly.assemblyId,
      packageActivationId: input.packageActivation.activationId,
      packageHash: input.promptPackage.manifest.packageHash,
      promptHash: input.promptPackage.manifest.prompt.contentHash,
      responseSchemaHash:
        input.promptPackage.manifest.responseSchema.contentHash,
      outputSchemaVersion:
        input.promptPackage.manifest.responseSchema.schemaVersion,
      validatorVersion: input.promptPackage.manifest.validatorVersion,
      payload,
      payloadHash: payload.payloadHash,
      operatorPrincipal: input.operatorPrincipal,
    } as const;
    return deepFreeze({
      ...body,
      preparationId: canonicalHash(body),
    });
  } catch (error) {
    rethrow(error);
  }
}

export function assertPreparedPolicyPayloadIntegrity(
  value: unknown,
  context: PreparedPolicyPayloadValidationContextV1,
): asserts value is PreparedPolicyPayloadV1 {
  try {
    validateContext(context);
    const prepared = exactRecord<PreparedPolicyPayloadV1>(
      "prepared policy payload",
      value,
      [
        "schemaVersion",
        "preparationRulesVersion",
        "sourceScope",
        "assemblyId",
        "packageActivationId",
        "packageHash",
        "promptHash",
        "responseSchemaHash",
        "outputSchemaVersion",
        "validatorVersion",
        "payload",
        "payloadHash",
        "operatorPrincipal",
        "preparationId",
      ],
    );
    if (prepared.schemaVersion !== PREPARED_POLICY_PAYLOAD_SCHEMA_VERSION) {
      fail("prepared payload schemaVersion is unsupported");
    }
    if (prepared.preparationRulesVersion !== PREPARED_POLICY_PAYLOAD_RULES_VERSION) {
      fail("prepared payload rules version is unsupported");
    }
    if (prepared.sourceScope !== POLICY_ASSEMBLY_SOURCE_SCOPE) {
      fail("prepared payload sourceScope is unsupported");
    }
    if (prepared.assemblyId !== context.assembly.assemblyId) {
      fail("prepared payload does not bind the Policy Assembly");
    }
    if (prepared.packageActivationId !== context.packageActivation.activationId) {
      fail("prepared payload does not bind the Prompt Package activation");
    }
    if (prepared.packageHash !== context.promptPackage.manifest.packageHash) {
      fail("prepared payload package hash does not match the Prompt Package");
    }
    if (prepared.promptHash !== context.promptPackage.manifest.prompt.contentHash) {
      fail("prepared payload prompt hash does not match the Prompt Package");
    }
    if (
      prepared.responseSchemaHash !==
      context.promptPackage.manifest.responseSchema.contentHash
    ) {
      fail("prepared payload response schema hash does not match the Prompt Package");
    }
    if (
      prepared.outputSchemaVersion !==
      context.promptPackage.manifest.responseSchema.schemaVersion
    ) {
      fail("prepared payload output schema version does not match the Prompt Package");
    }
    if (prepared.validatorVersion !== context.promptPackage.manifest.validatorVersion) {
      fail("prepared payload validator version does not match the Prompt Package");
    }
    assertOutboundModelPayloadPrivacy(prepared.payload);
    const expectedPayload = createOutboundModelPayload({
      policyInput: context.assembly.policyInput,
      promptHash: context.promptPackage.manifest.prompt.contentHash,
      outputSchemaVersion:
        context.promptPackage.manifest.responseSchema.schemaVersion,
    });
    if (
      prepared.payloadHash !== prepared.payload.payloadHash ||
      prepared.payloadHash !== expectedPayload.payloadHash
    ) {
      fail("prepared payloadHash does not match the reconstructed outbound payload");
    }
    assertOperatorPrincipal(prepared.operatorPrincipal);
    const { preparationId, ...body } = prepared;
    if (preparationId !== canonicalHash(body)) {
      fail("prepared payload identity does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateContext(context: PreparedPolicyPayloadValidationContextV1): void {
  exactRecord("prepared payload validation context", context, [
    "assembly",
    "packageActivation",
    "promptPackage",
  ]);
  assertPolicyAssemblyIntegrity(context.assembly);
  assertBrooksPromptPackageActivationAuthorityIntegrity(
    context.packageActivation,
  );
  assertBrooksPromptPackageManifestIntegrity(context.promptPackage.manifest);
  assertBrooksPromptPackageApprovalIntegrity(
    context.promptPackage.approval,
    context.promptPackage.manifest,
  );
  if (
    context.packageActivation.packageHash !==
      context.promptPackage.manifest.packageHash ||
    context.packageActivation.approvalRecordHash !==
      context.promptPackage.approval.approvalRecordHash
  ) {
    fail("Prompt Package activation does not bind the verified package approval");
  }
}

function assertOperatorPrincipal(value: string): void {
  if (value !== BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL) {
    fail("operatorPrincipal must be the local Phase 2 operator");
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
  throw new PreparedPolicyPayloadContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PreparedPolicyPayloadContractError) throw error;
  if (error instanceof Error) throw new PreparedPolicyPayloadContractError(error.message);
  throw new PreparedPolicyPayloadContractError("prepared policy payload validation failed");
}
