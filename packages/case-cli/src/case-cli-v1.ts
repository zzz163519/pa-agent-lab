import { parseArgs } from "node:util";

import { persistAnonymousChartArtifacts } from "@pa-agent-lab/chart-renderer";

import { createPhase2SyntheticFixtureV1 } from "./synthetic-fixture-v1.ts";

export interface CaseCliOptionsV1 {
  readonly argv: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
  readonly fetchImpl?: typeof fetch;
}

export async function runCaseCliV1(options: CaseCliOptionsV1): Promise<number> {
  try {
    const parsed = parseArgs({
      args: [...options.argv],
      allowPositionals: true,
      strict: true,
      options: {
        "api-url": { type: "string", default: "http://127.0.0.1:3210" },
        "artifact-root": { type: "string" },
      },
    });
    const command = parsed.positionals[0];
    const apiUrl = validateLocalApiUrl(parsed.values["api-url"]!);
    const token = options.env.PA_API_TOKEN;
    if (token === undefined || token.length < 32) {
      throw new Error("PA_API_TOKEN must contain the per-launch local token");
    }
    const request = createRequest(apiUrl, token, options.fetchImpl ?? fetch);

    if (command === "seed-synthetic") {
      const artifactRoot =
        parsed.values["artifact-root"] ?? options.env.PA_CHART_ARTIFACT_ROOT;
      if (artifactRoot === undefined || artifactRoot.trim().length === 0) {
        throw new Error(
          "seed-synthetic requires --artifact-root or PA_CHART_ARTIFACT_ROOT",
        );
      }
      const fixture = createPhase2SyntheticFixtureV1();
      await persistAnonymousChartArtifacts(fixture.charts, artifactRoot);
      await request("POST", "/v1/synthetic-case-bundles", fixture.caseBundle);
      await request("POST", "/v1/brooks-decisions", fixture.decision);
      await request("POST", "/v1/calvin-reviews", fixture.review);
      const audit = asRecord(
        await request(
          "GET",
          `/v1/cases/${fixture.caseBundle.policyCase.caseHash}/audit`,
        ),
      );
      const conflict = asRecord(audit.decisionConflict);
      const conflictKinds = conflict.kinds;
      if (!Array.isArray(conflictKinds)) {
        throw new Error("Case audit response is missing conflict kinds");
      }
      options.stdout(
        JSON.stringify({
          caseHash: fixture.caseBundle.policyCase.caseHash,
          decisionHash: fixture.decision.decisionHash,
          reviewHash: fixture.review.reviewHash,
          conflictKinds,
        }),
      );
      return 0;
    }

    if (command === "get-audit" || command === "get-case") {
      const caseHash = parsed.positionals[1];
      if (caseHash === undefined || !/^sha256:[0-9a-f]{64}$/.test(caseHash)) {
        throw new Error(`${command} requires one Case SHA-256 identity`);
      }
      const suffix = command === "get-audit" ? "/audit" : "";
      const value = await request("GET", `/v1/cases/${caseHash}${suffix}`);
      options.stdout(JSON.stringify(value));
      return 0;
    }

    throw new Error("command must be seed-synthetic, get-case, or get-audit");
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function createRequest(
  apiUrl: URL,
  token: string,
  fetchImpl: typeof fetch,
) {
  return async (
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<unknown> => {
    const response = await fetchImpl(new URL(path, apiUrl), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value = (await response.json()) as unknown;
    if (!response.ok) {
      const record = asRecord(value);
      throw new Error(
        typeof record.message === "string"
          ? record.message
          : `local API returned HTTP ${response.status}`,
      );
    }
    return value;
  };
}

function validateLocalApiUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Phase 2 CLI api-url must be local loopback HTTP");
  }
  return url;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("local API response must be a JSON object");
  }
  return value as Record<string, unknown>;
}
