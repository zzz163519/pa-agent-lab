import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  assertBrooksPromptPackageApprovalIntegrity,
  createBrooksPromptPackageActivation,
  createBrooksPromptPackageRollbackActivation,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
} from "../src/brooks-prompt-package-v1.ts";
import { canonicalHash } from "../src/contract-utils-v1.ts";

const promptPath = new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url);
const schemaPath = new URL(
  "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
  import.meta.url,
);
const manifestPath = new URL(
  "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json",
  import.meta.url,
);
const approvalPath = new URL(
  "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json",
  import.meta.url,
);
const implementationAuthorizationPath = new URL(
  "../../../docs/decisions/PHASE5B1_IMPLEMENTATION_AUTHORIZATION_V1.json",
  import.meta.url,
);

function artifacts() {
  return {
    promptBytes: readFileSync(promptPath),
    responseSchemaBytes: readFileSync(schemaPath),
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")) as BrooksPromptPackageManifestV1,
    approval: JSON.parse(readFileSync(approvalPath, "utf8")) as BrooksPromptPackageApprovalV1,
  };
}

describe("Phase 5B1 Brooks Prompt Package identity", () => {
  it("verifies the exact Calvin-approved package without widening authority", () => {
    const verified = verifyBrooksPromptPackageArtifacts(artifacts());

    assert.equal(
      verified.manifest.packageHash,
      "sha256:b67896d15d5e2542c7bebaeca2b60c67cbb5510ef359efaca7f44e42fa17b0d9",
    );
    assert.equal(
      verified.approval.approvalRecordHash,
      "sha256:d1c0ddbac5c14ec2d455de5ba85d0de381f8561dd928c8362207f7c41370389e",
    );
    assert.equal(verified.approval.approvalScope, "exact-package-content-only");
    assert.equal(verified.approval.phase5b1ImplementationAuthorized, false);
    assert.equal(verified.approval.packageActivationPerformed, false);
    assert.equal(verified.approval.providerCallsAuthorized, false);
    assert.equal(Object.isFrozen(verified), true);
    assert.equal(Object.isFrozen(verified.manifest), true);
    assert.equal(Object.isFrozen(verified.approval), true);
  });

  it("keeps implementation authority separate from exact-content approval", () => {
    const authorization = JSON.parse(
      readFileSync(implementationAuthorizationPath, "utf8"),
    ) as Record<string, unknown>;
    const authorizationRecordHash = authorization.authorizationRecordHash;
    delete authorization.authorizationRecordHash;

    assert.equal(
      canonicalHash(authorization),
      "sha256:fd84862d0e0308d5a0474c077078307dcb2562162912736e28ab2fc7119e0a32",
    );
    assert.equal(
      authorizationRecordHash,
      "sha256:fd84862d0e0308d5a0474c077078307dcb2562162912736e28ab2fc7119e0a32",
    );
    assert.equal(authorization.implementationAuthorized, true);
    assert.equal(authorization.packageActivationAuthorized, false);
    assert.equal(authorization.packageActivationPerformed, false);
    assert.equal(authorization.providerCallsAuthorized, false);
    assert.equal(authorization.modelRunsAuthorized, false);
    assert.equal(authorization.productionBrooksDecisionsAuthorized, false);
  });

  it("rejects byte drift, mixed identities, extra keys, and widened approval flags", () => {
    const exact = artifacts();
    assert.throws(
      () => verifyBrooksPromptPackageArtifacts({
        ...exact,
        promptBytes: Buffer.concat([exact.promptBytes, Buffer.from("\n")]),
      }),
      /prompt byte length|prompt content hash/,
    );
    assert.throws(
      () => verifyBrooksPromptPackageArtifacts({
        ...exact,
        manifest: {
          ...exact.manifest,
          validatorVersion: "brooks-identity-free-response-validator.v2" as never,
        },
      }),
      /validator version|package hash/,
    );
    assert.throws(
      () => assertBrooksPromptPackageApprovalIntegrity({
        ...exact.approval,
        packageHash: `sha256:${"a".repeat(64)}`,
      }, exact.manifest),
      /approval record hash|approved package/,
    );
    assert.throws(
      () => assertBrooksPromptPackageApprovalIntegrity({
        ...exact.approval,
        phase5b1ImplementationAuthorized: true,
      }, exact.manifest),
      /approval record hash|does not authorize implementation/,
    );
    assert.throws(
      () => assertBrooksPromptPackageApprovalIntegrity({
        ...exact.approval,
        extra: true,
      } as never, exact.manifest),
      /exact keys/,
    );
  });

  it("creates explicit append-only activation and rollback identities", () => {
    const verified = verifyBrooksPromptPackageArtifacts(artifacts());
    const activation = createBrooksPromptPackageActivation({
      activationSequence: 1,
      promptPackage: verified,
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(activation.activationKind, "standard");
    assert.equal(activation.packageHash, verified.manifest.packageHash);
    assert.equal(activation.approvalRecordHash, verified.approval.approvalRecordHash);
    assert.match(activation.activationId, /^sha256:[0-9a-f]{64}$/);

    const rollback = createBrooksPromptPackageRollbackActivation({
      activationSequence: 3,
      replacesActivationId: `sha256:${"f".repeat(64)}`,
      targetActivation: activation,
      reason: "  Restore\t the prior approved package.  ",
      operatorPrincipal: "local:phase2-operator",
    });
    assert.equal(rollback.activationKind, "rollback");
    assert.equal(rollback.targetActivationId, activation.activationId);
    assert.equal(rollback.packageHash, activation.packageHash);
    assert.equal(rollback.reason, "Restore the prior approved package.");
    assert.notEqual(rollback.activationId, activation.activationId);
    assert.equal(Object.isFrozen(rollback), true);
  });

  it("rejects ambiguous package lifecycle authority", () => {
    const verified = verifyBrooksPromptPackageArtifacts(artifacts());
    const activation = createBrooksPromptPackageActivation({
      activationSequence: 1,
      promptPackage: verified,
      operatorPrincipal: "local:phase2-operator",
    });
    assert.throws(
      () => createBrooksPromptPackageActivation({
        activationSequence: 1,
        promptPackage: verified,
        operatorPrincipal: "local:calvin-reviewer" as never,
      }),
      /operatorPrincipal/,
    );
    assert.throws(
      () => createBrooksPromptPackageRollbackActivation({
        activationSequence: 1,
        replacesActivationId: `sha256:${"f".repeat(64)}`,
        targetActivation: activation,
        reason: "restore",
        operatorPrincipal: "local:phase2-operator",
      }),
      /later than the target/,
    );
    assert.throws(
      () => createBrooksPromptPackageRollbackActivation({
        activationSequence: 2,
        replacesActivationId: activation.activationId,
        targetActivation: activation,
        reason: "restore",
        operatorPrincipal: "local:phase2-operator",
      }),
      /must differ from targetActivationId/,
    );
    assert.throws(
      () => createBrooksPromptPackageRollbackActivation({
        activationSequence: 2,
        replacesActivationId: `sha256:${"f".repeat(64)}`,
        targetActivation: activation,
        reason: "\u0000",
        operatorPrincipal: "local:phase2-operator",
      }),
      /control/,
    );
  });
});
