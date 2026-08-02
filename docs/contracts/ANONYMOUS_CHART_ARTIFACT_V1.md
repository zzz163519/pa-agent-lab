# Anonymous Chart Artifact V1

Status: IMPLEMENTED CONTRACT AND RENDERER SLICE. NO MARKET-DATA OR MODEL AUTHORITY.

Authority: ADR-0005, ADR-0009, ADR-0011, and ADR-0012.

## Package

Public renderer package:

```text
@pa-agent-lab/chart-renderer
@pa-agent-lab/chart-renderer/anonymous-chart-renderer-v1
```

Public seams:

- `createAnonymousMarketInput`
- `renderAnonymousPolicyCharts`
- `assertAnonymousChartArtifact`
- `assertAnonymousChartBundle`
- `assertAnonymousChartBundleForCase`
- `toAnonymousChartManifest`
- `persistAnonymousChartArtifacts`

## Render flow

```text
BrooksPolicyCaseV1
  -> createAnonymousMarketInput
      -> context SVG: every visible anonymous bar
      -> detail SVG: final 40 anonymous bars
          -> pinned resvg-js rasterization
              -> validated content-addressed PNG artifacts
                  -> stripped chart manifests
                      -> BrooksPolicyInputV1
```

The renderer never receives a symbol, venue, real time, account, outcome, or model decision. It renders normalized OHLC and continuity only.

## Fixed rendering contract

- renderer ID: `pa-candlestick-svg-resvg.v1`;
- runtime: `@resvg/resvg-js@2.6.2`;
- native platform runtime: `@resvg/resvg-js-linux-x64-gnu@2.6.2`;
- output: PNG, `1200 x 720`;
- no fonts, labels, metadata text, external images, or network resources;
- independently fitted panel range with fixed six-percent vertical padding;
- fixed grid and border;
- fixed bullish, bearish, and doji colors;
- fixed session-boundary, missing-data, and unknown-continuity markers;
- no volume, indicator, overlay, annotation, or signal inference.

The chart is visual geometry. Normalized OHLC remains the exact numeric authority.

## Artifact fields

An artifact includes local normalized bars so validation can prove the image, but `toAnonymousChartManifest` strips them before model-input assembly.

Artifact identity commits to:

- renderer, JS runtime, and native platform runtime;
- panel and dimensions;
- render-input hash;
- PNG content hash and byte length;
- anonymous bar IDs and final visible ID.

The render-input hash commits to every normalized OHLC and continuity value. Runtime validation re-renders those bars and compares the complete PNG byte sequence.

## Bundle invariants

A valid bundle requires:

- a context artifact containing 40 through 120 bars;
- one detail artifact containing exactly 40 bars;
- detail IDs exactly equal to the final 40 context IDs;
- a shared final anonymous visible-bar ID;
- anonymous-market hash reconstructed from context bars and censoring metadata;
- source Case hash and optional independent rebinding through `assertAnonymousChartBundleForCase`;
- canonical bundle identity over both artifact IDs.

For a left-censored 40-bar Case, context and detail may share one PNG content hash because they show the same visible bars. Their artifact IDs remain distinct because panel identity differs.

## PNG validation

The validator rejects:

- unknown, missing, accessor, symbol, sparse, or non-index fields;
- malformed or non-canonical base64;
- non-PNG bytes or invalid IHDR;
- wrong dimensions, byte length, or content hash;
- malformed anonymous IDs or OHLC geometry;
- wrong 120/40 membership;
- render-input hash mismatch;
- a valid PNG that is not byte-identical to pinned renderer output for the stored bars;
- artifact, bundle, market, or Case identity mismatch.

## Content-addressed persistence

PNG filenames are `<sha256-hex>.png`. Persistence creates the requested local directory, uses exclusive writes, and accepts an existing file only when its bytes match the artifact hash. Existing corrupt content fails closed.

Files under the repository default `var/` boundary remain ignored by Git. No image artifact is committed by this contract.

## Tests

Tests use synthetic closed bars only and verify:

- repeated rendering is byte-identical;
- context/detail membership and left-censoring;
- valid policy-input manifest construction;
- PNG signature, dimensions, decompression, and nonblank candle pixels;
- bullish, bearish, session-boundary, and missing-data colors;
- absence of PNG text/time/EXIF chunks;
- artifact and Case-binding tamper rejection;
- idempotent content-addressed writes and corrupt-file rejection.

These tests prove renderer and artifact behavior, not Price Action doctrine, model vision quality, or profitability.

## Implemented by ADR-0013

ADR-0013 now provides strict persisted chart metadata plus PostgreSQL uniqueness and Case-binding constraints. PNG bytes remain in this contract's content-addressed files.

## Still deferred

- provider-specific image transport;
- an MCP/skill wrapper for on-demand agent use;
- a running database or API service;
- visual model-quality evaluation;
- any market fetch, model call, replay, training, or trading authority.
