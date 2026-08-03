import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runCaseCliV1 } from "../src/case-cli-v1.ts";

const token = "phase5a-cli-token-0123456789abcdef";
const HASH = `sha256:${"d".repeat(64)}`;

describe("Phase 5A Policy Assembly CLI", () => {
  it("maps only bounded policy commands to operator routes", async () => {
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
      ["policy", "assemble", "--case-hash", HASH],
      ["policy", "assembly", "--assembly-id", HASH],
      ["policy", "assembly-failure", "--failure-id", HASH],
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
        path: "/v1/policy-assemblies",
        body: { caseHash: HASH },
      },
      {
        method: "GET",
        path: `/v1/policy-assemblies/${HASH}`,
        body: undefined,
      },
      {
        method: "GET",
        path: `/v1/policy-assembly-failures/${HASH}`,
        body: undefined,
      },
    ]);
  });

  it("rejects missing identities and caller-selected authority fields", async () => {
    for (const argv of [
      ["policy", "assemble"],
      ["policy", "assembly", "--assembly-id", "not-a-hash"],
      ["policy", "assembly-failure", "--failure-id", "not-a-hash"],
      ["policy", "assemble", "--case-hash", HASH, "--activation-id", HASH],
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
