import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const workspaceRoot = resolve(import.meta.dirname, "../../..");

describe("Phase 3A trusted-loopback deployment artifacts", () => {
  it("pins images and publishes only the credential-free gateway on loopback", async () => {
    const [dockerfile, compose] = await Promise.all([
      readFile(resolve(workspaceRoot, "infra/phase3a/Dockerfile"), "utf8"),
      readFile(resolve(workspaceRoot, "infra/phase3a/compose.yaml"), "utf8"),
    ]);
    assert.match(
      dockerfile,
      /^FROM node:24\.18\.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build/m,
    );
    assert.match(
      compose,
      /pgvector\/pgvector:0\.8\.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352/,
    );
    assert.equal(
      [...compose.matchAll(/127\.0\.0\.1:\$\{PA_CONSOLE_PORT:-3210\}:3210/g)]
        .length,
      1,
    );

    const consoleBlock = compose.slice(
      compose.indexOf("  console:"),
      compose.indexOf("  gateway:"),
    );
    assert.doesNotMatch(consoleBlock, /\n    ports:/);
    assert.doesNotMatch(consoleBlock, /phase3a-loopback-ingress/);
    assert.match(consoleBlock, /PA_REVIEWER_AUTH_MODE: trusted_loopback/);
    assert.match(consoleBlock, /PA_DATABASE_PASSWORD:/);
    assert.doesNotMatch(consoleBlock, /postgresql:\/\//);
    assert.match(consoleBlock, /PA_TRUSTED_LOOPBACK_GATEWAY: "true"/);

    const gatewayBlock = compose.slice(
      compose.indexOf("  gateway:"),
      compose.indexOf("\nnetworks:"),
    );
    assert.match(gatewayBlock, /PA_GATEWAY_TARGET_ORIGIN: http:\/\/console:3210/);
    assert.doesNotMatch(
      gatewayBlock,
      /PA_API_TOKEN|PA_DATABASE_URL|PA_DATABASE_APPLICATION_PASSWORD|volumes:/,
    );
    assert.match(compose, /phase3a-internal:\n    internal: true/);
    assert.doesNotMatch(compose, /postgresql:\/\//);
  });
});
