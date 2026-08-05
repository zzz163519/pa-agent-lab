import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";

import { canonicalHash } from "../../contracts/src/contract-utils-v1.ts";
import {
  createBrooksMultiTimeframeCaseV1,
  createBrooksMultiTimeframePolicyInputV1,
  createBrooksMultiTimeframeSourceProfileV1,
  type LocalMultiTimeframeBarV1,
} from "../../contracts/src/brooks-multi-timeframe-input-v1.ts";
import {
  assertAnonymousMultiTimeframeChartArtifactV1,
  assertAnonymousMultiTimeframeChartBundleV1,
  renderAnonymousMultiTimeframePolicyChartsV1,
  toAnonymousMultiTimeframeChartManifestsV1,
} from "../src/anonymous-multi-timeframe-chart-renderer-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;
const CUTOFF = 2_000_000_000_000;

function makeProfile() {
  return createBrooksMultiTimeframeSourceProfileV1({
    sourceId: "source:synthetic-native",
    sourceVersion: "synthetic-native.v1",
    marketSurface: "synthetic-market",
    instrumentId: "instrument:synthetic",
    priceBasis: "unadjusted-trade-price.v1",
    sessionProfile: {
      profileId: "session:synthetic-24x7",
      profileVersion: "synthetic-24x7.v1",
      timezone: "Etc/UTC",
      calendarVersion: "synthetic-calendar.v1",
      fiveMinuteAlignmentId: "alignment:5m:epoch",
      sixtyMinuteAlignmentId: "alignment:60m:epoch",
      dailyAlignmentId: "alignment:1d:utc-midnight",
    },
  });
}

function makeBars(
  timeframe: "5m" | "60m" | "1d",
  count: number,
  sourceProfileHash: `sha256:${string}`,
): LocalMultiTimeframeBarV1[] {
  const duration =
    timeframe === "5m" ? 300_000 : timeframe === "60m" ? 3_600_000 : 86_400_000;
  const firstStart = CUTOFF - count * duration;
  return Array.from({ length: count }, (_, index) => {
    const center = 200 + Math.sin(index / 4) * 12 + index * 0.2;
    const open = center + (index % 2 === 0 ? -2 : 2);
    const close = center + (index % 2 === 0 ? 2.5 : -2.5);
    return {
      sourceBarId: `source-bar:${timeframe}:${index}`,
      sequence: index,
      timeframe,
      lifecycle: "finalized",
      periodStartEpochMs: firstStart + index * duration,
      periodEndEpochMs: firstStart + (index + 1) * duration,
      snapshotCutoffEpochMs: CUTOFF,
      open,
      high: Math.max(open, close) + 2,
      low: Math.min(open, close) - 2,
      close,
      continuityFromPrevious:
        index === 0
          ? "unknown_left_boundary"
          : index === Math.floor(count / 2) && count > 2
            ? "expected_session_boundary"
            : "contiguous",
      progress: null,
      sourceContentHash: sha(((index % 9) + 1).toString()),
      sourceProfileHash,
      alignmentId:
        timeframe === "5m"
          ? "alignment:5m:epoch"
          : timeframe === "60m"
            ? "alignment:60m:epoch"
            : "alignment:1d:utc-midnight",
    };
  });
}

function makeCase(options: Readonly<{
  sixtyMinute?: number;
  sixtyMinuteProvisional?: boolean;
  daily?: number;
}> = {}) {
  const profile = makeProfile();
  const reference = (
    timeframe: "60m" | "1d",
    count: number | undefined,
    provisional = false,
  ) => {
    if (count === undefined) return { availability: "not_supplied" } as const;
    const bars = makeBars(timeframe, count, profile.profileHash);
    if (provisional) {
      const duration = timeframe === "60m" ? 3_600_000 : 86_400_000;
      const lastIndex = bars.length - 1;
      if (lastIndex < 0) throw new Error("provisional fixture requires one bar");
      bars[lastIndex] = {
        ...bars[lastIndex]!,
        lifecycle: "provisional",
        periodEndEpochMs: CUTOFF + duration,
        progress: {
          completedBaseIntervals: timeframe === "60m" ? 6 : 144,
          scheduledBaseIntervals: timeframe === "60m" ? 12 : 288,
          progressStatus: "verified",
        },
      };
    }
    return {
      availability: "supplied" as const,
      historyStart: "window_truncated" as const,
      bars,
    };
  };
  return createBrooksMultiTimeframeCaseV1({
    caseId: "case:synthetic-mtf-chart",
    policyStreamId: "stream:synthetic-mtf-chart",
    decisionCutoffEpochMs: CUTOFF,
    sourceProfile: profile,
    primaryBars: makeBars("5m", 120, profile.profileHash),
    references: {
      sixtyMinute: reference(
        "60m",
        options.sixtyMinute,
        options.sixtyMinuteProvisional,
      ),
      daily: reference("1d", options.daily),
    },
  });
}

function decodePng(png: Buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9]!;
    } else if (type === "IDAT") {
      chunks.push(data);
    }
    offset += length + 12;
    if (type === "IEND") break;
  }
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(chunks));
  const raw = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset++]!;
    const rowOffset = row * stride;
    const priorOffset = (row - 1) * stride;
    for (let column = 0; column < stride; column += 1) {
      const encoded = inflated[sourceOffset++]!;
      const left = column >= bytesPerPixel ? raw[rowOffset + column - bytesPerPixel]! : 0;
      const above = row > 0 ? raw[priorOffset + column]! : 0;
      const upperLeft =
        row > 0 && column >= bytesPerPixel
          ? raw[priorOffset + column - bytesPerPixel]!
          : 0;
      const decoded =
        filter === 0
          ? encoded
          : filter === 1
            ? encoded + left
            : filter === 2
              ? encoded + above
              : filter === 3
                ? encoded + Math.floor((left + above) / 2)
                : filter === 4
                  ? encoded + paeth(left, above, upperLeft)
                  : Number.NaN;
      assert.ok(Number.isFinite(decoded), `unsupported PNG filter ${filter}`);
      raw[rowOffset + column] = decoded & 0xff;
    }
  }
  return { width, height, colorType, bytesPerPixel, raw };
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const distances = [
    Math.abs(estimate - left),
    Math.abs(estimate - above),
    Math.abs(estimate - upperLeft),
  ];
  return distances[0]! <= distances[1]! && distances[0]! <= distances[2]!
    ? left
    : distances[1]! <= distances[2]!
      ? above
      : upperLeft;
}

function countNonBackground(decoded: ReturnType<typeof decodePng>): number {
  let count = 0;
  for (let offset = 0; offset < decoded.raw.length; offset += decoded.bytesPerPixel) {
    if (
      decoded.raw[offset] !== 247 ||
      decoded.raw[offset + 1] !== 248 ||
      decoded.raw[offset + 2] !== 250
    ) {
      count += 1;
    }
  }
  return count;
}

function rehashArtifactIdentity(
  artifact: Record<string, unknown>,
): Record<string, unknown> {
  artifact.renderInputHash = canonicalHash({
    rendererId: artifact.rendererId,
    rendererRuntime: artifact.rendererRuntime,
    rendererPlatform: artifact.rendererPlatform,
    timeframe: artifact.timeframe,
    panel: artifact.panel,
    widthPx: artifact.widthPx,
    heightPx: artifact.heightPx,
    bars: artifact.bars,
  });
  artifact.artifactId = canonicalHash({
    rendererId: artifact.rendererId,
    rendererRuntime: artifact.rendererRuntime,
    rendererPlatform: artifact.rendererPlatform,
    timeframe: artifact.timeframe,
    panel: artifact.panel,
    mediaType: artifact.mediaType,
    widthPx: artifact.widthPx,
    heightPx: artifact.heightPx,
    renderInputHash: artifact.renderInputHash,
    contentHash: artifact.contentHash,
    byteLength: artifact.byteLength,
    barIds: artifact.barIds,
    lastVisibleBarId: artifact.lastVisibleBarId,
  });
  return artifact;
}

describe("anonymous multi-timeframe chart renderer V1", () => {
  it("renders one deterministic bundle for 5m, 60m, and daily evidence", () => {
    const policyCase = makeCase({ sixtyMinute: 12, daily: 3 });
    const first = renderAnonymousMultiTimeframePolicyChartsV1(policyCase);
    const second = renderAnonymousMultiTimeframePolicyChartsV1(policyCase);

    assert.equal(first.bundleId, second.bundleId);
    assert.equal(first.primary.context.pngBase64, second.primary.context.pngBase64);
    assert.equal(first.primary.detail.pngBase64, second.primary.detail.pngBase64);
    assert.equal(
      first.references.sixtyMinute?.pngBase64,
      second.references.sixtyMinute?.pngBase64,
    );
    assert.equal(first.references.daily?.pngBase64, second.references.daily?.pngBase64);
    assert.equal(first.primary.context.barIds.length, 120);
    assert.equal(first.primary.detail.barIds.length, 40);
    assert.equal(first.references.sixtyMinute?.barIds.length, 12);
    assert.equal(first.references.daily?.barIds.length, 3);
    assert.notEqual(first.primary.context.artifactId, first.references.sixtyMinute?.artifactId);
    assertAnonymousMultiTimeframeChartBundleV1(first);

    for (const artifact of [
      first.primary.context,
      first.primary.detail,
      first.references.sixtyMinute!,
      first.references.daily!,
    ]) {
      const png = Buffer.from(artifact.pngBase64, "base64");
      assert.deepEqual(
        png.subarray(0, 8),
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      const decoded = decodePng(png);
      assert.equal(decoded.width, 1200);
      assert.equal(decoded.height, 720);
      assert.ok(countNonBackground(decoded) > 1_000);
    }

    const policyInput = createBrooksMultiTimeframePolicyInputV1({
      policyCase,
      charts: toAnonymousMultiTimeframeChartManifestsV1(first),
      doctrine: [],
    });
    assert.equal(
      policyInput.charts.references.daily?.contentHash,
      first.references.daily?.contentHash,
    );
  });

  it("distinguishes absent references from a supplied zero-observation artifact", () => {
    const absent = renderAnonymousMultiTimeframePolicyChartsV1(makeCase());
    const suppliedEmpty = renderAnonymousMultiTimeframePolicyChartsV1(
      makeCase({ sixtyMinute: 0 }),
    );

    assert.equal(absent.references.sixtyMinute, null);
    assert.equal(absent.references.daily, null);
    assert.notEqual(suppliedEmpty.references.sixtyMinute, null);
    assert.deepEqual(suppliedEmpty.references.sixtyMinute?.barIds, []);
    assert.equal(suppliedEmpty.references.sixtyMinute?.lastVisibleBarId, null);
    assert.ok(
      countNonBackground(
        decodePng(
          Buffer.from(suppliedEmpty.references.sixtyMinute!.pngBase64, "base64"),
        ),
      ) > 1_000,
    );
    assertAnonymousMultiTimeframeChartBundleV1(absent);
    assertAnonymousMultiTimeframeChartBundleV1(suppliedEmpty);
  });

  it("keeps paired five-minute local, anonymous, and PNG bytes identical when references are added or removed", () => {
    const fiveMinuteOnlyCase = makeCase();
    const withReferencesCase = makeCase({ sixtyMinute: 12, daily: 3 });
    const fiveMinuteOnly = renderAnonymousMultiTimeframePolicyChartsV1(
      fiveMinuteOnlyCase,
    );
    const withReferences = renderAnonymousMultiTimeframePolicyChartsV1(
      withReferencesCase,
    );

    assert.deepEqual(
      Buffer.from(JSON.stringify(fiveMinuteOnlyCase.primaryBars), "utf8"),
      Buffer.from(JSON.stringify(withReferencesCase.primaryBars), "utf8"),
    );
    assert.deepEqual(
      Buffer.from(JSON.stringify(fiveMinuteOnly.market.primary), "utf8"),
      Buffer.from(JSON.stringify(withReferences.market.primary), "utf8"),
    );
    assert.deepEqual(
      Buffer.from(fiveMinuteOnly.primary.context.pngBase64, "base64"),
      Buffer.from(withReferences.primary.context.pngBase64, "base64"),
    );
    assert.deepEqual(
      Buffer.from(fiveMinuteOnly.primary.detail.pngBase64, "base64"),
      Buffer.from(withReferences.primary.detail.pngBase64, "base64"),
    );
    assert.equal(
      fiveMinuteOnly.primary.context.contentHash,
      withReferences.primary.context.contentHash,
    );
    assert.equal(
      fiveMinuteOnly.primary.detail.contentHash,
      withReferences.primary.detail.contentHash,
    );
    assert.notEqual(fiveMinuteOnly.market.marketHash, withReferences.market.marketHash);
    assert.equal(fiveMinuteOnly.references.sixtyMinute, null);
    assert.equal(fiveMinuteOnly.references.daily, null);
    assert.notEqual(withReferences.references.sixtyMinute, null);
    assert.notEqual(withReferences.references.daily, null);
  });

  it("rejects fully rehashed standalone primary-count and reference-lifecycle violations", () => {
    const suppliedZero = renderAnonymousMultiTimeframePolicyChartsV1(
      makeCase({ sixtyMinute: 0 }),
    ).references.sixtyMinute;
    if (suppliedZero === null) throw new Error("fixture requires supplied reference");
    const zeroPrimary = structuredClone(suppliedZero) as unknown as Record<
      string,
      unknown
    >;
    zeroPrimary.timeframe = "5m";
    rehashArtifactIdentity(zeroPrimary);
    assert.throws(
      () => assertAnonymousMultiTimeframeChartArtifactV1(zeroPrimary),
      { message: /primary context chart requires between 40 and 120 bars/ },
    );

    const validProvisional = renderAnonymousMultiTimeframePolicyChartsV1(
      makeCase({ sixtyMinute: 2, sixtyMinuteProvisional: true }),
    ).references.sixtyMinute;
    if (validProvisional === null) {
      throw new Error("fixture requires provisional reference");
    }
    const twoProvisional = structuredClone(validProvisional) as unknown as {
      bars: Array<Record<string, unknown>>;
    };
    twoProvisional.bars[0] = {
      ...twoProvisional.bars[0]!,
      barId: "bar:60m:provisional:000",
      lifecycle: "provisional",
      progress: {
        completedBaseIntervals: 1,
        scheduledBaseIntervals: 12,
        progressStatus: "verified",
      },
    };
    assert.throws(
      () => assertAnonymousMultiTimeframeChartArtifactV1(twoProvisional),
      { message: /at most one provisional bar/ },
    );

    const nonFinalProvisional = structuredClone(validProvisional) as unknown as {
      bars: Array<Record<string, unknown>>;
    };
    nonFinalProvisional.bars[0] = {
      ...nonFinalProvisional.bars[0]!,
      barId: "bar:60m:provisional:000",
      lifecycle: "provisional",
      progress: {
        completedBaseIntervals: 1,
        scheduledBaseIntervals: 12,
        progressStatus: "verified",
      },
    };
    nonFinalProvisional.bars[1] = {
      ...nonFinalProvisional.bars[1]!,
      barId: "bar:60m:finalized:001",
      lifecycle: "finalized",
      progress: null,
    };
    assert.throws(
      () => assertAnonymousMultiTimeframeChartArtifactV1(nonFinalProvisional),
      { message: /provisional bar must be final/ },
    );
  });

  it("preserves all four accepted chart combinations and rejects tampering", () => {
    const bundles = [
      renderAnonymousMultiTimeframePolicyChartsV1(makeCase()),
      renderAnonymousMultiTimeframePolicyChartsV1(makeCase({ sixtyMinute: 1 })),
      renderAnonymousMultiTimeframePolicyChartsV1(makeCase({ daily: 1 })),
      renderAnonymousMultiTimeframePolicyChartsV1(
        makeCase({ sixtyMinute: 1, daily: 1 }),
      ),
    ];
    assert.deepEqual(
      bundles.map((bundle) => [
        bundle.references.sixtyMinute === null,
        bundle.references.daily === null,
      ]),
      [
        [true, true],
        [false, true],
        [true, false],
        [false, false],
      ],
    );

    const bundle = bundles[3]!;
    assert.throws(
      () =>
        assertAnonymousMultiTimeframeChartBundleV1({
          ...bundle,
          primary: {
            ...bundle.primary,
            context: {
              ...bundle.primary.context,
              contentHash: sha("f"),
            },
          },
        }),
      { message: /contentHash does not match PNG bytes/ },
    );
  });
});
