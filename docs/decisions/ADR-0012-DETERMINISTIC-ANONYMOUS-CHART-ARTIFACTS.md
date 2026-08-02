# ADR-0012: Deterministic Anonymous Chart Artifacts

Status: ACCEPTED. IMPLEMENTED AS A PHASE 1 VERTICAL SLICE.

## Context

ADR-0005 requires a deterministic anonymous context chart and final-40 detail chart. ADR-0011 previously froze only their manifests and deferred image rendering and storage.

The reuse scan in `docs/research/CHART_RENDERER_SKILL_MCP_REUSE_SCAN_V1.md` evaluated skills.sh, ClawHub, market-chart skills, TradingView MCP integrations, general chart MCP servers, and rendering libraries. Existing chart skills commonly fetch market data or add indicators. General chart MCPs are valuable but either use remote rendering, expose source/date semantics, omit continuity, or carry a substantially wider runtime and configuration surface than this frozen two-image contract.

## Decision

PA Agent Lab V1 renders both policy images locally with:

- one repository-owned, deterministic SVG candlestick scene;
- unmodified `@resvg/resvg-js@2.6.2` with pinned `@resvg/resvg-js-linux-x64-gnu@2.6.2` native runtime for SVG-to-PNG rasterization;
- fixed renderer identity `pa-candlestick-svg-resvg.v1`;
- fixed output size `1200 x 720` pixels;
- no system fonts, text, titles, symbols, dates, timestamps, labels, volume, indicators, overlays, external images, or network resources.

The context artifact renders every visible anonymous bar, normally 120 and explicitly 40 through 119 when left-censored. The detail artifact renders exactly the final 40 anonymous bars. Each panel independently fits its visible high/low range with fixed six-percent vertical padding; normalized OHLC remains the precise comparison authority.

Candles use fixed up, down, and doji colors. Non-contiguous transitions are visible as fixed lines for `session_boundary`, `missing_data`, and non-initial `unknown`. These lines communicate input uncertainty and never repair or interpolate a gap.

## Shared market input

`createAnonymousMarketInput` is the sole normalization and anonymous-bar mapping seam used by both `BrooksPolicyInputV1` and the renderer. Renderer code does not reimplement raw-price normalization or local-to-anonymous ID mapping.

No local case ID, stream ID, local bar ID, raw price, source identity, symbol, venue, or real time enters SVG or PNG bytes.

## Artifact identity and validation

Each `AnonymousChartArtifactV1` stores locally:

- schema, renderer, runtime, panel, and dimensions;
- anonymous normalized bars and their relative IDs;
- render-input hash;
- PNG content hash and byte length;
- canonical base64 PNG bytes;
- final anonymous visible-bar ID;
- immutable artifact ID.

The provider-facing `AnonymousChartManifestV1` strips the normalized bars and PNG bytes. It exposes only panel, `image/png`, content hash, anonymous bar IDs, and final anonymous bar ID as already accepted by ADR-0011.

Runtime artifact validation:

- enforces exact plain-object and dense-array fields;
- revalidates normalized OHLC, anonymous IDs, continuity, and 120/40 bounds;
- validates canonical base64, PNG signature, IHDR, dimensions, and content hash;
- recomputes the render-input and artifact hashes;
- re-renders the stored normalized bars with the pinned renderer and requires byte-identical PNG output.

A bundle binds source Case hash, reconstructed anonymous-market hash, context artifact, and detail artifact. `assertAnonymousChartBundleForCase` independently rebinds the bundle to a supplied local Case.

## Local content-addressed storage

`persistAnonymousChartArtifacts` writes files named only by PNG SHA-256 under a caller-provided local directory. Repeated writes are idempotent. If an existing hash-named file contains different bytes, persistence fails closed instead of overwriting or silently repairing it.

The storage result is local-only and never enters model context.

## Dependency authorization

This ADR authorizes exactly `@resvg/resvg-js@2.6.2` and `@resvg/resvg-js-linux-x64-gnu@2.6.2` for the first WSL2/Linux x64 GNU environment. Both remain unmodified MPL-2.0 external dependencies. Artifact and bundle hashes record both identities; other operating systems, architectures, or libc variants fail closed and require a separately versioned renderer runtime. This approval does not authorize Sharp, browser automation, TradingView, ECharts, chart MCP servers, remote render services, system fonts, or external image loading.

The local SVG scene is intentionally narrow: candle/wick geometry, grid, border, and continuity markers only. resvg supplies the mature rasterization and PNG implementation.

## Future MCP and skill boundary

When an agent needs on-demand chart generation beyond frozen policy-input construction, prefer a project-scoped MCP plus skill that wraps this exact renderer contract. The MCP must accept only already validated anonymous market input and return content-addressed artifacts. It must not fetch market data or expose rendering choices as Brooks strategy authority.

General chart MCPs may be reconsidered for non-authoritative exploratory visualization through a separate permission and privacy review.

## Not authorized

This ADR does not authorize:

- provider transport or external model calls;
- browser or TradingView capture;
- market-data acquisition;
- indicators, signal detection, or strategy interpretation;
- PostgreSQL/API persistence;
- chart access to Calvin review, outcomes, PnL, positions, or research memory;
- replay, training, Paper, Live, exchange, wallet, or real-money activity.
