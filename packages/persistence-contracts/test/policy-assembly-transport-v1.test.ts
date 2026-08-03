import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1,
  assertCreatePolicyAssemblyCommand,
  assertDoctrineCorpusRollbackCommand,
} from "../src/policy-assembly-transport-v1.ts";

const HASH = `sha256:${"a".repeat(64)}` as const;

describe("Phase 5A rollback transport", () => {
  it("accepts only targetActivationId and reason", () => {
    assert.doesNotThrow(() =>
      assertDoctrineCorpusRollbackCommand({
        targetActivationId: HASH,
        reason: "Restore prior eligible corpus.",
      }),
    );
    assert.throws(
      () => assertDoctrineCorpusRollbackCommand({ targetActivationId: HASH }),
      /exact keys/,
    );
    assert.throws(
      () =>
        assertDoctrineCorpusRollbackCommand({
          targetActivationId: HASH,
          reason: "Restore prior eligible corpus.",
          operatorPrincipal: "local:phase2-operator",
        }),
      /exact keys/,
    );
    for (const forbiddenKey of [
      "activationSequence",
      "runId",
      "snapshotId",
      "profileHash",
      "qualityReportHash",
    ]) {
      assert.throws(
        () =>
          assertDoctrineCorpusRollbackCommand({
            targetActivationId: HASH,
            reason: "Restore prior eligible corpus.",
            [forbiddenKey]: HASH,
          }),
        /exact keys/,
      );
    }
    assert.throws(
      () =>
        assertDoctrineCorpusRollbackCommand({
          targetActivationId: "sha256:not-a-hash",
          reason: "Restore prior eligible corpus.",
        }),
      /SHA-256/,
    );
    assert.throws(
      () =>
        assertDoctrineCorpusRollbackCommand({
          targetActivationId: HASH,
          reason: "x".repeat(501),
        }),
      /1 through 500/,
    );
  });

  it("accepts only caseHash for Policy Assembly", () => {
    assert.doesNotThrow(() =>
      assertCreatePolicyAssemblyCommand({ caseHash: HASH }),
    );
    assert.throws(() => assertCreatePolicyAssemblyCommand({}), /exact keys/);
    for (const forbiddenKey of [
      "activationId",
      "snapshotId",
      "doctrine",
      "query",
      "promptHash",
      "provider",
      "operatorPrincipal",
      "policyInput",
    ]) {
      assert.throws(
        () =>
          assertCreatePolicyAssemblyCommand({
            caseHash: HASH,
            [forbiddenKey]: HASH,
          }),
        /exact keys/,
      );
    }
    assert.throws(
      () => assertCreatePolicyAssemblyCommand({ caseHash: "sha256:bad" }),
      /SHA-256/,
    );
  });

  it("publishes the complete five-route operator-only manifest", () => {
    assert.deepEqual(
      PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1.map(
        ({ method, path, authentication }) => ({ method, path, authentication }),
      ),
      [
        { method: "POST", path: "/v1/doctrine/rollback-activations", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/activations/:activationId", authentication: "operator_token" },
        { method: "POST", path: "/v1/policy-assemblies", authentication: "operator_token" },
        { method: "GET", path: "/v1/policy-assemblies/:assemblyId", authentication: "operator_token" },
        { method: "GET", path: "/v1/policy-assembly-failures/:failureId", authentication: "operator_token" },
      ],
    );
  });

  it("publishes only operator routes and includes rollback write and activation read", () => {
    assert.deepEqual(
      PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1.slice(0, 2).map(
        ({ method, path, authentication }) => ({ method, path, authentication }),
      ),
      [
        {
          method: "POST",
          path: "/v1/doctrine/rollback-activations",
          authentication: "operator_token",
        },
        {
          method: "GET",
          path: "/v1/doctrine/activations/:activationId",
          authentication: "operator_token",
        },
      ],
    );
    assert.equal(
      PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1.every(
        (route) => route.authentication === "operator_token",
      ),
      true,
    );
  });
});
