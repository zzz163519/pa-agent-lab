import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";

import {
  createBrooksPolicyCase,
  createBrooksPolicyInput,
} from "../../contracts/src/policy-input-v1.ts";
import {
  ANONYMOUS_CHART_RENDERER_PLATFORM,
  assertAnonymousChartArtifact,
  assertAnonymousChartBundle,
  assertAnonymousChartBundleForCase,
  persistAnonymousChartArtifacts,
  renderAnonymousPolicyCharts,
  toAnonymousChartManifest,
} from "../src/anonymous-chart-renderer-v1.ts";

function makePolicyCase(count = 120) {
  return createBrooksPolicyCase({
    caseId: "case:chart-renderer",
    policyStreamId: "stream:chart-renderer",
    barDurationSeconds: 300,
    bars: Array.from({ length: count }, (_, index) => {
      const center = 100 + Math.sin(index / 6) * 8 + index * 0.08;
      const open = center + (index % 2 === 0 ? -1.2 : 1.1);
      const close = center + (index % 2 === 0 ? 1.4 : -1.3);
      return {
        barId: `local:${index}`,
        sequence: 900 + index,
        open,
        high: Math.max(open, close) + 1.5,
        low: Math.min(open, close) - 1.4,
        close,
        isClosed: true,
        continuityFromPrevious:
          index === 0
            ? ("unknown" as const)
            : index === 60
              ? ("session_boundary" as const)
              : index === 90
                ? ("missing_data" as const)
                : ("contiguous" as const),
      };
    }),
    lastVisibleBarId: `local:${count - 1}`,
    isLeftCensored: count < 120,
  });
}

function decodePng(png: Buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const chunkTypes: string[] = [];
  const imageChunks: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    chunkTypes.push(type);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === "IDAT") {
      imageChunks.push(data);
    }
    offset += length + 12;
    if (type === "IEND") break;
  }
  assert.equal(bitDepth, 8);
  assert.equal(interlace, 0);
  assert.ok(colorType === 6 || colorType === 2);
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(imageChunks));
  assert.equal(inflated.length, (stride + 1) * height);
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
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba[pixel * 4] = raw[pixel * bytesPerPixel]!;
    rgba[pixel * 4 + 1] = raw[pixel * bytesPerPixel + 1]!;
    rgba[pixel * 4 + 2] = raw[pixel * bytesPerPixel + 2]!;
    rgba[pixel * 4 + 3] = colorType === 6 ? raw[pixel * 4 + 3]! : 255;
  }
  return { width, height, chunkTypes, rgba };
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function countRgb(pixels: Buffer, red: number, green: number, blue: number): number {
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (
      pixels[offset] === red &&
      pixels[offset + 1] === green &&
      pixels[offset + 2] === blue
    ) {
      count += 1;
    }
  }
  return count;
}

describe("anonymous Brooks chart renderer V1", () => {
  it("renders deterministic real PNG artifacts for the 120/40 policy input", () => {
    const policyCase = makePolicyCase();
    const first = renderAnonymousPolicyCharts(policyCase);
    const second = renderAnonymousPolicyCharts(policyCase);

    assert.equal(first.bundleId, second.bundleId);
    assert.equal(first.rendererPlatform, ANONYMOUS_CHART_RENDERER_PLATFORM);
    assert.equal(first.context.pngBase64, second.context.pngBase64);
    assert.equal(first.detail.pngBase64, second.detail.pngBase64);
    assert.notEqual(first.context.contentHash, first.detail.contentHash);
    assert.deepEqual(
      Buffer.from(first.context.pngBase64, "base64").subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    assert.equal(first.context.barIds.length, 120);
    assert.equal(first.detail.barIds.length, 40);
    assert.equal(first.context.lastVisibleBarId, "bar:119");
    assert.equal(first.detail.lastVisibleBarId, "bar:119");
    assertAnonymousChartArtifact(first.context);
    assertAnonymousChartArtifact(first.detail);
    assertAnonymousChartBundleForCase(first, policyCase);
    const decoded = decodePng(Buffer.from(first.context.pngBase64, "base64"));
    assert.equal(decoded.width, 1200);
    assert.equal(decoded.height, 720);
    assert.equal(
      decoded.chunkTypes.some((type) =>
        ["tIME", "tEXt", "zTXt", "iTXt", "eXIf"].includes(type),
      ),
      false,
    );
    assert.ok(countRgb(decoded.rgba, 8, 127, 91) > 100);
    assert.ok(countRgb(decoded.rgba, 196, 61, 75) > 100);
    assert.ok(countRgb(decoded.rgba, 109, 76, 194) > 100);
    assert.ok(countRgb(decoded.rgba, 176, 91, 22) > 100);

    const policyInput = createBrooksPolicyInput({
      policyCase,
      charts: {
        context: toAnonymousChartManifest(first.context),
        detail: toAnonymousChartManifest(first.detail),
      },
      doctrine: [],
    });
    assert.equal(policyInput.charts.context.contentHash, first.context.contentHash);
    assert.equal(policyInput.charts.detail.contentHash, first.detail.contentHash);
  });

  it("renders the 40-bar left-censored floor without inventing context", () => {
    const bundle = renderAnonymousPolicyCharts(makePolicyCase(40));

    assertAnonymousChartBundle(bundle);
    assert.equal(bundle.context.barIds.length, 40);
    assert.equal(bundle.detail.barIds.length, 40);
    assert.deepEqual(bundle.context.barIds, bundle.detail.barIds);
    assert.equal(bundle.context.contentHash, bundle.detail.contentHash);
    assert.notEqual(bundle.context.artifactId, bundle.detail.artifactId);
    assert.equal(bundle.context.lastVisibleBarId, "bar:039");
  });

  it("rejects artifact or bundle metadata that no longer matches rendered bytes", () => {
    const bundle = renderAnonymousPolicyCharts(makePolicyCase());

    assert.throws(
      () =>
        assertAnonymousChartArtifact({
          ...bundle.context,
          byteLength: bundle.context.byteLength + 1,
        }),
      { message: /byteLength does not match PNG bytes/ },
    );
    assert.throws(
      () =>
        assertAnonymousChartArtifact({
          ...bundle.context,
          bars: bundle.context.bars.map((bar, index) =>
            index === 0 ? { ...bar, sequence: 1 } : bar,
          ),
        }),
      { message: /sequence must match its anonymous barId/ },
    );
    assert.throws(
      () => assertAnonymousChartBundleForCase(bundle, makePolicyCase(40)),
      { message: /sourceCaseHash does not match the policy case/ },
    );
    assert.throws(
      () =>
        assertAnonymousChartBundle({
          ...bundle,
          detail: bundle.context,
        }),
      { message: /bundle panels are inconsistent/ },
    );
  });

  it("persists content-addressed PNGs idempotently and rejects corrupt reuse", async () => {
    const bundle = renderAnonymousPolicyCharts(makePolicyCase());
    const directory = await mkdtemp(join(tmpdir(), "pa-chart-artifacts-"));
    try {
      const first = await persistAnonymousChartArtifacts(bundle, directory);
      const second = await persistAnonymousChartArtifacts(bundle, directory);
      assert.deepEqual(first, second);
      assert.match(
        first.contextPath,
        new RegExp(`${bundle.context.contentHash.slice("sha256:".length)}\\.png$`),
      );
      assert.deepEqual(
        await readFile(first.contextPath),
        Buffer.from(bundle.context.pngBase64, "base64"),
      );
      assert.deepEqual(
        await readFile(first.detailPath),
        Buffer.from(bundle.detail.pngBase64, "base64"),
      );

      await writeFile(first.contextPath, Buffer.from("corrupt"));
      await assert.rejects(
        () => persistAnonymousChartArtifacts(bundle, directory),
        { message: /existing content-addressed chart artifact has invalid bytes/ },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
