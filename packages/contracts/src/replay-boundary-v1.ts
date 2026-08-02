import {
  assertNonEmpty,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import type { BrooksDecisionV1 } from "./brooks-decision-v1.ts";
import {
  createReplayDecisionBundle,
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  FROZEN_MODEL_RESULT_SCHEMA_VERSION,
  REPLAY_DECISION_BUNDLE_SCHEMA_VERSION,
  type ReplayDecisionBundleV1,
} from "./model-call-schedule-v1.ts";
import {
  assertBrooksPolicyCaseIntegrity,
  assertBrooksPolicyInputIntegrity,
  createAnonymousMarketInput,
  type BrooksPolicyCaseV1,
  type BrooksPolicyInputV1,
} from "./policy-input-v1.ts";

export const DATASET_AUTHORIZATION_SCHEMA_VERSION =
  "dataset-authorization.v1" as const;
export const POST_DECISION_EXECUTION_DATA_PROVENANCE_SCHEMA_VERSION =
  "post-decision-execution-data-provenance.v1" as const;
export const EXPERIMENT_POLICY_REFERENCE_SCHEMA_VERSION =
  "experiment-policy-reference.v1" as const;
export const REPLAY_REQUEST_SCHEMA_VERSION = "replay-request.v1" as const;
export const REPLAY_RESULT_SCHEMA_VERSION = "replay-result.v1" as const;

export const REPLAY_TERMINAL_STATES = [
  "rejected",
  "resolved",
  "unresolved",
  "right_censored",
] as const;
export const REPLAY_REJECTION_REASONS = [
  "dataset_authorization_revoked",
  "dataset_artifact_hash_mismatch",
  "provenance_artifact_hash_mismatch",
  "experiment_policy_hash_mismatch",
  "engine_runtime_not_authorized",
  "replay_config_not_authorized",
  "audit_identity_mismatch",
] as const;
export const REPLAY_UNRESOLVED_REASONS = [
  "missing_execution_data",
  "segment_boundary",
  "same_bar_order_ambiguous",
  "source_order_unknown",
] as const;

export type ReplayTerminalStateV1 = (typeof REPLAY_TERMINAL_STATES)[number];
export type ReplayRejectionReasonV1 =
  (typeof REPLAY_REJECTION_REASONS)[number];
export type ReplayUnresolvedReasonV1 =
  (typeof REPLAY_UNRESOLVED_REASONS)[number];

export const EXECUTION_DATA_EVENT_RESOLUTIONS = [
  "closed_bars",
  "sub_bar_events",
] as const;

export type ExecutionDataEventResolutionV1 =
  (typeof EXECUTION_DATA_EVENT_RESOLUTIONS)[number];

export interface ProtectedWindowCheckV1 {
  readonly policyId: string;
  readonly status: "passed";
  readonly validationResultHash: ContractSha256;
}

export interface CreateDatasetAuthorizationInputV1 {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly sliceId: string;
  readonly artifactHash: ContractSha256;
  readonly manifestHash: ContractSha256;
  readonly coverageStartUtc: string;
  readonly coverageEndUtc: string;
  readonly authorizationScope: "exact_slice";
  readonly approvedPurpose: "research_replay";
  readonly isImmutable: true;
  readonly protectedWindowCheck: ProtectedWindowCheckV1;
  readonly approvalAuthority: "calvin";
  readonly approvalRecordHash: ContractSha256;
}

export interface DatasetAuthorizationV1
  extends CreateDatasetAuthorizationInputV1 {
  readonly schemaVersion: typeof DATASET_AUTHORIZATION_SCHEMA_VERSION;
  readonly authorizationHash: ContractSha256;
}

export interface ExecutionDataEventIdentityV1 {
  readonly eventId: string;
  readonly eventSequence: number;
  readonly parentPolicyBarId: string;
  readonly parentPolicyBarSequence: number;
}

export interface CreatePostDecisionExecutionDataProvenanceInputV1 {
  readonly datasetAuthorization: DatasetAuthorizationV1;
  readonly caseHash: ContractSha256;
  readonly inputHash: ContractSha256;
  readonly decisionHash: ContractSha256;
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly executionDataArtifactHash: ContractSha256;
  readonly executionDataManifestHash: ContractSha256;
  readonly eventResolution: ExecutionDataEventResolutionV1;
  readonly coverageStartRelation: "strictly_after_decision_cutoff";
  readonly firstEvent: ExecutionDataEventIdentityV1;
  readonly lastEvent: ExecutionDataEventIdentityV1;
}

export interface PostDecisionExecutionDataProvenanceV1
  extends Omit<
    CreatePostDecisionExecutionDataProvenanceInputV1,
    "datasetAuthorization"
  > {
  readonly schemaVersion: typeof POST_DECISION_EXECUTION_DATA_PROVENANCE_SCHEMA_VERSION;
  readonly provenanceHash: ContractSha256;
  readonly datasetAuthorizationHash: ContractSha256;
}

export interface CreateExperimentPolicyReferenceInputV1 {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly assumptionsHash: ContractSha256;
  readonly isFrozen: true;
  readonly mutationPermitted: false;
}

export interface ExperimentPolicyReferenceV1
  extends CreateExperimentPolicyReferenceInputV1 {
  readonly schemaVersion: typeof EXPERIMENT_POLICY_REFERENCE_SCHEMA_VERSION;
  readonly policyHash: ContractSha256;
}

export interface ReplayDecisionBindingV1 {
  readonly bundleId: ContractSha256;
  readonly callId: ContractSha256;
  readonly caseHash: ContractSha256;
  readonly caseId: string;
  readonly inputHash: ContractSha256;
  readonly decisionHash: ContractSha256;
  readonly policyStreamId: string;
  readonly decisionPointBarId: string;
  readonly decisionPointSequence: number;
  readonly anonymousLastVisibleBarId: string;
  readonly barDurationSeconds: number;
}

export interface CreateReplayRequestInputV1 {
  readonly policyCase: BrooksPolicyCaseV1;
  readonly policyInput: BrooksPolicyInputV1;
  readonly decision: BrooksDecisionV1;
  readonly decisionBundle: ReplayDecisionBundleV1;
  readonly selectedCallId: ContractSha256;
  readonly datasetAuthorization: DatasetAuthorizationV1;
  readonly executionDataProvenance: PostDecisionExecutionDataProvenanceV1;
  readonly experimentPolicy: ExperimentPolicyReferenceV1;
}

export interface ReplayExecutionDataRangeV1 {
  readonly firstEventId: string;
  readonly firstEventSequence: number;
  readonly lastEventId: string;
  readonly lastEventSequence: number;
}

export interface ReplayRequestV1 {
  readonly schemaVersion: typeof REPLAY_REQUEST_SCHEMA_VERSION;
  readonly requestHash: ContractSha256;
  readonly pathId: ContractSha256;
  readonly pathScope: "single_frozen_decision";
  readonly decisionBinding: ReplayDecisionBindingV1;
  readonly datasetAuthorizationHash: ContractSha256;
  readonly executionDataProvenanceHash: ContractSha256;
  readonly executionDataRange: ReplayExecutionDataRangeV1;
  readonly experimentPolicyHash: ContractSha256;
  readonly modelCallsPermitted: false;
  readonly policyMutationPermitted: false;
  readonly futureDataPermitted: false;
  readonly implicitOhlcTraversalPermitted: false;
}

export interface RejectedReplayTerminalV1 {
  readonly state: "rejected";
  readonly reason: ReplayRejectionReasonV1;
  readonly sidecarStarted: false;
}

export interface ResolvedReplayTerminalV1 {
  readonly state: "resolved";
  readonly reason: null;
  readonly terminalEventId: string;
  readonly terminalEventSequence: number;
}

export interface UnresolvedReplayTerminalV1 {
  readonly state: "unresolved";
  readonly reason: ReplayUnresolvedReasonV1;
  readonly affectedPathAction: "terminated_fail_closed";
  readonly detectedAtEventId: string | null;
  readonly detectedAtEventSequence: number | null;
}

export interface RightCensoredReplayTerminalV1 {
  readonly state: "right_censored";
  readonly reason: "authorized_horizon_exhausted";
  readonly censoringBoundaryEventId: string;
  readonly lastObservedEventId: string;
  readonly lastObservedEventSequence: number;
}

export type ReplayTerminalV1 =
  | RejectedReplayTerminalV1
  | ResolvedReplayTerminalV1
  | UnresolvedReplayTerminalV1
  | RightCensoredReplayTerminalV1;

export interface CreateReplayResultInputV1 {
  readonly request: ReplayRequestV1;
  readonly terminal: ReplayTerminalV1;
  readonly engineRuntimeHash: ContractSha256 | null;
  readonly replayConfigHash: ContractSha256 | null;
  readonly rawArtifactHash: ContractSha256 | null;
  readonly validationAuditHash: ContractSha256;
}

export interface ReplayResultV1
  extends Omit<CreateReplayResultInputV1, "request"> {
  readonly schemaVersion: typeof REPLAY_RESULT_SCHEMA_VERSION;
  readonly resultHash: ContractSha256;
  readonly requestHash: ContractSha256;
  readonly pathId: ContractSha256;
  readonly datasetAuthorizationHash: ContractSha256;
  readonly executionDataProvenanceHash: ContractSha256;
  readonly experimentPolicyHash: ContractSha256;
}

export class ReplayBoundaryContractError extends Error {
  override readonly name = "ReplayBoundaryContractError";
}

export function createDatasetAuthorization(
  input: CreateDatasetAuthorizationInputV1,
): Readonly<DatasetAuthorizationV1> {
  try {
    assertNonEmpty("datasetId", input.datasetId);
    assertNonEmpty("datasetVersion", input.datasetVersion);
    assertNonEmpty("sliceId", input.sliceId);
    assertSha256("artifactHash", input.artifactHash);
    assertSha256("manifestHash", input.manifestHash);
    assertUtcInterval(input.coverageStartUtc, input.coverageEndUtc);
    if (input.authorizationScope !== "exact_slice") {
      fail("dataset authorizationScope must be exact_slice");
    }
    if (input.approvedPurpose !== "research_replay") {
      fail("dataset approvedPurpose must be research_replay");
    }
    if (input.isImmutable !== true) {
      fail("dataset authorization requires an immutable slice");
    }
    assertNonEmpty(
      "protectedWindowCheck.policyId",
      input.protectedWindowCheck.policyId,
    );
    if (input.protectedWindowCheck.status !== "passed") {
      fail("protected-window check must pass before data access");
    }
    assertSha256(
      "protectedWindowCheck.validationResultHash",
      input.protectedWindowCheck.validationResultHash,
    );
    if (input.approvalAuthority !== "calvin") {
      fail("dataset authorization requires Calvin approval");
    }
    assertSha256("approvalRecordHash", input.approvalRecordHash);

    const body = {
      datasetId: input.datasetId,
      datasetVersion: input.datasetVersion,
      sliceId: input.sliceId,
      artifactHash: input.artifactHash,
      manifestHash: input.manifestHash,
      coverageStartUtc: input.coverageStartUtc,
      coverageEndUtc: input.coverageEndUtc,
      authorizationScope: input.authorizationScope,
      approvedPurpose: input.approvedPurpose,
      isImmutable: input.isImmutable,
      protectedWindowCheck: { ...input.protectedWindowCheck },
      approvalAuthority: input.approvalAuthority,
      approvalRecordHash: input.approvalRecordHash,
    } as const;

    return deepFreeze({
      schemaVersion: DATASET_AUTHORIZATION_SCHEMA_VERSION,
      authorizationHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function assertDatasetAuthorizationIntegrity(
  authorization: DatasetAuthorizationV1,
): void {
  try {
    if (authorization.schemaVersion !== DATASET_AUTHORIZATION_SCHEMA_VERSION) {
      fail("dataset authorization schemaVersion is unsupported");
    }
    assertSha256("authorizationHash", authorization.authorizationHash);
    const recreated = createDatasetAuthorization({
      datasetId: authorization.datasetId,
      datasetVersion: authorization.datasetVersion,
      sliceId: authorization.sliceId,
      artifactHash: authorization.artifactHash,
      manifestHash: authorization.manifestHash,
      coverageStartUtc: authorization.coverageStartUtc,
      coverageEndUtc: authorization.coverageEndUtc,
      authorizationScope: authorization.authorizationScope,
      approvedPurpose: authorization.approvedPurpose,
      isImmutable: authorization.isImmutable,
      protectedWindowCheck: authorization.protectedWindowCheck,
      approvalAuthority: authorization.approvalAuthority,
      approvalRecordHash: authorization.approvalRecordHash,
    });
    if (recreated.authorizationHash !== authorization.authorizationHash) {
      fail("dataset authorization hash does not match its content");
    }
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function createPostDecisionExecutionDataProvenance(
  input: CreatePostDecisionExecutionDataProvenanceInputV1,
): Readonly<PostDecisionExecutionDataProvenanceV1> {
  try {
    assertDatasetAuthorizationIntegrity(input.datasetAuthorization);
    assertSha256("caseHash", input.caseHash);
    assertSha256("inputHash", input.inputHash);
    assertSha256("decisionHash", input.decisionHash);
    assertNonEmpty("policyStreamId", input.policyStreamId);
    assertNonEmpty("decisionPointBarId", input.decisionPointBarId);
    assertNonNegativeSafeInteger(
      "decisionPointSequence",
      input.decisionPointSequence,
    );
    assertSha256(
      "executionDataArtifactHash",
      input.executionDataArtifactHash,
    );
    assertSha256(
      "executionDataManifestHash",
      input.executionDataManifestHash,
    );
    if (!EXECUTION_DATA_EVENT_RESOLUTIONS.includes(input.eventResolution)) {
      fail(`unsupported execution event resolution: ${String(input.eventResolution)}`);
    }
    if (
      input.coverageStartRelation !== "strictly_after_decision_cutoff"
    ) {
      fail("execution coverage must start strictly after the decision cutoff");
    }
    validateExecutionEvent("firstEvent", input.firstEvent);
    validateExecutionEvent("lastEvent", input.lastEvent);
    if (
      input.firstEvent.parentPolicyBarSequence <= input.decisionPointSequence ||
      input.firstEvent.parentPolicyBarId === input.decisionPointBarId
    ) {
      fail("execution events must be strictly after the decision cutoff");
    }
    if (
      input.lastEvent.parentPolicyBarSequence <
        input.firstEvent.parentPolicyBarSequence ||
      input.lastEvent.eventSequence < input.firstEvent.eventSequence
    ) {
      fail("execution event coverage must be monotonically ordered");
    }

    const body = {
      datasetAuthorizationHash: input.datasetAuthorization.authorizationHash,
      caseHash: input.caseHash,
      inputHash: input.inputHash,
      decisionHash: input.decisionHash,
      policyStreamId: input.policyStreamId,
      decisionPointBarId: input.decisionPointBarId,
      decisionPointSequence: input.decisionPointSequence,
      executionDataArtifactHash: input.executionDataArtifactHash,
      executionDataManifestHash: input.executionDataManifestHash,
      eventResolution: input.eventResolution,
      coverageStartRelation: input.coverageStartRelation,
      firstEvent: { ...input.firstEvent },
      lastEvent: { ...input.lastEvent },
    } as const;

    return deepFreeze({
      schemaVersion:
        POST_DECISION_EXECUTION_DATA_PROVENANCE_SCHEMA_VERSION,
      provenanceHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function assertPostDecisionExecutionDataProvenanceIntegrity(
  provenance: PostDecisionExecutionDataProvenanceV1,
): void {
  try {
    if (
      provenance.schemaVersion !==
      POST_DECISION_EXECUTION_DATA_PROVENANCE_SCHEMA_VERSION
    ) {
      fail("execution-data provenance schemaVersion is unsupported");
    }
    assertSha256("provenanceHash", provenance.provenanceHash);
    assertSha256(
      "datasetAuthorizationHash",
      provenance.datasetAuthorizationHash,
    );
    assertSha256("caseHash", provenance.caseHash);
    assertSha256("inputHash", provenance.inputHash);
    assertSha256("decisionHash", provenance.decisionHash);
    assertNonEmpty("policyStreamId", provenance.policyStreamId);
    assertNonEmpty("decisionPointBarId", provenance.decisionPointBarId);
    assertNonNegativeSafeInteger(
      "decisionPointSequence",
      provenance.decisionPointSequence,
    );
    assertSha256(
      "executionDataArtifactHash",
      provenance.executionDataArtifactHash,
    );
    assertSha256(
      "executionDataManifestHash",
      provenance.executionDataManifestHash,
    );
    if (!EXECUTION_DATA_EVENT_RESOLUTIONS.includes(provenance.eventResolution)) {
      fail(
        `unsupported execution event resolution: ${String(provenance.eventResolution)}`,
      );
    }
    if (
      provenance.coverageStartRelation !==
      "strictly_after_decision_cutoff"
    ) {
      fail("execution coverage must start strictly after the decision cutoff");
    }
    validateExecutionEvent("firstEvent", provenance.firstEvent);
    validateExecutionEvent("lastEvent", provenance.lastEvent);
    if (
      provenance.firstEvent.parentPolicyBarSequence <=
        provenance.decisionPointSequence ||
      provenance.firstEvent.parentPolicyBarId === provenance.decisionPointBarId
    ) {
      fail("execution events must be strictly after the decision cutoff");
    }
    if (
      provenance.lastEvent.parentPolicyBarSequence <
        provenance.firstEvent.parentPolicyBarSequence ||
      provenance.lastEvent.eventSequence < provenance.firstEvent.eventSequence
    ) {
      fail("execution event coverage must be monotonically ordered");
    }
    if (canonicalHash(provenanceBody(provenance)) !== provenance.provenanceHash) {
      fail("execution-data provenance hash does not match its content");
    }
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function createExperimentPolicyReference(
  input: CreateExperimentPolicyReferenceInputV1,
): Readonly<ExperimentPolicyReferenceV1> {
  try {
    assertNonEmpty("policyId", input.policyId);
    assertNonEmpty("policyVersion", input.policyVersion);
    assertSha256("assumptionsHash", input.assumptionsHash);
    if (input.isFrozen !== true) {
      fail("experiment policy must be frozen");
    }
    if (input.mutationPermitted !== false) {
      fail("experiment policy mutation is forbidden");
    }
    const body = {
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      assumptionsHash: input.assumptionsHash,
      isFrozen: input.isFrozen,
      mutationPermitted: input.mutationPermitted,
    } as const;
    return deepFreeze({
      schemaVersion: EXPERIMENT_POLICY_REFERENCE_SCHEMA_VERSION,
      policyHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function assertExperimentPolicyReferenceIntegrity(
  policy: ExperimentPolicyReferenceV1,
): void {
  try {
    if (policy.schemaVersion !== EXPERIMENT_POLICY_REFERENCE_SCHEMA_VERSION) {
      fail("experiment policy schemaVersion is unsupported");
    }
    assertSha256("policyHash", policy.policyHash);
    const recreated = createExperimentPolicyReference({
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      assumptionsHash: policy.assumptionsHash,
      isFrozen: policy.isFrozen,
      mutationPermitted: policy.mutationPermitted,
    });
    if (recreated.policyHash !== policy.policyHash) {
      fail("experiment policy hash does not match its content");
    }
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function createReplayRequest(
  input: CreateReplayRequestInputV1,
): Readonly<ReplayRequestV1> {
  try {
    assertBrooksPolicyCaseIntegrity(input.policyCase);
    assertBrooksPolicyInputIntegrity(input.policyInput);
    assertDecisionIntegrity(input.decision);
    assertReplayDecisionBundleIntegrity(input.decisionBundle);
    assertSha256("selectedCallId", input.selectedCallId);
    assertDatasetAuthorizationIntegrity(input.datasetAuthorization);
    assertPostDecisionExecutionDataProvenanceIntegrity(
      input.executionDataProvenance,
    );
    assertExperimentPolicyReferenceIntegrity(input.experimentPolicy);

    const selectedResult = input.decisionBundle.results.find(
      (result) => result.callId === input.selectedCallId,
    );
    if (selectedResult === undefined) {
      fail("selected replay callId is not present in the frozen bundle");
    }
    if (!selectedResult.isFrozen || selectedResult.validationStatus !== "accepted") {
      fail("replay requires one selected accepted frozen model result");
    }
    const expectedAnonymousMarket = createAnonymousMarketInput(input.policyCase);
    if (
      canonicalHash(expectedAnonymousMarket) !==
      canonicalHash(input.policyInput.market)
    ) {
      fail("policy input market does not match the local policy Case");
    }
    const finalCaseBar = input.policyCase.bars.at(-1);
    if (
      input.decision.caseId !== input.policyCase.caseId ||
      input.decision.inputHash !== input.policyInput.inputHash ||
      input.decision.lastVisibleBarId !==
        input.policyInput.market.lastVisibleBarId ||
      input.decision.barDurationSeconds !== input.policyCase.barDurationSeconds
    ) {
      fail("BrooksDecision identity does not match its Case and policy input");
    }
    if (
      selectedResult.policyStreamId !== input.policyCase.policyStreamId ||
      selectedResult.decisionPointBarId !== input.policyCase.lastVisibleBarId ||
      selectedResult.decisionPointSequence !== finalCaseBar?.sequence ||
      selectedResult.inputHash !== input.policyInput.inputHash ||
      selectedResult.decisionHash !== input.decision.decisionHash
    ) {
      fail("frozen result does not match the Case, input, decision, and cutoff");
    }

    const provenance = input.executionDataProvenance;
    if (provenance.datasetAuthorizationHash !== input.datasetAuthorization.authorizationHash) {
      fail("provenance dataset authorization does not match");
    }
    if (provenance.caseHash !== input.policyCase.caseHash) {
      fail("provenance caseHash does not match");
    }
    if (provenance.inputHash !== input.policyInput.inputHash) {
      fail("provenance inputHash does not match");
    }
    if (provenance.decisionHash !== input.decision.decisionHash) {
      fail("provenance decisionHash does not match");
    }
    if (
      provenance.policyStreamId !== input.policyCase.policyStreamId ||
      provenance.decisionPointBarId !== selectedResult.decisionPointBarId ||
      provenance.decisionPointSequence !== selectedResult.decisionPointSequence
    ) {
      fail("provenance cutoff does not match the selected frozen result");
    }

    const decisionBinding: ReplayDecisionBindingV1 = {
      bundleId: input.decisionBundle.bundleId,
      callId: selectedResult.callId,
      caseHash: input.policyCase.caseHash,
      caseId: input.policyCase.caseId,
      inputHash: input.policyInput.inputHash,
      decisionHash: input.decision.decisionHash,
      policyStreamId: input.policyCase.policyStreamId,
      decisionPointBarId: selectedResult.decisionPointBarId,
      decisionPointSequence: selectedResult.decisionPointSequence,
      anonymousLastVisibleBarId: input.decision.lastVisibleBarId,
      barDurationSeconds: input.policyCase.barDurationSeconds,
    };
    const body = {
      pathId: selectedResult.callId,
      pathScope: "single_frozen_decision" as const,
      decisionBinding,
      datasetAuthorizationHash: input.datasetAuthorization.authorizationHash,
      executionDataProvenanceHash: provenance.provenanceHash,
      executionDataRange: {
        firstEventId: provenance.firstEvent.eventId,
        firstEventSequence: provenance.firstEvent.eventSequence,
        lastEventId: provenance.lastEvent.eventId,
        lastEventSequence: provenance.lastEvent.eventSequence,
      },
      experimentPolicyHash: input.experimentPolicy.policyHash,
      modelCallsPermitted: false as const,
      policyMutationPermitted: false as const,
      futureDataPermitted: false as const,
      implicitOhlcTraversalPermitted: false as const,
    };

    return deepFreeze({
      schemaVersion: REPLAY_REQUEST_SCHEMA_VERSION,
      requestHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function assertReplayRequestIntegrity(request: ReplayRequestV1): void {
  try {
    assertExactKeys("ReplayRequestV1", request, [
      "schemaVersion",
      "requestHash",
      "pathId",
      "pathScope",
      "decisionBinding",
      "datasetAuthorizationHash",
      "executionDataProvenanceHash",
      "executionDataRange",
      "experimentPolicyHash",
      "modelCallsPermitted",
      "policyMutationPermitted",
      "futureDataPermitted",
      "implicitOhlcTraversalPermitted",
    ]);
    if (request.schemaVersion !== REPLAY_REQUEST_SCHEMA_VERSION) {
      fail("replay request schemaVersion is unsupported");
    }
    assertSha256("requestHash", request.requestHash);
    assertSha256("pathId", request.pathId);
    if (request.pathScope !== "single_frozen_decision") {
      fail("replay request must contain one frozen decision path");
    }
    validateDecisionBinding(request.decisionBinding);
    if (request.pathId !== request.decisionBinding.callId) {
      fail("replay pathId must equal the selected frozen callId");
    }
    assertSha256(
      "datasetAuthorizationHash",
      request.datasetAuthorizationHash,
    );
    assertSha256(
      "executionDataProvenanceHash",
      request.executionDataProvenanceHash,
    );
    validateExecutionDataRange(request.executionDataRange);
    assertSha256("experimentPolicyHash", request.experimentPolicyHash);
    if (
      request.modelCallsPermitted !== false ||
      request.policyMutationPermitted !== false ||
      request.futureDataPermitted !== false ||
      request.implicitOhlcTraversalPermitted !== false
    ) {
      fail("replay request must forbid model calls, policy mutation, future data, and implicit OHLC traversal");
    }
    const { schemaVersion: _schemaVersion, requestHash, ...body } = request;
    if (canonicalHash(body) !== requestHash) {
      fail("replay request hash does not match its content");
    }
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function createReplayResult(
  input: CreateReplayResultInputV1,
): Readonly<ReplayResultV1> {
  try {
    assertExactKeys("CreateReplayResultInputV1", input, [
      "request",
      "terminal",
      "engineRuntimeHash",
      "replayConfigHash",
      "rawArtifactHash",
      "validationAuditHash",
    ]);
    assertReplayRequestIntegrity(input.request);
    validateReplayTerminal(input.terminal, input.request.executionDataRange);
    assertSha256("validationAuditHash", input.validationAuditHash);
    validateReplayResultArtifactHashes(
      input.terminal,
      input.engineRuntimeHash,
      input.replayConfigHash,
      input.rawArtifactHash,
    );

    const body = {
      requestHash: input.request.requestHash,
      pathId: input.request.pathId,
      datasetAuthorizationHash: input.request.datasetAuthorizationHash,
      executionDataProvenanceHash:
        input.request.executionDataProvenanceHash,
      experimentPolicyHash: input.request.experimentPolicyHash,
      terminal: { ...input.terminal },
      engineRuntimeHash: input.engineRuntimeHash,
      replayConfigHash: input.replayConfigHash,
      rawArtifactHash: input.rawArtifactHash,
      validationAuditHash: input.validationAuditHash,
    };
    return deepFreeze({
      schemaVersion: REPLAY_RESULT_SCHEMA_VERSION,
      resultHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

export function assertReplayResultIntegrity(
  result: ReplayResultV1,
  request: ReplayRequestV1,
): void {
  try {
    assertExactKeys("ReplayResultV1", result, [
      "schemaVersion",
      "resultHash",
      "requestHash",
      "pathId",
      "datasetAuthorizationHash",
      "executionDataProvenanceHash",
      "experimentPolicyHash",
      "terminal",
      "engineRuntimeHash",
      "replayConfigHash",
      "rawArtifactHash",
      "validationAuditHash",
    ]);
    if (result.schemaVersion !== REPLAY_RESULT_SCHEMA_VERSION) {
      fail("replay result schemaVersion is unsupported");
    }
    assertSha256("resultHash", result.resultHash);
    assertReplayRequestIntegrity(request);
    if (
      result.requestHash !== request.requestHash ||
      result.pathId !== request.pathId ||
      result.datasetAuthorizationHash !== request.datasetAuthorizationHash ||
      result.executionDataProvenanceHash !==
        request.executionDataProvenanceHash ||
      result.experimentPolicyHash !== request.experimentPolicyHash
    ) {
      fail("replay result identity does not match its request");
    }
    validateReplayTerminal(result.terminal, request.executionDataRange);
    validateReplayResultArtifactHashes(
      result.terminal,
      result.engineRuntimeHash,
      result.replayConfigHash,
      result.rawArtifactHash,
    );
    assertSha256("validationAuditHash", result.validationAuditHash);
    const { schemaVersion: _schemaVersion, resultHash, ...body } = result;
    if (canonicalHash(body) !== resultHash) {
      fail("replay result hash does not match its content");
    }
  } catch (error) {
    throw asReplayBoundaryError(error);
  }
}

function validateReplayResultArtifactHashes(
  terminal: ReplayTerminalV1,
  engineRuntimeHash: ContractSha256 | null,
  replayConfigHash: ContractSha256 | null,
  rawArtifactHash: ContractSha256 | null,
): void {
  if (terminal.state === "rejected") {
    if (
      engineRuntimeHash !== null ||
      replayConfigHash !== null ||
      rawArtifactHash !== null
    ) {
      fail("rejected result cannot bind sidecar artifacts");
    }
    return;
  }
  if (
    engineRuntimeHash === null ||
    replayConfigHash === null ||
    rawArtifactHash === null
  ) {
    fail("non-rejected result requires all sidecar artifact hashes");
  }
  assertSha256("engineRuntimeHash", engineRuntimeHash);
  assertSha256("replayConfigHash", replayConfigHash);
  assertSha256("rawArtifactHash", rawArtifactHash);
}

function assertDecisionIntegrity(decision: BrooksDecisionV1): void {
  assertSha256("decisionHash", decision.decisionHash);
  const { decisionHash, ...body } = decision;
  if (canonicalHash(body) !== decisionHash) {
    fail("BrooksDecision hash does not match its content");
  }
}

function assertReplayDecisionBundleIntegrity(
  bundle: ReplayDecisionBundleV1,
): void {
  if (bundle.schemaVersion !== REPLAY_DECISION_BUNDLE_SCHEMA_VERSION) {
    fail("replay decision bundle schemaVersion is unsupported");
  }
  assertSha256("replay decision bundleId", bundle.bundleId);
  if (
    bundle.source !== "precomputed_frozen_model_results" ||
    bundle.modelCallsPermitted !== false
  ) {
    fail("replay bundle must forbid model calls and use frozen results");
  }
  for (const result of bundle.results) {
    if (result.schemaVersion !== FROZEN_MODEL_RESULT_SCHEMA_VERSION) {
      fail("frozen model result schemaVersion is unsupported");
    }
  }
  const recreated = createReplayDecisionBundle({ results: bundle.results });
  if (recreated.bundleId !== bundle.bundleId) {
    fail("replay decision bundle hash does not match its content");
  }
}

function provenanceBody(
  provenance: PostDecisionExecutionDataProvenanceV1,
): Readonly<Record<string, unknown>> {
  return {
    datasetAuthorizationHash: provenance.datasetAuthorizationHash,
    caseHash: provenance.caseHash,
    inputHash: provenance.inputHash,
    decisionHash: provenance.decisionHash,
    policyStreamId: provenance.policyStreamId,
    decisionPointBarId: provenance.decisionPointBarId,
    decisionPointSequence: provenance.decisionPointSequence,
    executionDataArtifactHash: provenance.executionDataArtifactHash,
    executionDataManifestHash: provenance.executionDataManifestHash,
    eventResolution: provenance.eventResolution,
    coverageStartRelation: provenance.coverageStartRelation,
    firstEvent: { ...provenance.firstEvent },
    lastEvent: { ...provenance.lastEvent },
  };
}

function validateDecisionBinding(binding: ReplayDecisionBindingV1): void {
  assertExactKeys("ReplayDecisionBindingV1", binding, [
    "bundleId",
    "callId",
    "caseHash",
    "caseId",
    "inputHash",
    "decisionHash",
    "policyStreamId",
    "decisionPointBarId",
    "decisionPointSequence",
    "anonymousLastVisibleBarId",
    "barDurationSeconds",
  ]);
  assertSha256("decisionBinding.bundleId", binding.bundleId);
  assertSha256("decisionBinding.callId", binding.callId);
  assertSha256("decisionBinding.caseHash", binding.caseHash);
  assertNonEmpty("decisionBinding.caseId", binding.caseId);
  assertSha256("decisionBinding.inputHash", binding.inputHash);
  assertSha256("decisionBinding.decisionHash", binding.decisionHash);
  assertNonEmpty("decisionBinding.policyStreamId", binding.policyStreamId);
  assertNonEmpty("decisionBinding.decisionPointBarId", binding.decisionPointBarId);
  assertNonNegativeSafeInteger(
    "decisionBinding.decisionPointSequence",
    binding.decisionPointSequence,
  );
  assertNonEmpty(
    "decisionBinding.anonymousLastVisibleBarId",
    binding.anonymousLastVisibleBarId,
  );
  if (
    binding.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS
  ) {
    fail("replay decision binding requires 300-second policy bars");
  }
}

function validateExecutionDataRange(range: ReplayExecutionDataRangeV1): void {
  assertExactKeys("ReplayExecutionDataRangeV1", range, [
    "firstEventId",
    "firstEventSequence",
    "lastEventId",
    "lastEventSequence",
  ]);
  assertNonEmpty("executionDataRange.firstEventId", range.firstEventId);
  assertNonNegativeSafeInteger(
    "executionDataRange.firstEventSequence",
    range.firstEventSequence,
  );
  assertNonEmpty("executionDataRange.lastEventId", range.lastEventId);
  assertNonNegativeSafeInteger(
    "executionDataRange.lastEventSequence",
    range.lastEventSequence,
  );
  if (range.lastEventSequence < range.firstEventSequence) {
    fail("replay execution-data range must be monotonically ordered");
  }
}

function validateReplayTerminal(
  terminal: ReplayTerminalV1,
  range: ReplayExecutionDataRangeV1,
): void {
  if (terminal.state === "rejected") {
    assertExactKeys("RejectedReplayTerminalV1", terminal, [
      "state",
      "reason",
      "sidecarStarted",
    ]);
    if (!REPLAY_REJECTION_REASONS.includes(terminal.reason)) {
      fail(`unsupported replay rejection reason: ${String(terminal.reason)}`);
    }
    if (terminal.sidecarStarted !== false) {
      fail("rejected replay must not start a sidecar");
    }
    return;
  }
  if (terminal.state === "resolved") {
    assertExactKeys("ResolvedReplayTerminalV1", terminal, [
      "state",
      "reason",
      "terminalEventId",
      "terminalEventSequence",
    ]);
    if (terminal.reason !== null) {
      fail("resolved replay cannot carry an outcome reason");
    }
    assertNonEmpty("terminalEventId", terminal.terminalEventId);
    assertEventSequenceWithinRange(
      "terminalEventSequence",
      terminal.terminalEventSequence,
      range,
    );
    return;
  }
  if (terminal.state === "unresolved") {
    assertExactKeys("UnresolvedReplayTerminalV1", terminal, [
      "state",
      "reason",
      "affectedPathAction",
      "detectedAtEventId",
      "detectedAtEventSequence",
    ]);
    if (!REPLAY_UNRESOLVED_REASONS.includes(terminal.reason)) {
      fail(`unsupported replay unresolved reason: ${String(terminal.reason)}`);
    }
    if (terminal.affectedPathAction !== "terminated_fail_closed") {
      fail("unresolved replay must terminate the affected path fail closed");
    }
    if (
      (terminal.detectedAtEventId === null) !==
      (terminal.detectedAtEventSequence === null)
    ) {
      fail("unresolved detection event identity must be wholly present or null");
    }
    if (
      terminal.detectedAtEventId !== null &&
      terminal.detectedAtEventSequence !== null
    ) {
      assertNonEmpty("detectedAtEventId", terminal.detectedAtEventId);
      assertEventSequenceWithinRange(
        "detectedAtEventSequence",
        terminal.detectedAtEventSequence,
        range,
      );
    }
    return;
  }
  if (terminal.state === "right_censored") {
    assertExactKeys("RightCensoredReplayTerminalV1", terminal, [
      "state",
      "reason",
      "censoringBoundaryEventId",
      "lastObservedEventId",
      "lastObservedEventSequence",
    ]);
    if (terminal.reason !== "authorized_horizon_exhausted") {
      fail("right-censored replay requires the authorized horizon reason");
    }
    if (terminal.censoringBoundaryEventId !== range.lastEventId) {
      fail("right-censoring boundary must equal the authorized final event");
    }
    assertNonEmpty("lastObservedEventId", terminal.lastObservedEventId);
    assertEventSequenceWithinRange(
      "lastObservedEventSequence",
      terminal.lastObservedEventSequence,
      range,
    );
    return;
  }
  fail(`unsupported replay terminal state: ${String((terminal as { state?: unknown }).state)}`);
}

function assertEventSequenceWithinRange(
  name: string,
  sequence: number,
  range: ReplayExecutionDataRangeV1,
): void {
  assertNonNegativeSafeInteger(name, sequence);
  if (sequence < range.firstEventSequence || sequence > range.lastEventSequence) {
    fail(`${name} must remain inside the authorized execution-data range`);
  }
}

function assertExactKeys(
  name: string,
  value: object,
  expectedKeys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${name} fields must match the exact V1 contract`);
  }
}

function assertUtcInterval(start: string, end: string): void {
  const startMs = parseCanonicalUtc("coverageStartUtc", start);
  const endMs = parseCanonicalUtc("coverageEndUtc", end);
  if (startMs >= endMs) {
    fail("dataset coverage must end after it starts");
  }
}

function parseCanonicalUtc(name: string, value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    fail(`${name} must be a canonical UTC instant`);
  }
  const epochMs = Date.parse(value);
  if (!Number.isFinite(epochMs) || new Date(epochMs).toISOString() !== value) {
    fail(`${name} must be a valid canonical UTC instant`);
  }
  return epochMs;
}

function validateExecutionEvent(
  name: string,
  event: ExecutionDataEventIdentityV1,
): void {
  assertNonEmpty(`${name}.eventId`, event.eventId);
  assertNonNegativeSafeInteger(`${name}.eventSequence`, event.eventSequence);
  assertNonEmpty(`${name}.parentPolicyBarId`, event.parentPolicyBarId);
  assertNonNegativeSafeInteger(
    `${name}.parentPolicyBarSequence`,
    event.parentPolicyBarSequence,
  );
}

function assertNonNegativeSafeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${name} must be a non-negative safe integer`);
  }
}

function fail(message: string): never {
  throw new ReplayBoundaryContractError(message);
}

function asReplayBoundaryError(error: unknown): ReplayBoundaryContractError {
  if (error instanceof ReplayBoundaryContractError) return error;
  if (error instanceof Error) return new ReplayBoundaryContractError(error.message);
  return new ReplayBoundaryContractError(String(error));
}
