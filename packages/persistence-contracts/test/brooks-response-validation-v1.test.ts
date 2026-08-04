import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  makeValidLongDecision,
  makeValidNoTradeDecision,
  makeValidShortDecision,
  makeValidUncertainDecision,
} from "../../contracts/test/fixtures/brooks-decision-v1.fixture.ts";
import { parseIdentityFreeBrooksResponseJson } from "../src/brooks-response-validation-v1.ts";

function response(full = makeValidLongDecision()) {
  const {
    decisionId: _decisionId,
    caseId: _caseId,
    inputHash: _inputHash,
    lastVisibleBarId: _lastVisibleBarId,
    barDurationSeconds: _barDurationSeconds,
    ...identityFree
  } = full;
  return identityFree;
}

describe("Phase 5B1 strict identity-free response JSON", () => {
  it("accepts one unchanged closed 18-field JSON object", () => {
    const parsed = parseIdentityFreeBrooksResponseJson(JSON.stringify(response()));

    assert.deepEqual(parsed, response());
    assert.equal(Object.keys(parsed).length, 18);
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(Object.isFrozen(parsed.tradePlan), true);
  });

  it("accepts all four invented verdict branches unchanged", () => {
    for (const full of [
      makeValidLongDecision(),
      makeValidShortDecision(),
      makeValidNoTradeDecision(),
      makeValidUncertainDecision(),
    ]) {
      const exact = response(full);
      assert.deepEqual(
        parseIdentityFreeBrooksResponseJson(JSON.stringify(exact)),
        exact,
      );
    }
  });

  it("rejects syntax ambiguity, prose, local identity, unknown keys, and coercion", () => {
    const exact = response();
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(""),
      /empty|invalid JSON/i,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson('{"verdict":"long",}'),
      /invalid JSON syntax/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson('{/*comment*/"verdict":"long"}'),
      /invalid JSON syntax/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson('{},{}'),
      /invalid JSON syntax/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson('{"verdict":"long","verdict":"short"}'),
      /duplicate object key/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(`\`\`\`json\n${JSON.stringify(exact)}\n\`\`\``),
      /invalid JSON syntax/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(`${JSON.stringify(exact)} trailing`),
      /invalid JSON syntax/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(JSON.stringify({ ...exact, caseId: "forbidden" })),
      /additionalProperties|must NOT have additional properties/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(JSON.stringify({
        ...exact,
        broadContext: { ...exact.broadContext, confidence: 0.9 },
      })),
      /additionalProperties|must NOT have additional properties/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(JSON.stringify({ ...exact, verdict: "LONG" })),
      /verdict|must be equal/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(JSON.stringify({ ...exact, humanSummary: 7 })),
      /humanSummary|must be string|must be null/,
    );
    assert.throws(
      () => parseIdentityFreeBrooksResponseJson(JSON.stringify({ ...exact, humanSummary: undefined })),
      /required property|humanSummary/,
    );
  });
});
