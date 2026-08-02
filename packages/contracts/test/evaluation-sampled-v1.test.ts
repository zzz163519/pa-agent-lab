import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEvaluationCallPlan,
  type DecisionPointV1,
} from "../src/model-call-schedule-v1.ts";

const protocol = {
  promptHash:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  outputSchemaVersion: "brooks-decision.v1",
  reasoningBudgetId: "budget:peer",
} as const;

const candidates = [
  { candidateId: "gpt-peer", modelId: "gpt-5.6" },
  { candidateId: "gemini-peer", modelId: "gemini-3.6-flash" },
] as const;

function sampledPoint(sequence: number, inputDigit: string): DecisionPointV1 {
  return {
    policyStreamId: "stream:evaluation",
    decisionPointBarId: `case-bar:${sequence}`,
    decisionPointSequence: sequence,
    barDurationSeconds: 300,
    selectionPolicyId: "blind-semantic-sample.v1",
    inputHash: `sha256:${inputDigit.repeat(64)}`,
    isClosed: true,
  };
}

describe("evaluation sampled scheduling", () => {
  it("gives every peer the same frozen points, protocol, and repeat count", () => {
    const points = [sampledPoint(40, "4"), sampledPoint(80, "8")];
    const plan = createEvaluationCallPlan({
      selection: {
        selectionPolicyId: "blind-semantic-sample.v1",
        selectionCommitmentHash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        isFrozen: true,
        decisionPoints: points,
      },
      candidates,
      protocol,
      repeatsPerCandidate: 2,
    });

    assert.equal(plan.mode, "evaluation_sampled");
    assert.equal(plan.decisionPointCount, 2);
    assert.equal(plan.calls.length, 8);
    assert.deepEqual(plan.candidateIds, ["gpt-peer", "gemini-peer"]);

    for (const point of points) {
      for (const repeatIndex of [0, 1]) {
        const calls = plan.calls.filter(
          (call) =>
            call.decisionPointBarId === point.decisionPointBarId &&
            call.repeatIndex === repeatIndex,
        );
        assert.deepEqual(
          calls.map((call) => call.candidateId),
          ["gpt-peer", "gemini-peer"],
        );
        assert.deepEqual(
          [...new Set(calls.map((call) => call.inputHash))],
          [point.inputHash],
        );
        assert.deepEqual(
          [...new Set(calls.map((call) => call.promptHash))],
          [protocol.promptHash],
        );
        assert.deepEqual(
          [...new Set(calls.map((call) => call.reasoningBudgetId))],
          [protocol.reasoningBudgetId],
        );
      }
    }
  });

  it("keeps free-form stream and bar identity boundaries distinct", () => {
    const left = {
      ...sampledPoint(40, "4"),
      policyStreamId: "stream:a\nbar:b",
      decisionPointBarId: "bar:c",
    };
    const right = {
      ...sampledPoint(80, "8"),
      policyStreamId: "stream:a",
      decisionPointBarId: "bar:b\nbar:c",
    };

    const plan = createEvaluationCallPlan({
      selection: {
        selectionPolicyId: "blind-semantic-sample.v1",
        selectionCommitmentHash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        isFrozen: true,
        decisionPoints: [left, right],
      },
      candidates,
      protocol,
      repeatsPerCandidate: 1,
    });

    assert.equal(plan.decisionPointCount, 2);
    assert.equal(plan.calls.length, 4);
  });

  it("rejects a selection that has not been frozen", () => {
    assert.throws(
      () =>
        createEvaluationCallPlan({
          selection: {
            selectionPolicyId: "blind-semantic-sample.v1",
            selectionCommitmentHash:
              "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            isFrozen: false,
            decisionPoints: [sampledPoint(40, "4")],
          },
          candidates,
          protocol,
          repeatsPerCandidate: 1,
        }),
      {
        name: "ModelCallContractError",
        message: /evaluation selection must be frozen/,
      },
    );
  });
});
