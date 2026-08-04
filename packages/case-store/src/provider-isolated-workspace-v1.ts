import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1,
  assertProviderRequestEnvelopeIntegrity,
  type ProviderRequestArtifactFileNameV1,
  type ProviderRequestEnvelopeV1,
} from "@pa-agent-lab/contracts";

export type ProviderWorkspaceArtifactBytesV1 = Readonly<
  Record<ProviderRequestArtifactFileNameV1, Uint8Array>
>;

export interface CreateIsolatedProviderWorkspaceInputV1 {
  readonly baseDirectory: string;
  readonly requestEnvelope: ProviderRequestEnvelopeV1;
  readonly artifacts: ProviderWorkspaceArtifactBytesV1;
}

export interface IsolatedProviderWorkspaceV1 {
  readonly directory: string;
  readonly filePaths: Readonly<
    Record<ProviderRequestArtifactFileNameV1, string>
  >;
  readonly cleanup: () => Promise<void>;
}

export class ProviderIsolatedWorkspaceError extends Error {
  override readonly name = "ProviderIsolatedWorkspaceError";
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export async function createIsolatedProviderWorkspace(
  input: CreateIsolatedProviderWorkspaceInputV1,
): Promise<Readonly<IsolatedProviderWorkspaceV1>> {
  let directory: string | null = null;
  try {
    exactRecord("isolated provider workspace input", input, [
      "baseDirectory",
      "requestEnvelope",
      "artifacts",
    ]);
    assertProviderRequestEnvelopeIntegrity(input.requestEnvelope);
    await assertEmptyRealBaseDirectory(input.baseDirectory);
    validateArtifactObject(input.artifacts);
    validateArtifactBytes(input.requestEnvelope, input.artifacts);

    directory = await mkdtemp(join(resolve(input.baseDirectory), "request-"));
    await chmod(directory, 0o700);
    const filePaths = {} as Record<ProviderRequestArtifactFileNameV1, string>;
    for (const fileName of PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1) {
      const path = join(directory, fileName);
      await writeFile(path, input.artifacts[fileName], {
        flag: "wx",
        mode: 0o600,
      });
      await chmod(path, 0o600);
      const status = await lstat(path);
      if (!status.isFile() || status.isSymbolicLink()) {
        fail(`workspace artifact is not a regular file: ${fileName}`);
      }
      filePaths[fileName] = path;
    }
    const entries = (await readdir(directory)).sort();
    const expected = [...PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1].sort();
    if (
      entries.length !== expected.length ||
      entries.some((entry, index) => entry !== expected[index])
    ) {
      fail("workspace contains files outside the exact artifact allowlist");
    }

    let cleaned = false;
    const ownedDirectory = directory;
    const cleanup = async (): Promise<void> => {
      if (cleaned) return;
      cleaned = true;
      await rm(ownedDirectory, { recursive: true, force: true });
    };
    return Object.freeze({
      directory: ownedDirectory,
      filePaths: Object.freeze(filePaths),
      cleanup,
    });
  } catch (error) {
    if (directory !== null) {
      await rm(directory, { recursive: true, force: true });
    }
    rethrow(error);
  }
}

async function assertEmptyRealBaseDirectory(path: string): Promise<void> {
  if (typeof path !== "string" || path.length === 0 || path.includes("\u0000")) {
    fail("workspace baseDirectory must be a non-empty path");
  }
  const status = await lstat(path);
  if (status.isSymbolicLink() || !status.isDirectory()) {
    fail("workspace baseDirectory must be a real directory, not a symbolic link");
  }
  if ((await readdir(path)).length !== 0) {
    fail("workspace base directory must be empty");
  }
}

function validateArtifactObject(value: ProviderWorkspaceArtifactBytesV1): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail("workspace artifacts must contain exact generic artifact keys");
  }
  const keys = Object.keys(value);
  if (
    keys.length !== PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1.length ||
    keys.some(
      (key) =>
        !(PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1 as readonly string[]).includes(key),
    ) ||
    PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1.some((key) => !keys.includes(key))
  ) {
    fail("workspace artifacts must contain exact generic artifact keys");
  }
}

function validateArtifactBytes(
  envelope: ProviderRequestEnvelopeV1,
  artifacts: ProviderWorkspaceArtifactBytesV1,
): void {
  const identities = new Map(
    envelope.artifacts.map((identity) => [identity.fileName, identity]),
  );
  for (const fileName of PROVIDER_REQUEST_ARTIFACT_FILE_NAMES_V1) {
    const bytes = artifacts[fileName];
    if (!(bytes instanceof Uint8Array)) {
      fail(`workspace artifact bytes are invalid: ${fileName}`);
    }
    const identity = identities.get(fileName);
    if (identity === undefined || bytes.byteLength !== identity.byteLength) {
      fail(`workspace artifact byte length does not match: ${fileName}`);
    }
    const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (hash !== identity.contentHash) {
      fail(`workspace artifact content hash does not match: ${fileName}`);
    }
    if (
      (fileName === "context.png" || fileName === "detail.png") &&
      !Buffer.from(bytes.subarray(0, PNG_SIGNATURE.byteLength)).equals(PNG_SIGNATURE)
    ) {
      fail(`workspace chart is not a PNG: ${fileName}`);
    }
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
  throw new ProviderIsolatedWorkspaceError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof ProviderIsolatedWorkspaceError) throw error;
  if (error instanceof Error) throw new ProviderIsolatedWorkspaceError(error.message);
  throw new ProviderIsolatedWorkspaceError(
    "isolated provider workspace creation failed",
  );
}
