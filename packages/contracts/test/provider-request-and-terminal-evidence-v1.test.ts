import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "../src/contract-utils-v1.ts";
import { approvedProviderCandidateProfile } from "../src/provider-candidate-profile-v1.ts";
import {
  PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1,
  assertProviderRequestEnvelopeIntegrity,
  createProviderRequestEnvelope,
  type CreateProviderRequestEnvelopeInputV1,
} from "../src/provider-request-envelope-v1.ts";
import {
  createProviderTerminalEvidence,
  type CreateProviderTerminalEvidenceInputV1,
} from "../src/provider-terminal-evidence-v1.ts";

const h = (character: string) => `sha256:${character.repeat(64)}` as const;

function requestInput(): CreateProviderRequestEnvelopeInputV1 {
  return {
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
    candidateProfile: approvedProviderCandidateProfile(
      "candidate:gpt-codex-v1",
    ),
    artifacts: [
      {
        fileName: "request.json",
        mediaType: "application/json",
        byteLength: 4096,
        contentHash: h("8"),
      },
      {
        fileName: "prompt.txt",
        mediaType: "text/plain; charset=utf-8",
        byteLength: 5794,
        contentHash: h("6"),
      },
      {
        fileName: "response.schema.json",
        mediaType: "application/schema+json",
        byteLength: 25650,
        contentHash: h("7"),
      },
      {
        fileName: "context.png",
        mediaType: "image/png",
        byteLength: 12000,
        contentHash: h("9"),
      },
      {
        fileName: "detail.png",
        mediaType: "image/png",
        byteLength: 8000,
        contentHash: h("a"),
      },
    ],
  };
}

describe("Phase 5B2B provider request envelope", () => {
  it("binds one exact synthetic V2 request to fixed isolation and resource policy", () => {
    const request = createProviderRequestEnvelope(requestInput());

    assert.deepEqual(
      request.artifacts.map((artifact) => artifact.fileName),
      PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1,
    );
    assert.equal(request.candidateId, "candidate:gpt-codex-v1");
    assert.equal(request.modelId, "gpt-5.6");
    assert.equal(request.reasoningEffort, "high");
    assert.equal(request.resourcePolicy.hardTimeoutSeconds, 300);
    assert.equal(request.resourcePolicy.maxStdoutBytes, 262144);
    assert.equal(request.resourcePolicy.maxStderrBytes, 65536);
    assert.equal(request.resourcePolicy.maxTerminalJsonBytes, 131072);
    assert.equal(request.resourcePolicy.attemptLimit, 1);
    assert.equal(request.resourcePolicy.globalConcurrencyLimit, 1);
    assert.equal(request.resourcePolicy.batchingAuthorized, false);
    assert.equal(request.resourcePolicy.automaticRetryAuthorized, false);
    assert.equal(request.isolationProfile.shellAllowed, false);
    assert.equal(request.isolationProfile.repositoryAccessAllowed, false);
    assert.equal(request.isolationProfile.ordinaryHomeAccessAllowed, false);
    assert.equal(request.isolationProfile.toolsAllowed, false);
    assert.equal(request.isolationProfile.pluginsMcpRulesHistoryAllowed, false);
    assert.deepEqual(request.isolationProfile.childEnvironmentKeys, [
      "HOME",
      "TMPDIR",
      "LANG",
      "LC_ALL",
      "NO_COLOR",
    ]);
    assert.equal(request.retentionProfile.finalRawJson, true);
    assert.equal(request.retentionProfile.chainOfThought, false);
    assert.equal(request.retentionProfile.toolTrajectory, false);
    assert.equal(request.retentionProfile.cliConversationHistory, false);
    assert.match(request.requestEnvelopeHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(request), true);
  });

  it("rejects V1 packages, caller-selected fields, path leakage, and artifact drift", () => {
    const exact = requestInput();
    assert.throws(
      () => createProviderRequestEnvelope({
        ...exact,
        authority: {
          ...exact.authority,
          outputSchemaVersion: "brooks-identity-free-response.schema.v1" as never,
        },
      }),
      /V2 output schema/,
    );
    assert.throws(
      () => createProviderRequestEnvelope({
        ...exact,
        modelId: "gpt-5.6",
      } as never),
      /exact keys/,
    );
    assert.throws(
      () => createProviderRequestEnvelope({
        ...exact,
        artifacts: exact.artifacts.map((artifact) =>
          artifact.fileName === "context.png"
            ? { ...artifact, fileName: "/repo/context.png" as never }
            : artifact,
        ),
      }),
      /artifact filenames|generic files/,
    );
    assert.throws(
      () => createProviderRequestEnvelope({
        ...exact,
        artifacts: exact.artifacts.map((artifact) =>
          artifact.fileName === "prompt.txt"
            ? { ...artifact, contentHash: h("b") }
            : artifact,
        ),
      }),
      /prompt hash/,
    );

    const created = createProviderRequestEnvelope(exact);
    const { requestEnvelopeHash: _requestEnvelopeHash, ...tamperedBody } = {
      ...created,
      candidateProfileHash: h("f"),
    };
    assert.throws(
      () => assertProviderRequestEnvelopeIntegrity({
        ...tamperedBody,
        requestEnvelopeHash: canonicalHash(tamperedBody),
      }),
      /candidateProfileHash|approved candidate profile/,
    );
  });
});

describe("Phase 5B2B provider terminal evidence", () => {
  it("retains only an exact response, observable metrics, and validation evidence", () => {
    const requestEnvelope = createProviderRequestEnvelope(requestInput());
    const input: CreateProviderTerminalEvidenceInputV1 = {
      requestEnvelope,
      attemptNumber: 1,
      terminalStatus: "response_received",
      terminalJson: "{\"verdict\":\"no_trade\"}",
      latencyMs: 4321,
      usage: {
        inputTokens: 1000,
        outputTokens: 250,
        cacheReadTokens: null,
      },
      validation: {
        status: "accepted",
        rejectionCodes: [],
        validationResultHash: h("c"),
      },
    };
    const evidence = createProviderTerminalEvidence(input);

    assert.equal(evidence.responseHash?.startsWith("sha256:"), true);
    assert.equal(evidence.terminalJson, input.terminalJson);
    assert.equal(evidence.monetaryCostAvailability, "unavailable");
    assert.equal("monetaryCost" in evidence, false);
    assert.equal("chainOfThought" in evidence, false);
    assert.equal("toolTrajectory" in evidence, false);
    assert.equal("stderr" in evidence, false);
    assert.equal("workspacePath" in evidence, false);
    assert.match(evidence.evidenceHash, /^sha256:[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(evidence), true);
  });

  it("distinguishes absent usage from zero and enforces terminal-state closure", () => {
    const requestEnvelope = createProviderRequestEnvelope(requestInput());
    const timeout = createProviderTerminalEvidence({
      requestEnvelope,
      attemptNumber: 1,
      terminalStatus: "timeout",
      terminalJson: null,
      latencyMs: 300000,
      usage: null,
      validation: {
        status: "not_run",
        rejectionCodes: ["TIMEOUT"],
        validationResultHash: null,
      },
    });
    assert.equal(timeout.usage, null);
    assert.equal(timeout.responseHash, null);
    assert.equal(timeout.terminalJsonByteLength, null);

    const base: CreateProviderTerminalEvidenceInputV1 = {
      requestEnvelope,
      attemptNumber: 1,
      terminalStatus: "response_received",
      terminalJson: "{}",
      latencyMs: 1,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
      validation: {
        status: "rejected",
        rejectionCodes: ["SCHEMA_REJECTED"],
        validationResultHash: h("d"),
      },
    };
    const observedZero = createProviderTerminalEvidence(base);
    assert.deepEqual(observedZero.usage, {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
    });
    assert.throws(
      () => createProviderTerminalEvidence({ ...base, attemptNumber: 2 as never }),
      /attemptNumber/,
    );
    assert.throws(
      () => createProviderTerminalEvidence({
        ...base,
        terminalStatus: "timeout",
      }),
      /timeout.*terminalJson|null/i,
    );
    assert.throws(
      () => createProviderTerminalEvidence({
        ...base,
        validation: {
          status: "accepted",
          rejectionCodes: ["SCHEMA_REJECTED"],
          validationResultHash: h("d"),
        },
      }),
      /accepted.*rejection/i,
    );
  });
});
