import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runCaseCliV1 } from "../src/case-cli-v1.ts";

const token = "phase5b1-cli-token-0123456789abcdef";
const HASH = `sha256:${"e".repeat(64)}`;

describe("Phase 5B1 Prompt Package CLI", () => {
  it("maps only bounded package lifecycle and offline preparation commands", async () => {
    const requested: {
      readonly method: string;
      readonly path: string;
      readonly body: unknown;
    }[] = [];
    const fakeFetch = (async (input, init) => {
      requested.push({
        method: init?.method ?? "GET",
        path: new URL(String(input)).pathname,
        body:
          init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      });
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    for (const argv of [
      ["prompt-package", "activate"],
      ["prompt-package", "current"],
      ["prompt-package", "rollback", HASH, "--reason", "Restore exact prior package."],
      ["policy", "prepare", "--assembly-id", HASH],
      ["policy", "prepared", "--preparation-id", HASH],
    ]) {
      const errors: string[] = [];
      assert.equal(
        await runCaseCliV1({
          argv,
          env: { PA_API_TOKEN: token },
          stdout: () => {},
          stderr: (value) => errors.push(value),
          fetchImpl: fakeFetch,
        }),
        0,
        errors.join("\n"),
      );
    }
    assert.deepEqual(requested, [
      {
        method: "POST",
        path: "/v1/prompt-package-activations",
        body: {},
      },
      {
        method: "GET",
        path: "/v1/prompt-package-activations/current",
        body: undefined,
      },
      {
        method: "POST",
        path: "/v1/prompt-package-rollback-activations",
        body: {
          targetActivationId: HASH,
          reason: "Restore exact prior package.",
        },
      },
      {
        method: "POST",
        path: "/v1/prepared-policy-payloads",
        body: { assemblyId: HASH },
      },
      {
        method: "GET",
        path: `/v1/prepared-policy-payloads/${HASH}`,
        body: undefined,
      },
    ]);
  });

  it("rejects missing identities, invalid reasons, and caller-selected package fields", async () => {
    for (const argv of [
      ["prompt-package", "rollback", HASH],
      ["prompt-package", "rollback", "not-a-hash", "--reason", "Restore."],
      ["prompt-package", "rollback", HASH, "extra", "--reason", "Restore."],
      ["prompt-package", "activate", "--assembly-id", HASH],
      ["prompt-package", "current", "extra"],
      ["prompt-package", "activate", "--package-hash", HASH],
      ["policy", "prepare"],
      ["policy", "prepare", "extra", "--assembly-id", HASH],
      ["policy", "prepared", "--preparation-id", "not-a-hash"],
      ["policy", "prepared", "--preparation-id", HASH, "--case-hash", HASH],
    ]) {
      const errors: string[] = [];
      assert.equal(
        await runCaseCliV1({
          argv,
          env: { PA_API_TOKEN: token },
          stdout: () => {},
          stderr: (value) => errors.push(value),
          fetchImpl: async () => {
            throw new Error("invalid CLI input must not reach fetch");
          },
        }),
        1,
      );
      assert.equal(errors.length, 1);
    }
  });
});
