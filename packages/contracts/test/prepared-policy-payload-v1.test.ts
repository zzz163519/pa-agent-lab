import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_PROFILE_V1,
  createDoctrineApproval,
  createDoctrineCorpusActivation,
  createDoctrineCorpusEntry,
  createDoctrineCorpusSnapshot,
} from "../src/index.ts";
import {
  createBrooksPromptPackageActivation,
  createBrooksPromptPackageRollbackActivation,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
} from "../src/brooks-prompt-package-v1.ts";
import { createPolicyAssembly } from "../src/policy-assembly-v1.ts";
import {
  createPreparedPolicyPayload,
  type PreparedPolicyPayloadV1,
} from "../src/prepared-policy-payload-v1.ts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "../../case-cli/src/synthetic-fixture-v1.ts";

const hash = (character: string) =>
  `sha256:${character.repeat(64)}` as `sha256:${string}`;

function verifiedPackage() {
  return verifyBrooksPromptPackageArtifacts({
    promptBytes: readFileSync(
      new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url),
    ),
    responseSchemaBytes: readFileSync(
      new URL(
        "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
        import.meta.url,
      ),
    ),
    manifest: JSON.parse(
      readFileSync(
        new URL("../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json", import.meta.url),
        "utf8",
      ),
    ) as BrooksPromptPackageManifestV1,
    approval: JSON.parse(
      readFileSync(
        new URL(
          "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as BrooksPromptPackageApprovalV1,
  });
}

function assembly() {
  const fixture = createPhase2SyntheticFixtureV1();
  const snapshot = createDoctrineCorpusSnapshot(
    createPhase3bPilotDoctrineProposalsV1().map((proposal) =>
      createDoctrineCorpusEntry({
        proposal,
        approval: createDoctrineApproval({
          proposalHash: proposal.proposalHash,
          doctrineId: proposal.doctrineUnit.doctrineId,
          sourceId: proposal.source.sourceId,
          sourceContentHash: proposal.source.contentHash,
          approverPrincipal: "local:phase2-operator",
        }),
      }),
    ),
  );
  const activation = createDoctrineCorpusActivation({
    schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
    activationSequence: 1,
    runId: hash("a"),
    snapshotId: snapshot.snapshotId,
    profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
    qualityReportHash: hash("b"),
    operatorPrincipal: "local:phase2-operator",
  });
  return createPolicyAssembly({
    sourceBundleHash: fixture.caseBundle.bundleHash,
    activation,
    snapshot,
    policyCase: fixture.caseBundle.policyCase,
    charts: {
      context: {
        metadataId: fixture.caseBundle.chartMetadata.context.metadataId,
        artifactId: fixture.caseBundle.chartMetadata.context.artifactId,
        contentHash: fixture.caseBundle.chartMetadata.context.contentHash,
        manifest: fixture.caseBundle.policyInput.charts.context,
      },
      detail: {
        metadataId: fixture.caseBundle.chartMetadata.detail.metadataId,
        artifactId: fixture.caseBundle.chartMetadata.detail.artifactId,
        contentHash: fixture.caseBundle.chartMetadata.detail.contentHash,
        manifest: fixture.caseBundle.policyInput.charts.detail,
      },
    },
    operatorPrincipal: "local:phase2-operator",
  });
}

describe("Phase 5B1 prepared policy payload", () => {
  it("binds one synthetic assembly to one exact package activation without a model run", () => {
    const promptPackage = verifiedPackage();
    const packageActivation = createBrooksPromptPackageActivation({
      activationSequence: 1,
      promptPackage,
      operatorPrincipal: "local:phase2-operator",
    });
    const input = {
      assembly: assembly(),
      packageActivation,
      promptPackage,
      operatorPrincipal: "local:phase2-operator" as const,
    };
    const prepared = createPreparedPolicyPayload(input);
    const repeated = createPreparedPolicyPayload(input);

    assert.equal(prepared.schemaVersion, "prepared-policy-payload.v1");
    assert.equal(prepared.preparationRulesVersion, "prepared-policy-payload-rules.v1");
    assert.equal(prepared.sourceScope, "synthetic_fixture_only");
    assert.equal(prepared.assemblyId, input.assembly.assemblyId);
    assert.equal(prepared.packageActivationId, packageActivation.activationId);
    assert.equal(prepared.packageHash, promptPackage.manifest.packageHash);
    assert.equal(prepared.promptHash, promptPackage.manifest.prompt.contentHash);
    assert.equal(
      prepared.responseSchemaHash,
      promptPackage.manifest.responseSchema.contentHash,
    );
    assert.equal(
      prepared.outputSchemaVersion,
      promptPackage.manifest.responseSchema.schemaVersion,
    );
    assert.equal(prepared.payloadHash, prepared.payload.payloadHash);
    assert.equal(prepared.preparationId, repeated.preparationId);
    assert.equal(Object.isFrozen(prepared), true);
    for (const forbidden of [
      "modelId",
      "providerId",
      "callId",
      "modelRunId",
      "attemptId",
      "responseHash",
      "decisionHash",
    ]) {
      assert.equal(forbidden in prepared, false);
    }
  });

  it("creates a new preparation identity for an explicit rollback activation", () => {
    const promptPackage = verifiedPackage();
    const standard = createBrooksPromptPackageActivation({
      activationSequence: 1,
      promptPackage,
      operatorPrincipal: "local:phase2-operator",
    });
    const rollback = createBrooksPromptPackageRollbackActivation({
      activationSequence: 3,
      replacesActivationId: hash("f"),
      targetActivation: standard,
      reason: "Restore the earlier approved package.",
      operatorPrincipal: "local:phase2-operator",
    });
    const policyAssembly = assembly();
    const standardPrepared = createPreparedPolicyPayload({
      assembly: policyAssembly,
      packageActivation: standard,
      promptPackage,
      operatorPrincipal: "local:phase2-operator",
    });
    const rollbackPrepared = createPreparedPolicyPayload({
      assembly: policyAssembly,
      packageActivation: rollback,
      promptPackage,
      operatorPrincipal: "local:phase2-operator",
    });

    assert.notEqual(standardPrepared.preparationId, rollbackPrepared.preparationId);
    assert.equal(standardPrepared.payloadHash, rollbackPrepared.payloadHash);
  });

  it("rejects mixed package activation and caller-selected authority", () => {
    const promptPackage = verifiedPackage();
    const packageActivation = createBrooksPromptPackageActivation({
      activationSequence: 1,
      promptPackage,
      operatorPrincipal: "local:phase2-operator",
    });
    const input = {
      assembly: assembly(),
      packageActivation,
      promptPackage,
      operatorPrincipal: "local:phase2-operator" as const,
    };
    assert.throws(
      () => createPreparedPolicyPayload({
        ...input,
        packageActivation: {
          ...packageActivation,
          packageHash: hash("f"),
        },
      }),
      /activation identity|package hash/,
    );
    assert.throws(
      () => createPreparedPolicyPayload({
        ...input,
        operatorPrincipal: "local:calvin-reviewer" as never,
      }),
      /operatorPrincipal/,
    );
    assert.throws(
      () => createPreparedPolicyPayload({ ...input, modelId: "forbidden" } as never),
      /exact keys/,
    );
    assert.equal(
      Object.keys(createPreparedPolicyPayload(input)).includes(
        "modelRunId" as keyof PreparedPolicyPayloadV1,
      ),
      false,
    );
  });
});
