import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_PROFILE_V1,
  canonicalStringify,
  createDoctrineApproval,
  createDoctrineCorpusActivation,
  createDoctrineCorpusEntry,
  createDoctrineCorpusRollbackActivation,
  createDoctrineCorpusSnapshot,
} from "../src/index.ts";
import {
  POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES,
  POLICY_ASSEMBLY_RULES_VERSION,
  assertPolicyAssemblyFailureIntegrity,
  assertPolicyAssemblyIntegrity,
  createPolicyAssembly,
  createPolicyAssemblyFailure,
} from "../src/policy-assembly-v1.ts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "../../case-cli/src/synthetic-fixture-v1.ts";

const hash = (character: string) =>
  `sha256:${character.repeat(64)}` as `sha256:${string}`;

function approvedSnapshot() {
  return createDoctrineCorpusSnapshot(
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
}

function standardActivation(snapshotId = approvedSnapshot().snapshotId) {
  return createDoctrineCorpusActivation({
    schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
    activationSequence: 1,
    runId: hash("a"),
    snapshotId,
    profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
    qualityReportHash: hash("b"),
    operatorPrincipal: "local:phase2-operator",
  });
}

function assemblyInput() {
  const fixture = createPhase2SyntheticFixtureV1();
  const snapshot = approvedSnapshot();
  return {
    sourceBundleHash: fixture.caseBundle.bundleHash,
    activation: standardActivation(snapshot.snapshotId),
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
    operatorPrincipal: "local:phase2-operator" as const,
  };
}

describe("Phase 5A synthetic Policy Assembly domain", () => {
  it("rebuilds the existing anonymous input with the complete active snapshot", () => {
    const input = assemblyInput();
    const assembly = createPolicyAssembly(input);
    const context = {
      schemaVersion: "policy-doctrine-context.v1",
      doctrine: input.snapshot.entries.map((entry) => entry.ragRecord),
    } as const;
    const contextBytes = new TextEncoder().encode(
      canonicalStringify(context),
    ).byteLength;

    assert.equal(assembly.schemaVersion, "policy-assembly.v1");
    assert.equal(assembly.assemblyRulesVersion, POLICY_ASSEMBLY_RULES_VERSION);
    assert.equal(assembly.sourceScope, "synthetic_fixture_only");
    assert.equal(assembly.caseHash, input.policyCase.caseHash);
    assert.equal(assembly.activationKind, "standard");
    assert.equal(assembly.doctrineContextByteLength, contextBytes);
    assert.equal(assembly.doctrineManifest.length, 9);
    assert.deepEqual(
      assembly.doctrineManifest,
      input.snapshot.entries.map(({ doctrineId, ragRecordHash }) => ({
        doctrineId,
        ragRecordHash,
      })),
    );
    assert.deepEqual(
      assembly.policyInput.doctrine,
      input.snapshot.entries.map((entry) => entry.ragRecord),
    );
    assert.equal(
      assembly.policyInput.doctrine.some((record) =>
        record.doctrineId.startsWith("D-synthetic-"),
      ),
      false,
    );
    assert.equal(assembly.inputHash, assembly.policyInput.inputHash);
    assert.equal(assembly.charts.context.panel, "context");
    assert.equal(assembly.charts.detail.panel, "detail");
    assert.equal(Object.isFrozen(assembly), true);
    assert.equal(Object.isFrozen(assembly.policyInput), true);
    assert.doesNotThrow(() => assertPolicyAssemblyIntegrity(assembly));

    const rollback = createDoctrineCorpusRollbackActivation({
      activationSequence: 3,
      replacesActivationId: hash("c"),
      targetActivation: input.activation,
      reason: "Restore prior eligible corpus.",
      operatorPrincipal: "local:phase2-operator",
    });
    const rollbackAssembly = createPolicyAssembly({
      ...input,
      activation: rollback,
    });
    assert.equal(rollbackAssembly.activationKind, "rollback");
    assert.equal(rollbackAssembly.inputHash, assembly.inputHash);
    assert.notEqual(rollbackAssembly.assemblyId, assembly.assemblyId);
  });

  it("rejects relation drift, unknown keys, caller principal, count, and byte overflow", () => {
    const input = assemblyInput();
    assert.throws(
      () =>
        createPolicyAssembly({
          ...input,
          sourceBundleHash: "sha256:bad" as never,
        }),
      /SHA-256/,
    );
    assert.throws(
      () =>
        createPolicyAssembly({
          ...input,
          activation: standardActivation(hash("d")),
        }),
      /snapshot/,
    );
    assert.throws(
      () =>
        createPolicyAssembly({
          ...input,
          operatorPrincipal: "local:calvin-reviewer" as never,
        }),
      /operatorPrincipal/,
    );
    assert.throws(
      () => createPolicyAssembly({ ...input, query: "breakout" } as never),
      /exact keys/,
    );

    const assembly = createPolicyAssembly(input);
    assert.throws(
      () =>
        assertPolicyAssemblyIntegrity({
          ...assembly,
          inputHash: hash("e"),
        }),
      /inputHash|identity/,
    );
    assert.throws(
      () =>
        assertPolicyAssemblyIntegrity({
          ...assembly,
          unauthorized: true,
        }),
      /exact keys/,
    );
  });

  it("creates only the four bounded expected failure shapes", () => {
    const input = assemblyInput();
    const noActivation = createPolicyAssemblyFailure({
      caseHash: input.policyCase.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activation: null,
      observedDoctrineCount: null,
      observedDoctrineContextByteLength: null,
      errorCodes: ["ACTIVATION_UNAVAILABLE"],
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(noActivation.activationId, null);
    assert.equal(noActivation.snapshotId, null);
    assert.doesNotThrow(() => assertPolicyAssemblyFailureIntegrity(noActivation));

    const ineligible = createPolicyAssemblyFailure({
      caseHash: input.policyCase.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activation: input.activation,
      observedDoctrineCount: null,
      observedDoctrineContextByteLength: null,
      errorCodes: ["ACTIVE_CORPUS_INELIGIBLE"],
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(ineligible.activationKind, "standard");
    assert.equal(ineligible.snapshotId, input.snapshot.snapshotId);

    const countExceeded = createPolicyAssemblyFailure({
      caseHash: input.policyCase.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activation: input.activation,
      observedDoctrineCount: 33,
      observedDoctrineContextByteLength: null,
      errorCodes: ["DOCTRINE_COUNT_EXCEEDED"],
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(countExceeded.observedDoctrineCount, 33);

    const bytesExceeded = createPolicyAssemblyFailure({
      caseHash: input.policyCase.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activation: input.activation,
      observedDoctrineCount: 9,
      observedDoctrineContextByteLength:
        POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES + 1,
      errorCodes: ["DOCTRINE_CONTEXT_BYTES_EXCEEDED"],
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(
      bytesExceeded.observedDoctrineContextByteLength,
      POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES + 1,
    );

    assert.throws(
      () =>
        createPolicyAssemblyFailure({
          ...noActivation,
          failureId: undefined,
          errorCodes: ["ACTIVATION_UNAVAILABLE", "ACTIVATION_UNAVAILABLE"],
        } as never),
      /exact keys|unique/,
    );
    assert.throws(
      () =>
        createPolicyAssemblyFailure({
          caseHash: input.policyCase.caseHash,
          sourceBundleHash: input.sourceBundleHash,
          activation: null,
          observedDoctrineCount: 1,
          observedDoctrineContextByteLength: null,
          errorCodes: ["ACTIVATION_UNAVAILABLE"],
          operatorPrincipal: "local:phase2-operator",
        }),
      /null/,
    );
    assert.throws(
      () =>
        createPolicyAssemblyFailure({
          caseHash: input.policyCase.caseHash,
          sourceBundleHash: input.sourceBundleHash,
          activation: input.activation,
          observedDoctrineCount: 32,
          observedDoctrineContextByteLength: null,
          errorCodes: ["DOCTRINE_COUNT_EXCEEDED"],
          operatorPrincipal: "local:phase2-operator",
        }),
      /greater than 32/,
    );
  });
});
