import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCaseApiDeploymentV1 } from "../src/server.ts";

const baseEnvironment = {
  PA_DATABASE_URL: "postgresql://pa_app:test-password@postgres/pa_agent_lab",
  PA_CHART_ARTIFACT_ROOT: "/var/lib/pa-agent-lab/charts",
  PA_API_TOKEN: "operator-token-0123456789abcdef",
  PA_AUTHORIZED_SYNTHETIC_BUNDLE_HASHES: `sha256:${"a".repeat(64)}`,
  PA_API_PORT: "3210",
  PA_CONSOLE_ROOT: "packages/research-console/dist",
} as const;

describe("Phase 3A server deployment boundary", () => {
  it("keeps bearer deployments on a direct loopback listener", () => {
    const deployment = parseCaseApiDeploymentV1(baseEnvironment);
    assert.equal(deployment.reviewerAuthMode, "bearer");
    assert.equal(deployment.listenHost, "127.0.0.1");
    assert.equal(deployment.publicOrigin, "http://127.0.0.1:3210");
  });

  it("encodes reserved PostgreSQL credentials from discrete deployment fields", () => {
    const { PA_DATABASE_URL: _databaseUrl, ...withoutUrl } = baseEnvironment;
    const deployment = parseCaseApiDeploymentV1({
      ...withoutUrl,
      PA_DATABASE_HOST: "postgres",
      PA_DATABASE_PORT: "5432",
      PA_DATABASE_NAME: "pa_agent_lab",
      PA_DATABASE_USER: "pa_console_app",
      PA_DATABASE_PASSWORD: "reserved-/#?%-password-0123456789abcdef",
    });
    assert.equal(
      decodeURIComponent(new URL(deployment.databaseUrl).password),
      "reserved-/#?%-password-0123456789abcdef",
    );
  });

  it("allows a wildcard container listener only behind explicit loopback publishing", () => {
    const deployment = parseCaseApiDeploymentV1({
      ...baseEnvironment,
      PA_REVIEWER_AUTH_MODE: "trusted_loopback",
      PA_API_LISTEN_HOST: "0.0.0.0",
      PA_TRUSTED_LOOPBACK_GATEWAY: "true",
      PA_PUBLIC_PORT: "3211",
    });
    assert.equal(deployment.reviewerAuthMode, "trusted_loopback");
    assert.equal(deployment.listenHost, "0.0.0.0");
    assert.equal(deployment.publicOrigin, "http://127.0.0.1:3211");
  });

  it("rejects wildcard, unknown auth, and non-loopback public deployment values", () => {
    assert.throws(
      () =>
        parseCaseApiDeploymentV1({
          ...baseEnvironment,
          PA_REVIEWER_AUTH_MODE: "trusted_loopback",
        }),
      /explicit loopback gateway/,
    );
    assert.throws(
      () =>
        parseCaseApiDeploymentV1({
          ...baseEnvironment,
          PA_REVIEWER_AUTH_MODE: "trusted_loopback",
          PA_API_LISTEN_HOST: "0.0.0.0",
        }),
      /explicit loopback gateway/,
    );
    assert.throws(
      () =>
        parseCaseApiDeploymentV1({
          ...baseEnvironment,
          PA_REVIEWER_AUTH_MODE: "public",
        }),
      /PA_REVIEWER_AUTH_MODE/,
    );
    assert.throws(
      () =>
        parseCaseApiDeploymentV1({
          ...baseEnvironment,
          PA_PUBLIC_HOST: "192.0.2.10",
        }),
      /PA_PUBLIC_HOST/,
    );
  });
});
