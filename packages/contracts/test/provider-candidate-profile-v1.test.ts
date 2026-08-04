import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approvedProviderCandidateProfile,
  assertProviderCandidateProfileIntegrity,
  createProviderCandidateProfile,
  type ProviderCandidateProfileV1,
} from "../src/provider-candidate-profile-v1.ts";

describe("Phase 5B2B provider candidate profile", () => {
  it("fixes the two exact CLI/model identities without pinning CLI packaging", () => {
    const gemini = approvedProviderCandidateProfile("candidate:gemini-antigravity-v1");
    const gpt = approvedProviderCandidateProfile("candidate:gpt-codex-v1");

    assert.deepEqual(
      {
        candidateId: gemini.candidateId,
        providerSurface: gemini.providerSurface,
        executable: gemini.executable,
        modelId: gemini.modelId,
        reasoningEffort: gemini.reasoningEffort,
      },
      {
        candidateId: "candidate:gemini-antigravity-v1",
        providerSurface: "antigravity-cli",
        executable: "agy",
        modelId: "gemini-3.6-flash-high",
        reasoningEffort: "high",
      },
    );
    assert.deepEqual(
      {
        candidateId: gpt.candidateId,
        providerSurface: gpt.providerSurface,
        executable: gpt.executable,
        modelId: gpt.modelId,
        reasoningEffort: gpt.reasoningEffort,
      },
      {
        candidateId: "candidate:gpt-codex-v1",
        providerSurface: "codex-cli",
        executable: "codex",
        modelId: "gpt-5.6",
        reasoningEffort: "high",
      },
    );
    for (const profile of [gemini, gpt]) {
      assert.equal(profile.schemaVersion, "provider-candidate-profile.v1");
      assert.equal(profile.modelIdPinned, true);
      assert.equal(profile.cliVersionPinned, false);
      assert.equal(profile.cliBinaryHashPinned, false);
      assert.equal(profile.automaticModelFallbackAuthorized, false);
      assert.equal("cliVersion" in profile, false);
      assert.equal("cliBinaryHash" in profile, false);
      assert.match(profile.profileHash, /^sha256:[0-9a-f]{64}$/);
      assert.equal(Object.isFrozen(profile), true);
    }
    assert.notEqual(gemini.profileHash, gpt.profileHash);
  });

  it("rejects aliases, lower effort, fallback, extra fields, and mixed candidate fields", () => {
    const exact = approvedProviderCandidateProfile("candidate:gpt-codex-v1");
    const { profileHash: _profileHash, ...input } = exact;
    const make = (overrides: Partial<ProviderCandidateProfileV1>) =>
      createProviderCandidateProfile({ ...input, ...overrides } as never);

    assert.throws(() => make({ modelId: "gpt-5.6-latest" as never }), /modelId/);
    assert.throws(() => make({ reasoningEffort: "medium" as never }), /reasoningEffort/);
    assert.throws(
      () => make({ automaticModelFallbackAuthorized: true as never }),
      /fallback/,
    );
    assert.throws(
      () => make({ executable: "agy" }),
      /candidate fields|executable/,
    );
    assert.throws(
      () =>
        assertProviderCandidateProfileIntegrity({
          ...exact,
          cliVersion: "0.145.0",
        }),
      /exact keys/,
    );
  });
});
