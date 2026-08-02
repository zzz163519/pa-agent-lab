# Chart Rendering Skill, MCP, and Library Reuse Scan V1

Status: REVIEWED ENGINEERING EVIDENCE FOR ADR-0012. NOT STRATEGY AUTHORITY.

Reviewed: 2026-08-02.

## Search method

The scan used:

- Skills CLI searches for `candlestick chart`, `OHLCV market chart screenshot`, `MCP financial chart`, and `TradingView screenshot`;
- skills.sh pages and install counts;
- ClawHub skill pages;
- web search for local chart-rendering MCP servers;
- GitHub repository metadata and source inspection;
- npm package metadata for exact dependency and unpacked-size checks.

No skill or MCP was installed merely because it appeared in search results. Candidates were checked against the PA Agent Lab boundary: caller-supplied anonymous closed-bar OHLC, no market-data fetch, no symbol/time/venue leakage, no indicators, no login, no replay/live state, deterministic fixed-size PNG, content hashing, and local-only execution.

## Candidate assessment

| Candidate | Evidence | Assessment |
|---|---|---|
| [Starchild charting skill](https://skills.sh/starchild-ai-agent/official-skills/charting) | About 4.4K skills.sh installs. Its workflow writes and executes Python chart scripts, and explicitly says chart scripts fetch data internally with `requests`. | Rejected for the baseline. Internal fetch bypasses the frozen causal Case and can add source identity or unavailable bars. |
| [Longbridge candlestick skill](https://skills.sh/longbridge/skills/longbridge-candlestick) | About 577 installs. Detects classic candle patterns and produces directional signals. | Not a renderer. It would also introduce a second semantic/pattern authority. |
| [TradingView MCP assistant](https://skills.sh/aradotso/mcp-skills/tradingview-mcp-assistant) | About 226 installs. Controls a subscribed TradingView Desktop instance through CDP and exposes symbol/timeframe navigation, indicators, alerts, replay, and live streaming. | Rejected for baseline input. It exposes prohibited source identity and runtime state, and its browser screenshot is not a frozen anonymous artifact. |
| [ClawHub Charts](https://clawhub.ai/ryandeangraves/charts) | Python module fetching Yahoo Finance/CoinGecko data, then adding SMA, RSI, Fibonacci, pattern detection, and named assets. | Rejected. It fetches data and adds indicators and strategy interpretation that are outside the Brooks input contract. |
| [mcp-stock-chart](https://github.com/dcaoyuan/mcp-stock-chart) | Apache-2.0, three GitHub stars at review time, ticker-oriented `generate_stock_chart` surface. | Rejected for the baseline because it is ticker/source oriented and does not expose the required anonymous 120/40, continuity, or immutable artifact contract. |
| [AntV MCP Server Chart](https://github.com/antvis/mcp-server-chart) | MIT, about 4.2K GitHub stars, 26+ chart tools. Default rendering uses a remote service; listed tools do not include candlestick. | Strong general visualization MCP, but rejected for the baseline due to remote default and missing required candlestick/continuity contract. Suitable for unrelated non-private visualization later. |
| [mcp-echarts](https://github.com/hustcc/mcp-echarts) | MIT, about 256 stars, local PNG/Base64 rendering and a candlestick tool. Includes a generic ECharts-option tool. | Closest MCP candidate. Not selected for the baseline: the published package is about 7.5 MB unpacked and bundles MCP SDK, Express, MinIO, dotenv, ECharts, and canvas; the candlestick tool sorts date strings, renders date/legend semantics, omits continuity, and PNG output uses a 3x canvas. Environment configuration may switch output to MinIO. Keep as a future non-authoritative or sandboxed MCP candidate. |
| [Microsoft Flint Chart MCP](https://github.com/microsoft/flint-chart) | MIT, about 3K stars, candlestick templates and multiple rendering backends. Published MCP package is about 4.5 MB and includes ECharts, Chart.js, Vega, Vega-Lite, canvas, resvg, MCP SDK, and an automatic semantic layout layer. | High-quality general agent visualization system, but broader and less frozen than needed for the two baseline images. Consider for future exploratory agent charts, not the authoritative policy input. |
| [resvg-js](https://github.com/thx/resvg-js) | MPL-2.0, about 1.9K stars, pinned npm version `2.6.2`. Rust resvg through napi-rs, prebuilt platform binaries, direct SVG-to-PNG, no browser, and system fonts can be disabled. | Selected as the narrow rasterization dependency. It has no market-data, indicator, account, provider, storage, or network capability. |

Counts are discovery evidence only and will change. They are not authority or a substitute for source inspection.

## Decision implication

No discovered skill or MCP simultaneously met the authoritative baseline constraints with a smaller trust and dependency surface than pinned resvg-js.

PA Agent Lab therefore:

1. keeps normalization, causal bar selection, anonymity, continuity, and content hashing in local strict TypeScript contracts;
2. uses a small repository-owned SVG candlestick scene with no text, fonts, external images, market fetches, or indicators;
3. delegates only SVG rasterization to unmodified `@resvg/resvg-js@2.6.2` with the pinned Linux x64 GNU `2.6.2` native package;
4. can later expose this deterministic renderer through a project MCP plus skill when an agent genuinely needs on-demand chart generation;
5. may use mature general chart MCPs for non-authoritative exploratory visualization only after an explicit tool-permission and privacy review.

This is not a general rule against MCP. It is a bounded decision for the exact frozen Brooks policy input where byte reproducibility and causal provenance are stronger requirements than interactive chart flexibility.
