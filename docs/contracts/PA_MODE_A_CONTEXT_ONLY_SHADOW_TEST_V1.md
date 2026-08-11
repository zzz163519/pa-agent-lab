# PA Mode A Context-Only Shadow Test V1

Status: BOUNDED DIRECT AUTHORIZATION FOR LOCAL RESEARCH RUN. NO DOCTRINE, TRAINING, PAPER, LIVE, ORDER, WALLET, EXCHANGE, OR REAL-MONEY AUTHORITY.

## Purpose

This experiment compares PA Agent context-only decisions against the reviewed CCTRADERV4 best-period trade universe from 2026-05-11 through 2026-05-15.

The question is narrow: when PA sees the same closed-bar market context at the candidate decision point, does it independently choose to enter, abstain, or remain uncertain, and does that behavior look too tight, too loose, directionally wrong, or useful as a filter?

## Baseline Universe

The only baseline universe is the 81-trade CCTRADERV4 report set:

```text
/home/calvin/CCTRADERV4/reports/performance-report-2026-05-15.html
/home/calvin/CCTRADERV4/apps/backend/data/replay-audits/v4-baseline-2026-05-11_15.json
```

No DB query or regenerated selection may add or remove trades in this V1 run.

## Model-Visible Input

Each case supplies only:

- anonymous asset id;
- normalized closed-bar OHLC context in basis points;
- normalized volume index;
- primary five-minute bars;
- optional one-hour/daily reference bars when already available;
- BTC reference bars;
- neutral structure tags;
- case id and case-pack hash.

The model-visible prompt must not contain:

- source symbol, venue, or source identity;
- V4 direction;
- V4 entry, stop, target, or trade plan;
- PnL, R multiple, MFE, MAE, close reason, or outcome;
- future bars after the decision cutoff;
- Doctrine mutation, CalvinReview, prior PA answer, or replay/Paper/Live state.

## PA Output

PA returns exactly one JSON object:

```json
{
  "caseId": "pa-mode-a-case-001",
  "decision": "enter | no_trade | uncertain",
  "direction": "long | short | none",
  "entryRationale": "string",
  "invalidation": "string",
  "objective": "string",
  "reasonCodes": ["string"],
  "evidenceRefs": ["string"],
  "riskNotes": ["string"]
}
```

`enter` requires `long` or `short`. `no_trade` and `uncertain` require `none`.

## Freeze Then Join

Raw model output is hashed and normalized into `PAShadowDecisionV1` before outcome join. The hidden join file is not model input and is used only after every decision is frozen.

Classifications:

- `same_direction_enter`: PA entered in the same direction as V4; retain V4 PnL for filter comparison.
- `opposite_direction_enter`: PA entered opposite V4; diagnose separately, not treated as PA PnL.
- `no_trade_filtered`: PA abstained; filtered.
- `uncertain_filtered`: PA was uncertain; filtered.

## Interpretation

This test is a filter-style research comparison, not an independent PA execution backtest. It does not prove executable PA PnL, fill quality, sizing, costs, portfolio behavior, or profitability.

Useful signal:

- same-direction PA entries show higher expectancy than V4 full baseline;
- filtered losers are disproportionate versus filtered winners;
- drawdown proxy improves;
- rejected top winners are limited and explainable.

Failure signals:

- PA rejects most large winners;
- PA keeps most large losers;
- opposite-direction entries cluster in V4 winners;
- abstention is so high the filter is unusable;
- any leakage audit failure.

## Artifacts

Runtime artifacts are written under:

```text
artifacts/pa-mode-a-shadow-v1/2026-05-11_15/
```

Important files:

- `authorization.json`
- `case_manifest.json`
- `cases/*.json`
- `prompts/*.prompt.txt`
- `leakage_audit.txt`
- `raw_model_outputs/*.raw.json`
- `pa_shadow_decisions.jsonl`
- `pa_filter_pnl_report.json`
- `comparison_summary.md`
