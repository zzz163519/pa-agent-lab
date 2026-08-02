# ADR-0007: Deterministic Replay Platform Boundary

Status: ACCEPTED PLATFORM DIRECTION. PHASE 8 IMPLEMENTATION IS NOT YET AUTHORIZED.

## Decision

PA Agent Lab will not build a complete backtest, matching, portfolio, and accounting engine from scratch.

When Phase 8 is separately authorized, the first replay implementation will evaluate a pinned, unmodified NautilusTrader release as a local deterministic replay/execution sidecar behind a narrow, versioned TypeScript contract. NautilusTrader remains a replaceable implementation detail. It receives frozen replay inputs and has no Brooks doctrine, retrieval, model, policy, or research authority.

QuantConnect LEAN will be used only as a point-in-time conformance challenger on a small set of frozen, hand-computed synthetic fixtures. It is not a second maintained production integration. If NautilusTrader fails the accepted conformance gates, PA Agent Lab must reopen the platform decision rather than silently switching engines or weakening the gates.

This ADR approves the platform direction and the Phase 8 evaluation boundary. It does not authorize installing either engine, adding a Python or C# runtime, loading historical outcomes, or running replay before the Phase 8 contracts and implementation are separately approved.

## Replay boundary

The authoritative flow is:

```text
frozen brooksDecision and experiment policy
  -> TypeScript ReplayRequest validation
  -> isolated deterministic replay sidecar
  -> normalized ReplayResult and raw engine artifacts
  -> TypeScript invariant validation and immutable audit
```

The following rules apply:

- model inference and doctrine retrieval finish before replay begins;
- replay consumes immutable, content-hashed decisions and never calls or mutates a model mid-run;
- deterministic experiment policy, not the Brooks Policy Agent, supplies any sizing, fee, slippage, funding, latency, and portfolio assumptions;
- protected-window and dataset-authorization checks run before data is opened or sent to the sidecar;
- the sidecar receives no source corpus, `calvinReview`, research memory, account credential, wallet material, or external model access;
- canonical requests, normalized results, raw engine artifacts, engine version, image digest, configuration, and validation outcomes are retained by the PA audit boundary.

## Causal fill and ambiguity policy

NautilusTrader's default or adaptive OHLC traversal must not silently decide intrabar path for PA Agent Lab.

- A decision formed through closed bar R cannot fill against an earlier event or an intrabar price from R.
- Approved finer-grained execution data after R may resolve order sequencing, but it remains inaccessible to the policy input and model retrieval path.
- When available data cannot establish whether competing boundaries were reached first, the result is explicitly `ambiguous` and fails closed.
- Missing data, gaps, segment boundaries, and right-censoring remain explicit terminal or unresolved states according to the Phase 1 contracts.
- Probabilistic fill and unrecorded randomness are forbidden in the authoritative replay path.

## Isolation and license boundary

The Phase 8 sidecar must be local, containerized, version-pinned, and process-isolated from the TypeScript workspace. Its runtime must have no public listener, no exchange credentials, no wallet access, and no usable Paper or Live configuration. Network access is denied unless a later narrowly scoped decision proves it is required for an approved local build or artifact acquisition step; authoritative replay itself runs offline.

NautilusTrader is LGPL-3.0. The accepted posture is an unmodified separate-process sidecar with the applicable license and source notices preserved. Vendoring, static linking, modifying the engine, or redistributing a derived image requires a new license and architecture review.

LEAN is Apache-2.0 and is used only for the bounded conformance role described above.

## Minimum adoption gates

Before NautilusTrader may become the Phase 8 replay engine, synthetic tests must prove at least:

1. identical frozen inputs produce a byte-identical canonical result across fresh container starts;
2. a decision formed at R cannot fill from R's earlier OHLC range;
3. causal-prefix runs preserve all earlier replay events and states;
4. unresolved same-bar stop/target ordering becomes `ambiguous` rather than an assumed path;
5. gaps, missing data, segment resets, and right-censored positions fail closed as contracted;
6. fixed fee, slippage, funding, latency, order, fill, position, and accounting fixtures match hand-computed references;
7. malformed schemas, unauthorized datasets, protected windows, and identity leakage are rejected before sidecar execution;
8. authoritative replay runs without network, credentials, Paper adapters, or Live adapters;
9. a bounded LEAN comparison either matches the simple reference fixtures or records an explained contractual difference;
10. engine, adapter, image, request, result, and raw-artifact hashes are sufficient to reproduce and audit the run.

No gate may be relaxed because an engine otherwise produces plausible PnL.

## Amendment to ADR-0006

ADR-0006's Python restriction is amended only as follows:

- Python remains forbidden in the initial TypeScript application except for a separately approved model-training pipeline or the isolated Phase 8 deterministic replay sidecar governed by this ADR.
- The replay exception activates only after separate Phase 8 contract and implementation approval.
- It does not authorize Python orchestration, model policy, retrieval, API, UI, audit authority, Paper, Live, or exchange connectivity.

## Decision basis

The Phase 0 review considered:

- NautilusTrader's event-driven backtest engine, custom fill, fee and latency models, deterministic identifiers, documented bar execution assumptions, and LGPL-3.0 license;
- LEAN's local event-driven engine, custom data and fill models, Docker workflow, and Apache-2.0 license;
- Freqtrade's full-dataframe and documented backtest assumptions;
- vectorbt's strength in vectorized analysis rather than authoritative execution simulation;
- TypeScript libraries whose current fee, slippage, sizing, portfolio, intrabar, or audit capabilities do not satisfy the required contract.

Official references:

- <https://nautilustrader.io/docs/latest/concepts/backtesting/>
- <https://nautilustrader.io/docs/latest/concepts/execution/>
- <https://github.com/nautechsystems/nautilus_trader>
- <https://github.com/QuantConnect/Lean>
- <https://www.freqtrade.io/en/stable/backtesting/>
- <https://www.freqtrade.io/en/stable/lookahead-analysis/>
- <https://vectorbt.dev/api/portfolio/base/>

## Consequences

- PA Agent Lab owns the causal replay contract, authorization, ambiguity policy, normalization, validation, and audit boundary.
- The external engine owns only deterministic mechanical simulation under those accepted contracts.
- A stable TypeScript port keeps the engine replaceable and prevents engine-specific semantics from becoming Brooks doctrine or policy authority.
- Phase 8 carries a deliberate second-runtime and container-maintenance cost instead of the larger correctness risk of a new bespoke engine.
- Paper, Live, exchange submission, wallet access, and real-money authority remain forbidden.
