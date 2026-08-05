# Phase 3D Multi-Timeframe Offline Foundation Reuse Scan V1

Status: COMPLETE REUSE DISCOVERY EVIDENCE; RECOMMENDATION ONLY

Date: 2026-08-05

Repository baseline: `44ae0cf10191d3f756ff46db9aae59d882f68a82`

Accepted design authority:

- `docs/contracts/PHASE3D_VERSIONED_BROOKS_MULTI_TIMEFRAME_CAPABILITY_V1.md`
- contract content hash `sha256:989eb4a9717aff887fd5c970abf6bd14e53e97f4e37216779e4d287774a50b90`
- `docs/decisions/PHASE3D_MULTI_TIMEFRAME_CAPABILITY_CONTRACT_APPROVAL_V1.json`
- approval-record hash `sha256:0107f512023f2e0e33bd892ba262e3ba3db24e0224d0dadea50c65b67b6eaf3c`

This record is read-only research evidence. It does not authorize Phase 3D1 implementation, dependency installation, Source access, Doctrine mutation, provider calls, real data, replay, training, Paper, Live, exchange connectivity, wallet access, or trading.

## 1. Decision summary

The scan found no external package, skill, MCP server, calendar engine, aggregation engine, chart library, or trading framework that should be added as a new Phase 3D1 dependency.

The bounded Phase 3D1 recommendation is:

1. add zero dependencies;
2. use repository-owned, separately versioned TypeScript contracts and strict validators for the accepted native 5m/optional native 60m/daily evidence model;
3. validate supplied higher-timeframe bars without generating, discovering, or silently replacing them;
4. reuse the already pinned `@resvg/resvg-js@2.6.2` rasterization seam, with system fonts disabled and no runtime network resources, for a separately versioned multi-timeframe renderer;
5. reuse the already pinned Ajv and JSONC parser only through separately versioned response-schema validation code;
6. keep every aggregation and calendar candidate outside the trusted runtime core;
7. keep browser charting, market-data skills/MCP servers, backtest frameworks, paper/live engines, and execution surfaces outside Phase 3D1.

This is a recommendation, not implementation authority. Exact implementation scope, tests, files, rollback, and falsification criteria require a separate Phase 3D1 plan and explicit authorization.

## 2. Evaluation boundary

A candidate was evaluated against these fixed Phase 3D requirements:

- exactly 120 finalized primary 5m bars are complete evidence;
- 40 through 119 finalized primary 5m bars are accepted as explicitly left-censored;
- fewer than 40 finalized primary 5m bars reject the request;
- optional 60m and daily references may contain 0 through 120 visible bars;
- each optional reference may contain at most one cutoff-frozen provisional bar;
- weekly and monthly evidence are excluded;
- native same-source 5m, 60m, and daily bars remain authoritative;
- local aggregation may validate but cannot silently replace native higher-timeframe bars;
- boundaries are fixed, versioned, session-aligned, non-rolling, and evaluated at one causal cutoff;
- missing reference context is valid;
- supplied malformed or causally invalid reference context rejects the request and cannot be silently dropped;
- higher-timeframe combination and disagreement remain Doctrine judgment, without voting, scoring, fixed priority, blanket veto, or independent timeframe trade plans;
- existing V1/V2 contract, prompt, response, package, Case, chart, and validator identities remain immutable.

The scan asked, for each candidate:

- Causality: can future, post-cutoff, corrected-after-cutoff, or unclosed information enter silently?
- Privacy: does runtime operation transmit market inputs, credentials, symbols, timestamps, or local data?
- Determinism: are boundaries, fonts, resources, runtime versions, and output bytes controlled?
- Audit: can exact source revision, configuration, input, output, and lifecycle state be content-hashed and replayed locally?
- Authority: does the candidate add data discovery, aggregation authority, backtesting, paper/live, orders, brokers, exchange submission, or wallet behavior?
- License: is the license clear and compatible with the narrow intended use?

## 3. Discovery protocol

### 3.1 Venues

The formal scan covered:

- skills.sh search results;
- ClawHub search and exact version inspection;
- official MCP registry exact and broad searches;
- GitHub repository search;
- GitHub code search;
- shallow read-only GitHub clones under `/tmp/pa-agent-lab-phase3d-reuse-scan`;
- GitHub repository, contributor, release, and tag metadata;
- npm package metadata, tarball integrity metadata, dependencies, and package-to-repository identity;
- repository package manifests, core implementation files, and tests.

No candidate package or skill was installed into PA Agent Lab. No candidate runtime, renderer, market-data client, calendar engine, aggregation engine, backtest engine, paper/live engine, or MCP server was executed. The `clawhub` registry client was invoked read-only through `npx`; candidate bundles were inspected as metadata and source files only.

### 3.2 GitHub repository and code query families

Multiple repository and code query families were used rather than one keyword search:

- multi-timeframe: `multi timeframe`, `multiple timeframe`, `multi resolution`, `OHLC resample`, `candlestick aggregate`, `bar aggregation`, `forming candle`, and `provisional candle`;
- calendars: `market calendar`, `exchange calendar`, `trading calendar`, `session calendar`, `early close`, `holiday schedule`, and `overnight session`;
- deterministic charts: `candlestick SVG`, `candlestick PNG`, `headless chart`, `server side chart`, `lightweight charts screenshot`, and `kline chart canvas`;
- authority controls: `look ahead guard`, `causal backtest`, `bar cutoff`, `paper broker`, `live feed`, and `order execution`;
- code terms: `current`, `closed`, `provisional`, `timestamp order`, `session`, `utcOffsetMinutes`, `break_start`, `special_closes`, `ZoneInfo`, `document.createElement`, `HTMLCanvasElement`, `devicePixelRatio`, `fontFamily`, `fetch`, `WebSocket`, `node:fs`, `paper`, `live`, `broker`, and `order`.

Exact repository identity was verified from each clone's `origin`, not inferred from npm names or forks.

### 3.3 Registry outcomes

#### skills.sh

The chart-oriented results were:

| Skill | Finding | Disposition |
|---|---|---|
| `starchild-ai-agent/official-skills@charting` | general chart-generation workflow | reference only |
| `longbridge/skills@longbridge-candlestick` | broker/platform-oriented candlestick workflow | reject for Phase 3D1 |
| `bklit/bklit-ui@bklit-ui` | UI/chart tooling, not a deterministic governed renderer core | reference only |
| `emeraldls/mmt-agent-skills@mmt-tradingview-charts` | TradingView-oriented chart workflow | reject for Phase 3D1 |
| `besoeasy/open-skills@generate-asset-price-chart` | asset-price chart workflow, not an identity-free renderer contract | reference only |
| `gemini/developer-platform@gemini-candles` | model/platform workflow, not an offline deterministic core | reject for Phase 3D1 |

Additional trading-skill repositories inspected at exact revisions were:

- `https://github.com/agiprolabs/claude-trading-skills.git` at `938a6ee84eed8f2b51cfb5055eaaddc8c596028d`;
- `https://github.com/Bhala-Srinivash/nse-trading-skills.git` at `03fa324829fb7e4d1db450a1d677b08e01334e73`;
- `https://github.com/longbridge/skills.git` at `84bff7bea32e7366b959abf6be4c7fede3764fb2`.

These repositories provide workflows, analysis material, broker/platform operations, or broad trading capabilities. They do not provide the required identity-free, cutoff-bound, native-bar validation and deterministic artifact core. They are not direct reuse candidates.

#### ClawHub

| Exact candidate | Source findings | Disposition |
|---|---|---|
| `@dannyshmueli/chart-image@2.6.35` | MIT-0 skill; Vega/Vega-Lite/Sharp; browser-free and no runtime network evidenced; local input reads/output writes; default `Helvetica, Arial, sans-serif`; broad raw spec/file/path surface; caret dependency ranges with lockfile | reference only / future adapter candidate |
| `@liam8/crypto-market-data@1.0.2` | remote `api.igent.net` market-data and token service; stores session token in `scripts/.token`; endpoint can be environment-overridden; query data leaves the process | reject |
| `@xj577/market-data@1.0.0` | remote Polygon, CoinGecko, ForexFactory, and Google News requests; distributed source contains a hardcoded Polygon API key; file-level scan status is suspicious | reject |
| `@xueyetianya/candlestick@1.0.0` | generic reference/checklist/strategy material, not a bar, calendar, cutoff, or renderer implementation | reference only |

The offline claim of `chart-image` is useful reference evidence. It does not establish byte-identical output across platforms because its output includes text rendered through system font-family fallback, and its generic Vega/Sharp surface is much broader than the accepted fixed anonymous candlestick geometry. No install or execution was warranted.

#### MCP registries

Exact official MCP registry searches for `market data`, `candlestick`, and `market calendar` returned no matching server suitable for this core. Broader `trading`, `finance`, `stock`, and `crypto` searches, plus GitHub MCP searches, predominantly returned:

- remote market-data and news providers;
- TradingView, broker, exchange, or crypto integrations;
- authenticated or paid services;
- backtest, signal, portfolio, order, or execution tools.

An MCP server would also add a process/protocol and often a network authority boundary where Phase 3D1 only needs pure local contracts, deterministic validation, and deterministic artifact generation. No MCP candidate is accepted.

## 4. Serious candidate ledger

Metadata was captured on 2026-08-05. Stars, contributors, and latest releases are discovery-time context; exact inspected revisions are the stable evidence identity.

### 4.1 Aggregation and multi-timeframe candidates

| Candidate | Exact inspected identity | Maintenance and release evidence | License and dependencies | Disposition |
|---|---|---|---|---|
| `valamidev/candlestick-convert` | `https://github.com/valamidev/candlestick-convert.git` at `1e9ef82dc9561dd8797eb40dd6f86f00535a1839`; npm `7.0.0` | 55 stars, 3 contributors; inspected HEAD 2024-10-14; no exact HEAD tag or GitHub release | GitHub metadata MIT, package manifest ISC; zero runtime dependencies | reject direct reuse |
| `adiled/ohlc-resample` | `https://github.com/adiled/ohlc-resample.git` at `0f24b1809896c643d92d040203ed7f3676704c06`; npm `1.2.1` | 27 stars, 4 contributors; inspected HEAD 2025-06-15; no exact HEAD tag or GitHub release | LGPL-3.0; `commander`, `fast-csv`, `lodash`, `ts-node` | reject |
| `klinecharts/data-aggregator` | `https://github.com/klinecharts/data-aggregator.git` at `a641c7cad68f11339f9e24c76c02f7b5f686ede6`; npm `@klinecharts/data-aggregator@0.1.0` | 8 stars, 1 contributor; inspected HEAD 2026-07-25; no exact HEAD tag or GitHub release | Apache-2.0; zero runtime dependencies | reference only / future adapter candidate |
| `junduck/trading-core` | `https://github.com/junduck/trading-core.git` at `324f7198e8444e1f08e6bd02c01a51c6d285e94f`; package `2.13.0` | 6 stars, 1 contributor; inspected HEAD 2026-01-08; no GitHub release | MIT; no runtime dependencies declared | reject as Phase 3D1 core |
| `TheCommandCat/fbtf` | `https://github.com/TheCommandCat/fbtf.git` at `7ae7080a0c1f481918b46a2bf61159166827609d` | 2 stars, 2 contributors; inspected HEAD 2026-04-22; no GitHub release | MIT; broad framework dependencies and CLI surface | reject |
| canonical `tripolskypetr/backtest-kit` | `https://github.com/tripolskypetr/backtest-kit.git` at `9807d28b353f56107cb0434f6184e50bbb22f9be`; npm `18.3.1` | 54 stars, 2 contributors; inspected HEAD 2026-08-05; latest GitHub release `18.0.0` on 2026-08-02 | MIT; five runtime packages plus TypeScript peer | reject |

The previously encountered `https://github.com/eamd-wq/backtest-kit.git` clone at `588bb143ae8f7b02faa311056752c56167106f8a` is a stale fork. It is not the npm-canonical source and is not used as evidence for `backtest-kit@18.3.1`.

### 4.2 Calendar candidates

| Candidate | Exact inspected identity | Maintenance and release evidence | License and dependencies | Disposition |
|---|---|---|---|---|
| `rsheftel/pandas_market_calendars` | `https://github.com/rsheftel/pandas_market_calendars.git` at exact tag `v5.4.0`, commit `275890784073a3a3a347e4f05f4dc986456e6a75` | 987 stars, 61 contributors; inspected HEAD 2026-05-26 | MIT; Python, `exchange-calendars>=3.3`, `pandas>=1.1` | reference only / future adapter candidate |
| `gerrymanoim/exchange_calendars` | `https://github.com/gerrymanoim/exchange_calendars.git` at `5308ce20578422fce74b10b43cc7d913a17e7a88`; latest release `4.13.2` | 661 stars, 95 contributors; inspected HEAD 2026-07-23; latest release 2026-03-10 | Apache-2.0; Python, NumPy, pandas, pyluach, toolz, tzdata, Korean lunar calendar | reference only / future adapter candidate |
| `PrettyGoodCapital/finance-dates` | `https://github.com/PrettyGoodCapital/finance-dates.git` at `5305a7f30dedac50b7a32bb6893fcd0af222e07c`; Rust/Python package `0.4.0` | 1 star, 4 contributors; inspected HEAD 2026-08-01; no GitHub release | Apache-2.0; Rust `chrono`, `chrono-tz`, `finance_enums`, `once_cell`; Python binding adds PyO3 | reference only / future adapter candidate |
| `moshejs/sifma-holidays` | `https://github.com/moshejs/sifma-holidays.git` at exact tag `v1.0.0`, commit `ce3d8298527a9d88d929ecba60d8378f7aa5b36a` | 0 stars, 1 contributor; exact tagged release 2026-07-16 | MIT; zero runtime dependencies | reference only, too narrow for general authority |

The `exchange_calendars` clone fetched historical `quantopian/trading_calendars` references, but its canonical current origin, package source URL, and GitHub identity all resolve to `gerrymanoim/exchange_calendars`. Historical remotes do not change the identity recorded above.

### 4.3 Chart candidates

| Candidate | Exact inspected identity | Maintenance and release evidence | License and dependencies | Disposition |
|---|---|---|---|---|
| `tradingview/lightweight-charts` | `https://github.com/tradingview/lightweight-charts.git` at `ef7335a8007236eac38bd50cacddc305c7fcb293`; latest release `v5.2.0` | 16,869 stars, 57 contributors; inspected HEAD 2026-08-05; latest release 2026-04-24 | Apache-2.0; browser chart library and canvas bindings | reject as deterministic renderer core |
| `klinecharts/KLineChart` | `https://github.com/klinecharts/KLineChart.git` at `bfbb57afbf3298c25a871835f785b21abcef5565`; latest release `v10.0.1` | 4,030 stars, 37 contributors; inspected HEAD 2026-08-05; latest release 2026-07-31 | Apache-2.0; browser chart library and canvas bindings | reject as deterministic renderer core |
| existing `@resvg/resvg-js` | npm `@resvg/resvg-js@2.6.2`, integrity `sha512-xBaJish5OeGmniDj9cW5PRa/PtmuVU3ziqrbr5xJj901ZDN4TosrVaNZpEiLZAxdfnhAe7uQ7QFWfjPe9d9K2Q==`; canonical `thx/resvg-js` tag `v2.6.2`, commit `9ca058462ac529120c8cc84ddcd6fef644cc5406` | 1,968 stars, 76 forks; exact release 2024-03-26; already pinned in this repository | MPL-2.0; platform-specific optional native packages all pinned to `2.6.2` | direct reuse of existing dependency only |
| ClawHub `chart-image` | `@dannyshmueli/chart-image@2.6.35`; `scripts/chart.mjs` hash `sha256:3557d9389b6c02042695d9988ccfc90aacbe7b4b7a9235483c4c93b8d17659c6` | 17 ClawHub stars, 415 installs, 15 versions | MIT-0 skill; Vega, Vega-Lite, Sharp with lockfile | reference only / future adapter candidate |

## 5. Source-level findings

### 5.1 Aggregation, cutoff, provisional, and late-correction behavior

#### `candlestick-convert`

Inspected `src/batchers/batchCandle.ts`, related batchers, interfaces, and tests.

- Batch assignment is timestamp arithmetic rather than a versioned venue/session boundary.
- Input arrays are sorted in place by timestamp, so out-of-order inputs are silently reordered and caller-owned data are mutated.
- Gaps are accepted without an explicit causal continuity contract.
- There is no request cutoff, observed-at timestamp, native-source identity, session/DST rule, provisional/final lifecycle, late-correction policy, or immutable reference snapshot.
- A completed array grouping is not equivalent to a native higher-timeframe bar known at the Phase 3D cutoff.
- The package/GitHub license mismatch (ISC versus GitHub MIT) adds avoidable audit ambiguity.

Result: reject direct reuse. The arithmetic is simple enough to implement only as repository-owned validation if separately authorized; it must not become native 60m/daily authority.

#### `ohlc-resample`

Inspected `src/lib.ts`, `src/types.ts`, CLI, tests, and manifest.

- It sorts input by timestamp and groups by arithmetic intervals.
- It does not model native-source authority, session-aligned venue boundaries, cutoff-frozen provisional state, observed-at ordering, or late corrections.
- Its CLI reads local files through `fs`; runtime dependencies add CSV, CLI, lodash, and TypeScript execution surfaces not needed by Phase 3D1.
- LGPL-3.0 is a further reason not to add it for a small function that still fails the accepted semantics.

Result: reject.

#### `@klinecharts/data-aggregator`

Inspected `src/DataAggregator.ts`, `src/sessions.ts`, `src/period.ts`, types, and tests.

Positive evidence:

- `current` and optional `closed` outputs distinguish forming from completed aggregation state;
- out-of-order trades are rejected;
- caller-supplied sessions, discontinuous breaks, overnight sessions, holidays, extra trading days, and session-aligned periods are represented;
- source code has no runtime network or filesystem access, and the package declares no runtime dependencies.

Disqualifying evidence for direct Phase 3D1 reuse:

- timezone handling is a fixed `utcOffsetMinutes`, not an IANA timezone/DST rule;
- holidays and extra days are caller data, without content-hashed calendar authority or historical exception provenance;
- it constructs bars from trades, whereas Phase 3D says native same-source 60m/daily bars are authoritative;
- `closed` is emitted when a later trade enters another period, not from an explicit decision cutoff contract;
- there is no observed-at field, late-correction lifecycle, correction-as-known-at-cutoff rule, immutable snapshot identity, source identity, privacy whitelist, or Phase 3D count/cutoff validator;
- its broader period support includes unaccepted weekly/monthly paths.

Result: strong reference and possible future read-only adapter candidate, but not a dependency and not higher-timeframe authority.

#### Broad frameworks

- `fbtf` exports a live feed and paper broker, implements orders/fills/attached exits/OCO behavior, reads/writes CLI files, and supports `backtest` and `paper` modes.
- canonical `backtest-kit@18.3.1` contains backtest plus production/live/paper, exchange synchronization, order, persistence, report, and broader runtime capabilities. Look-ahead protections do not remove those authority expansions.
- `trading-core` supplies generic bars, positions, orders, fills, portfolio/bookkeeping, backtesting, and algorithmic utilities. Its `MarketBar` contains symbol, OHLCV, `timestamp: Date`, and interval values through weekly/monthly, but has no cutoff, session, observed-at, provisional, privacy, native-authority, or immutable snapshot semantics.

Result: reject all three. Their useful generic types or look-ahead ideas can be read as references, but importing them would combine PA judgment infrastructure with backtest, paper/live, order, or execution semantics forbidden in Phase 3D1.

### 5.2 Calendar behavior

#### `pandas_market_calendars` and `exchange_calendars`

Source inspection confirmed support for:

- IANA/ZoneInfo timezone conversion and DST behavior;
- regular and adhoc holidays;
- special opens and special closes;
- intraday breaks and interruptions;
- venue-specific historical schedules and early closes;
- overnight and date-specific market behavior in covered calendars.

These projects are mature references, but direct reuse would add a Python runtime, pandas/NumPy and calendar dependencies, a separately maintained holiday/timezone authority, and significant content-versioning obligations. Phase 3D1 consumes frozen native bars; it does not discover schedules or generate authoritative higher-timeframe bars.

Result: reference only / future versioned adapter candidates. Any future adapter would need an exact package lock, calendar subset, timezone database version, generated schedule content hash, venue/source mapping, and independent native-bar comparison before it could be trusted.

#### `finance-dates`

Source inspection confirmed IANA timezone support through `chrono-tz`, multi-session and overnight schedules, early-close rules, holiday projections, historical exceptions, and extended sessions. The source itself also documents incomplete product-specific CME halt/early-close modeling in parts of its baseline.

It is newly created, lightly adopted, and would add Rust/Python build/runtime and embedded calendar authority. Its declared schedules are useful comparison material, not accepted PA Agent Lab source authority.

Result: reference only / future adapter candidate.

#### `sifma-holidays`

The package is narrow, zero-dependency, and explicit about its evidence quality. Only `2026` appears in `PUBLISHED_YEARS` as literal official SIFMA recommendations; other years are rule-derived projections. The source acknowledges Good Friday can differ between projected and published years.

Result: reference only. It is too narrow for general session authority, and projections cannot silently stand in for published native schedule evidence.

#### Calendar conclusion

No calendar engine is required in Phase 3D1. Native bars must carry enough versioned, cutoff-bound boundary evidence to be validated against the accepted contract. A future calendar adapter is a separate capability and authorization problem.

### 5.3 Chart determinism and resources

#### `lightweight-charts`

Source inspection found direct use of `document`, `window`, DOM element creation, `HTMLCanvasElement`, canvas contexts, browser-computed colors, `devicePixelRatio`, animation time, screenshot canvases, locale/date formatting, and font-family text rendering.

The project does not need to make market-data network calls to be unsuitable. Browser, pixel-ratio, locale, canvas, and system-font behavior are enough to prevent its screenshot API from establishing byte-identical offline PNG output across environments.

Result: reject as the Phase 3D deterministic renderer core.

#### `KLineChart`

Source inspection found direct use of `document`, `window`, resize observers, request-animation-frame/time, browser user-agent behavior, `HTMLCanvasElement`, canvas contexts, `devicePixelRatio`, locale/date formatting, and font measurement/rendering.

Result: reject as the Phase 3D deterministic renderer core.

#### ClawHub `chart-image`

The source and lock metadata support its claims of browser-free local rendering with Vega/Vega-Lite and Sharp, and no runtime network call was evidenced. However:

- default text uses `Helvetica, Arial, sans-serif`, leaving system font fallback relevant;
- its generic chart/spec/file/path surface is much wider than the fixed identity-free artifact contract;
- npm manifests use caret ranges, even though a lockfile is present;
- its output contract is publication-oriented, not a content-hashed anonymous bar bundle with fixed geometry and causal metadata.

Result: reference only / future adapter candidate, not a Phase 3D1 dependency.

#### Existing resvg seam

PA Agent Lab already pins `@resvg/resvg-js@2.6.2`. The current renderer:

- constructs SVG locally from fixed numeric geometry;
- contains no chart text or font-dependent labels;
- sets `font: { loadSystemFonts: false }`;
- uses fixed dimensions, colors, rendering options, and PNG encoding path;
- permits no network resources in its chart input;
- is covered by existing byte-level and pixel-level tests.

The exact npm integrity and exact upstream tag commit are recorded in the candidate ledger. Reusing this existing dependency in a separately versioned renderer adds no new dependency or browser surface.

Result: direct reuse of the existing pinned rasterization seam only. V1 renderer identity and bytes remain immutable.

### 5.4 Network, filesystem, telemetry, and authority surface

- The narrow aggregation libraries have no core runtime network clients. That does not cure their cutoff/session/native-authority deficiencies.
- `ohlc-resample` adds a filesystem CLI.
- Browser chart libraries depend on DOM/canvas runtime state even without market-data network calls.
- ClawHub market-data candidates make remote requests; one stores a token and another distributes a hardcoded provider key.
- Broad MCP results add remote data, authentication, broker, signal, or trading surfaces.
- `fbtf`, `backtest-kit`, and `trading-core` add backtest, paper/live, portfolio, order, fill, broker, or execution semantics.
- No serious candidate evidenced covert telemetry as the deciding issue. Rejections are based on explicit runtime surfaces and semantic mismatch, not README wording.

## 6. Final adjudication matrix

`Direct reuse` below means reuse is allowed only for an already present pinned dependency. It does not authorize code changes.

| Candidate | Classification | Causal reason | Privacy/determinism/audit reason | Authority/license reason |
|---|---|---|---|---|
| existing `@resvg/resvg-js@2.6.2` | direct reuse of existing seam | pure rendering after validated cutoff-bound input | fixed version/integrity, system fonts disabled, text-free fixed SVG geometry, local bytes | already accepted dependency; MPL-2.0; no new capability authority |
| `@klinecharts/data-aggregator@0.1.0` | reference only / future adapter | forming/closed and order checks are useful, but no explicit decision cutoff, observed-at, or correction lifecycle | fixed offset rather than IANA/DST; caller calendar has no content-hash authority | constructs local bars and would risk replacing native authority; Apache-2.0 |
| `candlestick-convert@7.0.0` | reject direct reuse | silently sorts/mutates inputs; no cutoff/provisional/correction lifecycle | epoch arithmetic lacks session/DST/source audit | native-authority mismatch; ISC/MIT metadata conflict |
| `ohlc-resample@1.2.1` | reject | no cutoff/provisional/correction lifecycle | filesystem CLI and avoidable dependencies | local aggregation authority plus LGPL-3.0 |
| `pandas_market_calendars@5.4.0` | reference only / future adapter | strong sessions but not tied to the request's native bar cutoff | Python/pandas and calendar/tzdata content authority must be separately pinned | schedule discovery is outside Phase 3D1; MIT |
| `exchange_calendars` | reference only / future adapter | strong sessions/history but not request-native evidence | Python/NumPy/pandas/tzdata and generated schedule hashes required | calendar authority outside Phase 3D1; Apache-2.0 |
| `finance-dates@0.4.0` | reference only / future adapter | handles DST/overnight/early close but some product exceptions remain incomplete | new Rust/Python runtime and embedded schedule authority | outside Phase 3D1; Apache-2.0 |
| `sifma-holidays@1.0.0` | reference only | only 2026 is literal published data; other years projected | very narrow one-maintainer evidence base | cannot be general session authority; MIT |
| `lightweight-charts` | reject as renderer core | chart does not enforce Phase 3D cutoff semantics | DOM/canvas/device pixel ratio/locale/system-font variables prevent byte proof | browser UI dependency; Apache-2.0 |
| `KLineChart` | reject as renderer core | chart does not enforce Phase 3D cutoff semantics | DOM/canvas/device pixel ratio/locale/system-font variables prevent byte proof | browser UI dependency; Apache-2.0 |
| ClawHub `chart-image@2.6.35` | reference only / future adapter | generic input has no Phase 3D causal contract | system font fallback and broad spec/file surface; not fixed anonymous artifact identity | no runtime network evidenced, but unnecessary dependency expansion; MIT-0 |
| market-data skills and MCP servers | reject | live/remote data are not frozen request evidence | transmit queries/data, require remote service or credentials, sometimes persist tokens | add market discovery/provider/broker authority |
| `fbtf` | reject | feed/backtest behavior is broader than synthetic contract tests | CLI file persistence and broad runtime | paper broker, live feed, orders/fills; MIT |
| canonical `backtest-kit@18.3.1` | reject | look-ahead guards do not implement Phase 3D native cutoff contract | persistence/report/exchange synchronization surface | live/paper/orders/execution authority; MIT |
| `trading-core@2.13.0` | reject as core | generic bars omit cutoff/provisional/session/native semantics | symbol/Date/interval model is not the identity-free audit contract | order/fill/portfolio/backtest semantics; MIT |
| trading analysis skills | reference only or reject | workflows do not create validated cutoff-bound inputs | no deterministic content-hashed core | many introduce broker/platform/strategy behavior |

## 7. Dependency and implementation recommendation

### 7.1 Dependency decision

Recommended Phase 3D1 dependency delta: **zero**.

Existing allowed seams, subject to separate implementation authorization, are:

- TypeScript and repository-owned contract utilities already in the workspace;
- `@resvg/resvg-js@2.6.2` for separately versioned fixed SVG-to-PNG rasterization;
- `ajv@8.20.0` for separately versioned strict JSON Schema validation;
- `jsonc-parser@3.3.1` only where the existing strict invented-response parsing pattern applies.

No candidate is approved for installation by this record.

### 7.2 Boundary consequences for a later Phase 3D1 plan

A later exact implementation plan should require, without treating this list as authorization:

- separate multi-timeframe Case/input/chart/response/validator identities;
- required native 5m plus optional native 60m/daily references;
- explicit finalized/provisional and cutoff-frozen evidence fields;
- reject-on-invalid supplied references;
- no local aggregation as silent authority;
- no calendar discovery or schedule generation;
- no weekly/monthly paths;
- no provider/model call, Source access, real data, replay, training, persistence widening, Paper/Live, order, broker, exchange, or wallet path;
- synthetic paired fixtures with byte-identical 5m input and only reference presence changed;
- deterministic fixed-resource PNG tests at byte and pixel level.

### 7.3 Falsification criteria

The zero-new-dependency recommendation must be reopened before implementation if any required accepted behavior cannot be implemented and proven with the existing toolchain, specifically if:

- native reference boundary validation requires an external authoritative schedule that the accepted contract does not supply;
- the existing pinned resvg seam cannot produce deterministic fixed-resource artifacts for the accepted multi-timeframe layout;
- strict schema/semantic validation cannot be expressed with the existing Ajv and TypeScript seams;
- a candidate's exact pinned revision is proposed for runtime use beyond the classification in this record.

Reopening requires a new exact evidence record and separate dependency/capability authorization. It cannot occur implicitly during implementation.

## 8. Residual gaps and next gate

This scan does not prove:

- full Phase 3D multi-timeframe capability;
- correctness of any future implementation;
- availability or validity of real native 60m/daily data;
- a complete Brooks semantic corpus;
- profitability;
- provider readiness;
- replay, Paper/Live, or trading readiness.

The next permissible governance action is to draft an exact Phase 3D1 implementation plan and authorization proposal bound to baseline `44ae0cf10191d3f756ff46db9aae59d882f68a82`, then ask Calvin one focused approval question. No worktree, implementation, test mutation, schema proposal, chart mutation, or governance authorization commit may be created until that separate plan is reviewed and Calvin explicitly authorizes it.
