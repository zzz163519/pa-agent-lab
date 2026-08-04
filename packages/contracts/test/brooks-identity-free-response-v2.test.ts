import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2,
  createOfflineBrooksResponseValidationV2,
  type BrooksIdentityFreeResponseV2,
} from "../src/brooks-identity-free-response-v2.ts";
import {
  verifyBrooksPromptPackageV2Proposal,
  type BrooksPromptPackageManifestV2,
} from "../src/brooks-prompt-package-v2.ts";
import type { BrooksDecisionInputV1 } from "../src/brooks-decision-v1.ts";
import {
  makeValidLongDecision,
  makeValidNoTradeDecision,
  makeValidShortDecision,
  makeValidUncertainDecision,
  makeValidationContext,
} from "./fixtures/brooks-decision-v1.fixture.ts";

const promptV1Path = new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url);
const schemaV1Path = new URL(
  "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
  import.meta.url,
);
const promptV2Path = new URL("../../../docs/prompts/BROOKS_V2_PROMPT.txt", import.meta.url);
const schemaV2Path = new URL(
  "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V2.schema.json",
  import.meta.url,
);
const manifestV2Path = new URL(
  "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V2.json",
  import.meta.url,
);

function response(
  full: BrooksDecisionInputV1,
  plannedGeometry: BrooksIdentityFreeResponseV2["plannedGeometry"],
): BrooksIdentityFreeResponseV2 {
  const {
    decisionId: _decisionId,
    caseId: _caseId,
    inputHash: _inputHash,
    lastVisibleBarId: _lastVisibleBarId,
    barDurationSeconds: _barDurationSeconds,
    ...semantic
  } = full;
  return { ...semantic, plannedGeometry };
}

function semanticContext() {
  const { plannedGeometry: _plannedGeometry, ...context } = makeValidationContext();
  return context;
}

describe("Phase 5B2B identity-free Brooks response V2", () => {
  it("takes exact provider geometry through the existing semantic gate", () => {
    const value = response(makeValidLongDecision(), {
      entryNormalizedPrice: 103.1,
      protectionNormalizedPrice: 100.4,
      objectiveNormalizedPrice: 112,
    });
    const result = createOfflineBrooksResponseValidationV2({
      response: value,
      binding: {
        decisionId: "decision:fixture-long",
        caseId: "case:fixture",
        inputHash: `sha256:${"a".repeat(64)}`,
        lastVisibleBarId: "bar:119",
        barDurationSeconds: 300,
      },
      context: semanticContext(),
    });

    assert.equal(BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2.length, 19);
    assert.deepEqual(
      Object.keys(value).sort(),
      [...BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2].sort(),
    );
    assert.equal(result.schemaVersion, "brooks-offline-response-validation.v2");
    assert.equal(result.validatorVersion, "brooks-identity-free-response-validator.v2");
    assert.equal(result.rewardRiskAudit?.passed, true);
    assert.equal(result.rewardRiskAudit?.minimumRequired, 2);
    assert.equal(Object.isFrozen(result), true);
  });

  it("accepts invented stop and limit geometry for both directions", () => {
    const longLimit = makeValidLongDecision("scalp");
    if (longLimit.tradePlan === null) throw new Error("fixture requires plan");
    const withLimit: BrooksDecisionInputV1 = {
      ...longLimit,
      tradePlan: {
        ...longLimit.tradePlan,
        entry: {
          entryType: "limit",
          relation: "pullback_to",
          structureId: "structure:support",
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
      },
    };
    const cases = [
      response(withLimit, {
        entryNormalizedPrice: 101,
        protectionNormalizedPrice: 100.4,
        objectiveNormalizedPrice: 112,
      }),
      response(makeValidShortDecision(), {
        entryNormalizedPrice: 100.4,
        protectionNormalizedPrice: 103.1,
        objectiveNormalizedPrice: 99,
      }),
    ];
    for (const value of cases) {
      const result = createOfflineBrooksResponseValidationV2({
        response: value,
        binding: {
          decisionId: `decision:v2-${value.verdict}`,
          caseId: "case:fixture",
          inputHash: `sha256:${"a".repeat(64)}`,
          lastVisibleBarId: "bar:119",
          barDurationSeconds: 300,
        },
        context: semanticContext(),
      });
      assert.equal(result.rewardRiskAudit?.passed, true);
    }
  });

  it("requires geometry only for trades and rejects market-next-event or invalid ordering", () => {
    for (const full of [makeValidNoTradeDecision(), makeValidUncertainDecision()]) {
      const value = response(full, null);
      assert.doesNotThrow(() =>
        createOfflineBrooksResponseValidationV2({
          response: value,
          binding: {
            decisionId: `decision:v2-${value.verdict}`,
            caseId: "case:fixture",
            inputHash: `sha256:${"a".repeat(64)}`,
            lastVisibleBarId: "bar:119",
            barDurationSeconds: 300,
          },
          context: semanticContext(),
        }),
      );
    }

    const trade = response(makeValidLongDecision(), null);
    assert.throws(
      () => createOfflineBrooksResponseValidationV2({
        response: trade,
        binding: {
          decisionId: "decision:v2-missing-geometry",
          caseId: "case:fixture",
          inputHash: `sha256:${"a".repeat(64)}`,
          lastVisibleBarId: "bar:119",
          barDurationSeconds: 300,
        },
        context: semanticContext(),
      }),
      /plannedGeometry.*trade verdict/i,
    );

    const marketBase = makeValidLongDecision();
    if (marketBase.tradePlan === null) throw new Error("fixture requires plan");
    const market: BrooksDecisionInputV1 = {
      ...marketBase,
      tradePlan: {
        ...marketBase.tradePlan,
        entry: {
          entryType: "market_next_event",
          validAfterBarId: "bar:119",
          validForClosedBars: 1,
          claimIds: ["claim-entry"],
        },
      },
    };
    assert.throws(
      () => createOfflineBrooksResponseValidationV2({
        response: response(market, {
          entryNormalizedPrice: 103.1,
          protectionNormalizedPrice: 100.4,
          objectiveNormalizedPrice: 112,
        }),
        binding: {
          decisionId: "decision:v2-market",
          caseId: "case:fixture",
          inputHash: `sha256:${"a".repeat(64)}`,
          lastVisibleBarId: "bar:119",
          barDurationSeconds: 300,
        },
        context: semanticContext(),
      }),
      /market_next_event.*unsupported/i,
    );

    assert.throws(
      () => createOfflineBrooksResponseValidationV2({
        response: response(makeValidLongDecision(), {
          entryNormalizedPrice: 103.1,
          protectionNormalizedPrice: 104,
          objectiveNormalizedPrice: 112,
        }),
        binding: {
          decisionId: "decision:v2-wrong-side",
          caseId: "case:fixture",
          inputHash: `sha256:${"a".repeat(64)}`,
          lastVisibleBarId: "bar:119",
          barDurationSeconds: 300,
        },
        context: semanticContext(),
      }),
      /protection.*below|geometry/i,
    );
  });
});

describe("Phase 5B2B Prompt Package V2 proposal", () => {
  it("preserves V1 bytes and verifies one exact unapproved V2 proposal", () => {
    assert.equal(
      Buffer.from(readFileSync(promptV1Path)).toString("hex").length > 0,
      true,
    );
    assert.equal(
      createHash("sha256").update(readFileSync(promptV1Path)).digest("hex"),
      "99db77812497107f4e0daacbca8969d308523b40eee77825aca18b53be72a267",
    );
    assert.equal(
      createHash("sha256").update(readFileSync(schemaV1Path)).digest("hex"),
      "1017e462dd312177f7d4b50dbc4ee37e6041029e40ae10471f6a3118a73db53a",
    );

    const manifest = JSON.parse(
      readFileSync(manifestV2Path, "utf8"),
    ) as BrooksPromptPackageManifestV2;
    const proposal = verifyBrooksPromptPackageV2Proposal({
      promptBytes: readFileSync(promptV2Path),
      responseSchemaBytes: readFileSync(schemaV2Path),
      manifest,
    });
    assert.equal(proposal.manifest.packageVersion, "brooks-prompt-package.v2");
    assert.equal(proposal.manifest.proposalStatus, "unapproved");
    assert.equal(proposal.manifest.providerCallsAuthorized, false);
    assert.equal(Object.isFrozen(proposal), true);
    assert.equal("approval" in proposal, false);
  });
});
