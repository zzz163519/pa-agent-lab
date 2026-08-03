import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

import { createPostgresCaseStoreV1 } from "@pa-agent-lab/case-store";
import type { ContractSha256 } from "@pa-agent-lab/contracts";

import { createCaseApiV1 } from "./case-api-v1.ts";

export interface StartedCaseApiServerV1 {
  readonly url: string;
  readonly reviewerUrl: string | null;
  close(): Promise<void>;
}

export async function startCaseApiServerV1(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<StartedCaseApiServerV1> {
  const databaseUrl = required(env, "PA_DATABASE_URL");
  const artifactRoot = required(env, "PA_CHART_ARTIFACT_ROOT");
  const localToken = required(env, "PA_API_TOKEN");
  const reviewerToken = randomBytes(32).toString("hex");
  const consoleRoot = env.PA_CONSOLE_ROOT;
  const authorizedSyntheticBundleHashes = parseHashes(
    required(env, "PA_AUTHORIZED_SYNTHETIC_BUNDLE_HASHES"),
  );
  const authorizedDoctrineProposalHashes = parseOptionalHashes(
    env.PA_AUTHORIZED_DOCTRINE_PROPOSAL_HASHES,
  );
  const port = parsePort(env.PA_API_PORT ?? "3210");
  const database = createPostgresCaseStoreV1({ connectionString: databaseUrl });
  try {
    const app = await createCaseApiV1({
      store: database.store,
      artifactRoot,
      localToken,
      reviewerToken,
      authorizedSyntheticBundleHashes,
      authorizedDoctrineProposalHashes,
      allowedHosts: ["127.0.0.1", "localhost"],
      allowedOrigins: [
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
      ],
      ...(consoleRoot === undefined ? {} : { consoleRoot }),
    });
    const url = await app.listen({ host: "127.0.0.1", port });
    return {
      url,
      reviewerUrl:
        consoleRoot === undefined
          ? null
          : `${url}/console/#token=${reviewerToken}`,
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

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PA_API_PORT must be an integer from 1 through 65535");
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
