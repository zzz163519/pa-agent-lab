import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  bootstrapPhase2DatabaseV1,
  type BootstrapPhase2DatabaseOptionsV1,
} from "./database-bootstrap-v1.ts";
import { createPostgresConnectionStringV1 } from "./postgres-connection-v1.ts";

export function parseDatabaseBootstrapDeploymentV1(
  env: Readonly<Record<string, string | undefined>>,
): Readonly<BootstrapPhase2DatabaseOptionsV1> {
  const workspaceRoot = resolve(import.meta.dirname, "../../..");
  return {
    adminConnectionString: adminConnectionString(env),
    applicationLoginRole: required(
      env,
      "PA_DATABASE_APPLICATION_ROLE",
    ),
    applicationPassword: required(
      env,
      "PA_DATABASE_APPLICATION_PASSWORD",
    ),
    migrationsDirectory: resolve(
      workspaceRoot,
      "packages/persistence-contracts/sql",
    ),
    infrastructureDirectory: resolve(workspaceRoot, "infra/phase2"),
  };
}

function adminConnectionString(
  env: Readonly<Record<string, string | undefined>>,
): string {
  if (env.PA_DATABASE_ADMIN_URL !== undefined) {
    return required(env, "PA_DATABASE_ADMIN_URL");
  }
  return createPostgresConnectionStringV1({
    host: required(env, "PA_DATABASE_ADMIN_HOST"),
    port: requiredPort(env, "PA_DATABASE_ADMIN_PORT"),
    database: required(env, "PA_DATABASE_NAME"),
    user: required(env, "PA_DATABASE_ADMIN_USER"),
    password: required(env, "PA_POSTGRES_BOOTSTRAP_PASSWORD"),
  });
}

function requiredPort(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): number {
  const port = Number(required(env, name));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer from 1 through 65535`);
  }
  return port;
}

function required(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const results = await bootstrapPhase2DatabaseV1(
    parseDatabaseBootstrapDeploymentV1(process.env),
  );
  console.log(
    JSON.stringify({
      migrations: results.map(({ name, status }) => ({
        name,
        status,
      })),
    }),
  );
}
