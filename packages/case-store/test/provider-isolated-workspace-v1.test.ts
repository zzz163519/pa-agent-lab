import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  approvedProviderCandidateProfile,
  createProviderRequestEnvelope,
  type ContractSha256,
  type ProviderRequestArtifactV1,
  type ProviderRequestEnvelopeV1,
} from "@pa-agent-lab/contracts";

import {
  createIsolatedProviderWorkspace,
  type ProviderWorkspaceArtifactBytesV1,
} from "../src/provider-isolated-workspace-v1.ts";

const sha = (bytes: Uint8Array): ContractSha256 =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function fixture(): {
  readonly envelope: ProviderRequestEnvelopeV1;
  readonly artifacts: ProviderWorkspaceArtifactBytesV1;
} {
  const artifacts = {
    "request.json": Buffer.from('{"anonymousPayload":"fixture"}', "utf8"),
    "prompt.txt": Buffer.from("Synthetic prompt fixture.", "utf8"),
    "response.schema.json": Buffer.from(
      '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}',
      "utf8",
    ),
    "context.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]),
    "detail.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]),
  } satisfies ProviderWorkspaceArtifactBytesV1;
  const identities = Object.entries(artifacts).map(([fileName, bytes]) => ({
    fileName,
    mediaType:
      fileName === "request.json"
        ? "application/json"
        : fileName === "prompt.txt"
          ? "text/plain; charset=utf-8"
          : fileName === "response.schema.json"
            ? "application/schema+json"
            : "image/png",
    byteLength: bytes.byteLength,
    contentHash: sha(bytes),
  })) as ProviderRequestArtifactV1[];
  const byName = new Map(identities.map((identity) => [identity.fileName, identity]));
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
    artifacts: identities,
  });
  return { envelope, artifacts };
}

describe("Phase 5B2B isolated provider workspace", () => {
  it("writes only verified generic artifacts with restrictive permissions and cleans up", async () => {
    const baseDirectory = await mkdtemp(join(tmpdir(), "pa-provider-workspace-test-"));
    try {
      const { envelope, artifacts } = fixture();
      const workspace = await createIsolatedProviderWorkspace({
        baseDirectory,
        requestEnvelope: envelope,
        artifacts,
      });

      assert.deepEqual((await readdir(workspace.directory)).sort(), [
        "context.png",
        "detail.png",
        "prompt.txt",
        "request.json",
        "response.schema.json",
      ]);
      assert.equal((await stat(workspace.directory)).mode & 0o777, 0o700);
      for (const [fileName, bytes] of Object.entries(artifacts)) {
        const path = workspace.filePaths[fileName as keyof typeof workspace.filePaths];
        assert.equal((await stat(path)).mode & 0o777, 0o600);
        assert.deepEqual(await readFile(path), bytes);
        assert.equal((await lstat(path)).isSymbolicLink(), false);
      }
      assert.equal(Object.isFrozen(workspace.filePaths), true);
      assert.equal("repositoryPath" in workspace, false);
      assert.equal("homeDirectory" in workspace, false);

      await workspace.cleanup();
      await assert.rejects(() => stat(workspace.directory), /ENOENT/);
      await workspace.cleanup();
    } finally {
      await rm(baseDirectory, { recursive: true, force: true });
    }
  });

  it("rejects byte drift, extra files, symlink bases, and pre-existing content without residue", async () => {
    const root = await mkdtemp(join(tmpdir(), "pa-provider-workspace-reject-"));
    try {
      const exact = fixture();
      const tampered = {
        ...exact.artifacts,
        "context.png": Buffer.concat([exact.artifacts["context.png"], Buffer.from([3])]),
      };
      await assert.rejects(
        () => createIsolatedProviderWorkspace({
          baseDirectory: root,
          requestEnvelope: exact.envelope,
          artifacts: tampered,
        }),
        /byte length|content hash/,
      );
      assert.deepEqual(await readdir(root), []);

      await assert.rejects(
        () => createIsolatedProviderWorkspace({
          baseDirectory: root,
          requestEnvelope: exact.envelope,
          artifacts: { ...exact.artifacts, "source.txt": Buffer.from("forbidden") } as never,
        }),
        /exact generic artifact keys/,
      );
      assert.deepEqual(await readdir(root), []);

      await writeFile(join(root, "preexisting"), "x");
      await assert.rejects(
        () => createIsolatedProviderWorkspace({
          baseDirectory: root,
          requestEnvelope: exact.envelope,
          artifacts: exact.artifacts,
        }),
        /base directory must be empty/,
      );
      await rm(join(root, "preexisting"));

      const link = `${root}-link`;
      await symlink(root, link);
      try {
        await assert.rejects(
          () => createIsolatedProviderWorkspace({
            baseDirectory: link,
            requestEnvelope: exact.envelope,
            artifacts: exact.artifacts,
          }),
          /symbolic link|real directory/,
        );
      } finally {
        await rm(link, { force: true });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
