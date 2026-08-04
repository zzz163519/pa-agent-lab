import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import {
  PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1,
  assertProviderRequestEnvelopeIntegrity,
  type ProviderRequestEnvelopeV1,
  type ProviderTerminalStatusV1,
} from "@pa-agent-lab/contracts";

export const OFFLINE_PROVIDER_FIXTURE_SHA256 =
  "sha256:9c3d8c282590b671bfb135f3d6cadac34341c72e90eb7bfbec1d322922e21d1b" as const;

export const OFFLINE_PROVIDER_FIXTURE_MODES_V1 = [
  "success",
  "zero-usage",
  "tool-event",
  "unknown-event",
  "multiple",
  "prose",
  "ansi",
  "partial",
  "invalid-utf8",
  "stdout-overflow",
  "stderr",
  "stderr-overflow",
  "transport-error",
  "hang-with-child",
  "hang-with-resistant-child",
] as const;

export type OfflineProviderFixtureModeV1 =
  (typeof OFFLINE_PROVIDER_FIXTURE_MODES_V1)[number];

export interface RunOfflineProviderFixtureProcessInputV1 {
  readonly requestEnvelope: ProviderRequestEnvelopeV1;
  readonly workspaceDirectory: string;
  readonly fixtureExecutable: string;
  readonly fixtureScriptPath: string;
  readonly fixtureMode: OfflineProviderFixtureModeV1;
  readonly timeoutMs: number;
}

export interface OfflineProviderFixtureProcessResultV1 {
  readonly terminalStatus: ProviderTerminalStatusV1;
  readonly attemptNumber: 1;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdoutBytes: Uint8Array;
  readonly stderrByteLength: number;
  readonly latencyMs: number;
  readonly automaticRetryPerformed: false;
  readonly fixtureOnly: true;
}

export class ProviderProcessSupervisorError extends Error {
  override readonly name = "ProviderProcessSupervisorError";
}

let activeFixtureProcess = false;

export async function runOfflineProviderFixtureProcess(
  input: RunOfflineProviderFixtureProcessInputV1,
): Promise<Readonly<OfflineProviderFixtureProcessResultV1>> {
  exactRecord("offline provider fixture process input", input, [
    "requestEnvelope",
    "workspaceDirectory",
    "fixtureExecutable",
    "fixtureScriptPath",
    "fixtureMode",
    "timeoutMs",
  ]);
  if (activeFixtureProcess) {
    throw new ProviderProcessSupervisorError("provider global concurrency limit is 1");
  }
  activeFixtureProcess = true;
  try {
    assertProviderRequestEnvelopeIntegrity(input.requestEnvelope);
    validateTimeout(input.timeoutMs);
    await validateWorkspace(input.workspaceDirectory, input.requestEnvelope);
    await validateFixture(input.fixtureExecutable, input.fixtureScriptPath);
    if (
      !(OFFLINE_PROVIDER_FIXTURE_MODES_V1 as readonly string[]).includes(
        input.fixtureMode,
      )
    ) {
      fail("offline provider fixture mode is unsupported");
    }
    return await spawnFixture(input);
  } catch (error) {
    rethrow(error);
  } finally {
    activeFixtureProcess = false;
  }
}

async function spawnFixture(
  input: RunOfflineProviderFixtureProcessInputV1,
): Promise<Readonly<OfflineProviderFixtureProcessResultV1>> {
  const startedAt = Date.now();
  const child = spawn(
    input.fixtureExecutable,
    [input.fixtureScriptPath, input.fixtureMode],
    {
      cwd: input.workspaceDirectory,
      env: {
        HOME: input.workspaceDirectory,
        TMPDIR: input.workspaceDirectory,
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        NO_COLOR: "1",
      },
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const stdoutChunks: Buffer[] = [];
  let stdoutByteLength = 0;
  let stderrByteLength = 0;
  let timedOut = false;
  let outputResourceLimit = false;
  let spawnFailed = false;
  let forceKillTimer: NodeJS.Timeout | null = null;

  const signalGroup = (signal: NodeJS.Signals): void => {
    if (child.pid === undefined) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      spawnFailed = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // Terminal classification remains transport_error; no retry follows.
      }
    }
  };

  const terminateGroup = (): void => {
    signalGroup("SIGTERM");
    forceKillTimer ??= setTimeout(() => signalGroup("SIGKILL"), 100);
    forceKillTimer.unref();
  };

  child.stdout.on("data", (chunk: Buffer) => {
    const remaining = 262144 - stdoutByteLength;
    if (remaining > 0) stdoutChunks.push(Buffer.from(chunk.subarray(0, remaining)));
    stdoutByteLength += chunk.byteLength;
    if (stdoutByteLength > 262144 && !outputResourceLimit) {
      outputResourceLimit = true;
      terminateGroup();
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderrByteLength += chunk.byteLength;
    if (stderrByteLength > 65536 && !outputResourceLimit) {
      outputResourceLimit = true;
      terminateGroup();
    }
  });
  child.on("error", () => {
    spawnFailed = true;
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    terminateGroup();
  }, input.timeoutMs);
  timeout.unref();

  const closed = await new Promise<{
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timeout);
  if (timedOut || outputResourceLimit) signalGroup("SIGKILL");
  if (forceKillTimer !== null) clearTimeout(forceKillTimer);

  const terminalStatus: ProviderTerminalStatusV1 = outputResourceLimit
    ? "output_resource_limit"
    : timedOut
      ? "timeout"
      : spawnFailed || closed.exitCode !== 0 || stderrByteLength !== 0
        ? "transport_error"
        : "response_received";
  const latencyMs = Math.min(300000, Math.max(0, Date.now() - startedAt));
  return Object.freeze({
    terminalStatus,
    attemptNumber: 1,
    exitCode: closed.exitCode,
    signal: closed.signal,
    stdoutBytes: Buffer.concat(stdoutChunks),
    stderrByteLength,
    latencyMs,
    automaticRetryPerformed: false,
    fixtureOnly: true,
  });
}

async function validateWorkspace(
  directory: string,
  envelope: ProviderRequestEnvelopeV1,
): Promise<void> {
  if (typeof directory !== "string" || directory.length === 0) {
    fail("offline provider workspaceDirectory is required");
  }
  const status = await lstat(directory);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    (status.mode & 0o777) !== 0o700
  ) {
    fail("offline provider workspace must be a real 0700 directory");
  }
  const entries = (await readdir(directory)).sort();
  const expected = [...PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1].sort();
  if (
    entries.length !== expected.length ||
    entries.some((entry, index) => entry !== expected[index])
  ) {
    fail("offline provider workspace file allowlist is invalid");
  }

  const identities = new Map(
    envelope.artifacts.map((identity) => [identity.fileName, identity]),
  );
  for (const fileName of PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1) {
    const identity = identities.get(fileName);
    if (identity === undefined) {
      fail(`offline provider workspace artifact identity is missing: ${fileName}`);
    }
    let handle;
    try {
      handle = await open(
        join(directory, fileName),
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      const fileStatus = await handle.stat();
      if (!fileStatus.isFile() || (fileStatus.mode & 0o777) !== 0o600) {
        fail(`offline provider workspace artifact must be a regular 0600 file: ${fileName}`);
      }
      if (fileStatus.size !== identity.byteLength) {
        fail(`offline provider workspace artifact byte length changed: ${fileName}`);
      }
      const bytes = await handle.readFile();
      const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if (hash !== identity.contentHash) {
        fail(`offline provider workspace artifact content hash changed: ${fileName}`);
      }
    } catch (error) {
      if (error instanceof ProviderProcessSupervisorError) throw error;
      fail(
        `offline provider workspace artifact could not be verified: ${fileName}`,
      );
    } finally {
      await handle?.close();
    }
  }
}

async function validateFixture(executable: string, scriptPath: string): Promise<void> {
  if (executable !== process.execPath) {
    fail("offline fixture executable must be the current Node executable");
  }
  if (basename(scriptPath) !== "provider-fake-cli-v1.mjs") {
    fail("offline provider fixture filename is invalid");
  }
  const status = await lstat(scriptPath);
  if (!status.isFile() || status.isSymbolicLink()) {
    fail("offline provider fixture must be a regular file");
  }
  const bytes = await readFile(scriptPath);
  const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (hash !== OFFLINE_PROVIDER_FIXTURE_SHA256) {
    fail("offline provider fixture content hash is invalid");
  }
}

function validateTimeout(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 300000) {
    fail("offline provider timeoutMs must be from 1 through 300000");
  }
}

function exactRecord(
  name: string,
  value: unknown,
  keys: readonly string[],
): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object with exact keys`);
  }
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actual.includes(key))
  ) {
    fail(`${name} must contain exact keys`);
  }
}

function fail(message: string): never {
  throw new ProviderProcessSupervisorError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderProcessSupervisorError) throw error;
  if (error instanceof Error) throw new ProviderProcessSupervisorError(error.message);
  throw new ProviderProcessSupervisorError(
    "offline provider fixture process failed",
  );
}
