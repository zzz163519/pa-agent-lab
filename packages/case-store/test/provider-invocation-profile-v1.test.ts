import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approvedProviderCandidateProfile,
  canonicalHash,
  createProviderRequestEnvelope,
  type CreateProviderRequestEnvelopeInputV1,
} from "@pa-agent-lab/contracts";

import {
  createAntigravityInvocationProfile,
  createCodexCapabilityProofFromOfflineEvidence,
  createCodexInvocationProfile,
  type AntigravityCapabilityProofV1,
  type CodexCapabilityProofV1,
  type CodexOfflineCapabilityEvidenceV1,
} from "../src/provider-invocation-profile-v1.ts";

const h = (character: string) => `sha256:${character.repeat(64)}` as const;

function request(candidate: "candidate:gpt-codex-v1" | "candidate:gemini-antigravity-v1") {
  const input: CreateProviderRequestEnvelopeInputV1 = {
    authority: {
      sourceScope: "synthetic_fixture_only",
      preparationId: h("1"),
      assemblyId: h("2"),
      packageActivationId: h("3"),
      packageHash: h("4"),
      packageApprovalRecordHash: h("5"),
      promptHash: h("6"),
      responseSchemaHash: h("7"),
      payloadHash: h("8"),
      outputSchemaVersion: "brooks-identity-free-response.schema.v2",
    },
    candidateProfile: approvedProviderCandidateProfile(candidate),
    artifacts: [
      { fileName: "request.json", mediaType: "application/json", byteLength: 1, contentHash: h("8") },
      { fileName: "prompt.txt", mediaType: "text/plain; charset=utf-8", byteLength: 1, contentHash: h("6") },
      { fileName: "response.schema.json", mediaType: "application/schema+json", byteLength: 1, contentHash: h("7") },
      { fileName: "context.png", mediaType: "image/png", byteLength: 8, contentHash: h("9") },
      { fileName: "detail.png", mediaType: "image/png", byteLength: 8, contentHash: h("a") },
    ],
  };
  return createProviderRequestEnvelope(input);
}

function codexProof(
  overrides: Partial<CodexOfflineCapabilityEvidenceV1> = {},
): Readonly<CodexCapabilityProofV1> {
  return createCodexCapabilityProofFromOfflineEvidence({
    schemaVersion: "codex-offline-capability-evidence.v1",
    candidateProfileHash: request("candidate:gpt-codex-v1").candidateProfileHash,
    helpText: [
      "--model <MODEL>",
      "--image <FILE>...",
      "--output-schema <FILE>",
      "--output-last-message <FILE>",
      "--json",
      "--ephemeral",
      "--sandbox <MODE>",
      "--ask-for-approval <POLICY>",
      "--cd <DIR>",
      "--config <KEY=VALUE>",
    ].join("\n"),
    modelCatalogText: "gpt-5.6\ngpt-5.6-terra",
    configReferenceText: [
      "model_reasoning_effort: low | medium | high",
      "sandbox: read-only",
      "network: disabled",
      "web_search: disabled",
    ].join("\n"),
    hiddenRetryDisposition: "observable_per_attempt",
    ...overrides,
  });
}

function agyProof(
  overrides: Partial<Omit<AntigravityCapabilityProofV1, "proofHash">> = {},
): AntigravityCapabilityProofV1 {
  const body = {
    schemaVersion: "antigravity-capability-proof.v1" as const,
    candidateProfileHash: request("candidate:gemini-antigravity-v1").candidateProfileHash,
    helpEvidenceHash: h("c"),
    exactModelAvailable: true,
    highEffortSupported: true,
    nonInteractivePrintSupported: true,
    exactTwoImageAttachmentSupported: true,
    outputSchemaSupported: true,
    machineOutputSupported: true,
    strictSandboxSupported: true,
    isolatedWorkspaceSupported: true,
    pluginsMcpRulesHooksSkillsHistoryExcluded: true,
    toolsAndSubagentsDisabledOrObservable: true,
    interactionDataCollectionDisabled: true,
    externalRetentionAccepted: true,
    hiddenRetryDisabledOrObservable: true,
    ...overrides,
  };
  return { ...body, proofHash: canonicalHash(body) };
}

describe("Phase 5B2B Codex invocation profile builder", () => {
  it("builds one reviewable argv array without executing it", () => {
    const envelope = request("candidate:gpt-codex-v1");
    const profile = createCodexInvocationProfile({
      requestEnvelope: envelope,
      capabilityProof: codexProof(),
    });

    assert.equal(profile.availability, "available");
    assert.equal(profile.executable, "codex");
    assert.deepEqual(profile.argv, [
      "--model",
      "gpt-5.6",
      "--config",
      'model_reasoning_effort="high"',
      "--config",
      "mcp_servers={}",
      "--config",
      'web_search="disabled"',
      "--ask-for-approval",
      "never",
      "--sandbox",
      "read-only",
      "--cd",
      ".",
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--image",
      "context.png",
      "--image",
      "detail.png",
      "--output-schema",
      "response.schema.json",
      "--output-last-message",
      "terminal.json",
      "--json",
    ]);
    assert.equal(profile.stdinFileName, "prompt.txt");
    assert.equal(profile.terminalOutputFileName, "terminal.json");
    assert.equal(profile.shell, false);
    assert.equal(profile.realInvocationAuthorized, false);
    assert.deepEqual(profile.rejectionCodes, []);
    assert.equal(profile.argv?.includes("resume"), false);
    assert.equal(profile.argv?.includes("workspace-write"), false);
    assert.equal(profile.argv?.includes("--search"), false);
    assert.equal("cliVersion" in profile, false);
    assert.equal("binaryHash" in profile, false);
    assert.equal(Object.isFrozen(profile), true);
  });

  it("returns unavailable without argv when any hard capability is unproved", () => {
    const envelope = request("candidate:gpt-codex-v1");
    const profile = createCodexInvocationProfile({
      requestEnvelope: envelope,
      capabilityProof: codexProof({ hiddenRetryDisposition: "unverified" }),
    });
    assert.equal(profile.availability, "unavailable");
    assert.equal(profile.argv, null);
    assert.equal(profile.executable, null);
    assert.deepEqual(profile.rejectionCodes, ["HIDDEN_RETRY_UNVERIFIED"]);

    const wrongModelProof = codexProof({
      modelCatalogText: "gpt-5.6-latest\ngpt-5.6-terra",
    });
    const wrongModel = createCodexInvocationProfile({
      requestEnvelope: envelope,
      capabilityProof: wrongModelProof,
    });
    assert.deepEqual(wrongModel.rejectionCodes, ["MODEL_ID_UNAVAILABLE"]);

    const proof = codexProof();
    assert.throws(
      () => createCodexInvocationProfile({
        requestEnvelope: envelope,
        capabilityProof: { ...proof, networkDisabled: false },
      }),
      /proof hash/,
    );

    assert.throws(
      () => createCodexInvocationProfile({
        requestEnvelope: request("candidate:gemini-antigravity-v1"),
        capabilityProof: codexProof(),
      }),
      /Codex candidate/,
    );
  });
});

describe("Phase 5B2B Antigravity invocation profile builder", () => {
  it("fails closed without privacy, retention, and hidden-retry evidence", () => {
    const envelope = request("candidate:gemini-antigravity-v1");
    const profile = createAntigravityInvocationProfile({
      requestEnvelope: envelope,
      capabilityProof: agyProof({
        interactionDataCollectionDisabled: false,
        externalRetentionAccepted: false,
        hiddenRetryDisabledOrObservable: false,
      }),
    });
    assert.equal(profile.availability, "unavailable");
    assert.equal(profile.executable, null);
    assert.equal(profile.argv, null);
    assert.deepEqual(profile.rejectionCodes, [
      "PRIVACY_CONFIGURATION_UNVERIFIED",
      "EXTERNAL_RETENTION_UNVERIFIED",
      "HIDDEN_RETRY_UNVERIFIED",
    ]);
    assert.equal(profile.realInvocationAuthorized, false);
  });

  it("still returns unavailable until exact non-interactive PNG transport is implemented", () => {
    const envelope = request("candidate:gemini-antigravity-v1");
    const profile = createAntigravityInvocationProfile({
      requestEnvelope: envelope,
      capabilityProof: agyProof(),
    });
    assert.equal(profile.availability, "unavailable");
    assert.equal(profile.executable, null);
    assert.equal(profile.argv, null);
    assert.deepEqual(profile.rejectionCodes, ["CAPABILITY_PREFLIGHT_FAILED"]);
    assert.match(profile.unavailableReason ?? "", /PNG transport.*not implemented/i);
  });
});
