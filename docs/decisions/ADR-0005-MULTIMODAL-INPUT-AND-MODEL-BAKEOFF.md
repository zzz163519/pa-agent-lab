# ADR-0005: Multimodal Input and Model Bakeoff

Status: ACCEPTED, SPECIALIZED BY ADR-0009

## Decision

The Brooks Policy Agent receives both a deterministic anonymous chart and precise causal OHLC. The chart supplies global geometry; OHLC and stable bar identities supply exact evidence and deterministic validation.

GPT-5.6 and Gemini 3.6 Flash are peer candidates. Neither is preselected as primary or fallback. Exact provider model versions are pinned before evaluation.

## Causal market payload

The first input contract uses:

- 120 closed bars in the context panel;
- a deterministic detail panel repeating the final 40 bars;
- the same `lastVisibleBar` in both panels;
- OHLC for all 120 visible bars;
- explicit left-censoring when 120 valid bars are unavailable;
- `barDurationSeconds`, fixed to 300 for the first V1 policy stream by ADR-0009;
- per-bar continuity: `contiguous`, `session_boundary`, `missing_data`, or `unknown`.

The local system retains raw OHLC. External model payloads use the same deterministic normalization as the chart:

```text
normalizedPrice = rawPrice / firstVisibleClose * 100
```

External payloads omit raw price, symbol, real timestamp, date, time zone, venue, market class, source/window identity, account information, future bars, outcomes, PnL, indicators, and Vegas overlays. Stable local bar IDs replace source identities.

## Model comparison

Both candidates receive byte-equivalent inputs, retrieval evidence, prompts, schemas, and reasoning budgets on frozen, blind, outcome-free cases.

The comparison applies hard gates before cost ranking:

- schema and deterministic validator success;
- doctrine correctness and citation accuracy;
- causal prefix invariance;
- correct ambiguity, missing-data, uncertainty, and no-trade handling;
- repeated-run consistency;
- no fabricated bars or evidence.

Among models that pass the quality gate, selection also considers observable reasoning quality, valid-decision cost, retries, latency, and throughput. Lower price cannot compensate for failing semantic or causal gates.

Because ADR-0003 removes the runtime Calvin Adapter, the first bakeoff is a direct GPT-5.6 versus Gemini 3.6 Flash comparison on the complete Brooks decision contract. The earlier proposed two-stage 2x2 model matrix is superseded.

## Consequences

- Model names are configuration identities, not doctrine authority.
- Model output verbosity or hidden chain-of-thought is not a depth metric; scoring uses observable evidence handling and causal reasoning behavior.
- No provider integration or external API call is authorized until the contracts, privacy validator, evaluation split, and audit record are implemented and approved.
