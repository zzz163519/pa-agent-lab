import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  ANONYMOUS_CHART_HEIGHT_PX,
  ANONYMOUS_CHART_WIDTH_PX,
  persistAnonymousChartArtifacts,
} from "@pa-agent-lab/chart-renderer";
import { assertCaseAuditViewIntegrity } from "@pa-agent-lab/persistence-contracts";

import { createPhase3bPilotDoctrineProposalsV1 } from "./doctrine-pilot-v1.ts";
import { createPhase2SyntheticFixtureV1 } from "./synthetic-fixture-v1.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_CHART_DOWNLOAD_BYTES = 4 * 1024 * 1024;

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
        output: { type: "string" },
        reason: { type: "string" },
      },
    });
    const command = parsed.positionals[0];
    const apiUrl = validateLocalApiUrl(parsed.values["api-url"]!);
    const token = options.env.PA_API_TOKEN;
    if (token === undefined || token.length < 32) {
      throw new Error("PA_API_TOKEN must contain the per-launch local token");
    }
    const request = createRequest(apiUrl, token, options.fetchImpl ?? fetch);
    const fetchImpl = options.fetchImpl ?? fetch;

    if (command === "seed-doctrine-pilot") {
      const proposals = createPhase3bPilotDoctrineProposalsV1();
      const statuses = [];
      for (const proposal of proposals) {
        statuses.push({
          doctrineId: proposal.doctrineUnit.doctrineId,
          proposalHash: proposal.proposalHash,
          status: mutationStatus(
            await request("POST", "/v1/doctrine/proposals", proposal),
          ),
        });
      }
      options.stdout(
        JSON.stringify({
          proposalCount: proposals.length,
          approvedCount: 0,
          proposals: statuses,
        }),
      );
      return 0;
    }

    if (command === "inspect-doctrine") {
      const doctrineId = requiredDoctrineId(command, parsed.positionals[1]);
      const value = await request(
        "GET",
        `/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}`,
      );
      options.stdout(JSON.stringify(value));
      return 0;
    }

    if (command === "approve-doctrine") {
      const doctrineId = requiredDoctrineId(command, parsed.positionals[1]);
      const proposalHash = requiredSha256(
        "approve-doctrine requires one proposal SHA-256 identity",
        parsed.positionals[2],
      );
      const value = await request(
        "POST",
        `/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}/approve`,
        { proposalHash },
      );
      options.stdout(JSON.stringify(value));
      return 0;
    }

    if (command === "retire-doctrine") {
      const doctrineId = requiredDoctrineId(command, parsed.positionals[1]);
      const approvalHash = requiredSha256(
        "retire-doctrine requires one approval SHA-256 identity",
        parsed.positionals[2],
      );
      const reason = parsed.values.reason;
      if (reason === undefined || reason.trim().length === 0) {
        throw new Error("retire-doctrine requires --reason <text>");
      }
      const value = await request(
        "POST",
        `/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}/retire`,
        { approvalHash, reason },
      );
      options.stdout(JSON.stringify(value));
      return 0;
    }

    if (command === "seed-review-work-item") {
      const artifactRoot =
        parsed.values["artifact-root"] ?? options.env.PA_CHART_ARTIFACT_ROOT;
      if (artifactRoot === undefined || artifactRoot.trim().length === 0) {
        throw new Error(
          "seed-review-work-item requires --artifact-root or PA_CHART_ARTIFACT_ROOT",
        );
      }
      const fixture = createPhase2SyntheticFixtureV1();
      await persistAnonymousChartArtifacts(fixture.charts, artifactRoot);
      const caseBundleStatus = mutationStatus(
        await request("POST", "/v1/synthetic-case-bundles", fixture.caseBundle),
      );
      const brooksDecisionStatus = mutationStatus(
        await request("POST", "/v1/brooks-decisions", fixture.decision),
      );
      options.stdout(
        JSON.stringify({
          caseHash: fixture.caseBundle.policyCase.caseHash,
          decisionHash: fixture.decision.decisionHash,
          reviewState: "awaiting_assessment",
          mutations: {
            caseBundle: caseBundleStatus,
            brooksDecision: brooksDecisionStatus,
          },
          chartArtifacts: {
            context: {
              artifactId: fixture.caseBundle.chartMetadata.context.artifactId,
              contentHash: fixture.caseBundle.chartMetadata.context.contentHash,
            },
            detail: {
              artifactId: fixture.caseBundle.chartMetadata.detail.artifactId,
              contentHash: fixture.caseBundle.chartMetadata.detail.contentHash,
            },
          },
        }),
      );
      return 0;
    }

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
      const caseBundleStatus = mutationStatus(
        await request("POST", "/v1/synthetic-case-bundles", fixture.caseBundle),
      );
      const brooksDecisionStatus = mutationStatus(
        await request("POST", "/v1/brooks-decisions", fixture.decision),
      );
      const calvinReviewStatus = mutationStatus(
        await request("POST", "/v1/calvin-reviews", fixture.review),
      );
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
          mutations: {
            caseBundle: caseBundleStatus,
            brooksDecision: brooksDecisionStatus,
            calvinReview: calvinReviewStatus,
          },
          chartArtifacts: {
            context: {
              artifactId: fixture.caseBundle.chartMetadata.context.artifactId,
              contentHash: fixture.caseBundle.chartMetadata.context.contentHash,
            },
            detail: {
              artifactId: fixture.caseBundle.chartMetadata.detail.artifactId,
              contentHash: fixture.caseBundle.chartMetadata.detail.contentHash,
            },
          },
        }),
      );
      return 0;
    }

    if (command === "get-chart") {
      const artifactId = requiredSha256(
        "get-chart requires one chart artifact SHA-256 identity",
        parsed.positionals[1],
      );
      const output = parsed.values.output;
      if (output === undefined || output.trim().length === 0) {
        throw new Error("get-chart requires --output <path>");
      }
      const downloaded = await downloadChart(
        apiUrl,
        token,
        artifactId,
        fetchImpl,
      );
      const outputPath = resolve(output);
      try {
        await writeFile(outputPath, downloaded.bytes, { flag: "wx" });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          throw new Error(`output file already exists: ${outputPath}`);
        }
        throw error;
      }
      options.stdout(
        JSON.stringify({
          artifactId,
          outputPath,
          byteLength: downloaded.bytes.length,
          contentHash: downloaded.contentHash,
          widthPx: downloaded.widthPx,
          heightPx: downloaded.heightPx,
        }),
      );
      return 0;
    }

    if (command === "inspect-case") {
      const caseHash = requiredCaseHash(command, parsed.positionals[1]);
      const audit = await request("GET", `/v1/cases/${caseHash}/audit`);
      assertCaseAuditViewIntegrity(audit);
      options.stdout(
        JSON.stringify({
          caseHash: audit.caseHash,
          caseId: audit.caseBundle.policyCase.caseId,
          sourceScope: audit.caseBundle.sourceScope,
          inputHash: audit.caseBundle.policyInput.inputHash,
          barCount: audit.caseBundle.policyCase.bars.length,
          barDurationSeconds: audit.caseBundle.policyCase.barDurationSeconds,
          lastVisibleBarId: audit.caseBundle.policyCase.lastVisibleBarId,
          auditHash: audit.auditHash,
          decision:
            audit.decision === null
              ? null
              : {
                  decisionHash: audit.decision.decisionHash,
                  verdict: audit.decision.verdict,
                },
          review:
            audit.review === null
              ? null
              : {
                  reviewHash: audit.review.reviewHash,
                  disposition: audit.review.disposition,
                },
          conflict:
            audit.decisionConflict === null
              ? null
              : {
                  kinds: audit.decisionConflict.kinds,
                  status: audit.decisionConflict.status,
                },
          chartArtifacts: {
            context: chartSummary(audit.caseBundle.chartMetadata.context),
            detail: chartSummary(audit.caseBundle.chartMetadata.detail),
          },
        }),
      );
      return 0;
    }

    if (command === "get-audit" || command === "get-case") {
      const caseHash = requiredCaseHash(command, parsed.positionals[1]);
      const suffix = command === "get-audit" ? "/audit" : "";
      const value = await request("GET", `/v1/cases/${caseHash}${suffix}`);
      options.stdout(JSON.stringify(value));
      return 0;
    }

    throw new Error(
      "command must be seed-doctrine-pilot, inspect-doctrine, approve-doctrine, retire-doctrine, seed-review-work-item, seed-synthetic, inspect-case, get-chart, get-case, or get-audit",
    );
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
      redirect: "error",
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

function requiredDoctrineId(command: string, value: string | undefined): string {
  if (
    value === undefined ||
    value.length === 0 ||
    value.length > 200 ||
    !/^du:[a-z0-9][a-z0-9:_-]*$/.test(value)
  ) {
    throw new Error(`${command} requires one Doctrine ID`);
  }
  return value;
}

function requiredCaseHash(command: string, value: string | undefined): string {
  return requiredSha256(
    `${command} requires one Case SHA-256 identity`,
    value,
  );
}

function requiredSha256(message: string, value: string | undefined): string {
  if (value === undefined || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new Error(message);
  }
  return value;
}

interface DownloadedChartV1 {
  readonly bytes: Buffer;
  readonly contentHash: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

async function downloadChart(
  apiUrl: URL,
  token: string,
  artifactId: string,
  fetchImpl: typeof fetch,
): Promise<DownloadedChartV1> {
  const response = await fetchImpl(
    new URL(`/v1/chart-artifacts/${artifactId}/content`, apiUrl),
    {
      method: "GET",
      redirect: "error",
      headers: { authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response));
  }
  if (response.headers.get("content-type")?.split(";", 1)[0] !== "image/png") {
    throw new Error("chart response content-type must be image/png");
  }
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) ||
      Number(declaredLength) > MAX_CHART_DOWNLOAD_BYTES)
  ) {
    throw new Error("chart response exceeds the local CLI byte limit");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_CHART_DOWNLOAD_BYTES) {
    throw new Error("chart response exceeds the local CLI byte limit");
  }
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE) ||
    bytes.readUInt32BE(16) !== ANONYMOUS_CHART_WIDTH_PX ||
    bytes.readUInt32BE(20) !== ANONYMOUS_CHART_HEIGHT_PX
  ) {
    throw new Error("chart response is not a valid Phase 2 anonymous PNG");
  }
  return {
    bytes,
    contentHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    widthPx: ANONYMOUS_CHART_WIDTH_PX,
    heightPx: ANONYMOUS_CHART_HEIGHT_PX,
  };
}

async function responseErrorMessage(response: Response): Promise<string> {
  try {
    const record = asRecord(await response.json());
    if (typeof record.message === "string") return record.message;
  } catch {
    // Fall through to the bounded status message.
  }
  return `local API returned HTTP ${response.status}`;
}

function chartSummary(metadata: {
  readonly artifactId: string;
  readonly contentHash: string;
  readonly widthPx: number;
  readonly heightPx: number;
}) {
  return {
    artifactId: metadata.artifactId,
    contentHash: metadata.contentHash,
    widthPx: metadata.widthPx,
    heightPx: metadata.heightPx,
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

function mutationStatus(value: unknown): "inserted" | "existing" {
  const record = asRecord(value);
  if (record.status !== "inserted" && record.status !== "existing") {
    throw new Error("local API mutation response is missing its status");
  }
  return record.status;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("local API response must be a JSON object");
  }
  return value as Record<string, unknown>;
}
