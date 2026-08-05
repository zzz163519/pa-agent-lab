import { createHash } from "node:crypto";

import { Resvg } from "@resvg/resvg-js";
import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "@pa-agent-lab/contracts/contract-utils-v1";
import {
  BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1,
  BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1,
  BROOKS_MULTI_TIMEFRAME_REFERENCE_MAX_BAR_COUNT_V1,
  assertAnonymousMultiTimeframeMarketIntegrityV1,
  assertBrooksMultiTimeframeCaseIntegrityV1,
  createAnonymousMultiTimeframeMarketInputV1,
  type AnonymousMultiTimeframeChartManifestV1,
  type AnonymousMultiTimeframeMarketV1,
  type AnonymousReferenceContextV1,
  type BrooksMultiTimeframeCaseV1,
  type BrooksMultiTimeframeV1,
  type MultiTimeframeContinuityStateV1,
  type NormalizedMultiTimeframeBarV1,
} from "@pa-agent-lab/contracts/brooks-multi-timeframe-input-v1";
import {
  ANONYMOUS_CHART_HEIGHT_PX,
  ANONYMOUS_CHART_RENDERER_PLATFORM,
  ANONYMOUS_CHART_RENDERER_RUNTIME,
  ANONYMOUS_CHART_WIDTH_PX,
} from "./anonymous-chart-renderer-v1.ts";

export const ANONYMOUS_MULTI_TIMEFRAME_CHART_ARTIFACT_SCHEMA_VERSION_V1 =
  "anonymous-multi-timeframe-chart-artifact.v1" as const;
export const ANONYMOUS_MULTI_TIMEFRAME_CHART_BUNDLE_SCHEMA_VERSION_V1 =
  "anonymous-multi-timeframe-chart-bundle.v1" as const;
export const ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1 =
  "pa-multi-timeframe-candlestick-svg-resvg.v1" as const;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BACKGROUND = "#f7f8fa";
const PLOT_BACKGROUND = "#ffffff";
const GRID = "#d9dee7";
const BORDER = "#8894a5";
const UP = "#087f5b";
const DOWN = "#c43d4b";
const DOJI = "#58677a";
const PROVISIONAL = "#a16207";
const SESSION_BOUNDARY = "#6d4cc2";
const MISSING_DATA = "#b05b16";
const UNKNOWN_CONTINUITY = "#64748b";

export interface AnonymousMultiTimeframeChartArtifactV1 {
  readonly schemaVersion: typeof ANONYMOUS_MULTI_TIMEFRAME_CHART_ARTIFACT_SCHEMA_VERSION_V1;
  readonly artifactId: ContractSha256;
  readonly rendererId: typeof ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1;
  readonly rendererRuntime: typeof ANONYMOUS_CHART_RENDERER_RUNTIME;
  readonly rendererPlatform: typeof ANONYMOUS_CHART_RENDERER_PLATFORM;
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly panel: "context" | "detail";
  readonly mediaType: "image/png";
  readonly widthPx: typeof ANONYMOUS_CHART_WIDTH_PX;
  readonly heightPx: typeof ANONYMOUS_CHART_HEIGHT_PX;
  readonly renderInputHash: ContractSha256;
  readonly contentHash: ContractSha256;
  readonly byteLength: number;
  readonly bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[];
  readonly barIds: readonly string[];
  readonly lastVisibleBarId: string | null;
  readonly pngBase64: string;
}

export interface AnonymousMultiTimeframeChartBundleV1 {
  readonly schemaVersion: typeof ANONYMOUS_MULTI_TIMEFRAME_CHART_BUNDLE_SCHEMA_VERSION_V1;
  readonly bundleId: ContractSha256;
  readonly rendererId: typeof ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1;
  readonly rendererRuntime: typeof ANONYMOUS_CHART_RENDERER_RUNTIME;
  readonly rendererPlatform: typeof ANONYMOUS_CHART_RENDERER_PLATFORM;
  readonly sourceCaseHash: ContractSha256;
  readonly market: Readonly<AnonymousMultiTimeframeMarketV1>;
  readonly primary: Readonly<{
    context: Readonly<AnonymousMultiTimeframeChartArtifactV1>;
    detail: Readonly<AnonymousMultiTimeframeChartArtifactV1>;
  }>;
  readonly references: Readonly<{
    sixtyMinute: Readonly<AnonymousMultiTimeframeChartArtifactV1> | null;
    daily: Readonly<AnonymousMultiTimeframeChartArtifactV1> | null;
  }>;
}

export class AnonymousMultiTimeframeChartRendererError extends Error {
  override readonly name = "AnonymousMultiTimeframeChartRendererError";
}

export function renderAnonymousMultiTimeframePolicyChartsV1(
  policyCase: BrooksMultiTimeframeCaseV1,
): Readonly<AnonymousMultiTimeframeChartBundleV1> {
  try {
    assertPinnedPlatform();
    assertBrooksMultiTimeframeCaseIntegrityV1(policyCase);
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    const primary = {
      context: renderArtifact("5m", "context", market.primary.bars),
      detail: renderArtifact(
        "5m",
        "detail",
        market.primary.bars.slice(-BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1),
      ),
    } as const;
    const references = {
      sixtyMinute: renderReference(market.references.sixtyMinute, "60m"),
      daily: renderReference(market.references.daily, "1d"),
    } as const;
    const identity = {
      rendererId: ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1,
      rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
      rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
      sourceCaseHash: policyCase.caseHash,
      marketHash: market.marketHash,
      primaryContextArtifactId: primary.context.artifactId,
      primaryDetailArtifactId: primary.detail.artifactId,
      sixtyMinuteArtifactId: references.sixtyMinute?.artifactId ?? null,
      dailyArtifactId: references.daily?.artifactId ?? null,
    } as const;
    const bundle = deepFreeze({
      schemaVersion: ANONYMOUS_MULTI_TIMEFRAME_CHART_BUNDLE_SCHEMA_VERSION_V1,
      bundleId: canonicalHash(identity),
      rendererId: ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1,
      rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
      rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
      sourceCaseHash: policyCase.caseHash,
      market,
      primary,
      references,
    });
    assertAnonymousMultiTimeframeChartBundleV1(bundle);
    return bundle;
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousMultiTimeframeChartArtifactV1(
  value: unknown,
): asserts value is AnonymousMultiTimeframeChartArtifactV1 {
  try {
    const record = exactRecord("multi-timeframe chart artifact", value, [
      "schemaVersion",
      "artifactId",
      "rendererId",
      "rendererRuntime",
      "rendererPlatform",
      "timeframe",
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
    if (
      record.schemaVersion !==
      ANONYMOUS_MULTI_TIMEFRAME_CHART_ARTIFACT_SCHEMA_VERSION_V1
    ) {
      fail("multi-timeframe chart artifact schemaVersion is unsupported");
    }
    if (
      record.rendererId !== ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1 ||
      record.rendererRuntime !== ANONYMOUS_CHART_RENDERER_RUNTIME ||
      record.rendererPlatform !== assertPinnedPlatform()
    ) {
      fail("multi-timeframe chart artifact renderer identity is unsupported");
    }
    if (!isTimeframe(record.timeframe)) fail("chart timeframe is unsupported");
    if (record.panel !== "context" && record.panel !== "detail") {
      fail("chart panel is unsupported");
    }
    if (record.panel === "detail" && record.timeframe !== "5m") {
      fail("detail charts are permitted only for the primary 5m timeframe");
    }
    if (record.mediaType !== "image/png") fail("chart artifact must be image/png");
    if (
      record.widthPx !== ANONYMOUS_CHART_WIDTH_PX ||
      record.heightPx !== ANONYMOUS_CHART_HEIGHT_PX
    ) {
      fail("chart artifact dimensions are invalid");
    }
    assertSha("artifactId", record.artifactId);
    assertSha("renderInputHash", record.renderInputHash);
    assertSha("contentHash", record.contentHash);
    if (
      typeof record.byteLength !== "number" ||
      !Number.isSafeInteger(record.byteLength) ||
      record.byteLength <= 0
    ) {
      fail("chart artifact byteLength must be positive");
    }
    const bars = validateAnonymousBars(record.bars, record.timeframe);
    if (record.timeframe === "5m") {
      if (bars.some((bar) => bar.lifecycle !== "finalized")) {
        fail("primary chart bars must be finalized");
      }
      if (
        record.panel === "context" &&
        (bars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1 ||
          bars.length > BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1)
      ) {
        fail("primary context chart requires between 40 and 120 bars");
      }
    } else {
      if (bars.length > BROOKS_MULTI_TIMEFRAME_REFERENCE_MAX_BAR_COUNT_V1) {
        fail("reference chart accepts at most 120 bars");
      }
      const provisionalIndexes = bars.flatMap((bar, index) =>
        bar.lifecycle === "provisional" ? [index] : [],
      );
      if (provisionalIndexes.length > 1) {
        fail("reference chart accepts at most one provisional bar");
      }
      if (
        provisionalIndexes.length === 1 &&
        provisionalIndexes[0] !== bars.length - 1
      ) {
        fail("reference chart provisional bar must be final");
      }
    }
    if (
      record.panel === "context" &&
      bars.length > 0 &&
      (bars[0]?.sequence !== 0 ||
        bars[0]?.continuityFromPrevious !== "unknown_left_boundary")
    ) {
      fail("context chart must start at its anonymous left boundary");
    }
    if (record.panel === "detail" && bars.length !== 40) {
      fail("primary detail chart requires exactly 40 bars");
    }
    const barIds = plainStringArray("barIds", record.barIds, true);
    if (!sameStrings(barIds, bars.map((bar) => bar.barId))) {
      fail("chart artifact barIds do not match bars");
    }
    const expectedLast = barIds.at(-1) ?? null;
    if (record.lastVisibleBarId !== expectedLast) {
      fail("chart artifact lastVisibleBarId does not match bars");
    }
    const bytes = decodeCanonicalBase64(record.pngBase64);
    if (bytes.length !== record.byteLength) {
      fail("chart artifact byteLength does not match PNG bytes");
    }
    if (sha256Bytes(bytes) !== record.contentHash) {
      fail("chart artifact contentHash does not match PNG bytes");
    }
    validatePng(bytes);
    const renderInput = {
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      timeframe: record.timeframe,
      panel: record.panel,
      widthPx: record.widthPx,
      heightPx: record.heightPx,
      bars,
    } as const;
    if (record.renderInputHash !== canonicalHash(renderInput)) {
      fail("chart artifact renderInputHash does not match bars");
    }
    const expectedBytes = rasterize(createSvg(bars));
    if (!bytes.equals(expectedBytes)) {
      fail("chart artifact PNG is not the pinned renderer output for its bars");
    }
    const metadata = {
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      timeframe: record.timeframe,
      panel: record.panel,
      mediaType: record.mediaType,
      widthPx: record.widthPx,
      heightPx: record.heightPx,
      renderInputHash: record.renderInputHash,
      contentHash: record.contentHash,
      byteLength: record.byteLength,
      barIds,
      lastVisibleBarId: record.lastVisibleBarId,
    } as const;
    if (record.artifactId !== canonicalHash(metadata)) {
      fail("chart artifact artifactId does not match content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousMultiTimeframeChartBundleV1(
  value: unknown,
): asserts value is AnonymousMultiTimeframeChartBundleV1 {
  try {
    const record = exactRecord("multi-timeframe chart bundle", value, [
      "schemaVersion",
      "bundleId",
      "rendererId",
      "rendererRuntime",
      "rendererPlatform",
      "sourceCaseHash",
      "market",
      "primary",
      "references",
    ]);
    if (
      record.schemaVersion !== ANONYMOUS_MULTI_TIMEFRAME_CHART_BUNDLE_SCHEMA_VERSION_V1
    ) {
      fail("multi-timeframe chart bundle schemaVersion is unsupported");
    }
    if (
      record.rendererId !== ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1 ||
      record.rendererRuntime !== ANONYMOUS_CHART_RENDERER_RUNTIME ||
      record.rendererPlatform !== assertPinnedPlatform()
    ) {
      fail("multi-timeframe chart bundle renderer identity is unsupported");
    }
    assertSha("bundleId", record.bundleId);
    assertSha("sourceCaseHash", record.sourceCaseHash);
    assertAnonymousMultiTimeframeMarketIntegrityV1(record.market);
    const market = record.market;
    const primary = exactRecord("primary chart bundle", record.primary, [
      "context",
      "detail",
    ]);
    assertAnonymousMultiTimeframeChartArtifactV1(primary.context);
    assertAnonymousMultiTimeframeChartArtifactV1(primary.detail);
    const context = primary.context;
    const detail = primary.detail;
    if (
      context.timeframe !== "5m" ||
      context.panel !== "context" ||
      detail.timeframe !== "5m" ||
      detail.panel !== "detail"
    ) {
      fail("primary chart bundle identity is invalid");
    }
    assertArtifactMatchesBars(context, market.primary.bars);
    assertArtifactMatchesBars(
      detail,
      market.primary.bars.slice(-BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1),
    );
    const references = exactRecord("reference chart bundle", record.references, [
      "sixtyMinute",
      "daily",
    ]);
    const sixtyMinute = validateBundledReference(
      references.sixtyMinute,
      market.references.sixtyMinute,
      "60m",
    );
    const daily = validateBundledReference(
      references.daily,
      market.references.daily,
      "1d",
    );
    const identity = {
      rendererId: record.rendererId,
      rendererRuntime: record.rendererRuntime,
      rendererPlatform: record.rendererPlatform,
      sourceCaseHash: record.sourceCaseHash,
      marketHash: market.marketHash,
      primaryContextArtifactId: context.artifactId,
      primaryDetailArtifactId: detail.artifactId,
      sixtyMinuteArtifactId: sixtyMinute?.artifactId ?? null,
      dailyArtifactId: daily?.artifactId ?? null,
    } as const;
    if (record.bundleId !== canonicalHash(identity)) {
      fail("multi-timeframe chart bundle bundleId does not match content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousMultiTimeframeChartBundleForCaseV1(
  value: unknown,
  policyCase: BrooksMultiTimeframeCaseV1,
): asserts value is AnonymousMultiTimeframeChartBundleV1 {
  try {
    assertAnonymousMultiTimeframeChartBundleV1(value);
    assertBrooksMultiTimeframeCaseIntegrityV1(policyCase);
    const market = createAnonymousMultiTimeframeMarketInputV1(policyCase);
    if (value.sourceCaseHash !== policyCase.caseHash) {
      fail("chart bundle sourceCaseHash does not match the Case");
    }
    if (value.market.marketHash !== market.marketHash) {
      fail("chart bundle anonymous market does not match the Case");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function toAnonymousMultiTimeframeChartManifestsV1(
  bundle: AnonymousMultiTimeframeChartBundleV1,
): Readonly<{
  primary: Readonly<{
    context: Readonly<AnonymousMultiTimeframeChartManifestV1>;
    detail: Readonly<AnonymousMultiTimeframeChartManifestV1>;
  }>;
  references: Readonly<{
    sixtyMinute: Readonly<AnonymousMultiTimeframeChartManifestV1> | null;
    daily: Readonly<AnonymousMultiTimeframeChartManifestV1> | null;
  }>;
}> {
  assertAnonymousMultiTimeframeChartBundleV1(bundle);
  return deepFreeze({
    primary: {
      context: toManifest(bundle.primary.context),
      detail: toManifest(bundle.primary.detail),
    },
    references: {
      sixtyMinute:
        bundle.references.sixtyMinute === null
          ? null
          : toManifest(bundle.references.sixtyMinute),
      daily:
        bundle.references.daily === null
          ? null
          : toManifest(bundle.references.daily),
    },
  });
}

function renderReference(
  reference: AnonymousReferenceContextV1,
  timeframe: "60m" | "1d",
): AnonymousMultiTimeframeChartArtifactV1 | null {
  return reference.availability === "not_supplied"
    ? null
    : renderArtifact(timeframe, "context", reference.bars);
}

function renderArtifact(
  timeframe: BrooksMultiTimeframeV1,
  panel: "context" | "detail",
  bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[],
): AnonymousMultiTimeframeChartArtifactV1 {
  const renderInput = {
    rendererId: ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1,
    rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
    rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
    timeframe,
    panel,
    widthPx: ANONYMOUS_CHART_WIDTH_PX,
    heightPx: ANONYMOUS_CHART_HEIGHT_PX,
    bars,
  } as const;
  const renderInputHash = canonicalHash(renderInput);
  const bytes = rasterize(createSvg(bars));
  const barIds = bars.map((bar) => bar.barId);
  const metadata = {
    rendererId: ANONYMOUS_MULTI_TIMEFRAME_CHART_RENDERER_ID_V1,
    rendererRuntime: ANONYMOUS_CHART_RENDERER_RUNTIME,
    rendererPlatform: ANONYMOUS_CHART_RENDERER_PLATFORM,
    timeframe,
    panel,
    mediaType: "image/png" as const,
    widthPx: ANONYMOUS_CHART_WIDTH_PX,
    heightPx: ANONYMOUS_CHART_HEIGHT_PX,
    renderInputHash,
    contentHash: sha256Bytes(bytes),
    byteLength: bytes.length,
    barIds,
    lastVisibleBarId: barIds.at(-1) ?? null,
  } as const;
  const artifact = deepFreeze({
    schemaVersion: ANONYMOUS_MULTI_TIMEFRAME_CHART_ARTIFACT_SCHEMA_VERSION_V1,
    artifactId: canonicalHash(metadata),
    ...metadata,
    bars: bars.map((bar) => ({
      ...bar,
      progress: bar.progress === null ? null : { ...bar.progress },
    })),
    pngBase64: bytes.toString("base64"),
  });
  assertAnonymousMultiTimeframeChartArtifactV1(artifact);
  return artifact;
}

function validateBundledReference(
  value: unknown,
  reference: AnonymousReferenceContextV1,
  timeframe: "60m" | "1d",
): AnonymousMultiTimeframeChartArtifactV1 | null {
  if (reference.availability === "not_supplied") {
    if (value !== null) fail(`absent ${timeframe} reference forbids a chart artifact`);
    return null;
  }
  if (value === null) fail(`supplied ${timeframe} reference requires a chart artifact`);
  assertAnonymousMultiTimeframeChartArtifactV1(value);
  if (value.timeframe !== timeframe || value.panel !== "context") {
    fail(`${timeframe} reference chart artifact identity is invalid`);
  }
  assertArtifactMatchesBars(value, reference.bars);
  return value;
}

function assertArtifactMatchesBars(
  artifact: AnonymousMultiTimeframeChartArtifactV1,
  bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[],
): void {
  if (canonicalHash(artifact.bars) !== canonicalHash(bars)) {
    fail("chart artifact bars do not match the anonymous market");
  }
}

function toManifest(
  artifact: AnonymousMultiTimeframeChartArtifactV1,
): AnonymousMultiTimeframeChartManifestV1 {
  return {
    timeframe: artifact.timeframe,
    panel: artifact.panel,
    mediaType: artifact.mediaType,
    contentHash: artifact.contentHash,
    barIds: [...artifact.barIds],
    lastVisibleBarId: artifact.lastVisibleBarId,
  };
}

function rasterize(svg: string): Buffer {
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

function createSvg(
  bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[],
): string {
  const plot = { left: 24, top: 24, width: 1152, height: 672 } as const;
  const rawMinimum = bars.length === 0 ? 99 : Math.min(...bars.map((bar) => bar.low));
  const rawMaximum = bars.length === 0 ? 101 : Math.max(...bars.map((bar) => bar.high));
  const rawSpan = rawMaximum - rawMinimum;
  const span = rawSpan > 0 ? rawSpan : Math.max(Math.abs(rawMaximum) * 0.01, 1);
  const minimum = rawMinimum - span * 0.06;
  const maximum = rawMaximum + span * 0.06;
  const priceSpan = maximum - minimum;
  const slotWidth = bars.length === 0 ? plot.width : plot.width / bars.length;
  const bodyWidth = Math.max(1.5, Math.min(slotWidth * 0.62, 18));
  const y = (price: number) =>
    plot.top + ((maximum - price) / priceSpan) * plot.height;
  const elements = [
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
    const candleColor =
      bar.close > bar.open ? UP : bar.close < bar.open ? DOWN : DOJI;
    const highY = y(bar.high);
    const lowY = y(bar.low);
    const openY = y(bar.open);
    const closeY = y(bar.close);
    const naturalTop = Math.min(openY, closeY);
    const naturalHeight = Math.abs(closeY - openY);
    const bodyHeight = Math.max(1.5, naturalHeight);
    const bodyTop = naturalTop - (bodyHeight - naturalHeight) / 2;
    const opacity = bar.lifecycle === "provisional" ? "0.62" : "1";
    elements.push(
      `<line x1="${fixed(centerX)}" y1="${fixed(highY)}" x2="${fixed(centerX)}" y2="${fixed(lowY)}" stroke="${candleColor}" stroke-width="1.5" opacity="${opacity}"/>`,
      `<rect x="${fixed(centerX - bodyWidth / 2)}" y="${fixed(bodyTop)}" width="${fixed(bodyWidth)}" height="${fixed(bodyHeight)}" fill="${candleColor}" opacity="${opacity}"/>`,
    );
    if (bar.lifecycle === "provisional") {
      elements.push(
        `<rect x="${fixed(centerX - bodyWidth / 2 - 2)}" y="${fixed(highY)}" width="${fixed(bodyWidth + 4)}" height="${fixed(Math.max(2, lowY - highY))}" fill="none" stroke="${PROVISIONAL}" stroke-width="2" stroke-dasharray="4 3"/>`,
      );
    }
  });
  elements.push(
    `<rect x="${fixed(plot.left)}" y="${fixed(plot.top)}" width="${fixed(plot.width)}" height="${fixed(plot.height)}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANONYMOUS_CHART_WIDTH_PX}" height="${ANONYMOUS_CHART_HEIGHT_PX}" viewBox="0 0 ${ANONYMOUS_CHART_WIDTH_PX} ${ANONYMOUS_CHART_HEIGHT_PX}">${elements.join("")}</svg>`;
}

function continuityStyle(
  state: MultiTimeframeContinuityStateV1,
): { readonly color: string; readonly dash: string } {
  switch (state) {
    case "expected_session_boundary":
      return { color: SESSION_BOUNDARY, dash: "8 4" };
    case "scheduled_break":
      return { color: SESSION_BOUNDARY, dash: "12 4 2 4" };
    case "missing_data":
      return { color: MISSING_DATA, dash: "4 3" };
    case "unknown_left_boundary":
      return { color: UNKNOWN_CONTINUITY, dash: "2 4" };
    case "contiguous":
      return { color: GRID, dash: "1 0" };
  }
}

function validateAnonymousBars(
  value: unknown,
  timeframe: BrooksMultiTimeframeV1,
): NormalizedMultiTimeframeBarV1[] {
  const items = plainArray("chart bars", value);
  return items.map((item, index) => {
    const record = exactRecord(`chart bars[${index}]`, item, [
      "barId",
      "sequence",
      "timeframe",
      "lifecycle",
      "open",
      "high",
      "low",
      "close",
      "continuityFromPrevious",
      "progress",
    ]);
    const lifecycle = record.lifecycle;
    if (
      record.timeframe !== timeframe ||
      (lifecycle !== "finalized" && lifecycle !== "provisional")
    ) {
      fail(`chart bars[${index}] timeframe or lifecycle is invalid`);
    }
    const idMatch = new RegExp(
      `^bar:${timeframe}:${lifecycle}:([0-9]{3})$`,
    ).exec(String(record.barId));
    if (
      idMatch === null ||
      record.sequence !== Number(idMatch[1]) ||
      (index > 0 &&
        record.sequence !==
          (items[index - 1] as NormalizedMultiTimeframeBarV1).sequence + 1)
    ) {
      fail(`chart bars[${index}] identity or sequence is invalid`);
    }
    for (const field of ["open", "high", "low", "close"] as const) {
      if (typeof record[field] !== "number" || !Number.isFinite(record[field])) {
        fail(`chart bars[${index}].${field} must be finite`);
      }
    }
    if (
      (record.high as number) <
        Math.max(record.open as number, record.close as number) ||
      (record.low as number) >
        Math.min(record.open as number, record.close as number)
    ) {
      fail(`chart bars[${index}] has invalid OHLC geometry`);
    }
    if (
      record.continuityFromPrevious !== "contiguous" &&
      record.continuityFromPrevious !== "expected_session_boundary" &&
      record.continuityFromPrevious !== "scheduled_break" &&
      record.continuityFromPrevious !== "missing_data" &&
      record.continuityFromPrevious !== "unknown_left_boundary"
    ) {
      fail(`chart bars[${index}] continuity is invalid`);
    }
    if (lifecycle === "finalized" && record.progress !== null) {
      fail(`chart bars[${index}] finalized progress must be null`);
    }
    if (lifecycle === "provisional") {
      const progress = exactRecord(`chart bars[${index}] progress`, record.progress, [
        "completedBaseIntervals",
        "scheduledBaseIntervals",
        "progressStatus",
      ]);
      if (progress.progressStatus === "verified") {
        if (
          !Number.isSafeInteger(progress.completedBaseIntervals) ||
          !Number.isSafeInteger(progress.scheduledBaseIntervals) ||
          (progress.completedBaseIntervals as number) < 0 ||
          (progress.scheduledBaseIntervals as number) <= 0 ||
          (progress.completedBaseIntervals as number) >=
            (progress.scheduledBaseIntervals as number)
        ) {
          fail(`chart bars[${index}] verified provisional progress is invalid`);
        }
      } else if (
        progress.progressStatus !== "unverified_special_session" ||
        progress.completedBaseIntervals !== null ||
        progress.scheduledBaseIntervals !== null
      ) {
        fail(`chart bars[${index}] unverified provisional progress is invalid`);
      }
    }
    return record as unknown as NormalizedMultiTimeframeBarV1;
  });
}

function validatePng(bytes: Buffer): void {
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE) ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  ) {
    fail("chart artifact bytes are not a valid PNG");
  }
  if (
    bytes.readUInt32BE(16) !== ANONYMOUS_CHART_WIDTH_PX ||
    bytes.readUInt32BE(20) !== ANONYMOUS_CHART_HEIGHT_PX
  ) {
    fail("chart artifact PNG dimensions do not match metadata");
  }
}

function exactRecord(
  name: string,
  value: unknown,
  keys: readonly string[],
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
  const actual = Object.getOwnPropertyNames(record);
  const unknown = actual.find((key) => !keys.includes(key));
  if (unknown !== undefined) fail(`${name} contains unknown field: ${unknown}`);
  const missing = keys.find((key) => !actual.includes(key));
  if (missing !== undefined) fail(`${name} is missing field: ${missing}`);
  for (const key of actual) {
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
      (name) =>
        name !== "length" &&
        (!/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length),
    )
  ) {
    fail(`${name} contains non-index fields`);
  }
  return value;
}

function plainStringArray(
  name: string,
  value: unknown,
  allowEmpty: boolean,
): string[] {
  const items = plainArray(name, value);
  if (
    (!allowEmpty && items.length === 0) ||
    items.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    fail(`${name} must be a plain string array`);
  }
  return [...items] as string[];
}

function decodeCanonicalBase64(value: unknown): Buffer {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    fail("pngBase64 must be canonical base64");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) fail("pngBase64 must be canonical base64");
  return bytes;
}

function assertSha(name: string, value: unknown): asserts value is ContractSha256 {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail(`${name} must be a lowercase SHA-256 value`);
  }
}

function isTimeframe(value: unknown): value is BrooksMultiTimeframeV1 {
  return value === "5m" || value === "60m" || value === "1d";
}

function assertPinnedPlatform(): typeof ANONYMOUS_CHART_RENDERER_PLATFORM {
  const report = process.report.getReport() as {
    readonly header?: Readonly<Record<string, unknown>>;
  };
  if (
    process.platform !== "linux" ||
    process.arch !== "x64" ||
    typeof report.header?.glibcVersionRuntime !== "string"
  ) {
    fail("V1 chart rendering requires the pinned Linux x64 GNU resvg runtime");
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

function fail(message: string): never {
  throw new AnonymousMultiTimeframeChartRendererError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof AnonymousMultiTimeframeChartRendererError) throw error;
  throw new AnonymousMultiTimeframeChartRendererError(
    error instanceof Error ? error.message : "multi-timeframe chart rendering failed",
  );
}
