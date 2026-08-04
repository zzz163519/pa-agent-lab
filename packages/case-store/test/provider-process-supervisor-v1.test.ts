import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import {
  approvedProviderCandidateProfile,
  createProviderRequestEnvelope,
  type ContractSha256,
  type ProviderRequestArtifactV1,
  type ProviderRequestEnvelopeV1,
} from "@pa-agent-lab/contracts";

import {
  createIsolatedProviderWorkspace,
  type IsolatedProviderWorkspaceV1,
  type ProviderWorkspaceArtifactBytesV1,
} from "../src/provider-isolated-workspace-v1.ts";
import {
  decodeProviderCliTerminalEnvelope,
  ProviderTerminalEnvelopeError,
} from "../src/provider-terminal-envelope-v1.ts";
import {
  runOfflineProviderFixtureProcess,
  type OfflineProviderFixtureModeV1,
} from "../src/provider-process-supervisor-v1.ts";

const fixtureScriptPath = new URL(
  "./fixtures/provider-fake-cli-v1.mjs",
  import.meta.url,
).pathname;
const sha = (bytes: Uint8Array): ContractSha256 =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function workspaceFixture(): Promise<{
  readonly base: string;
  readonly envelope: ProviderRequestEnvelopeV1;
  readonly workspace: Readonly<IsolatedProviderWorkspaceV1>;
}> {
  const bytes = {
    "request.json": Buffer.from('{"anonymousPayload":"fixture"}'),
    "prompt.txt": Buffer.from("Synthetic prompt fixture."),
    "response.schema.json": Buffer.from('{"type":"object"}'),
    "context.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]),
    "detail.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]),
  } satisfies ProviderWorkspaceArtifactBytesV1;
  const artifacts = Object.entries(bytes).map(([fileName, value]) => ({
    fileName,
    mediaType:
      fileName === "request.json"
        ? "application/json"
        : fileName === "prompt.txt"
          ? "text/plain; charset=utf-8"
          : fileName === "response.schema.json"
            ? "application/schema+json"
            : "image/png",
    byteLength: value.byteLength,
    contentHash: sha(value),
  })) as ProviderRequestArtifactV1[];
  const byName = new Map(artifacts.map((artifact) => [artifact.fileName, artifact]));
  const envelope = createProviderRequestEnvelope({
    authority: {
      sourceScope: "synthetic_fixture_only",
      preparationId: `sha256:${"1".repeat(64)}`,
      assemblyId: `sha256:${"2".repeat(64)}`,
      packageActivationId: `sha256:${"3".repeat(64)}`,
      packageHash: `sha256:${"4".repeat(64)}`,
      packageApprovalRecordHash: `sha256:${"5".repeat(64)}`,
      promptHash: byName.get("prompt.txt")!.contentHash,
      responseSchemaHash: byName.get("response.schema.json")!.contentHash,
      payloadHash: byName.get("request.json")!.contentHash,
      outputSchemaVersion: "brooks-identity-free-response.schema.v2",
    },
    candidateProfile: approvedProviderCandidateProfile("candidate:gpt-codex-v1"),
    artifacts,
  });
  const base = await mkdtemp(join(tmpdir(), "pa-provider-process-"));
  const workspace = await createIsolatedProviderWorkspace({
    baseDirectory: base,
    requestEnvelope: envelope,
    artifacts: bytes,
  });
  return { base, envelope, workspace };
}

async function run(
  mode: OfflineProviderFixtureModeV1,
  timeoutMs = 3000,
) {
  const fixture = await workspaceFixture();
  try {
    return await runOfflineProviderFixtureProcess({
      requestEnvelope: fixture.envelope,
      workspaceDirectory: fixture.workspace.directory,
      fixtureExecutable: process.execPath,
      fixtureScriptPath,
      fixtureMode: mode,
      timeoutMs,
    });
  } finally {
    await fixture.workspace.cleanup();
    await rm(fixture.base, { recursive: true, force: true });
  }
}

describe("Phase 5B2B offline fixture process supervisor", () => {
  it("runs one fixed fake executable with bounded output and no shell", async () => {
    const result = await run("success");
    assert.equal(result.terminalStatus, "response_received");
    assert.equal(result.exitCode, 0);
    assert.equal(result.attemptNumber, 1);
    assert.equal(result.stderrByteLength, 0);
    assert.equal(result.automaticRetryPerformed, false);
    assert.equal(result.fixtureOnly, true);
    assert.equal(result.stdoutBytes.byteLength > 0, true);
    assert.equal("stderrBytes" in result, false);
    assert.equal("argv" in result, false);
  });

  it("terminates the complete fake process group on timeout and does not retry", async () => {
    const result = await run("hang-with-child", 300);
    assert.equal(result.terminalStatus, "timeout");
    assert.equal(result.automaticRetryPerformed, false);
    const childPid = Number(Buffer.from(result.stdoutBytes).toString("utf8"));
    assert.equal(Number.isSafeInteger(childPid), true);
    await delay(100);
    assert.throws(() => process.kill(childPid, 0), /ESRCH/);
  });

  it("force-kills a resistant descendant after the fixture parent closes", async () => {
    const result = await run("hang-with-resistant-child", 300);
    assert.equal(result.terminalStatus, "timeout");
    const childPid = Number(Buffer.from(result.stdoutBytes).toString("utf8"));
    assert.equal(Number.isSafeInteger(childPid), true);
    await delay(150);
    try {
      assert.throws(() => process.kill(childPid, 0), /ESRCH/);
    } finally {
      try {
        process.kill(childPid, "SIGKILL");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
  });

  it("enforces output bounds, transport closure, and global concurrency one", async () => {
    assert.equal((await run("stdout-overflow")).terminalStatus, "output_resource_limit");
    assert.equal((await run("stderr-overflow")).terminalStatus, "output_resource_limit");
    assert.equal((await run("stderr")).terminalStatus, "transport_error");
    assert.equal((await run("transport-error")).terminalStatus, "transport_error");

    const firstFixture = await workspaceFixture();
    const secondFixture = await workspaceFixture();
    try {
      const first = runOfflineProviderFixtureProcess({
        requestEnvelope: firstFixture.envelope,
        workspaceDirectory: firstFixture.workspace.directory,
        fixtureExecutable: process.execPath,
        fixtureScriptPath,
        fixtureMode: "hang-with-child",
        timeoutMs: 300,
      });
      await assert.rejects(
        () => runOfflineProviderFixtureProcess({
          requestEnvelope: secondFixture.envelope,
          workspaceDirectory: secondFixture.workspace.directory,
          fixtureExecutable: process.execPath,
          fixtureScriptPath,
          fixtureMode: "success",
          timeoutMs: 300,
        }),
        /global concurrency limit is 1/,
      );
      assert.equal((await first).terminalStatus, "timeout");
    } finally {
      await firstFixture.workspace.cleanup();
      await secondFixture.workspace.cleanup();
      await rm(firstFixture.base, { recursive: true, force: true });
      await rm(secondFixture.base, { recursive: true, force: true });
    }
  });

  it("revalidates staged artifact bytes immediately before process creation", async () => {
    const fixture = await workspaceFixture();
    try {
      await writeFile(
        join(fixture.workspace.directory, "prompt.txt"),
        Buffer.from("Tampered prompt fixture!"),
      );
      await assert.rejects(
        () => runOfflineProviderFixtureProcess({
          requestEnvelope: fixture.envelope,
          workspaceDirectory: fixture.workspace.directory,
          fixtureExecutable: process.execPath,
          fixtureScriptPath,
          fixtureMode: "success",
          timeoutMs: 100,
        }),
        /artifact byte length|artifact content hash/,
      );
    } finally {
      await fixture.workspace.cleanup();
      await rm(fixture.base, { recursive: true, force: true });
    }
  });

  it("hard-rejects real CLI executables and changed fixture bytes", async () => {
    const fixture = await workspaceFixture();
    try {
      await assert.rejects(
        () => runOfflineProviderFixtureProcess({
          requestEnvelope: fixture.envelope,
          workspaceDirectory: fixture.workspace.directory,
          fixtureExecutable: "agy",
          fixtureScriptPath,
          fixtureMode: "success",
          timeoutMs: 100,
        }),
        /offline fixture executable/,
      );
      await assert.rejects(
        () => runOfflineProviderFixtureProcess({
          requestEnvelope: fixture.envelope,
          workspaceDirectory: fixture.workspace.directory,
          fixtureExecutable: process.execPath,
          fixtureScriptPath: new URL(import.meta.url).pathname,
          fixtureMode: "success",
          timeoutMs: 100,
        }),
        /fixture content hash|fixture filename/,
      );
    } finally {
      await fixture.workspace.cleanup();
      await rm(fixture.base, { recursive: true, force: true });
    }
  });
});

describe("Phase 5B2B closed provider CLI terminal envelope", () => {
  it("returns one unchanged terminal JSON value and bounded optional usage", async () => {
    const result = await run("success");
    const decoded = decodeProviderCliTerminalEnvelope(result.stdoutBytes);
    assert.equal(
      decoded.terminalJson,
      '{"humanSummary":null,"plannedGeometry":null,"verdict":"no_trade"}',
    );
    assert.deepEqual(decoded.usage, {
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: null,
    });
    assert.equal(decoded.toolOrSubagentUsed, false);
    assert.equal(Object.isFrozen(decoded), true);
  });

  it("rejects invalid UTF-8, prose, ANSI, partial, multiple, unknown, and tool envelopes", async () => {
    const cases: readonly [OfflineProviderFixtureModeV1, RegExp, string][] = [
      ["invalid-utf8", /UTF-8/, "INVALID_UTF8"],
      ["prose", /closed canonical envelope/, "STRICT_JSON_REJECTED"],
      ["ansi", /closed canonical envelope/, "STRICT_JSON_REJECTED"],
      ["partial", /JSON|envelope/, "STRICT_JSON_REJECTED"],
      ["multiple", /JSON|envelope/, "STRICT_JSON_REJECTED"],
      ["unknown-event", /terminal_result/, "STRICT_JSON_REJECTED"],
      ["tool-event", /tool or subagent/, "TOOL_OR_SUBAGENT_USED"],
    ];
    for (const [mode, message, code] of cases) {
      const result = await run(mode);
      assert.throws(
        () => decodeProviderCliTerminalEnvelope(result.stdoutBytes),
        (error: unknown) =>
          error instanceof ProviderTerminalEnvelopeError &&
          error.rejectionCode === code &&
          message.test(error.message),
      );
    }
  });
});
