import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  MODEL_CALL_MODES,
  createModelCallRecord,
  parseModelCallMode,
} from "../src/model-call-schedule-v1.ts";

describe("model call scheduling modes", () => {
  it("accepts only the adjudicated evaluation and continuous modes", () => {
    assert.deepEqual(MODEL_CALL_MODES, [
      "evaluation_sampled",
      "continuous_every_close",
    ]);

    assert.equal(parseModelCallMode("evaluation_sampled"), "evaluation_sampled");
    assert.equal(
      parseModelCallMode("continuous_every_close"),
      "continuous_every_close",
    );
  });

  it("rejects an unspecified or strategy-filtered mode", () => {
    assert.throws(() => parseModelCallMode("event_filtered"), {
      name: "ModelCallContractError",
      message: /unsupported model call mode/,
    });
  });
});

describe("first Brooks policy timeframe", () => {
  it("fixes V1 decisions to five-minute closed bars", () => {
    assert.equal(FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS, 300);

    assert.throws(
      () =>
        createModelCallRecord({
          mode: "continuous_every_close",
          decisionPoint: {
            policyStreamId: "stream:test",
            decisionPointBarId: "bar:120",
            decisionPointSequence: 120,
            barDurationSeconds: 900,
            selectionPolicyId: "continuous_every_close.v1",
            inputHash:
              "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            isClosed: true,
          },
          candidate: {
            candidateId: "gpt-peer",
            modelId: "gpt-5.6",
          },
          protocol: {
            promptHash:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            outputSchemaVersion: "brooks-decision.v1",
            reasoningBudgetId: "budget:high",
          },
          repeatIndex: 0,
        }),
      {
        name: "ModelCallContractError",
        message: /V1 Brooks policy requires 300-second bars/,
      },
    );
  });
});

describe("model call audit identity", () => {
  it("records the causal decision point and frozen protocol identity", () => {
    const record = createModelCallRecord({
      mode: "continuous_every_close",
      decisionPoint: {
        policyStreamId: "stream:test",
        decisionPointBarId: "bar:120",
        decisionPointSequence: 120,
        barDurationSeconds: 300,
        selectionPolicyId: "continuous_every_close.v1",
        inputHash:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        isClosed: true,
      },
      candidate: {
        candidateId: "gpt-peer",
        modelId: "gpt-5.6",
      },
      protocol: {
        promptHash:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        outputSchemaVersion: "brooks-decision.v1",
        reasoningBudgetId: "budget:high",
      },
      repeatIndex: 0,
    });

    assert.deepEqual(record, {
      schemaVersion: "model-call-schedule.v1",
      callId:
        "sha256:50cf7bdf2e25fdfd3054aab16bc490156ddd0fbc87a2366fd160e98f6446fa16",
      mode: "continuous_every_close",
      policyStreamId: "stream:test",
      decisionPointBarId: "bar:120",
      decisionPointSequence: 120,
      barDurationSeconds: 300,
      selectionPolicyId: "continuous_every_close.v1",
      inputHash:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      candidateId: "gpt-peer",
      modelId: "gpt-5.6",
      promptHash:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      outputSchemaVersion: "brooks-decision.v1",
      reasoningBudgetId: "budget:high",
      repeatIndex: 0,
    });
    assert.equal(Object.isFrozen(record), true);
  });

  it("uses unambiguous structured hashing for free-form identities", () => {
    const shared = {
      mode: "continuous_every_close" as const,
      candidate: {
        candidateId: "gpt-peer",
        modelId: "gpt-5.6",
      },
      protocol: {
        promptHash:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111" as const,
        outputSchemaVersion: "brooks-decision.v1",
        reasoningBudgetId: "budget:high",
      },
      repeatIndex: 0,
    };
    const left = createModelCallRecord({
      ...shared,
      decisionPoint: {
        policyStreamId: "stream:a\nbar:b",
        decisionPointBarId: "bar:c",
        decisionPointSequence: 120,
        barDurationSeconds: 300,
        selectionPolicyId: "continuous_every_close.v1",
        inputHash:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        isClosed: true,
      },
    });
    const right = createModelCallRecord({
      ...shared,
      decisionPoint: {
        policyStreamId: "stream:a",
        decisionPointBarId: "bar:b\nbar:c",
        decisionPointSequence: 120,
        barDurationSeconds: 300,
        selectionPolicyId: "continuous_every_close.v1",
        inputHash:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        isClosed: true,
      },
    });

    assert.notEqual(left.callId, right.callId);
  });

  it("rejects an open decision-point candle", () => {
    assert.throws(
      () =>
        createModelCallRecord({
          mode: "continuous_every_close",
          decisionPoint: {
            policyStreamId: "stream:test",
            decisionPointBarId: "bar:120",
            decisionPointSequence: 120,
            barDurationSeconds: 300,
            selectionPolicyId: "continuous_every_close.v1",
            inputHash:
              "sha256:0000000000000000000000000000000000000000000000000000000000000000",
            isClosed: false,
          },
          candidate: {
            candidateId: "gpt-peer",
            modelId: "gpt-5.6",
          },
          protocol: {
            promptHash:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            outputSchemaVersion: "brooks-decision.v1",
            reasoningBudgetId: "budget:high",
          },
          repeatIndex: 0,
        }),
      {
        name: "ModelCallContractError",
        message: /decision point must be closed/,
      },
    );
  });
});
