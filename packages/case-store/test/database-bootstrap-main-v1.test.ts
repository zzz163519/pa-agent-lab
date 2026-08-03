import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseDatabaseBootstrapDeploymentV1 } from "../src/database-bootstrap-main-v1.ts";

const environment = {
  PA_DATABASE_ADMIN_HOST: "postgres",
  PA_DATABASE_ADMIN_PORT: "5432",
  PA_DATABASE_NAME: "pa_agent_lab",
  PA_DATABASE_ADMIN_USER: "pa_bootstrap",
  PA_POSTGRES_BOOTSTRAP_PASSWORD:
    "bootstrap-/#?%-password-0123456789abcdef",
  PA_DATABASE_APPLICATION_ROLE: "pa_console_app",
  PA_DATABASE_APPLICATION_PASSWORD:
    "application-/#?%-password-0123456789abcdef",
} as const;

describe("database bootstrap deployment entrypoint", () => {
  it("accepts one explicit restricted application login", () => {
    const deployment = parseDatabaseBootstrapDeploymentV1(environment);
    assert.equal(deployment.applicationLoginRole, "pa_console_app");
    assert.equal(
      deployment.applicationPassword,
      environment.PA_DATABASE_APPLICATION_PASSWORD,
    );
    assert.equal(
      decodeURIComponent(new URL(deployment.adminConnectionString).password),
      environment.PA_POSTGRES_BOOTSTRAP_PASSWORD,
    );
    assert.match(deployment.migrationsDirectory, /persistence-contracts\/sql$/);
    assert.match(deployment.infrastructureDirectory, /infra\/phase2$/);
  });

  it("fails closed when a deployment credential is absent", () => {
    assert.throws(
      () =>
        parseDatabaseBootstrapDeploymentV1({
          ...environment,
          PA_DATABASE_APPLICATION_PASSWORD: undefined,
        }),
      /PA_DATABASE_APPLICATION_PASSWORD is required/,
    );
  });
});
