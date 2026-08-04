import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1,
  createOfflineBrooksResponseValidation,
  type BrooksIdentityFreeResponseV1,
} from "../src/brooks-identity-free-response-v1.ts";
import {
  makeValidLongDecision,
  makeValidNoTradeDecision,
  makeValidShortDecision,
  makeValidUncertainDecision,
  makeValidationContext,
} from "./fixtures/brooks-decision-v1.fixture.ts";

function fixture(full = makeValidLongDecision()) {
  const {
    decisionId,
    caseId,
    inputHash,
    lastVisibleBarId,
    barDurationSeconds,
    ...response
  } = full;
  return {
    response: response as BrooksIdentityFreeResponseV1,
    binding: {
      decisionId,
      caseId,
      inputHash,
      lastVisibleBarId,
      barDurationSeconds,
    },
  };
}

describe("Phase 5B1 identity-free Brooks response", () => {
  it("validates the exact 18-field projection through the existing semantic gate", () => {
    const input = fixture();
    const result = createOfflineBrooksResponseValidation({
      ...input,
      context: makeValidationContext(),
    });

    assert.equal(BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1.length, 18);
    assert.deepEqual(Object.keys(input.response).sort(), [...BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V1].sort());
    assert.equal(result.schemaVersion, "brooks-offline-response-validation.v1");
    assert.equal(result.validatorVersion, "brooks-identity-free-response-validator.v1");
    assert.match(result.responseHash, /^sha256:[0-9a-f]{64}$/);
    assert.match(result.localBindingHash, /^sha256:[0-9a-f]{64}$/);
    assert.match(result.validationResultHash, /^sha256:[0-9a-f]{64}$/);
    assert.deepEqual(result.rewardRiskAudit, {
      ratio: 3.2962962962963123,
      minimumRequired: 2,
      passed: true,
    });
    assert.equal(Object.isFrozen(result), true);
    assert.equal("decision" in result, false);
    assert.equal("decisionHash" in result, false);
  });

  it("accepts invented Short, No Trade, and Uncertain branches without production authority", () => {
    const cases = [
      {
        full: makeValidShortDecision(),
        context: makeValidationContext({
          plannedGeometry: {
            entryNormalizedPrice: 100.4,
            protectionNormalizedPrice: 103.1,
            objectiveNormalizedPrice: 99,
          },
        }),
        rewardRisk: true,
      },
      {
        full: makeValidNoTradeDecision(),
        context: makeValidationContext({ plannedGeometry: null }),
        rewardRisk: false,
      },
      {
        full: makeValidUncertainDecision(),
        context: makeValidationContext({ plannedGeometry: null }),
        rewardRisk: false,
      },
    ] as const;

    for (const entry of cases) {
      const result = createOfflineBrooksResponseValidation({
        ...fixture(entry.full),
        context: entry.context,
      });
      assert.equal(result.rewardRiskAudit !== null, entry.rewardRisk);
      assert.equal("decision" in result, false);
      assert.equal("decisionHash" in result, false);
    }
  });

  it("rejects provider identity, unknown fields, probability, and missing local geometry", () => {
    const input = fixture();
    assert.throws(
      () => createOfflineBrooksResponseValidation({
        ...input,
        response: { ...input.response, caseId: "provider:forbidden" } as never,
        context: makeValidationContext(),
      }),
      /exact keys/,
    );
    assert.throws(
      () => createOfflineBrooksResponseValidation({
        ...input,
        response: {
          ...input.response,
          broadContext: { ...input.response.broadContext, confidence: 0.9 },
        } as never,
        context: makeValidationContext(),
      }),
      /probability|confidence|forbidden/i,
    );
    assert.throws(
      () => createOfflineBrooksResponseValidation({
        ...input,
        binding: { ...input.binding, operatorPrincipal: "forbidden" } as never,
        context: makeValidationContext(),
      }),
      /exact keys/,
    );
    assert.throws(
      () => createOfflineBrooksResponseValidation({
        ...input,
        context: makeValidationContext({ plannedGeometry: null }),
      }),
      /deterministic planned geometry/,
    );
  });
});
