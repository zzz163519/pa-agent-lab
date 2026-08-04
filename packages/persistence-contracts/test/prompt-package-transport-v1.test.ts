import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PHASE5B1_PROMPT_PACKAGE_ROUTE_MANIFEST_V1,
  assertActivateBrooksPromptPackageCommand,
  assertPreparePolicyPayloadCommand,
  assertRollbackBrooksPromptPackageCommand,
} from "../src/prompt-package-transport-v1.ts";

const hash = (character: string) => `sha256:${character.repeat(64)}`;

describe("Phase 5B1 Prompt Package transport", () => {
  it("publishes only five operator request-response routes", () => {
    assert.deepEqual(
      PHASE5B1_PROMPT_PACKAGE_ROUTE_MANIFEST_V1.map(({ method, path }) => ({
        method,
        path,
      })),
      [
        { method: "POST", path: "/v1/prompt-package-activations" },
        { method: "POST", path: "/v1/prompt-package-rollback-activations" },
        { method: "GET", path: "/v1/prompt-package-activations/current" },
        { method: "POST", path: "/v1/prepared-policy-payloads" },
        { method: "GET", path: "/v1/prepared-policy-payloads/:preparationId" },
      ],
    );
    for (const route of PHASE5B1_PROMPT_PACKAGE_ROUTE_MANIFEST_V1) {
      assert.equal(route.authentication, "operator_token");
      assert.equal(route.transport, "request_response");
    }
  });

  it("accepts only the bounded commands without caller-selected authority", () => {
    assert.doesNotThrow(() => assertActivateBrooksPromptPackageCommand({}));
    assert.doesNotThrow(() =>
      assertRollbackBrooksPromptPackageCommand({
        targetActivationId: hash("a"),
        reason: "Restore the approved prior package.",
      }),
    );
    assert.doesNotThrow(() =>
      assertPreparePolicyPayloadCommand({ assemblyId: hash("b") }),
    );
    assert.throws(
      () => assertActivateBrooksPromptPackageCommand({ packageHash: hash("c") }),
      /exact keys/,
    );
    assert.throws(
      () => assertRollbackBrooksPromptPackageCommand({
        targetActivationId: hash("a"),
        reason: "restore",
        operatorPrincipal: "forbidden",
      }),
      /exact keys/,
    );
    assert.throws(
      () => assertPreparePolicyPayloadCommand({
        assemblyId: hash("b"),
        modelId: "forbidden",
      }),
      /exact keys/,
    );
  });
});
