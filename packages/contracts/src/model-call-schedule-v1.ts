import { createHash } from "node:crypto";

export const MODEL_CALL_SCHEDULE_SCHEMA_VERSION = "model-call-schedule.v1" as const;
export const FROZEN_MODEL_RESULT_SCHEMA_VERSION = "frozen-model-result.v1" as const;
export const REPLAY_DECISION_BUNDLE_SCHEMA_VERSION =
  "replay-decision-bundle.v1" as const;

export const MODEL_CALL_MODES = [
  "evaluation_sampled",
  "continuous_every_close",
] as const;

export const CONTINUOUS_EVERY_CLOSE_SELECTION_POLICY_ID =
  "continuous_every_close.v1" as const;

export const FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS = 300 as const;

export type ModelCallMode = (typeof MODEL_CALL_MODES)[number];
export type Sha256 = `sha256:${string}`;

export interface DecisionPointV1 {
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly barDurationSeconds: number;
  readonly selectionPolicyId: string;
  readonly inputHash: Sha256;
  readonly isClosed: boolean;
}

export interface ModelCandidateV1 {
  readonly candidateId: string;
  readonly modelId: string;
}

export interface ModelCallProtocolV1 {
  readonly promptHash: Sha256;
  readonly outputSchemaVersion: string;
  readonly reasoningBudgetId: string;
}

export interface CreateModelCallRecordInputV1 {
  readonly mode: ModelCallMode;
  readonly decisionPoint: DecisionPointV1;
  readonly candidate: ModelCandidateV1;
  readonly protocol: ModelCallProtocolV1;
  readonly repeatIndex: number;
}

export interface ModelCallRecordV1 {
  readonly schemaVersion: typeof MODEL_CALL_SCHEDULE_SCHEMA_VERSION;
  readonly callId: Sha256;
  readonly mode: ModelCallMode;
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly barDurationSeconds: number;
  readonly selectionPolicyId: string;
  readonly inputHash: Sha256;
  readonly candidateId: string;
  readonly modelId: string;
  readonly promptHash: Sha256;
  readonly outputSchemaVersion: string;
  readonly reasoningBudgetId: string;
  readonly repeatIndex: number;
}

export interface CreateContinuousScheduleStateInputV1 {
  readonly policyStreamId: string;
  readonly barDurationSeconds: number;
  readonly candidate: ModelCandidateV1;
  readonly protocol: ModelCallProtocolV1;
}

export interface ContinuousScheduleStateV1 {
  readonly schemaVersion: typeof MODEL_CALL_SCHEDULE_SCHEMA_VERSION;
  readonly mode: "continuous_every_close";
  readonly policyStreamId: string;
  readonly barDurationSeconds: number;
  readonly selectionPolicyId: typeof CONTINUOUS_EVERY_CLOSE_SELECTION_POLICY_ID;
  readonly candidate: Readonly<ModelCandidateV1>;
  readonly protocol: Readonly<ModelCallProtocolV1>;
  readonly lastScheduledSequence: number | null;
  readonly lastScheduledBarId: string | null;
  readonly lastScheduledInputHash: Sha256 | null;
  readonly scheduledBarIds: readonly string[];
}

export interface AdvanceContinuousScheduleInputV1 {
  readonly state: ContinuousScheduleStateV1;
  readonly decisionPoint: DecisionPointV1;
}

export type ContinuousScheduleAdvanceV1 =
  | Readonly<{
      status: "scheduled";
      call: Readonly<ModelCallRecordV1>;
      nextState: ContinuousScheduleStateV1;
    }>
  | Readonly<{
      status: "not_scheduled";
      reason:
        | "bar_not_closed"
        | "duplicate_closed_bar"
        | "stale_closed_bar";
      nextState: ContinuousScheduleStateV1;
    }>;

export interface FrozenEvaluationSelectionV1 {
  readonly selectionPolicyId: string;
  readonly selectionCommitmentHash: Sha256;
  readonly isFrozen: boolean;
  readonly decisionPoints: readonly DecisionPointV1[];
}

export interface CreateEvaluationCallPlanInputV1 {
  readonly selection: FrozenEvaluationSelectionV1;
  readonly candidates: readonly ModelCandidateV1[];
  readonly protocol: ModelCallProtocolV1;
  readonly repeatsPerCandidate: number;
}

export interface EvaluationCallPlanV1 {
  readonly schemaVersion: typeof MODEL_CALL_SCHEDULE_SCHEMA_VERSION;
  readonly planId: Sha256;
  readonly mode: "evaluation_sampled";
  readonly selectionPolicyId: string;
  readonly selectionCommitmentHash: Sha256;
  readonly decisionPointCount: number;
  readonly candidateIds: readonly string[];
  readonly repeatsPerCandidate: number;
  readonly calls: readonly Readonly<ModelCallRecordV1>[];
}

export type ModelResultValidationStatus = "accepted" | "rejected";

export interface CreateFrozenModelResultInputV1 {
  readonly call: ModelCallRecordV1;
  readonly rawOutputHash: Sha256;
  readonly decisionHash: Sha256;
  readonly validationResultHash: Sha256;
  readonly validationStatus: ModelResultValidationStatus;
}

export interface FrozenModelResultV1 {
  readonly schemaVersion: typeof FROZEN_MODEL_RESULT_SCHEMA_VERSION;
  readonly cacheKey: Sha256;
  readonly callId: Sha256;
  readonly mode: ModelCallMode;
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly inputHash: Sha256;
  readonly candidateId: string;
  readonly modelId: string;
  readonly rawOutputHash: Sha256;
  readonly decisionHash: Sha256;
  readonly validationResultHash: Sha256;
  readonly validationStatus: ModelResultValidationStatus;
  readonly isFrozen: boolean;
}

export interface CreateReplayDecisionBundleInputV1 {
  readonly results: readonly FrozenModelResultV1[];
}

export interface ReplayDecisionBundleV1 {
  readonly schemaVersion: typeof REPLAY_DECISION_BUNDLE_SCHEMA_VERSION;
  readonly bundleId: Sha256;
  readonly source: "precomputed_frozen_model_results";
  readonly modelCallsPermitted: false;
  readonly results: readonly FrozenModelResultV1[];
}

export class ModelCallContractError extends Error {
  override readonly name = "ModelCallContractError";
}

export function parseModelCallMode(value: unknown): ModelCallMode {
  if (
    value === "evaluation_sampled" ||
    value === "continuous_every_close"
  ) {
    return value;
  }

  throw new ModelCallContractError(
    `unsupported model call mode: ${String(value)}`,
  );
}

export function createModelCallRecord(
  input: CreateModelCallRecordInputV1,
): Readonly<ModelCallRecordV1> {
  const mode = parseModelCallMode(input.mode);
  const { decisionPoint, candidate, protocol } = input;

  if (!decisionPoint.isClosed) {
    throw new ModelCallContractError("decision point must be closed");
  }

  assertNonEmpty("policyStreamId", decisionPoint.policyStreamId);
  assertNonEmpty("decisionPointBarId", decisionPoint.decisionPointBarId);
  assertNonNegativeInteger(
    "decisionPointSequence",
    decisionPoint.decisionPointSequence,
  );
  assertPositiveInteger("barDurationSeconds", decisionPoint.barDurationSeconds);
  assertFirstBrooksPolicyBarDuration(decisionPoint.barDurationSeconds);
  assertNonEmpty("selectionPolicyId", decisionPoint.selectionPolicyId);
  assertSha256("inputHash", decisionPoint.inputHash);
  assertNonEmpty("candidateId", candidate.candidateId);
  assertNonEmpty("modelId", candidate.modelId);
  assertSha256("promptHash", protocol.promptHash);
  assertNonEmpty("outputSchemaVersion", protocol.outputSchemaVersion);
  assertNonEmpty("reasoningBudgetId", protocol.reasoningBudgetId);
  assertNonNegativeInteger("repeatIndex", input.repeatIndex);

  const identityFields = [
    MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    mode,
    decisionPoint.policyStreamId,
    decisionPoint.decisionPointBarId,
    decisionPoint.decisionPointSequence,
    decisionPoint.barDurationSeconds,
    decisionPoint.selectionPolicyId,
    decisionPoint.inputHash,
    candidate.candidateId,
    candidate.modelId,
    protocol.promptHash,
    protocol.outputSchemaVersion,
    protocol.reasoningBudgetId,
    input.repeatIndex,
  ];

  const callId = hashIdentity(identityFields);

  return Object.freeze({
    schemaVersion: MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    callId,
    mode,
    policyStreamId: decisionPoint.policyStreamId,
    decisionPointBarId: decisionPoint.decisionPointBarId,
    decisionPointSequence: decisionPoint.decisionPointSequence,
    barDurationSeconds: decisionPoint.barDurationSeconds,
    selectionPolicyId: decisionPoint.selectionPolicyId,
    inputHash: decisionPoint.inputHash,
    candidateId: candidate.candidateId,
    modelId: candidate.modelId,
    promptHash: protocol.promptHash,
    outputSchemaVersion: protocol.outputSchemaVersion,
    reasoningBudgetId: protocol.reasoningBudgetId,
    repeatIndex: input.repeatIndex,
  });
}

export function createContinuousScheduleState(
  input: CreateContinuousScheduleStateInputV1,
): ContinuousScheduleStateV1 {
  assertNonEmpty("policyStreamId", input.policyStreamId);
  assertPositiveInteger("barDurationSeconds", input.barDurationSeconds);
  assertFirstBrooksPolicyBarDuration(input.barDurationSeconds);
  assertCandidate(input.candidate);
  assertProtocol(input.protocol);

  return Object.freeze({
    schemaVersion: MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    mode: "continuous_every_close",
    policyStreamId: input.policyStreamId,
    barDurationSeconds: input.barDurationSeconds,
    selectionPolicyId: CONTINUOUS_EVERY_CLOSE_SELECTION_POLICY_ID,
    candidate: Object.freeze({ ...input.candidate }),
    protocol: Object.freeze({ ...input.protocol }),
    lastScheduledSequence: null,
    lastScheduledBarId: null,
    lastScheduledInputHash: null,
    scheduledBarIds: Object.freeze([]),
  });
}

export function advanceContinuousSchedule(
  input: AdvanceContinuousScheduleInputV1,
): ContinuousScheduleAdvanceV1 {
  const { state, decisionPoint } = input;

  assertContinuousStreamMatch(state, decisionPoint);

  if (!decisionPoint.isClosed) {
    return Object.freeze({
      status: "not_scheduled",
      reason: "bar_not_closed",
      nextState: state,
    });
  }

  const scheduledBarIdIndex = state.scheduledBarIds.indexOf(
    decisionPoint.decisionPointBarId,
  );
  if (scheduledBarIdIndex >= 0) {
    const isExactLatestDuplicate =
      decisionPoint.decisionPointSequence === state.lastScheduledSequence &&
      decisionPoint.decisionPointBarId === state.lastScheduledBarId &&
      decisionPoint.inputHash === state.lastScheduledInputHash;

    if (isExactLatestDuplicate) {
      return Object.freeze({
        status: "not_scheduled",
        reason: "duplicate_closed_bar",
        nextState: state,
      });
    }

    if (decisionPoint.decisionPointSequence === state.lastScheduledSequence) {
      throw new ModelCallContractError(
        "conflicting decision point for an already scheduled sequence",
      );
    }

    throw new ModelCallContractError(
      "decision point bar ID has already been scheduled",
    );
  }

  if (
    state.lastScheduledSequence !== null &&
    decisionPoint.decisionPointSequence <= state.lastScheduledSequence
  ) {
    if (decisionPoint.decisionPointSequence === state.lastScheduledSequence) {
      throw new ModelCallContractError(
        "conflicting decision point for an already scheduled sequence",
      );
    }

    return Object.freeze({
      status: "not_scheduled",
      reason: "stale_closed_bar",
      nextState: state,
    });
  }

  const call = createModelCallRecord({
    mode: "continuous_every_close",
    decisionPoint,
    candidate: state.candidate,
    protocol: state.protocol,
    repeatIndex: 0,
  });
  const nextState = Object.freeze({
    ...state,
    lastScheduledSequence: decisionPoint.decisionPointSequence,
    lastScheduledBarId: decisionPoint.decisionPointBarId,
    lastScheduledInputHash: decisionPoint.inputHash,
    scheduledBarIds: Object.freeze([
      ...state.scheduledBarIds,
      decisionPoint.decisionPointBarId,
    ]),
  });

  return Object.freeze({ status: "scheduled", call, nextState });
}

export function createEvaluationCallPlan(
  input: CreateEvaluationCallPlanInputV1,
): EvaluationCallPlanV1 {
  const { selection, candidates, protocol } = input;

  if (!selection.isFrozen) {
    throw new ModelCallContractError("evaluation selection must be frozen");
  }
  assertNonEmpty("selectionPolicyId", selection.selectionPolicyId);
  if (
    selection.selectionPolicyId ===
    CONTINUOUS_EVERY_CLOSE_SELECTION_POLICY_ID
  ) {
    throw new ModelCallContractError(
      "evaluation mode requires a sampled selection policy",
    );
  }
  assertSha256(
    "selectionCommitmentHash",
    selection.selectionCommitmentHash,
  );
  if (selection.decisionPoints.length === 0) {
    throw new ModelCallContractError(
      "evaluation selection must contain a decision point",
    );
  }
  if (candidates.length < 2) {
    throw new ModelCallContractError(
      "peer evaluation requires at least two candidates",
    );
  }
  assertPositiveInteger("repeatsPerCandidate", input.repeatsPerCandidate);
  assertProtocol(protocol);

  const candidateIds = candidates.map((candidate) => {
    assertCandidate(candidate);
    return candidate.candidateId;
  });
  assertUnique("candidateId", candidateIds);

  const decisionPointIds = selection.decisionPoints.map((decisionPoint) => {
    if (!decisionPoint.isClosed) {
      throw new ModelCallContractError(
        "evaluation decision points must be closed",
      );
    }
    if (decisionPoint.selectionPolicyId !== selection.selectionPolicyId) {
      throw new ModelCallContractError(
        "decision point selection policy does not match the frozen selection",
      );
    }
    return JSON.stringify([
      decisionPoint.policyStreamId,
      decisionPoint.decisionPointBarId,
    ]);
  });
  assertUnique("evaluation decision point", decisionPointIds);

  const calls: Readonly<ModelCallRecordV1>[] = [];
  for (const decisionPoint of selection.decisionPoints) {
    for (
      let repeatIndex = 0;
      repeatIndex < input.repeatsPerCandidate;
      repeatIndex += 1
    ) {
      for (const candidate of candidates) {
        calls.push(
          createModelCallRecord({
            mode: "evaluation_sampled",
            decisionPoint,
            candidate,
            protocol,
            repeatIndex,
          }),
        );
      }
    }
  }

  const frozenCandidateIds = Object.freeze([...candidateIds]);
  const frozenCalls = Object.freeze([...calls]);
  const planId = hashIdentity([
    MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    "evaluation_sampled",
    selection.selectionPolicyId,
    selection.selectionCommitmentHash,
    input.repeatsPerCandidate,
    ...frozenCalls.map((call) => call.callId),
  ]);

  return Object.freeze({
    schemaVersion: MODEL_CALL_SCHEDULE_SCHEMA_VERSION,
    planId,
    mode: "evaluation_sampled",
    selectionPolicyId: selection.selectionPolicyId,
    selectionCommitmentHash: selection.selectionCommitmentHash,
    decisionPointCount: selection.decisionPoints.length,
    candidateIds: frozenCandidateIds,
    repeatsPerCandidate: input.repeatsPerCandidate,
    calls: frozenCalls,
  });
}

export function createFrozenModelResult(
  input: CreateFrozenModelResultInputV1,
): Readonly<FrozenModelResultV1> {
  assertSha256("callId", input.call.callId);
  assertSha256("rawOutputHash", input.rawOutputHash);
  assertSha256("decisionHash", input.decisionHash);
  assertSha256("validationResultHash", input.validationResultHash);
  if (
    input.validationStatus !== "accepted" &&
    input.validationStatus !== "rejected"
  ) {
    throw new ModelCallContractError(
      `unsupported validation status: ${String(input.validationStatus)}`,
    );
  }

  return Object.freeze({
    schemaVersion: FROZEN_MODEL_RESULT_SCHEMA_VERSION,
    cacheKey: input.call.callId,
    callId: input.call.callId,
    mode: input.call.mode,
    policyStreamId: input.call.policyStreamId,
    decisionPointBarId: input.call.decisionPointBarId,
    decisionPointSequence: input.call.decisionPointSequence,
    inputHash: input.call.inputHash,
    candidateId: input.call.candidateId,
    modelId: input.call.modelId,
    rawOutputHash: input.rawOutputHash,
    decisionHash: input.decisionHash,
    validationResultHash: input.validationResultHash,
    validationStatus: input.validationStatus,
    isFrozen: true,
  });
}

export function createReplayDecisionBundle(
  input: CreateReplayDecisionBundleInputV1,
): Readonly<ReplayDecisionBundleV1> {
  if (input.results.length === 0) {
    throw new ModelCallContractError(
      "replay decision bundle must contain a model result",
    );
  }

  for (const result of input.results) {
    if (!result.isFrozen) {
      throw new ModelCallContractError("replay requires frozen model results");
    }
    assertSha256("result callId", result.callId);
    assertSha256("result cacheKey", result.cacheKey);
    assertSha256("result rawOutputHash", result.rawOutputHash);
    assertSha256("result decisionHash", result.decisionHash);
    assertSha256("result validationResultHash", result.validationResultHash);
    if (result.cacheKey !== result.callId) {
      throw new ModelCallContractError(
        "frozen result cache key must equal its model call identity",
      );
    }
  }
  assertUnique(
    "replay result callId",
    input.results.map((result) => result.callId),
  );

  const frozenResults = Object.freeze([...input.results]);
  const bundleId = hashIdentity([
    REPLAY_DECISION_BUNDLE_SCHEMA_VERSION,
    "precomputed_frozen_model_results",
    false,
    ...frozenResults.flatMap((result) => [
      result.callId,
      result.rawOutputHash,
      result.decisionHash,
      result.validationResultHash,
      result.validationStatus,
    ]),
  ]);

  return Object.freeze({
    schemaVersion: REPLAY_DECISION_BUNDLE_SCHEMA_VERSION,
    bundleId,
    source: "precomputed_frozen_model_results",
    modelCallsPermitted: false,
    results: frozenResults,
  });
}

function assertContinuousStreamMatch(
  state: ContinuousScheduleStateV1,
  decisionPoint: DecisionPointV1,
): void {
  if (decisionPoint.policyStreamId !== state.policyStreamId) {
    throw new ModelCallContractError("decision point belongs to another stream");
  }
  if (decisionPoint.barDurationSeconds !== state.barDurationSeconds) {
    throw new ModelCallContractError("bar duration changed within a stream");
  }
  if (
    decisionPoint.selectionPolicyId !==
    CONTINUOUS_EVERY_CLOSE_SELECTION_POLICY_ID
  ) {
    throw new ModelCallContractError(
      "continuous mode requires continuous_every_close.v1 selection policy",
    );
  }
}

function assertCandidate(candidate: ModelCandidateV1): void {
  assertNonEmpty("candidateId", candidate.candidateId);
  assertNonEmpty("modelId", candidate.modelId);
}

function assertProtocol(protocol: ModelCallProtocolV1): void {
  assertSha256("promptHash", protocol.promptHash);
  assertNonEmpty("outputSchemaVersion", protocol.outputSchemaVersion);
  assertNonEmpty("reasoningBudgetId", protocol.reasoningBudgetId);
}

function assertUnique(name: string, values: readonly string[]): void {
  if (new Set(values).size !== values.length) {
    throw new ModelCallContractError(`${name} values must be unique`);
  }
}

function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new ModelCallContractError(`${name} must not be empty`);
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ModelCallContractError(`${name} must be a positive integer`);
  }
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ModelCallContractError(
      `${name} must be a non-negative integer`,
    );
  }
}

function assertFirstBrooksPolicyBarDuration(value: number): void {
  if (value !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS) {
    throw new ModelCallContractError(
      "V1 Brooks policy requires 300-second bars",
    );
  }
}

function assertSha256(name: string, value: string): asserts value is Sha256 {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new ModelCallContractError(`${name} must be a lowercase SHA-256`);
  }
}

function hashIdentity(
  fields: readonly (string | number | boolean)[],
): Sha256 {
  return sha256(JSON.stringify(fields));
}

function sha256(value: string): Sha256 {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}
