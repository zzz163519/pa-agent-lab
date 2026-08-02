import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createModelRunAuditRecord,
  createModelRunRecord,
  createProviderAttemptRecord,
} from "../src/model-run-audit-v1.ts";
import { createModelCallRecord } from "../src/model-call-schedule-v1.ts";
import {
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  createOutboundModelPayload,
} from "../src/policy-input-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function makePolicyFixture() {
  const bars = Array.from({ length: 40 }, (_, index) => ({
    barId: `local:${index}`,
    sequence: index,
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100 + index,
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
  const policyCase = createBrooksPolicyCase({
    caseId: "case:audit-fixture",
    policyStreamId: "stream:audit-fixture",
    barDurationSeconds: 300,
    bars,
    lastVisibleBarId: "local:39",
    isLeftCensored: true,
  });
  const barIds = Array.from(
    { length: 40 },
    (_, index) => `bar:${index.toString().padStart(3, "0")}`,
  );
  const policyInput = createBrooksPolicyInput({
    policyCase,
    charts: {
      context: {
        panel: "context",
        mediaType: "image/png",
        contentHash: sha("1"),
        barIds,
        lastVisibleBarId: "bar:039",
      },
      detail: {
        panel: "detail",
        mediaType: "image/png",
        contentHash: sha("2"),
        barIds,
        lastVisibleBarId: "bar:039",
      },
    },
    doctrine: [
      {
        doctrineId: "doctrine:audit-fixture",
        concept: "Fixture concept",
        rule: "Use only visible evidence.",
        appliesWhen: ["a decision is evaluated"],
        avoidWhen: ["evidence is unavailable"],
        decisionEffect: ["Return uncertain when evidence is insufficient."],
      },
    ],
  });
  const payload = createOutboundModelPayload({
    policyInput,
    promptHash: sha("3"),
    outputSchemaVersion: "brooks-decision.v1",
  });
  return { policyCase, payload };
}

function makeOutboundPayload() {
  return makePolicyFixture().payload;
}

function makeCall(
  payload = makeOutboundPayload(),
  inputHash = payload.policyInput.inputHash,
  promptHash = payload.promptHash,
) {
  return createModelCallRecord({
    mode: "evaluation_sampled",
    decisionPoint: {
      policyStreamId: "stream:audit-fixture",
      decisionPointBarId: "local:39",
      decisionPointSequence: 39,
      barDurationSeconds: 300,
      selectionPolicyId: "selection:fixture",
      inputHash,
      isClosed: true,
    },
    candidate: {
      candidateId: "candidate:gpt-peer",
      modelId: "provider-model:fixture",
    },
    protocol: {
      promptHash,
      outputSchemaVersion: payload.outputSchemaVersion,
      reasoningBudgetId: "budget:fixture",
    },
    repeatIndex: 0,
  });
}

function makeRunFixture() {
  const { policyCase, payload } = makePolicyFixture();
  const call = makeCall(payload);
  const run = createModelRunRecord({ call, policyCase, payload });
  return { policyCase, payload, call, run };
}

describe("ModelRun and provider-attempt audit V1", () => {
  it("keeps retries under one logical call and freezes accepted validation evidence", () => {
    const { payload, call, run } = makeRunFixture();

    const timeout = createProviderAttemptRecord({
      run,
      attemptIndex: 0,
      providerId: "provider:fixture",
      requestHash: payload.payloadHash,
      status: "timeout",
      responseHash: null,
      errorCode: "deadline_exceeded",
      latencyMs: 1_000,
    });
    const response = createProviderAttemptRecord({
      run,
      attemptIndex: 1,
      providerId: "provider:fixture",
      requestHash: payload.payloadHash,
      status: "response_received",
      responseHash: sha("4"),
      errorCode: null,
      latencyMs: 750,
    });
    const audit = createModelRunAuditRecord({
      run,
      attempt: response,
      rawOutputHash: sha("4"),
      decisionHash: sha("5"),
      validationResultHash: sha("6"),
      validationStatus: "accepted",
      rejectionCodes: [],
    });

    assert.equal(timeout.modelRunId, run.modelRunId);
    assert.equal(response.modelRunId, run.modelRunId);
    assert.equal(timeout.callId, call.callId);
    assert.equal(response.callId, call.callId);
    assert.notEqual(timeout.attemptId, response.attemptId);
    assert.deepEqual(run.retrievedDoctrineIds, ["doctrine:audit-fixture"]);
    assert.equal(audit.validationStatus, "accepted");
    assert.equal(audit.caseHash, run.caseHash);
    assert.equal(Object.isFrozen(audit), true);
  });

  it("rejects a logical call that is not bound to the exact payload", () => {
    const { policyCase, payload } = makePolicyFixture();
    const call = makeCall(payload);
    const wrongInputCall = makeCall(payload, sha("0"));
    assert.throws(
      () =>
        createModelRunRecord({
          call: wrongInputCall,
          policyCase,
          payload,
        }),
      { message: /inputHash must match the outbound policy input/ },
    );
    const wrongPromptCall = makeCall(
      payload,
      payload.policyInput.inputHash,
      sha("8"),
    );
    assert.throws(
      () =>
        createModelRunRecord({
          call: wrongPromptCall,
          policyCase,
          payload,
        }),
      { message: /promptHash must match the outbound payload/ },
    );
    assert.throws(
      () =>
        createModelRunRecord({
          call: { ...call, candidateId: "candidate:tampered" },
          policyCase,
          payload,
        }),
      { message: /callId does not match its content/ },
    );

    const alteredCase = createBrooksPolicyCase({
      caseId: policyCase.caseId,
      policyStreamId: policyCase.policyStreamId,
      barDurationSeconds: policyCase.barDurationSeconds,
      bars: policyCase.bars.map((bar, index) =>
        index === 0 ? { ...bar, close: 100.5 } : { ...bar },
      ),
      lastVisibleBarId: policyCase.lastVisibleBarId,
      isLeftCensored: policyCase.isLeftCensored,
    });
    assert.throws(
      () =>
        createModelRunRecord({
          call,
          policyCase: alteredCase,
          payload,
        }),
      { message: /policy input must be derived from the local policy case/ },
    );
  });

  it("enforces provider-attempt terminal fields without creating a new call", () => {
    const { payload, run } = makeRunFixture();
    assert.throws(
      () =>
        createProviderAttemptRecord({
          run,
          attemptIndex: 0,
          providerId: "provider:fixture",
          requestHash: payload.payloadHash,
          status: "response_received",
          responseHash: null,
          errorCode: null,
          latencyMs: 1,
        }),
      { message: /received response requires responseHash/ },
    );
    assert.throws(
      () =>
        createProviderAttemptRecord({
          run,
          attemptIndex: 0,
          providerId: "provider:fixture",
          requestHash: payload.payloadHash,
          status: "timeout",
          responseHash: sha("4"),
          errorCode: "deadline_exceeded",
          latencyMs: 1,
        }),
      { message: /failed transport attempt cannot contain responseHash/ },
    );
    assert.throws(
      () =>
        createProviderAttemptRecord({
          run,
          attemptIndex: 0,
          providerId: "provider:fixture",
          requestHash: sha("9"),
          status: "timeout",
          responseHash: null,
          errorCode: "deadline_exceeded",
          latencyMs: 1,
        }),
      { message: /requestHash must match the frozen outbound payload/ },
    );
  });

  it("records rejected validation and detects a tampered attempt", () => {
    const { payload, run } = makeRunFixture();
    const response = createProviderAttemptRecord({
      run,
      attemptIndex: 0,
      providerId: "provider:fixture",
      requestHash: payload.payloadHash,
      status: "response_received",
      responseHash: sha("4"),
      errorCode: null,
      latencyMs: 10,
    });
    const rejected = createModelRunAuditRecord({
      run,
      attempt: response,
      rawOutputHash: sha("4"),
      decisionHash: null,
      validationResultHash: sha("6"),
      validationStatus: "rejected",
      rejectionCodes: ["schema_invalid"],
    });
    assert.equal(rejected.validationStatus, "rejected");
    assert.equal(rejected.decisionHash, null);

    assert.throws(
      () =>
        createModelRunAuditRecord({
          run,
          attempt: response,
          rawOutputHash: sha("4"),
          decisionHash: null,
          validationResultHash: sha("6"),
          validationStatus: "accepted",
          rejectionCodes: [],
        }),
      { message: /accepted validation requires decisionHash/ },
    );
    assert.throws(
      () =>
        createModelRunAuditRecord({
          run,
          attempt: { ...response, latencyMs: 11 },
          rawOutputHash: sha("4"),
          decisionHash: sha("5"),
          validationResultHash: sha("6"),
          validationStatus: "accepted",
          rejectionCodes: [],
        }),
      { message: /attempt hash does not match its content/ },
    );
  });
});
