import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import {
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "@pa-agent-lab/contracts/contract-utils-v1";
import { FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS } from "@pa-agent-lab/contracts/model-call-schedule-v1";
import {
  BAR_CONTINUITY_STATES,
  BROOKS_CONTEXT_BAR_COUNT,
  BROOKS_DETAIL_BAR_COUNT,
  NORMALIZED_FIRST_VISIBLE_CLOSE,
  createAnonymousMarketInput,
  type AnonymousChartManifestV1,
  type AnonymousMarketInputV1,
  type BrooksPolicyCaseV1,
  type NormalizedClosedBarV1,
} from "@pa-agent-lab/contracts/policy-input-v1";

export const ANONYMOUS_CHART_ARTIFACT_SCHEMA_VERSION =
  "anonymous-chart-artifact.v1" as const;
export const ANONYMOUS_CHART_BUNDLE_SCHEMA_VERSION =
  "anonymous-chart-bundle.v1" as const;
export const ANONYMOUS_CHART_STORAGE_SCHEMA_VERSION =
  "anonymous-chart-storage.v1" as const;
export const ANONYMOUS_CHART_RENDERER_ID =
  "pa-candlestick-svg-resvg.v1" as const;
export const ANONYMOUS_CHART_RENDERER_RUNTIME =
  "@resvg/resvg-js@2.6.2" as const;
export const ANONYMOUS_CHART_RENDERER_PLATFORM =
  "@resvg/resvg-js-linux-x64-gnu@2.6.2" as const;
export const ANONYMOUS_CHART_WIDTH_PX = 1200 as const;
export const ANONYMOUS_CHART_HEIGHT_PX = 720 as const;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BACKGROUND = "#f7f8fa";
const PLOT_BACKGROUND = "#ffffff";
const GRID = "#d9dee7";
const BORDER = "#8894a5";
const UP = "#087f5b";
const DOWN = "#c43d4b";
const DOJI = "#58677a";
const SESSION_BOUNDARY = "#6d4cc2";
const MISSING_DATA = "#b05b16";
const UNKNOWN_CONTINUITY = "#64748b";

export interface AnonymousChartArtifactV1 {
  readonly schemaVersion: typeof ANONYMOUS_CHART_ARTIFACT_SCHEMA_VERSION;
  readonly artifactId: ContractSha256;
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
  readonly bars: readonly Readonly<NormalizedClosedBarV1>[];
  readonly barIds: readonly string[];
  readonly lastVisibleBarId: string;
  readonly pngBase64: string;
}

export interface AnonymousChartBundleV1 {
  readonly schemaVersion: typeof ANONYMOUS_CHART_BUNDLE_SCHEMA_VERSION;
  readonly bundleId: ContractSha256;
  readonly rendererId: typeof ANONYMOUS_CHART_RENDERER_ID;
  readonly rendererRuntime: typeof ANONYMOUS_CHART_RENDERER_RUNTIME;
  readonly rendererPlatform: typeof ANONYMOUS_CHART_RENDERER_PLATFORM;
  readonly sourceCaseHash: ContractSha256;
  readonly anonymousMarketHash: ContractSha256;
  readonly context: Readonly<AnonymousChartArtifactV1>;
  readonly detail: Readonly<AnonymousChartArtifactV1>;
}

export interface PersistedAnonymousChartBundleV1 {
  readonly schemaVersion: typeof ANONYMOUS_CHART_STORAGE_SCHEMA_VERSION;
  readonly bundleId: ContractSha256;
  readonly rootDirectory: string;
  readonly contextPath: string;
  readonly detailPath: string;
}

export class AnonymousChartRendererError extends Error {
  override readonly name = "AnonymousChartRendererError";
}

export function renderAnonymousPolicyCharts(
  policyCase: BrooksPolicyCaseV1,
): AnonymousChartBundleV1 {
  try {
    assertPinnedRendererPlatform();
    const market = createAnonymousMarketInput(policyCase);
    const context = renderArtifact("context", market.bars);
    const detail = renderArtifact(
      "detail",
      market.bars.slice(-BROOKS_DETAIL_BAR_COUNT),
    );
    const identity = {
      rendererId: ANONYMOUS_CHART_RENDERER_ID,
      rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
      rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
      sourceCaseHash: policyCase.caseHash,
      anonymousMarketHash: canonicalHash(market),
      contextArtifactId: context.artifactId,
      detailArtifactId: detail.artifactId,
    } as const;
    const bundle = deepFreeze({
      schemaVersion: ANONYMOUS_CHART_BUNDLE_SCHEMA_VERSION,
      bundleId: canonicalHash(identity),
      rendererId: ANONYMOUS_CHART_RENDERER_ID,
      rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
      rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
      sourceCaseHash: policyCase.caseHash,
      anonymousMarketHash: identity.anonymousMarketHash,
      context,
      detail,
    });
    assertAnonymousChartBundle(bundle);
    return bundle;
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousChartArtifact(
  value: unknown,
): asserts value is AnonymousChartArtifactV1 {
  try {
    const record = exactRecord("chart artifact", value, [
      "schemaVersion",
      "artifactId",
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
      "bars",
      "barIds",
      "lastVisibleBarId",
      "pngBase64",
    ]);
    if (record.schemaVersion !== ANONYMOUS_CHART_ARTIFACT_SCHEMA_VERSION) {
      fail("chart artifact schemaVersion is unsupported");
    }
    if (record.rendererId !== ANONYMOUS_CHART_RENDERER_ID) {
      fail("chart artifact rendererId is unsupported");
    }
    if (record.rendererRuntime !== ANONYMOUS_CHART_RENDERER_RUNTIME) {
      fail("chart artifact rendererRuntime is unsupported");
    }
    if (record.rendererPlatform !== assertPinnedRendererPlatform()) {
      fail("chart artifact rendererPlatform is unsupported");
    }
    if (record.panel !== "context" && record.panel !== "detail") {
      fail("chart artifact panel is unsupported");
    }
    if (record.mediaType !== "image/png") {
      fail("chart artifact mediaType must be image/png");
    }
    if (
      record.widthPx !== ANONYMOUS_CHART_WIDTH_PX ||
      record.heightPx !== ANONYMOUS_CHART_HEIGHT_PX
    ) {
      fail("chart artifact dimensions are invalid");
    }
    assertSha256Value("artifactId", record.artifactId);
    assertSha256Value("renderInputHash", record.renderInputHash);
    assertSha256Value("contentHash", record.contentHash);
    assertPositiveInteger("byteLength", record.byteLength);
    const bars = validateArtifactBars(record.bars, record.panel);
    const barIds = plainStringArray("barIds", record.barIds);
    const expectedCount =
      record.panel === "detail" ? BROOKS_DETAIL_BAR_COUNT : undefined;
    if (
      expectedCount !== undefined &&
      barIds.length !== BROOKS_DETAIL_BAR_COUNT
    ) {
      fail("detail chart artifact requires exactly 40 bars");
    }
    if (
      record.panel === "context" &&
      (barIds.length < BROOKS_DETAIL_BAR_COUNT ||
        barIds.length > BROOKS_CONTEXT_BAR_COUNT)
    ) {
      fail("context chart artifact requires between 40 and 120 bars");
    }
    validateAnonymousBarIds(barIds);
    if (!sameStrings(barIds, bars.map((bar) => bar.barId))) {
      fail("chart artifact barIds do not match its normalized bars");
    }
    assertNonEmptyString("lastVisibleBarId", record.lastVisibleBarId);
    if (record.lastVisibleBarId !== barIds.at(-1)) {
      fail("chart artifact lastVisibleBarId must equal its final bar");
    }
    assertNonEmptyString("pngBase64", record.pngBase64);
    const pngBytes = decodeCanonicalBase64(record.pngBase64);
    if (pngBytes.length !== record.byteLength) {
      fail("chart artifact byteLength does not match PNG bytes");
    }
    if (sha256Bytes(pngBytes) !== record.contentHash) {
      fail("chart artifact contentHash does not match PNG bytes");
    }
    validatePng(pngBytes, record.widthPx, record.heightPx);
    const expectedRenderInputHash = canonicalHash({
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      panel: record.panel,
      widthPx: record.widthPx,
      heightPx: record.heightPx,
      bars,
    });
    if (record.renderInputHash !== expectedRenderInputHash) {
      fail("chart artifact renderInputHash does not match its normalized bars");
    }
    const expectedPng = rasterizeCandlestickSvg(createCandlestickSvg(bars));
    if (!pngBytes.equals(expectedPng)) {
      fail("chart artifact PNG is not the pinned renderer output for its bars");
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
      fail("chart artifact artifactId does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousChartBundle(
  value: unknown,
): asserts value is AnonymousChartBundleV1 {
  try {
    const record = exactRecord("chart bundle", value, [
      "schemaVersion",
      "bundleId",
      "rendererId",
      "rendererRuntime",
      "rendererPlatform",
      "sourceCaseHash",
      "anonymousMarketHash",
      "context",
      "detail",
    ]);
    if (record.schemaVersion !== ANONYMOUS_CHART_BUNDLE_SCHEMA_VERSION) {
      fail("chart bundle schemaVersion is unsupported");
    }
    if (
      record.rendererId !== ANONYMOUS_CHART_RENDERER_ID ||
      record.rendererRuntime !== ANONYMOUS_CHART_RENDERER_RUNTIME ||
      record.rendererPlatform !== assertPinnedRendererPlatform()
    ) {
      fail("chart bundle renderer identity is unsupported");
    }
    assertSha256Value("bundleId", record.bundleId);
    assertSha256Value("sourceCaseHash", record.sourceCaseHash);
    assertSha256Value("anonymousMarketHash", record.anonymousMarketHash);
    assertAnonymousChartArtifact(record.context);
    assertAnonymousChartArtifact(record.detail);
    const context = record.context;
    const detail = record.detail;
    if (context.panel !== "context" || detail.panel !== "detail") {
      fail("chart bundle panels are inconsistent");
    }
    if (
      context.lastVisibleBarId !== detail.lastVisibleBarId ||
      !sameStrings(
        detail.barIds,
        context.barIds.slice(-BROOKS_DETAIL_BAR_COUNT),
      )
    ) {
      fail("chart bundle detail must repeat the final 40 context bars");
    }
    const expectedMarket: AnonymousMarketInputV1 = {
      barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
      lastVisibleBarId: context.lastVisibleBarId,
      visibleBarCount: context.bars.length,
      isLeftCensored: context.bars.length < BROOKS_CONTEXT_BAR_COUNT,
      leftCensoredBarsMissing:
        BROOKS_CONTEXT_BAR_COUNT - context.bars.length,
      normalization: {
        method: "first_visible_close_equals_100",
        base: NORMALIZED_FIRST_VISIBLE_CLOSE,
        anchorBarId: context.bars[0]!.barId,
      },
      bars: context.bars,
    };
    if (record.anonymousMarketHash !== canonicalHash(expectedMarket)) {
      fail("chart bundle anonymousMarketHash does not match context bars");
    }
    const expectedBundleId = canonicalHash({
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      sourceCaseHash: record.sourceCaseHash,
      anonymousMarketHash: record.anonymousMarketHash,
      contextArtifactId: context.artifactId,
      detailArtifactId: detail.artifactId,
    });
    if (record.bundleId !== expectedBundleId) {
      fail("chart bundle bundleId does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousChartBundleForCase(
  bundle: unknown,
  policyCase: BrooksPolicyCaseV1,
): asserts bundle is AnonymousChartBundleV1 {
  try {
    assertAnonymousChartBundle(bundle);
    const market = createAnonymousMarketInput(policyCase);
    if (bundle.sourceCaseHash !== policyCase.caseHash) {
      fail("chart bundle sourceCaseHash does not match the policy case");
    }
    if (bundle.anonymousMarketHash !== canonicalHash(market)) {
      fail("chart bundle anonymous market does not match the policy case");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function toAnonymousChartManifest(
  artifact: AnonymousChartArtifactV1,
): Readonly<AnonymousChartManifestV1> {
  assertAnonymousChartArtifact(artifact);
  return deepFreeze({
    panel: artifact.panel,
    mediaType: artifact.mediaType,
    contentHash: artifact.contentHash,
    barIds: [...artifact.barIds],
    lastVisibleBarId: artifact.lastVisibleBarId,
  });
}

export async function persistAnonymousChartArtifacts(
  bundle: AnonymousChartBundleV1,
  rootDirectory: string,
): Promise<PersistedAnonymousChartBundleV1> {
  try {
    assertAnonymousChartBundle(bundle);
    if (rootDirectory.trim().length === 0) {
      fail("chart artifact rootDirectory must not be empty");
    }
    const absoluteRoot = resolve(rootDirectory);
    await mkdir(absoluteRoot, { recursive: true, mode: 0o700 });
    const contextPath = await persistArtifact(bundle.context, absoluteRoot);
    const detailPath = await persistArtifact(bundle.detail, absoluteRoot);
    return deepFreeze({
      schemaVersion: ANONYMOUS_CHART_STORAGE_SCHEMA_VERSION,
      bundleId: bundle.bundleId,
      rootDirectory: absoluteRoot,
      contextPath,
      detailPath,
    });
  } catch (error) {
    rethrow(error);
  }
}

function renderArtifact(
  panel: "context" | "detail",
  bars: readonly Readonly<NormalizedClosedBarV1>[],
): AnonymousChartArtifactV1 {
  const barIds = bars.map((bar) => bar.barId);
  const lastVisibleBarId = barIds.at(-1);
  if (lastVisibleBarId === undefined) fail("chart renderer requires bars");
  const renderInput = {
    rendererId: ANONYMOUS_CHART_RENDERER_ID,
    rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
    rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
    panel,
    widthPx: ANONYMOUS_CHART_WIDTH_PX,
    heightPx: ANONYMOUS_CHART_HEIGHT_PX,
    bars,
  } as const;
  const renderInputHash = canonicalHash(renderInput);
  const pngBytes = rasterizeCandlestickSvg(createCandlestickSvg(bars));
  const contentHash = sha256Bytes(pngBytes);
  const metadata = {
    rendererId: ANONYMOUS_CHART_RENDERER_ID,
    rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
    rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
    panel,
    mediaType: "image/png" as const,
    widthPx: ANONYMOUS_CHART_WIDTH_PX,
    heightPx: ANONYMOUS_CHART_HEIGHT_PX,
    renderInputHash,
    contentHash,
    byteLength: pngBytes.length,
    barIds,
    lastVisibleBarId,
  } as const;
  const artifact = deepFreeze({
    schemaVersion: ANONYMOUS_CHART_ARTIFACT_SCHEMA_VERSION,
    artifactId: canonicalHash(metadata),
    ...metadata,
    bars: bars.map((bar) => ({ ...bar })),
    pngBase64: pngBytes.toString("base64"),
  });
  assertAnonymousChartArtifact(artifact);
  return artifact;
}

function rasterizeCandlestickSvg(svg: string): Buffer {
  const rendered = new Resvg(svg, {
    background: BACKGROUND,
    fitTo: { mode: "original" },
    font: { loadSystemFonts: false },
    shapeRendering: 2,
    textRendering: 0,
    imageRendering: 1,
    logLevel: "off",
  }).render();
  if (
    rendered.width !== ANONYMOUS_CHART_WIDTH_PX ||
    rendered.height !== ANONYMOUS_CHART_HEIGHT_PX
  ) {
    fail("resvg returned unexpected chart dimensions");
  }
  return rendered.asPng();
}

function createCandlestickSvg(
  bars: readonly Readonly<NormalizedClosedBarV1>[],
): string {
  const plot = { left: 24, top: 24, width: 1152, height: 672 } as const;
  const rawMinimum = Math.min(...bars.map((bar) => bar.low));
  const rawMaximum = Math.max(...bars.map((bar) => bar.high));
  const rawSpan = rawMaximum - rawMinimum;
  const span =
    rawSpan > 0 ? rawSpan : Math.max(Math.abs(rawMaximum) * 0.01, 1);
  const minimum = rawMinimum - span * 0.06;
  const maximum = rawMaximum + span * 0.06;
  const priceSpan = maximum - minimum;
  const slotWidth = plot.width / bars.length;
  const bodyWidth = Math.max(1.5, Math.min(slotWidth * 0.62, 18));
  const y = (price: number) =>
    plot.top + ((maximum - price) / priceSpan) * plot.height;
  const elements: string[] = [
    `<rect x="0" y="0" width="${ANONYMOUS_CHART_WIDTH_PX}" height="${ANONYMOUS_CHART_HEIGHT_PX}" fill="${BACKGROUND}"/>`,
    `<rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" fill="${PLOT_BACKGROUND}"/>`,
  ];

  for (let index = 0; index <= 8; index += 1) {
    const gridY = plot.top + (plot.height * index) / 8;
    elements.push(
      `<line x1="${fixed(plot.left)}" y1="${fixed(gridY)}" x2="${fixed(plot.left + plot.width)}" y2="${fixed(gridY)}" stroke="${GRID}" stroke-width="1"/>`,
    );
  }
  for (let index = 0; index <= 12; index += 1) {
    const gridX = plot.left + (plot.width * index) / 12;
    elements.push(
      `<line x1="${fixed(gridX)}" y1="${fixed(plot.top)}" x2="${fixed(gridX)}" y2="${fixed(plot.top + plot.height)}" stroke="${GRID}" stroke-width="1"/>`,
    );
  }

  bars.forEach((bar, index) => {
    if (index > 0 && bar.continuityFromPrevious !== "contiguous") {
      const boundaryX = plot.left + slotWidth * index;
      const style = continuityStyle(bar.continuityFromPrevious);
      elements.push(
        `<line x1="${fixed(boundaryX)}" y1="${fixed(plot.top)}" x2="${fixed(boundaryX)}" y2="${fixed(plot.top + plot.height)}" stroke="${style.color}" stroke-width="2" stroke-dasharray="${style.dash}"/>`,
      );
    }
    const centerX = plot.left + slotWidth * (index + 0.5);
    const color =
      bar.close > bar.open ? UP : bar.close < bar.open ? DOWN : DOJI;
    const highY = y(bar.high);
    const lowY = y(bar.low);
    const openY = y(bar.open);
    const closeY = y(bar.close);
    const naturalTop = Math.min(openY, closeY);
    const naturalHeight = Math.abs(closeY - openY);
    const bodyHeight = Math.max(1.5, naturalHeight);
    const bodyTop = naturalTop - (bodyHeight - naturalHeight) / 2;
    elements.push(
      `<line x1="${fixed(centerX)}" y1="${fixed(highY)}" x2="${fixed(centerX)}" y2="${fixed(lowY)}" stroke="${color}" stroke-width="1.5"/>`,
      `<rect x="${fixed(centerX - bodyWidth / 2)}" y="${fixed(bodyTop)}" width="${fixed(bodyWidth)}" height="${fixed(bodyHeight)}" fill="${color}"/>`,
    );
  });

  elements.push(
    `<rect x="${fixed(plot.left)}" y="${fixed(plot.top)}" width="${fixed(plot.width)}" height="${fixed(plot.height)}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANONYMOUS_CHART_WIDTH_PX}" height="${ANONYMOUS_CHART_HEIGHT_PX}" viewBox="0 0 ${ANONYMOUS_CHART_WIDTH_PX} ${ANONYMOUS_CHART_HEIGHT_PX}">${elements.join("")}</svg>`;
}

function continuityStyle(
  state: NormalizedClosedBarV1["continuityFromPrevious"],
): { readonly color: string; readonly dash: string } {
  switch (state) {
    case "session_boundary":
      return { color: SESSION_BOUNDARY, dash: "8 4" };
    case "missing_data":
      return { color: MISSING_DATA, dash: "4 3" };
    case "unknown":
      return { color: UNKNOWN_CONTINUITY, dash: "2 4" };
    case "contiguous":
      return { color: GRID, dash: "1 0" };
  }
}

async function persistArtifact(
  artifact: AnonymousChartArtifactV1,
  rootDirectory: string,
): Promise<string> {
  const filename = `${artifact.contentHash.slice("sha256:".length)}.png`;
  const path = resolve(rootDirectory, filename);
  const bytes = decodeCanonicalBase64(artifact.pngBase64);
  try {
    await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    const existing = await readFile(path);
    if (sha256Bytes(existing) !== artifact.contentHash) {
      fail("existing content-addressed chart artifact has invalid bytes");
    }
  }
  return path;
}

function validateArtifactBars(
  value: unknown,
  panel: unknown,
): readonly Readonly<NormalizedClosedBarV1>[] {
  const items = plainArray("bars", value);
  if (
    (panel === "detail" && items.length !== BROOKS_DETAIL_BAR_COUNT) ||
    (panel === "context" &&
      (items.length < BROOKS_DETAIL_BAR_COUNT ||
        items.length > BROOKS_CONTEXT_BAR_COUNT))
  ) {
    fail("chart artifact normalized bar count is invalid");
  }
  const bars = items.map((item, index) => {
    const record = exactRecord(`bars[${index}]`, item, [
      "barId",
      "sequence",
      "open",
      "high",
      "low",
      "close",
      "continuityFromPrevious",
    ]);
    assertNonEmptyString(`bars[${index}].barId`, record.barId);
    if (
      typeof record.sequence !== "number" ||
      !Number.isSafeInteger(record.sequence) ||
      record.sequence < 0
    ) {
      fail(`bars[${index}].sequence must be a non-negative safe integer`);
    }
    const match = /^bar:([0-9]{3})$/.exec(record.barId as string);
    if (match === null || record.sequence !== Number(match[1])) {
      fail(`bars[${index}] sequence must match its anonymous barId`);
    }
    for (const field of ["open", "high", "low", "close"] as const) {
      if (
        typeof record[field] !== "number" ||
        !Number.isFinite(record[field]) ||
        record[field] <= 0
      ) {
        fail(`bars[${index}].${field} must be finite and positive`);
      }
    }
    if (
      (record.high as number) <
        Math.max(record.open as number, record.close as number) ||
      (record.low as number) >
        Math.min(record.open as number, record.close as number)
    ) {
      fail(`bars[${index}] has invalid OHLC geometry`);
    }
    if (
      typeof record.continuityFromPrevious !== "string" ||
      !BAR_CONTINUITY_STATES.includes(
        record.continuityFromPrevious as (typeof BAR_CONTINUITY_STATES)[number],
      )
    ) {
      fail(`bars[${index}] continuity state is unsupported`);
    }
    return {
      barId: record.barId as string,
      sequence: record.sequence as number,
      open: record.open as number,
      high: record.high as number,
      low: record.low as number,
      close: record.close as number,
      continuityFromPrevious:
        record.continuityFromPrevious as NormalizedClosedBarV1["continuityFromPrevious"],
    };
  });
  if (panel === "context" && bars[0]?.continuityFromPrevious !== "unknown") {
    fail("context chart first visible continuity must be unknown");
  }
  return bars;
}

function validatePng(bytes: Buffer, width: unknown, height: unknown): void {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail("chart artifact bytes are not a PNG");
  }
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    fail("chart artifact PNG is missing a valid IHDR");
  }
  if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height) {
    fail("chart artifact PNG dimensions do not match metadata");
  }
}

function validateAnonymousBarIds(barIds: readonly string[]): void {
  barIds.forEach((barId, index) => {
    const match = /^bar:([0-9]{3})$/.exec(barId);
    if (match === null) fail("chart artifact barIds must be anonymous relative IDs");
    const numeric = Number(match[1]);
    if (index > 0) {
      const prior = Number(/^bar:([0-9]{3})$/.exec(barIds[index - 1]!)![1]);
      if (numeric !== prior + 1) {
        fail("chart artifact barIds must be consecutive");
      }
    }
  });
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
  if (unknownKey !== undefined) fail(`${name} contains unknown field: ${unknownKey}`);
  const missingKey = allowedKeys.find((key) => !Object.hasOwn(record, key));
  if (missingKey !== undefined) fail(`${name} is missing field: ${missingKey}`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      fail(`${name} fields must be enumerable data properties`);
    }
  }
  return record;
}

function plainStringArray(name: string, value: unknown): readonly string[] {
  const items = plainArray(name, value);
  if (
    items.length === 0 ||
    items.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    fail(`${name} must be a non-empty plain string array`);
  }
  return items as string[];
}

function plainArray(name: string, value: unknown): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`${name} must be a plain array`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  const names = Object.getOwnPropertyNames(value);
  if (
    names.some(
      (field) =>
        field !== "length" &&
        (!/^(0|[1-9][0-9]*)$/.test(field) || Number(field) >= value.length),
    )
  ) {
    fail(`${name} contains non-index fields`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      fail(`${name} must not be sparse or contain accessors`);
    }
  }
  return value;
}

function decodeCanonicalBase64(value: unknown): Buffer {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    fail("pngBase64 must be canonical base64");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    fail("pngBase64 must be canonical base64");
  }
  return bytes;
}

function assertSha256Value(name: string, value: unknown): void {
  if (typeof value !== "string") fail(`${name} must be a SHA-256 string`);
  assertSha256(name, value);
}

function assertPositiveInteger(name: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    fail(`${name} must be a positive safe integer`);
  }
}

function assertNonEmptyString(name: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${name} must be a non-empty string`);
  }
}

function assertPinnedRendererPlatform(): typeof ANONYMOUS_CHART_RENDERER_PLATFORM {
  const report = process.report.getReport() as {
    readonly header?: Readonly<Record<string, unknown>>;
  };
  const header = report.header ?? {};
  if (
    process.platform !== "linux" ||
    process.arch !== "x64" ||
    typeof header.glibcVersionRuntime !== "string"
  ) {
    fail(
      "V1 anonymous chart rendering requires the pinned Linux x64 GNU resvg runtime",
    );
  }
  return ANONYMOUS_CHART_RENDERER_PLATFORM;
}

function sha256Bytes(bytes: Uint8Array): ContractSha256 {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function fixed(value: number): string {
  return value.toFixed(3);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isAlreadyExists(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function fail(message: string): never {
  throw new AnonymousChartRendererError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof AnonymousChartRendererError) throw error;
  if (error instanceof Error) throw new AnonymousChartRendererError(error.message);
  throw new AnonymousChartRendererError("anonymous chart rendering failed");
}
