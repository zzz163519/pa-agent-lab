import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  createPostgresCaseStoreV1,
  createPostgresConnectionStringV1,
} from "@pa-agent-lab/case-store";
import {
  DOCTRINE_RETRIEVAL_RUNTIME,
  type ContractSha256,
} from "@pa-agent-lab/contracts";

import { createCaseApiV1 } from "./case-api-v1.ts";

export interface StartedCaseApiServerV1 {
  readonly url: string;
  readonly reviewerUrl: string | null;
  close(): Promise<void>;
}

export interface CaseApiDeploymentV1 {
  readonly databaseUrl: string;
  readonly artifactRoot: string;
  readonly localToken: string;
  readonly consoleRoot?: string;
  readonly authorizedSyntheticBundleHashes: readonly ContractSha256[];
  readonly authorizedDoctrineProposalHashes: readonly ContractSha256[];
  readonly reviewerAuthMode: "bearer" | "trusted_loopback";
  readonly listenHost: "127.0.0.1" | "0.0.0.0";
  readonly publicOrigin: string;
  readonly port: number;
  readonly publicPort: number;
}

export async function startCaseApiServerV1(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<StartedCaseApiServerV1> {
  const deployment = parseCaseApiDeploymentV1(env);
  const reviewerToken = randomBytes(32).toString("hex");
  const database = createPostgresCaseStoreV1({
    connectionString: deployment.databaseUrl,
    doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME,
    authorizedSyntheticBundleHashes:
      deployment.authorizedSyntheticBundleHashes,
    artifactRoot: deployment.artifactRoot,
  });
  try {
    const app = await createCaseApiV1({
      store: database.store,
      artifactRoot: deployment.artifactRoot,
      localToken: deployment.localToken,
      reviewerToken,
      reviewerAuthMode: deployment.reviewerAuthMode,
      authorizedSyntheticBundleHashes:
        deployment.authorizedSyntheticBundleHashes,
      authorizedDoctrineProposalHashes:
        deployment.authorizedDoctrineProposalHashes,
      allowedHosts: ["127.0.0.1", "localhost"],
      allowedOrigins: [
        `http://127.0.0.1:${deployment.publicPort}`,
        `http://localhost:${deployment.publicPort}`,
      ],
      ...(deployment.consoleRoot === undefined
        ? {}
        : { consoleRoot: deployment.consoleRoot }),
    });
    await app.listen({
      host: deployment.listenHost,
      port: deployment.port,
    });
    return {
      url: deployment.publicOrigin,
      reviewerUrl:
        deployment.consoleRoot === undefined
          ? null
          : deployment.reviewerAuthMode === "trusted_loopback"
            ? `${deployment.publicOrigin}/console/`
            : `${deployment.publicOrigin}/console/#token=${reviewerToken}`,
      close: async () => {
        await app.close();
        await database.close();
      },
    };
  } catch (error) {
    await database.close();
    throw error;
  }
}

export function parseCaseApiDeploymentV1(
  env: Readonly<Record<string, string | undefined>>,
): Readonly<CaseApiDeploymentV1> {
  const port = parsePort("PA_API_PORT", env.PA_API_PORT ?? "3210");
  const publicPort = parsePort(
    "PA_PUBLIC_PORT",
    env.PA_PUBLIC_PORT ?? String(port),
  );
  const reviewerAuthMode = parseReviewerAuthMode(env.PA_REVIEWER_AUTH_MODE);
  const listenHost = parseListenHost(
    env.PA_API_LISTEN_HOST,
    reviewerAuthMode,
    env.PA_TRUSTED_LOOPBACK_GATEWAY,
  );
  const publicHost = env.PA_PUBLIC_HOST ?? "127.0.0.1";
  if (publicHost !== "127.0.0.1" && publicHost !== "localhost") {
    throw new Error("PA_PUBLIC_HOST must be an exact loopback hostname");
  }
  return {
    databaseUrl: databaseConnectionString(env),
    artifactRoot: required(env, "PA_CHART_ARTIFACT_ROOT"),
    localToken: required(env, "PA_API_TOKEN"),
    ...(env.PA_CONSOLE_ROOT === undefined
      ? {}
      : { consoleRoot: required(env, "PA_CONSOLE_ROOT") }),
    authorizedSyntheticBundleHashes: parseHashes(
      required(env, "PA_AUTHORIZED_SYNTHETIC_BUNDLE_HASHES"),
    ),
    authorizedDoctrineProposalHashes: parseOptionalHashes(
      env.PA_AUTHORIZED_DOCTRINE_PROPOSAL_HASHES,
    ),
    reviewerAuthMode,
    listenHost,
    publicOrigin: `http://${publicHost}:${publicPort}`,
    port,
    publicPort,
  };
}

function databaseConnectionString(
  env: Readonly<Record<string, string | undefined>>,
): string {
  if (env.PA_DATABASE_URL !== undefined) {
    return required(env, "PA_DATABASE_URL");
  }
  return createPostgresConnectionStringV1({
    host: required(env, "PA_DATABASE_HOST"),
    port: parsePort(
      "PA_DATABASE_PORT",
      required(env, "PA_DATABASE_PORT"),
    ),
    database: required(env, "PA_DATABASE_NAME"),
    user: required(env, "PA_DATABASE_USER"),
    password: required(env, "PA_DATABASE_PASSWORD"),
  });
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

function parseHashes(value: string): readonly ContractSha256[] {
  const hashes = value.split(",").map((item) => item.trim());
  if (
    hashes.length === 0 ||
    hashes.some((hash) => !/^sha256:[0-9a-f]{64}$/.test(hash)) ||
    new Set(hashes).size !== hashes.length
  ) {
    throw new Error(
      "PA_AUTHORIZED_SYNTHETIC_BUNDLE_HASHES must contain unique SHA-256 identities",
    );
  }
  return hashes as ContractSha256[];
}

function parseOptionalHashes(
  value: string | undefined,
): readonly ContractSha256[] {
  if (value === undefined || value.trim().length === 0) return [];
  return parseHashes(value);
}

function parseReviewerAuthMode(
  value: string | undefined,
): "bearer" | "trusted_loopback" {
  if (value === undefined || value === "bearer") return "bearer";
  if (value === "trusted_loopback") return value;
  throw new Error(
    "PA_REVIEWER_AUTH_MODE must be bearer or trusted_loopback",
  );
}

function parseListenHost(
  value: string | undefined,
  reviewerAuthMode: "bearer" | "trusted_loopback",
  trustedLoopbackGateway: string | undefined,
): "127.0.0.1" | "0.0.0.0" {
  const host = value ?? "127.0.0.1";
  if (
    reviewerAuthMode === "trusted_loopback" &&
    trustedLoopbackGateway !== "true"
  ) {
    throw new Error(
      "trusted_loopback requires an explicit loopback gateway",
    );
  }
  if (host === "127.0.0.1") return host;
  if (
    host === "0.0.0.0" &&
    reviewerAuthMode === "trusted_loopback" &&
    trustedLoopbackGateway === "true"
  ) {
    return host;
  }
  if (host === "0.0.0.0") {
    throw new Error(
      "0.0.0.0 requires trusted_loopback and an explicit loopback gateway",
    );
  }
  throw new Error("PA_API_LISTEN_HOST must be 127.0.0.1 or 0.0.0.0");
}

function parsePort(name: string, value: string): number {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer from 1 through 65535`);
  }
  return port;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startCaseApiServerV1();
  console.log(server.reviewerUrl ?? server.url);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void server.close().finally(() => {
        process.exitCode = 0;
      });
    });
  }
}
