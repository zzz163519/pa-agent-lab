import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createFrozenModelResult,
  createModelCallRecord,
  createReplayDecisionBundle,
} from "../src/model-call-schedule-v1.ts";

function modelCall() {
  return createModelCallRecord({
    mode: "continuous_every_close",
    decisionPoint: {
      policyStreamId: "stream:replay",
      decisionPointBarId: "bar:240",
      decisionPointSequence: 240,
      barDurationSeconds: 300,
      selectionPolicyId: "continuous_every_close.v1",
      inputHash:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      isClosed: true,
    },
    candidate: {
      candidateId: "selected-policy",
      modelId: "model:pinned",
    },
    protocol: {
      promptHash:
        "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      outputSchemaVersion: "brooks-decision.v1",
      reasoningBudgetId: "budget:pinned",
    },
    repeatIndex: 0,
  });
}

describe("frozen model results for replay", () => {
  it("uses the call identity as a cache key and forbids replay-time calls", () => {
    const call = modelCall();
    const result = createFrozenModelResult({
      call,
      rawOutputHash:
        "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      decisionHash:
        "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      validationResultHash:
        "sha256:abababababababababababababababababababababababababababababababab",
      validationStatus: "accepted",
    });

    assert.equal(result.cacheKey, call.callId);
    assert.equal(result.callId, call.callId);
    assert.equal(result.isFrozen, true);
    assert.equal(Object.isFrozen(result), true);

    const firstBundle = createReplayDecisionBundle({ results: [result] });
    const repeatedBundle = createReplayDecisionBundle({ results: [result] });

    assert.equal(
      firstBundle.source,
      "precomputed_frozen_model_results",
    );
    assert.equal(firstBundle.modelCallsPermitted, false);
    assert.equal(firstBundle.bundleId, repeatedBundle.bundleId);
    assert.deepEqual(firstBundle.results, [result]);
    assert.equal(Object.isFrozen(firstBundle), true);
    assert.equal(Object.isFrozen(firstBundle.results), true);
  });

  it("rejects a result that is not explicitly frozen", () => {
    const result = createFrozenModelResult({
      call: modelCall(),
      rawOutputHash:
        "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      decisionHash:
        "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      validationResultHash:
        "sha256:abababababababababababababababababababababababababababababababab",
      validationStatus: "accepted",
    });

    assert.throws(
      () =>
        createReplayDecisionBundle({
          results: [{ ...result, isFrozen: false }],
        }),
      {
        name: "ModelCallContractError",
        message: /replay requires frozen model results/,
      },
    );
  });
});
