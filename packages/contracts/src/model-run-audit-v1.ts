import {
  assertFiniteNumber,
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  assertStringList,
  assertUnique,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  MODEL_CALL_MODES,
  MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
  type ModelCallMode,
  type ModelCallRecordV1,
} from "./model-call-schedule-v1.ts";
import {
  assertBrooksPolicyCaseIntegrity,
  assertOutboundModelPayloadPrivacy,
  createBrooksPolicyInput,
  type BrooksPolicyCaseV1,
  type OutboundModelPayloadV1,
} from "./policy-input-v1.ts";

export const MODEL_RUN_SCHEMA_VERSION = "model-run.v1" as const;
export const PROVIDER_ATTEMPT_SCHEMA_VERSION = "provider-attempt.v1" as const;
export const MODEL_RUN_AUDIT_SCHEMA_VERSION = "model-run-audit.v1" as const;

export const PROVIDER_ATTEMPT_STATUSES = [
  "response_received",
  "timeout",
  "transport_error",
] as const;
export const MODEL_RUN_VALIDATION_STATUSES = ["accepted", "rejected"] as const;

export type ProviderAttemptStatusV1 =
  (typeof PROVIDER_ATTEMPT_STATUSES)[number];
export type ModelRunValidationStatusV1 =
  (typeof MODEL_RUN_VALIDATION_STATUSES)[number];

export interface CreateModelRunRecordInputV1 {
  readonly call: ModelCallRecordV1;
  readonly policyCase: BrooksPolicyCaseV1;
  readonly payload: OutboundModelPayloadV1;
}

export interface ModelRunRecordV1 {
  readonly schemaVersion: typeof MODEL_RUN_SCHEMA_VERSION;
  readonly modelRunId: ContractSha256;
  readonly callId: ContractSha256;
  readonly caseId: string;
  readonly caseHash: ContractSha256;
  readonly localLastVisibleBarId: string;
  readonly mode: ModelCallMode;
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly candidateId: string;
  readonly modelId: string;
  readonly inputHash: ContractSha256;
  readonly payloadHash: ContractSha256;
  readonly promptHash: ContractSha256;
  readonly outputSchemaVersion: string;
  readonly reasoningBudgetId: string;
  readonly repeatIndex: number;
  readonly retrievedDoctrineIds: readonly string[];
}

export interface CreateProviderAttemptRecordInputV1 {
  readonly run: ModelRunRecordV1;
  readonly attemptIndex: number;
  readonly providerId: string;
  readonly requestHash: ContractSha256;
  readonly status: ProviderAttemptStatusV1;
  readonly responseHash: ContractSha256 | null;
  readonly errorCode: string | null;
  readonly latencyMs: number;
}

export interface ProviderAttemptRecordV1 {
  readonly schemaVersion: typeof PROVIDER_ATTEMPT_SCHEMA_VERSION;
  readonly attemptId: ContractSha256;
  readonly attemptKey: ContractSha256;
  readonly modelRunId: ContractSha256;
  readonly callId: ContractSha256;
  readonly attemptIndex: number;
  readonly providerId: string;
  readonly modelId: string;
  readonly requestHash: ContractSha256;
  readonly status: ProviderAttemptStatusV1;
  readonly responseHash: ContractSha256 | null;
  readonly errorCode: string | null;
  readonly latencyMs: number;
}

export interface CreateModelRunAuditRecordInputV1 {
  readonly run: ModelRunRecordV1;
  readonly attempt: ProviderAttemptRecordV1;
  readonly rawOutputHash: ContractSha256;
  readonly decisionHash: ContractSha256 | null;
  readonly validationResultHash: ContractSha256;
  readonly validationStatus: ModelRunValidationStatusV1;
  readonly rejectionCodes: readonly string[];
}

export interface ModelRunAuditRecordV1 {
  readonly schemaVersion: typeof MODEL_RUN_AUDIT_SCHEMA_VERSION;
  readonly auditId: ContractSha256;
  readonly modelRunId: ContractSha256;
  readonly callId: ContractSha256;
  readonly attemptId: ContractSha256;
  readonly caseId: string;
  readonly caseHash: ContractSha256;
  readonly inputHash: ContractSha256;
  readonly payloadHash: ContractSha256;
  readonly promptHash: ContractSha256;
  readonly retrievedDoctrineIds: readonly string[];
  readonly rawOutputHash: ContractSha256;
  readonly decisionHash: ContractSha256 | null;
  readonly validationResultHash: ContractSha256;
  readonly validationStatus: ModelRunValidationStatusV1;
  readonly rejectionCodes: readonly string[];
}

export class ModelRunAuditContractError extends Error {
  override readonly name = "ModelRunAuditContractError";
}

export function createModelRunRecord(
  input: CreateModelRunRecordInputV1,
): ModelRunRecordV1 {
  try {
    validateCallIdentity(input.call);
    assertBrooksPolicyCaseIntegrity(input.policyCase);
    assertOutboundModelPayloadPrivacy(input.payload);
    if (
      input.call.policyStreamId !== input.policyCase.policyStreamId ||
      input.call.decisionPointBarId !== input.policyCase.lastVisibleBarId ||
      input.call.decisionPointSequence !==
        input.policyCase.bars.at(-1)?.sequence ||
      input.call.barDurationSeconds !== input.policyCase.barDurationSeconds
    ) {
      fail("logical call decision point must match the local policy case");
    }
    const reconstructedInput = createBrooksPolicyInput({
      policyCase: input.policyCase,
      charts: input.payload.policyInput.charts,
      doctrine: input.payload.policyInput.doctrine,
    });
    if (reconstructedInput.inputHash !== input.payload.policyInput.inputHash) {
      fail("outbound policy input must be derived from the local policy case");
    }
    if (input.call.inputHash !== input.payload.policyInput.inputHash) {
      fail("logical call inputHash must match the outbound policy input");
    }
    if (input.call.promptHash !== input.payload.promptHash) {
      fail("logical call promptHash must match the outbound payload");
    }
    if (
      input.call.outputSchemaVersion !== input.payload.outputSchemaVersion
    ) {
      fail("logical call output schema must match the outbound payload");
    }

    const retrievedDoctrineIds = input.payload.policyInput.doctrine.map(
      (record) => record.doctrineId,
    );
    assertUnique("retrievedDoctrineIds", retrievedDoctrineIds);
    const body = {
      callId: input.call.callId,
      caseId: input.policyCase.caseId,
      caseHash: input.policyCase.caseHash,
      localLastVisibleBarId: input.policyCase.lastVisibleBarId,
      mode: input.call.mode,
      policyStreamId: input.call.policyStreamId,
      decisionPointBarId: input.call.decisionPointBarId,
      decisionPointSequence: input.call.decisionPointSequence,
      candidateId: input.call.candidateId,
      modelId: input.call.modelId,
      inputHash: input.call.inputHash,
      payloadHash: input.payload.payloadHash,
      promptHash: input.call.promptHash,
      outputSchemaVersion: input.call.outputSchemaVersion,
      reasoningBudgetId: input.call.reasoningBudgetId,
      repeatIndex: input.call.repeatIndex,
      retrievedDoctrineIds,
    } as const;
    return deepFreeze({
      schemaVersion: MODEL_RUN_SCHEMA_VERSION,
      modelRunId: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createProviderAttemptRecord(
  input: CreateProviderAttemptRecordInputV1,
): ProviderAttemptRecordV1 {
  try {
    validateRunRecord(input.run);
    if (!Number.isSafeInteger(input.attemptIndex) || input.attemptIndex < 0) {
      fail("attemptIndex must be a non-negative safe integer");
    }
    assertNonEmpty("providerId", input.providerId);
    assertSha256("requestHash", input.requestHash);
    assertOneOf("provider attempt status", input.status, PROVIDER_ATTEMPT_STATUSES);
    assertFiniteNumber("latencyMs", input.latencyMs);
    if (input.latencyMs < 0) fail("latencyMs must be non-negative");
    if (input.requestHash !== input.run.payloadHash) {
      fail("provider requestHash must match the frozen outbound payload");
    }
    validateAttemptTerminalFields(
      input.status,
      input.responseHash,
      input.errorCode,
    );

    const identity = {
      modelRunId: input.run.modelRunId,
      attemptIndex: input.attemptIndex,
      providerId: input.providerId,
      modelId: input.run.modelId,
      requestHash: input.requestHash,
    } as const;
    const attemptKey = canonicalHash(identity);
    const body = {
      attemptKey,
      ...identity,
      callId: input.run.callId,
      status: input.status,
      responseHash: input.responseHash,
      errorCode: input.errorCode,
      latencyMs: input.latencyMs,
    } as const;
    return deepFreeze({
      schemaVersion: PROVIDER_ATTEMPT_SCHEMA_VERSION,
      attemptId: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createModelRunAuditRecord(
  input: CreateModelRunAuditRecordInputV1,
): ModelRunAuditRecordV1 {
  try {
    validateRunRecord(input.run);
    validateAttemptRecord(input.attempt);
    if (
      input.attempt.modelRunId !== input.run.modelRunId ||
      input.attempt.callId !== input.run.callId ||
      input.attempt.requestHash !== input.run.payloadHash ||
      input.attempt.modelId !== input.run.modelId
    ) {
      fail("provider attempt does not belong to the model run");
    }
    if (
      input.attempt.status !== "response_received" ||
      input.attempt.responseHash === null
    ) {
      fail("model-run validation requires a received provider response");
    }
    assertSha256("rawOutputHash", input.rawOutputHash);
    assertSha256("validationResultHash", input.validationResultHash);
    assertOneOf(
      "validationStatus",
      input.validationStatus,
      MODEL_RUN_VALIDATION_STATUSES,
    );
    assertStringList("rejectionCodes", input.rejectionCodes);
    assertUnique("rejectionCodes", input.rejectionCodes);
    if (input.rawOutputHash !== input.attempt.responseHash) {
      fail("rawOutputHash must match the provider responseHash");
    }
    validateDecisionResult(
      input.validationStatus,
      input.decisionHash,
      input.rejectionCodes,
    );

    const body = {
      modelRunId: input.run.modelRunId,
      callId: input.run.callId,
      attemptId: input.attempt.attemptId,
      caseId: input.run.caseId,
      caseHash: input.run.caseHash,
      inputHash: input.run.inputHash,
      payloadHash: input.run.payloadHash,
      promptHash: input.run.promptHash,
      retrievedDoctrineIds: [...input.run.retrievedDoctrineIds],
      rawOutputHash: input.rawOutputHash,
      decisionHash: input.decisionHash,
      validationResultHash: input.validationResultHash,
      validationStatus: input.validationStatus,
      rejectionCodes: [...input.rejectionCodes],
    } as const;
    return deepFreeze({
      schemaVersion: MODEL_RUN_AUDIT_SCHEMA_VERSION,
      auditId: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

function validateCallIdentity(call: ModelCallRecordV1): void {
  if (call.schemaVersion !== MODEL_CALL_SCHEDULE_SCHEMA_VERSION) {
    fail("model call schemaVersion is unsupported");
  }
  assertOneOf("model call mode", call.mode, MODEL_CALL_MODES);
  assertSha256("callId", call.callId);
  assertSha256("call inputHash", call.inputHash);
  assertSha256("call promptHash", call.promptHash);
  for (const [name, value] of [
    ["policyStreamId", call.policyStreamId],
    ["decisionPointBarId", call.decisionPointBarId],
    ["selectionPolicyId", call.selectionPolicyId],
    ["candidateId", call.candidateId],
    ["modelId", call.modelId],
    ["outputSchemaVersion", call.outputSchemaVersion],
    ["reasoningBudgetId", call.reasoningBudgetId],
  ] as const) {
    assertNonEmpty(name, value);
  }
  if (
    !Number.isSafeInteger(call.decisionPointSequence) ||
    call.decisionPointSequence < 0 ||
    !Number.isSafeInteger(call.repeatIndex) ||
    call.repeatIndex < 0
  ) {
    fail("model call sequence and repeat index must be non-negative integers");
  }
  if (
    call.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS
  ) {
    fail("model call requires 300-second bars");
  }
  const expectedCallId = canonicalHash([
    MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    call.mode,
    call.policyStreamId,
    call.decisionPointBarId,
    call.decisionPointSequence,
    call.barDurationSeconds,
    call.selectionPolicyId,
    call.inputHash,
    call.candidateId,
    call.modelId,
    call.promptHash,
    call.outputSchemaVersion,
    call.reasoningBudgetId,
    call.repeatIndex,
  ]);
  if (call.callId !== expectedCallId) {
    fail("model call callId does not match its content");
  }
}

function validateRunRecord(run: ModelRunRecordV1): void {
  if (run.schemaVersion !== MODEL_RUN_SCHEMA_VERSION) {
    fail("model run schemaVersion is unsupported");
  }
  assertSha256("modelRunId", run.modelRunId);
  assertSha256("callId", run.callId);
  assertNonEmpty("run caseId", run.caseId);
  assertSha256("run caseHash", run.caseHash);
  assertNonEmpty("run localLastVisibleBarId", run.localLastVisibleBarId);
  assertSha256("inputHash", run.inputHash);
  assertSha256("payloadHash", run.payloadHash);
  assertSha256("promptHash", run.promptHash);
  assertOneOf("model run mode", run.mode, MODEL_CALL_MODES);
  for (const [name, value] of [
    ["run policyStreamId", run.policyStreamId],
    ["run decisionPointBarId", run.decisionPointBarId],
    ["run candidateId", run.candidateId],
    ["run modelId", run.modelId],
    ["run outputSchemaVersion", run.outputSchemaVersion],
    ["run reasoningBudgetId", run.reasoningBudgetId],
  ] as const) {
    assertNonEmpty(name, value);
  }
  if (
    !Number.isSafeInteger(run.decisionPointSequence) ||
    run.decisionPointSequence < 0 ||
    !Number.isSafeInteger(run.repeatIndex) ||
    run.repeatIndex < 0
  ) {
    fail("model run sequence and repeat index must be non-negative integers");
  }
  assertStringList("retrievedDoctrineIds", run.retrievedDoctrineIds);
  assertUnique("retrievedDoctrineIds", run.retrievedDoctrineIds);
  const expected = canonicalHash({
    callId: run.callId,
    caseId: run.caseId,
    caseHash: run.caseHash,
    localLastVisibleBarId: run.localLastVisibleBarId,
    mode: run.mode,
    policyStreamId: run.policyStreamId,
    decisionPointBarId: run.decisionPointBarId,
    decisionPointSequence: run.decisionPointSequence,
    candidateId: run.candidateId,
    modelId: run.modelId,
    inputHash: run.inputHash,
    payloadHash: run.payloadHash,
    promptHash: run.promptHash,
    outputSchemaVersion: run.outputSchemaVersion,
    reasoningBudgetId: run.reasoningBudgetId,
    repeatIndex: run.repeatIndex,
    retrievedDoctrineIds: run.retrievedDoctrineIds,
  });
  if (run.modelRunId !== expected) {
    fail("model run hash does not match its content");
  }
}

function validateAttemptRecord(attempt: ProviderAttemptRecordV1): void {
  if (attempt.schemaVersion !== PROVIDER_ATTEMPT_SCHEMA_VERSION) {
    fail("provider attempt schemaVersion is unsupported");
  }
  assertSha256("attemptId", attempt.attemptId);
  assertSha256("attemptKey", attempt.attemptKey);
  assertSha256("attempt modelRunId", attempt.modelRunId);
  assertSha256("attempt callId", attempt.callId);
  assertSha256("attempt requestHash", attempt.requestHash);
  if (!Number.isSafeInteger(attempt.attemptIndex) || attempt.attemptIndex < 0) {
    fail("provider attemptIndex must be a non-negative safe integer");
  }
  assertNonEmpty("attempt providerId", attempt.providerId);
  assertNonEmpty("attempt modelId", attempt.modelId);
  assertFiniteNumber("attempt latencyMs", attempt.latencyMs);
  if (attempt.latencyMs < 0) fail("attempt latencyMs must be non-negative");
  assertOneOf("attempt status", attempt.status, PROVIDER_ATTEMPT_STATUSES);
  validateAttemptTerminalFields(
    attempt.status,
    attempt.responseHash,
    attempt.errorCode,
  );
  const expectedKey = canonicalHash({
    modelRunId: attempt.modelRunId,
    attemptIndex: attempt.attemptIndex,
    providerId: attempt.providerId,
    modelId: attempt.modelId,
    requestHash: attempt.requestHash,
  });
  if (attempt.attemptKey !== expectedKey) {
    fail("provider attempt key does not match its identity");
  }
  const expectedId = canonicalHash({
    attemptKey: attempt.attemptKey,
    modelRunId: attempt.modelRunId,
    attemptIndex: attempt.attemptIndex,
    providerId: attempt.providerId,
    modelId: attempt.modelId,
    requestHash: attempt.requestHash,
    callId: attempt.callId,
    status: attempt.status,
    responseHash: attempt.responseHash,
    errorCode: attempt.errorCode,
    latencyMs: attempt.latencyMs,
  });
  if (attempt.attemptId !== expectedId) {
    fail("provider attempt hash does not match its content");
  }
}

function validateAttemptTerminalFields(
  status: ProviderAttemptStatusV1,
  responseHash: ContractSha256 | null,
  errorCode: string | null,
): void {
  if (status === "response_received") {
    if (responseHash === null) fail("received response requires responseHash");
    assertSha256("responseHash", responseHash);
    if (errorCode !== null) {
      fail("received response cannot contain a transport errorCode");
    }
    return;
  }
  if (responseHash !== null) {
    fail("failed transport attempt cannot contain responseHash");
  }
  if (errorCode === null) {
    fail("failed transport attempt requires errorCode");
  }
  assertNonEmpty("errorCode", errorCode);
}

function validateDecisionResult(
  status: ModelRunValidationStatusV1,
  decisionHash: ContractSha256 | null,
  rejectionCodes: readonly string[],
): void {
  if (status === "accepted") {
    if (decisionHash === null) fail("accepted validation requires decisionHash");
    assertSha256("decisionHash", decisionHash);
    if (rejectionCodes.length !== 0) {
      fail("accepted validation cannot contain rejectionCodes");
    }
    return;
  }
  if (decisionHash !== null) assertSha256("decisionHash", decisionHash);
  if (rejectionCodes.length === 0) {
    fail("rejected validation requires at least one rejectionCode");
  }
}

function fail(message: string): never {
  throw new ModelRunAuditContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ModelRunAuditContractError) throw error;
  if (error instanceof Error) throw new ModelRunAuditContractError(error.message);
  throw new ModelRunAuditContractError("model-run audit validation failed");
}
