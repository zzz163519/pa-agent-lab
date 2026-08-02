import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertReplayResultIntegrity,
  createDatasetAuthorization,
  createExperimentPolicyReference,
  createPostDecisionExecutionDataProvenance,
  createReplayRequest,
  createReplayResult,
} from "../src/replay-boundary-v1.ts";
import { createBrooksDecision } from "../src/brooks-decision-v1.ts";
import {
  createFrozenModelResult,
  createModelCallRecord,
  createReplayDecisionBundle,
} from "../src/model-call-schedule-v1.ts";
import {
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  type LocalClosedBarV1,
} from "../src/policy-input-v1.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
  retrievedDoctrine,
} from "./fixtures/brooks-decision-v1.fixture.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function datasetAuthorizationInput() {
  return {
    datasetId: "dataset:synthetic-replay",
    datasetVersion: "v1",
    sliceId: "slice:authorized-001",
    artifactHash: sha("1"),
    manifestHash: sha("2"),
    coverageStartUtc: "2024-01-01T00:00:00.000Z",
    coverageEndUtc: "2024-01-02T00:00:00.000Z",
    authorizationScope: "exact_slice" as const,
    approvedPurpose: "research_replay" as const,
    isImmutable: true as const,
    protectedWindowCheck: {
      policyId: "pa-protected-windows.v1",
      status: "passed" as const,
      validationResultHash: sha("3"),
    },
    approvalAuthority: "calvin" as const,
    approvalRecordHash: sha("4"),
  };
}

function executionDataProvenanceInput() {
  return {
    datasetAuthorization: createDatasetAuthorization(datasetAuthorizationInput()),
    caseHash: sha("5"),
    inputHash: sha("6"),
    decisionHash: sha("7"),
    policyStreamId: "stream:synthetic-replay",
    decisionPointBarId: "local-bar:119",
    decisionPointSequence: 119,
    executionDataArtifactHash: sha("8"),
    executionDataManifestHash: sha("9"),
    eventResolution: "sub_bar_events" as const,
    coverageStartRelation: "strictly_after_decision_cutoff" as const,
    firstEvent: {
      eventId: "event:120:0",
      eventSequence: 120_000,
      parentPolicyBarId: "local-bar:120",
      parentPolicyBarSequence: 120,
    },
    lastEvent: {
      eventId: "event:121:9",
      eventSequence: 121_009,
      parentPolicyBarId: "local-bar:121",
      parentPolicyBarSequence: 121,
    },
  };
}

function makeReplayRequestInput() {
  const finalBars = new Map<
    number,
    Omit<
      LocalClosedBarV1,
      "barId" | "sequence" | "isClosed" | "continuityFromPrevious"
    >
  >([
    [117, { open: 104, high: 112, low: 99, close: 105 }],
    [118, { open: 103, high: 104, low: 101, close: 102 }],
    [119, { open: 102, high: 103, low: 100.5, close: 102.5 }],
  ]);
  const bars: LocalClosedBarV1[] = Array.from({ length: 120 }, (_, index) => ({
    barId: `local-bar:${index}`,
    sequence: index,
    ...(finalBars.get(index) ?? {
      open: 100,
      high: 101,
      low: 99,
      close: 100,
    }),
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
  const policyCase = createBrooksPolicyCase({
    caseId: "case:fixture",
    policyStreamId: "stream:synthetic-replay",
    barDurationSeconds: 300,
    bars,
    lastVisibleBarId: "local-bar:119",
    isLeftCensored: false,
  });
  const barIds = Array.from(
    { length: 120 },
    (_, index) => `bar:${index.toString().padStart(3, "0")}`,
  );
  const policyInput = createBrooksPolicyInput({
    policyCase,
    charts: {
      context: {
        panel: "context",
        mediaType: "image/png",
        contentHash: sha("b"),
        barIds,
        lastVisibleBarId: "bar:119",
      },
      detail: {
        panel: "detail",
        mediaType: "image/png",
        contentHash: sha("c"),
        barIds: barIds.slice(-40),
        lastVisibleBarId: "bar:119",
      },
    },
    doctrine: retrievedDoctrine.map((unit) => ({
      doctrineId: unit.doctrineId,
      concept: unit.concept,
      rule: unit.rule,
      appliesWhen: unit.appliesWhen,
      avoidWhen: unit.avoidWhen,
      decisionEffect: unit.decisionEffect,
    })),
  });
  const decision = createBrooksDecision(
    { ...makeValidLongDecision(), inputHash: policyInput.inputHash },
    makeValidationContext(),
  ).decision;
  const call = createModelCallRecord({
    mode: "continuous_every_close",
    decisionPoint: {
      policyStreamId: policyCase.policyStreamId,
      decisionPointBarId: policyCase.lastVisibleBarId,
      decisionPointSequence: 119,
      barDurationSeconds: 300,
      selectionPolicyId: "continuous_every_close.v1",
      inputHash: policyInput.inputHash,
      isClosed: true,
    },
    candidate: {
      candidateId: "candidate:synthetic",
      modelId: "model:pinned-synthetic",
    },
    protocol: {
      promptHash: sha("d"),
      outputSchemaVersion: "brooks-decision.v1",
      reasoningBudgetId: "budget:synthetic",
    },
    repeatIndex: 0,
  });
  const frozenResult = createFrozenModelResult({
    call,
    rawOutputHash: sha("e"),
    decisionHash: decision.decisionHash,
    validationResultHash: sha("f"),
    validationStatus: "accepted",
  });
  const decisionBundle = createReplayDecisionBundle({ results: [frozenResult] });
  const datasetAuthorization = createDatasetAuthorization(
    datasetAuthorizationInput(),
  );
  const executionDataProvenance = createPostDecisionExecutionDataProvenance({
    ...executionDataProvenanceInput(),
    datasetAuthorization,
    caseHash: policyCase.caseHash,
    inputHash: policyInput.inputHash,
    decisionHash: decision.decisionHash,
    policyStreamId: policyCase.policyStreamId,
    decisionPointBarId: policyCase.lastVisibleBarId,
    decisionPointSequence: 119,
  });
  const experimentPolicy = createExperimentPolicyReference({
    policyId: "experiment-policy:synthetic",
    policyVersion: "v1",
    assumptionsHash: sha("a"),
    isFrozen: true,
    mutationPermitted: false,
  });

  return {
    policyCase,
    policyInput,
    decision,
    decisionBundle,
    selectedCallId: call.callId,
    datasetAuthorization,
    executionDataProvenance,
    experimentPolicy,
  };
}

describe("Replay Boundary V1 dataset authorization", () => {
  it("authorizes only an exact immutable content-hashed slice", () => {
    const first = createDatasetAuthorization(datasetAuthorizationInput());
    const repeated = createDatasetAuthorization(datasetAuthorizationInput());

    assert.equal(first.authorizationScope, "exact_slice");
    assert.equal(first.approvedPurpose, "research_replay");
    assert.equal(first.isImmutable, true);
    assert.equal(first.authorizationHash, repeated.authorizationHash);
    assert.match(first.authorizationHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.protectedWindowCheck), true);

    assert.throws(
      () =>
        createDatasetAuthorization({
          ...datasetAuthorizationInput(),
          authorizationScope: "source",
        } as never),
      { message: /exact_slice/ },
    );
    assert.throws(
      () =>
        createDatasetAuthorization({
          ...datasetAuthorizationInput(),
          protectedWindowCheck: {
            ...datasetAuthorizationInput().protectedWindowCheck,
            status: "failed",
          },
        } as never),
      { message: /protected-window check must pass/ },
    );
  });
});

describe("Replay Boundary V1 post-decision provenance", () => {
  it("accepts only execution events strictly after the frozen decision bar", () => {
    const first = createPostDecisionExecutionDataProvenance(
      executionDataProvenanceInput(),
    );
    const repeated = createPostDecisionExecutionDataProvenance(
      executionDataProvenanceInput(),
    );

    assert.equal(
      first.datasetAuthorizationHash,
      executionDataProvenanceInput().datasetAuthorization.authorizationHash,
    );
    assert.equal(first.coverageStartRelation, "strictly_after_decision_cutoff");
    assert.equal(first.firstEvent.parentPolicyBarSequence, 120);
    assert.equal(first.provenanceHash, repeated.provenanceHash);
    assert.match(first.provenanceHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.firstEvent), true);

    assert.throws(
      () =>
        createPostDecisionExecutionDataProvenance({
          ...executionDataProvenanceInput(),
          firstEvent: {
            ...executionDataProvenanceInput().firstEvent,
            parentPolicyBarId: "local-bar:119",
            parentPolicyBarSequence: 119,
          },
        }),
      { message: /strictly after the decision cutoff/ },
    );
  });
});

describe("Replay Boundary V1 experiment policy identity", () => {
  it("binds an opaque frozen policy hash without mechanical assumptions", () => {
    const input = {
      policyId: "experiment-policy:synthetic",
      policyVersion: "v1",
      assumptionsHash: sha("a"),
      isFrozen: true as const,
      mutationPermitted: false as const,
    };
    const first = createExperimentPolicyReference(input);
    const repeated = createExperimentPolicyReference(input);

    assert.equal(first.policyHash, repeated.policyHash);
    assert.equal(first.isFrozen, true);
    assert.equal(first.mutationPermitted, false);
    assert.doesNotMatch(
      JSON.stringify(first),
      /size|fee|slippage|funding|latency|order|fill|portfolio|account|pnl/i,
    );
    assert.throws(
      () =>
        createExperimentPolicyReference({
          ...input,
          mutationPermitted: true,
        } as never),
      { message: /policy mutation is forbidden/ },
    );
  });
});

describe("Replay Boundary V1 request identity", () => {
  it("binds one frozen decision path and forbids mutable or causal shortcuts", () => {
    const input = makeReplayRequestInput();
    const first = createReplayRequest(input);
    const repeated = createReplayRequest(makeReplayRequestInput());

    assert.equal(first.requestHash, repeated.requestHash);
    assert.equal(first.pathId, input.selectedCallId);
    assert.equal(first.pathScope, "single_frozen_decision");
    assert.equal(first.decisionBinding.caseHash, input.policyCase.caseHash);
    assert.equal(first.decisionBinding.inputHash, input.policyInput.inputHash);
    assert.equal(
      first.decisionBinding.decisionHash,
      input.decision.decisionHash,
    );
    assert.equal(
      first.executionDataRange.firstEventSequence,
      input.executionDataProvenance.firstEvent.eventSequence,
    );
    assert.equal(first.modelCallsPermitted, false);
    assert.equal(first.policyMutationPermitted, false);
    assert.equal(first.futureDataPermitted, false);
    assert.equal(first.implicitOhlcTraversalPermitted, false);
    assert.doesNotMatch(JSON.stringify(first), /tradePlan|bars|open|high|low|close/);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.decisionBinding), true);
  });

  it("rejects mismatched cutoff identities and mutable frozen inputs", () => {
    const input = makeReplayRequestInput();
    const mismatchedProvenance = createPostDecisionExecutionDataProvenance({
      ...executionDataProvenanceInput(),
      datasetAuthorization: input.datasetAuthorization,
      caseHash: input.policyCase.caseHash,
      inputHash: sha("0"),
      decisionHash: input.decision.decisionHash,
      policyStreamId: input.policyCase.policyStreamId,
      decisionPointBarId: input.policyCase.lastVisibleBarId,
      decisionPointSequence: 119,
    });
    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          executionDataProvenance: mismatchedProvenance,
        }),
      { message: /provenance inputHash does not match/ },
    );

    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          decisionBundle: {
            ...input.decisionBundle,
            modelCallsPermitted: true,
          } as never,
        }),
      { message: /forbid model calls/ },
    );

    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          experimentPolicy: {
            ...input.experimentPolicy,
            assumptionsHash: sha("9"),
          },
        }),
      { message: /policy hash does not match/ },
    );

    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          decisionBundle: {
            ...input.decisionBundle,
            schemaVersion: "replay-decision-bundle.invalid",
          } as never,
        }),
      { message: /bundle schemaVersion is unsupported/ },
    );

    const selected = input.decisionBundle.results[0]!;
    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          decisionBundle: {
            ...input.decisionBundle,
            results: [
              {
                ...selected,
                schemaVersion: "frozen-model-result.invalid",
              },
            ],
          } as never,
        }),
      { message: /frozen model result schemaVersion is unsupported/ },
    );

    const rejectedBundle = createReplayDecisionBundle({
      results: [{ ...selected, validationStatus: "rejected" }],
    });
    assert.throws(
      () =>
        createReplayRequest({
          ...input,
          decisionBundle: rejectedBundle,
        }),
      { message: /selected accepted frozen model result/ },
    );
  });
});

describe("Replay Boundary V1 terminal results", () => {
  it("keeps rejected, resolved, unresolved, and right-censored paths explicit", () => {
    const request = createReplayRequest(makeReplayRequestInput());
    const auditHash = sha("1");
    const artifactHashes = {
      engineRuntimeHash: sha("2"),
      replayConfigHash: sha("3"),
      rawArtifactHash: sha("4"),
    };

    const rejected = createReplayResult({
      request,
      terminal: {
        state: "rejected",
        reason: "dataset_artifact_hash_mismatch",
        sidecarStarted: false,
      },
      engineRuntimeHash: null,
      replayConfigHash: null,
      rawArtifactHash: null,
      validationAuditHash: auditHash,
    });
    const resolved = createReplayResult({
      request,
      terminal: {
        state: "resolved",
        reason: null,
        terminalEventId: "event:121:9",
        terminalEventSequence: 121_009,
      },
      ...artifactHashes,
      validationAuditHash: auditHash,
    });
    const unresolvedReasons = [
      "missing_execution_data",
      "segment_boundary",
      "same_bar_order_ambiguous",
      "source_order_unknown",
    ] as const;
    for (const reason of unresolvedReasons) {
      const unresolved = createReplayResult({
        request,
        terminal: {
          state: "unresolved",
          reason,
          affectedPathAction: "terminated_fail_closed",
          detectedAtEventId: null,
          detectedAtEventSequence: null,
        },
        ...artifactHashes,
        validationAuditHash: auditHash,
      });
      assert.equal(unresolved.terminal.state, "unresolved");
      assert.equal(unresolved.terminal.reason, reason);
      assert.equal(
        unresolved.terminal.affectedPathAction,
        "terminated_fail_closed",
      );
    }
    const censored = createReplayResult({
      request,
      terminal: {
        state: "right_censored",
        reason: "authorized_horizon_exhausted",
        censoringBoundaryEventId: "event:121:9",
        lastObservedEventId: "event:121:9",
        lastObservedEventSequence: 121_009,
      },
      ...artifactHashes,
      validationAuditHash: auditHash,
    });

    assert.equal(rejected.terminal.state, "rejected");
    assert.equal(resolved.terminal.state, "resolved");
    assert.equal(censored.terminal.state, "right_censored");
    assert.equal(resolved.requestHash, request.requestHash);
    assert.equal(resolved.pathId, request.pathId);
    assert.equal(resolved.experimentPolicyHash, request.experimentPolicyHash);
    assert.match(resolved.resultHash, /^sha256:[0-9a-f]{64}$/);
    assert.doesNotMatch(
      JSON.stringify([rejected, resolved, censored]),
      /success|failure|win|loss|profit|pnl|probability/i,
    );
    assert.equal(Object.isFrozen(censored), true);
    assert.equal(Object.isFrozen(censored.terminal), true);
  });

  it("rejects artifact hashes that contradict the terminal state", () => {
    const request = createReplayRequest(makeReplayRequestInput());

    assert.throws(
      () =>
        createReplayResult({
          request,
          terminal: {
            state: "rejected",
            reason: "audit_identity_mismatch",
            sidecarStarted: false,
          },
          engineRuntimeHash: sha("2"),
          replayConfigHash: null,
          rawArtifactHash: null,
          validationAuditHash: sha("1"),
        }),
      { message: /rejected result cannot bind sidecar artifacts/ },
    );
    assert.throws(
      () =>
        createReplayResult({
          request,
          terminal: {
            state: "resolved",
            reason: null,
            terminalEventId: "event:121:9",
            terminalEventSequence: 121_009,
          },
          engineRuntimeHash: null,
          replayConfigHash: sha("3"),
          rawArtifactHash: sha("4"),
          validationAuditHash: sha("1"),
        }),
      { message: /non-rejected result requires all sidecar artifact hashes/ },
    );
  });

  it("revalidates transported result hashes against the bound request", () => {
    const request = createReplayRequest(makeReplayRequestInput());
    const result = createReplayResult({
      request,
      terminal: {
        state: "resolved",
        reason: null,
        terminalEventId: "event:121:9",
        terminalEventSequence: 121_009,
      },
      engineRuntimeHash: sha("2"),
      replayConfigHash: sha("3"),
      rawArtifactHash: sha("4"),
      validationAuditHash: sha("1"),
    });

    assert.doesNotThrow(() => assertReplayResultIntegrity(result, request));
    const otherInput = makeReplayRequestInput();
    const otherRequest = createReplayRequest({
      ...otherInput,
      experimentPolicy: createExperimentPolicyReference({
        policyId: "experiment-policy:synthetic",
        policyVersion: "v2",
        assumptionsHash: sha("8"),
        isFrozen: true,
        mutationPermitted: false,
      }),
    });
    assert.throws(
      () => assertReplayResultIntegrity(result, otherRequest),
      { message: /result identity does not match its request/ },
    );
    assert.throws(
      () =>
        assertReplayResultIntegrity(
          { ...result, resultHash: sha("0") },
          request,
        ),
      { message: /result hash does not match/ },
    );
    assert.throws(
      () =>
        assertReplayResultIntegrity(
          { ...result, outcome: "win" } as never,
          request,
        ),
      { message: /fields must match the exact V1 contract/ },
    );
  });
});
