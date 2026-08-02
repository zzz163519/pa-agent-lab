import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceContinuousSchedule,
  createContinuousScheduleState,
  type ContinuousScheduleStateV1,
  type DecisionPointV1,
  type ModelCallRecordV1,
} from "../src/model-call-schedule-v1.ts";

const candidate = {
  candidateId: "selected-policy",
  modelId: "model:pinned",
} as const;

const protocol = {
  promptHash:
    "sha256:1212121212121212121212121212121212121212121212121212121212121212",
  outputSchemaVersion: "brooks-decision.v1",
  reasoningBudgetId: "budget:pinned",
} as const;

function decisionPoint(
  sequence: number,
  inputDigit: string,
  isClosed: boolean,
): DecisionPointV1 {
  return {
    policyStreamId: "stream:causal-prefix",
    decisionPointBarId: `bar:${sequence}`,
    decisionPointSequence: sequence,
    barDurationSeconds: 300,
    selectionPolicyId: "continuous_every_close.v1",
    inputHash: `sha256:${inputDigit.repeat(64)}`,
    isClosed,
  };
}

function initialState(): ContinuousScheduleStateV1 {
  return createContinuousScheduleState({
    policyStreamId: "stream:causal-prefix",
    barDurationSeconds: 300,
    candidate,
    protocol,
  });
}

function scheduleClosedPrefix(
  points: readonly DecisionPointV1[],
): readonly Readonly<ModelCallRecordV1>[] {
  let state = initialState();
  const calls: Readonly<ModelCallRecordV1>[] = [];

  for (const point of points) {
    const result = advanceContinuousSchedule({ state, decisionPoint: point });
    state = result.nextState;
    if (result.status === "scheduled") {
      calls.push(result.call);
    }
  }

  return calls;
}

describe("causal scheduling invariants", () => {
  it("does not schedule an open bar and can schedule it after closure", () => {
    const state = initialState();
    const openResult = advanceContinuousSchedule({
      state,
      decisionPoint: decisionPoint(120, "1", false),
    });

    assert.deepEqual(openResult, {
      status: "not_scheduled",
      reason: "bar_not_closed",
      nextState: state,
    });

    const closedResult = advanceContinuousSchedule({
      state: openResult.nextState,
      decisionPoint: decisionPoint(120, "1", true),
    });
    assert.equal(closedResult.status, "scheduled");
  });

  it("fails closed when the same sequence arrives with changed causal input", () => {
    const first = advanceContinuousSchedule({
      state: initialState(),
      decisionPoint: decisionPoint(120, "1", true),
    });
    assert.equal(first.status, "scheduled");
    if (first.status !== "scheduled") {
      assert.fail("expected the first point to schedule");
    }

    assert.throws(
      () =>
        advanceContinuousSchedule({
          state: first.nextState,
          decisionPoint: decisionPoint(120, "2", true),
        }),
      {
        name: "ModelCallContractError",
        message: /conflicting decision point/,
      },
    );
  });

  it("fails closed when a scheduled bar ID is reused with a new sequence", () => {
    const first = advanceContinuousSchedule({
      state: initialState(),
      decisionPoint: decisionPoint(120, "1", true),
    });
    assert.equal(first.status, "scheduled");
    if (first.status !== "scheduled") {
      assert.fail("expected the first point to schedule");
    }

    assert.throws(
      () =>
        advanceContinuousSchedule({
          state: first.nextState,
          decisionPoint: {
            ...decisionPoint(121, "2", true),
            decisionPointBarId: "bar:120",
          },
        }),
      {
        name: "ModelCallContractError",
        message: /bar ID has already been scheduled/,
      },
    );
  });

  it("preserves prior call identities when future bars are appended", () => {
    const prefix = [
      decisionPoint(120, "1", true),
      decisionPoint(121, "2", true),
    ];
    const futureSuffix = [
      decisionPoint(122, "3", true),
      decisionPoint(123, "4", true),
    ];

    const prefixCalls = scheduleClosedPrefix(prefix);
    const fullCalls = scheduleClosedPrefix([...prefix, ...futureSuffix]);

    assert.deepEqual(
      fullCalls.slice(0, prefixCalls.length),
      prefixCalls,
    );
    assert.deepEqual(
      fullCalls.slice(0, prefixCalls.length).map((call) => call.callId),
      prefixCalls.map((call) => call.callId),
    );
  });
});
