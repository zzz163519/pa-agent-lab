import type { AnonymousChartBundleV1 } from "@pa-agent-lab/chart-renderer";
import {
  ANONYMOUS_CHART_HEIGHT_PX,
  ANONYMOUS_CHART_RENDERER_ID,
  ANONYMOUS_CHART_RENDERER_PLATFORM,
  ANONYMOUS_CHART_RENDERER_RUNTIME,
  ANONYMOUS_CHART_WIDTH_PX,
  assertAnonymousChartArtifact,
  assertAnonymousChartBundle,
} from "@pa-agent-lab/chart-renderer";
import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "@pa-agent-lab/contracts";

export const ANONYMOUS_CHART_ARTIFACT_METADATA_SCHEMA_VERSION =
  "anonymous-chart-artifact-metadata.v1" as const;

export interface AnonymousChartArtifactMetadataV1 {
  readonly schemaVersion: typeof ANONYMOUS_CHART_ARTIFACT_METADATA_SCHEMA_VERSION;
  readonly metadataId: ContractSha256;
  readonly artifactId: ContractSha256;
  readonly sourceCaseHash: ContractSha256;
  readonly anonymousMarketHash: ContractSha256;
  readonly rendererId: typeof ANONYMOUS_CHART_RENDERER_ID;
  readonly rendererRuntime: typeof ANONYMOUS_CHART_RENDERER_RUNTIME;
  readonly rendererPlatform: typeof ANONYMOUS_CHART_RENDERER_PLATFORM;
  readonly panel: "context" | "detail";
  readonly mediaType: "image/png";
  readonly widthPx: typeof ANONYMOUS_CHART_WIDTH_PX;
  readonly heightPx: typeof ANONYMOUS_CHART_HEIGHT_PX;
  readonly renderInputHash: ContractSha256;
  readonly contentHash: ContractSha256;
  readonly byteLength: number;
  readonly barIds: readonly string[];
  readonly lastVisibleBarId: string;
}

export class PersistenceContractError extends Error {
  override readonly name = "PersistenceContractError";
}

export function createAnonymousChartArtifactMetadata(
  bundle: AnonymousChartBundleV1,
  panel: "context" | "detail",
): AnonymousChartArtifactMetadataV1 {
  try {
    assertAnonymousChartBundle(bundle);
    const artifact = bundle[panel];
    assertAnonymousChartArtifact(artifact);
    return deepFreeze({
      schemaVersion: ANONYMOUS_CHART_ARTIFACT_METADATA_SCHEMA_VERSION,
      metadataId: canonicalHash({
        sourceCaseHash: bundle.sourceCaseHash,
        anonymousMarketHash: bundle.anonymousMarketHash,
        artifactId: artifact.artifactId,
      }),
      artifactId: artifact.artifactId,
      sourceCaseHash: bundle.sourceCaseHash,
      anonymousMarketHash: bundle.anonymousMarketHash,
      rendererId: artifact.rendererId,
      rendererRuntime: artifact.rendererRuntime,
      rendererPlatform: artifact.rendererPlatform,
      panel: artifact.panel,
      mediaType: artifact.mediaType,
      widthPx: artifact.widthPx,
      heightPx: artifact.heightPx,
      renderInputHash: artifact.renderInputHash,
      contentHash: artifact.contentHash,
      byteLength: artifact.byteLength,
      barIds: [...artifact.barIds],
      lastVisibleBarId: artifact.lastVisibleBarId,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousChartArtifactMetadataIntegrity(
  value: unknown,
): asserts value is AnonymousChartArtifactMetadataV1 {
  try {
    const record = exactRecord("chart artifact metadata", value, [
      "schemaVersion",
      "metadataId",
      "artifactId",
      "sourceCaseHash",
      "anonymousMarketHash",
      "rendererId",
      "rendererRuntime",
      "rendererPlatform",
      "panel",
      "mediaType",
      "widthPx",
      "heightPx",
      "renderInputHash",
      "contentHash",
      "byteLength",
      "barIds",
      "lastVisibleBarId",
    ]);
    if (
      record.schemaVersion !==
      ANONYMOUS_CHART_ARTIFACT_METADATA_SCHEMA_VERSION
    ) {
      fail("chart artifact metadata schemaVersion is unsupported");
    }
    for (const field of [
      "metadataId",
      "artifactId",
      "sourceCaseHash",
      "anonymousMarketHash",
      "renderInputHash",
      "contentHash",
    ] as const) {
      if (typeof record[field] !== "string") {
        fail(`${field} must be a SHA-256 string`);
      }
      assertSha256(field, record[field]);
    }
    for (const field of [
      "rendererId",
      "rendererRuntime",
      "rendererPlatform",
      "lastVisibleBarId",
    ] as const) {
      if (typeof record[field] !== "string") fail(`${field} must be a string`);
      assertNonEmpty(field, record[field]);
    }
    if (typeof record.panel !== "string") fail("panel must be a string");
    assertOneOf("panel", record.panel, ["context", "detail"] as const);
    if (record.mediaType !== "image/png") {
      fail("chart artifact metadata mediaType must be image/png");
    }
    for (const field of ["widthPx", "heightPx", "byteLength"] as const) {
      if (
        typeof record[field] !== "number" ||
        !Number.isSafeInteger(record[field]) ||
        record[field] <= 0
      ) {
        fail(`${field} must be a positive safe integer`);
      }
    }
    const barIdsValue = record.barIds;
    if (!Array.isArray(barIdsValue) || barIdsValue.length < 40) {
      fail("barIds must contain at least 40 anonymous IDs");
    }
    if (record.panel === "detail" && barIdsValue.length !== 40) {
      fail("detail chart metadata requires exactly 40 barIds");
    }
    if (record.panel === "context" && barIdsValue.length > 120) {
      fail("context chart metadata accepts at most 120 barIds");
    }
    let previousSequence: number | undefined;
    const barIds = barIdsValue.map((barId) => {
      if (typeof barId !== "string") {
        fail("barIds must be ordered anonymous relative IDs");
      }
      const match = /^bar:([0-9]{3})$/.exec(barId);
      const sequence = match === null ? Number.NaN : Number(match[1]);
      if (
        !Number.isSafeInteger(sequence) ||
        (previousSequence !== undefined && sequence !== previousSequence + 1)
      ) {
        fail("barIds must be ordered anonymous relative IDs");
      }
      previousSequence = sequence;
      return barId;
    });
    if (record.lastVisibleBarId !== barIds.at(-1)) {
      fail("lastVisibleBarId must identify the final anonymous bar");
    }
    if (record.rendererId !== ANONYMOUS_CHART_RENDERER_ID) {
      fail("rendererId is unsupported");
    }
    if (record.rendererRuntime !== ANONYMOUS_CHART_RENDERER_RUNTIME) {
      fail("rendererRuntime is unsupported");
    }
    if (record.rendererPlatform !== ANONYMOUS_CHART_RENDERER_PLATFORM) {
      fail("rendererPlatform is unsupported");
    }
    if (
      record.widthPx !== ANONYMOUS_CHART_WIDTH_PX ||
      record.heightPx !== ANONYMOUS_CHART_HEIGHT_PX
    ) {
      fail("chart artifact metadata dimensions are unsupported");
    }
    if (record.panel === "context" && barIds[0] !== "bar:000") {
      fail("context chart metadata must begin with bar:000");
    }
    const expectedMetadataId = canonicalHash({
      sourceCaseHash: record.sourceCaseHash,
      anonymousMarketHash: record.anonymousMarketHash,
      artifactId: record.artifactId,
    });
    if (record.metadataId !== expectedMetadataId) {
      fail("chart artifact metadata metadataId does not match its binding");
    }
    const expectedArtifactId = canonicalHash({
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      panel: record.panel,
      mediaType: record.mediaType,
      widthPx: record.widthPx,
      heightPx: record.heightPx,
      renderInputHash: record.renderInputHash,
      contentHash: record.contentHash,
      byteLength: record.byteLength,
      barIds,
      lastVisibleBarId: record.lastVisibleBarId,
    });
    if (record.artifactId !== expectedArtifactId) {
      fail("chart artifact metadata artifactId does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

function exactRecord(
  name: string,
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  const keys = Object.getOwnPropertyNames(record);
  const unknownKey = keys.find((key) => !allowedKeys.includes(key));
  const missingKey = allowedKeys.find((key) => !Object.hasOwn(record, key));
  if (unknownKey !== undefined) fail(`${name} contains unknown field: ${unknownKey}`);
  if (missingKey !== undefined) fail(`${name} is missing field: ${missingKey}`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${name} fields must be enumerable data properties`);
    }
  }
  return record;
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  if (error instanceof Error) throw new PersistenceContractError(error.message);
  throw new PersistenceContractError("chart artifact metadata validation failed");
}
