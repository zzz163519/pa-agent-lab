import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceContinuousSchedule,
  createContinuousScheduleState,
  type DecisionPointV1,
} from "../src/model-call-schedule-v1.ts";

const candidate = {
  candidateId: "gpt-peer",
  modelId: "gpt-5.6",
} as const;

const protocol = {
  promptHash:
    "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  outputSchemaVersion: "brooks-decision.v1",
  reasoningBudgetId: "budget:high",
} as const;

function closedDecisionPoint(
  sequence: number,
  inputDigit: string,
): DecisionPointV1 {
  return {
    policyStreamId: "stream:test",
    decisionPointBarId: `bar:${sequence}`,
    decisionPointSequence: sequence,
    barDurationSeconds: 300,
    selectionPolicyId: "continuous_every_close.v1",
    inputHash: `sha256:${inputDigit.repeat(64)}`,
    isClosed: true,
  };
}

describe("continuous every-close scheduling", () => {
  it("schedules at most one call for each newly closed bar", () => {
    const initial = createContinuousScheduleState({
      policyStreamId: "stream:test",
      barDurationSeconds: 300,
      candidate,
      protocol,
    });

    const first = advanceContinuousSchedule({
      state: initial,
      decisionPoint: closedDecisionPoint(120, "2"),
    });
    assert.equal(first.status, "scheduled");
    if (first.status !== "scheduled") {
      assert.fail("expected the first closed bar to be scheduled");
    }
    assert.equal(first.call.mode, "continuous_every_close");
    assert.equal(first.call.selectionPolicyId, "continuous_every_close.v1");
    assert.equal(first.nextState.lastScheduledSequence, 120);
    assert.equal(first.nextState.lastScheduledBarId, "bar:120");

    const duplicate = advanceContinuousSchedule({
      state: first.nextState,
      decisionPoint: closedDecisionPoint(120, "2"),
    });
    assert.deepEqual(duplicate, {
      status: "not_scheduled",
      reason: "duplicate_closed_bar",
      nextState: first.nextState,
    });

    const second = advanceContinuousSchedule({
      state: duplicate.nextState,
      decisionPoint: closedDecisionPoint(121, "3"),
    });
    assert.equal(second.status, "scheduled");
    if (second.status !== "scheduled") {
      assert.fail("expected the next closed bar to be scheduled");
    }
    assert.equal(second.call.decisionPointBarId, "bar:121");
    assert.equal(second.nextState.lastScheduledSequence, 121);
    assert.notEqual(second.call.callId, first.call.callId);
  });
});
