# Hybrid PA Auto-Trading Baseline V1

Status: DRAFT BASELINE RECORD. NOT IMPLEMENTATION AUTHORITY, PROVIDER AUTHORITY, REPLAY AUTHORITY, PAPER/LIVE AUTHORITY, OR TRADING AUTHORITY.

This record freezes the current grilling decisions for the hybrid PA auto-trading system direction. It is a planning and contract-routing baseline only. It does not mutate accepted immutable bytes, activate any prompt package, authorize Source access, authorize provider/model calls, authorize market-data ingestion, authorize replay execution, or authorize Paper/Live/exchange/wallet/order activity.

## 1. System Target

PA Agent Lab's long-term target is a hybrid automatic trading system, not a narrow Brooks-only research note system and not a PA Agent monolith.

The baseline system shape is:

```text
deterministic factor / structure preselection
  -> candidate ranking and compression reasons
  -> PA Agent semantic judgment
  -> deterministic validator
  -> deterministic risk gate
  -> execution gateway
  -> replay / accounting / audit
  -> offline researchCandidate / versioned promotion loop
```

The PA Agent is the high-order price-action semantic judgment layer. It is not the whole-market scanner, the risk engine, the execution engine, or a V4 replacement.

## 2. Authority Separation

| Layer | Owns | Must not own |
|---|---|---|
| Factor / structure layer | Candidate discovery, ranking, compression reasons, TTL/cooldown inputs, scheduler inputs | Final direction, entry, protection, objective, execution permission |
| Candidate scheduler | PA budget allocation, queue priority, in-flight control, dedup/cooldown | Directional authority, trade permission, PnL implication |
| PA Agent | Semantic assessment of candidate reasons and visible price-action structure | Whole-market scanning, risk veto override, execution, account/wallet/order access |
| Validator | Schema, reference closure, geometry, branch invariants, candidate-reason disposition completeness | Market interpretation, risk acceptance, execution |
| Risk Gate | Deterministic risk, liquidity, fee/profile, ambiguity, exposure, feasibility veto | Brooks doctrine, PA semantic repair, order submission |
| Execution Gateway | Future deterministic conversion of frozen approved intent into an adapter action under explicit mode authority | PA judgment, risk judgment, direct model access, unapproved Paper/Live/trading |
| Replay / accounting / audit | Frozen-bundle evaluation, ambiguity handling, append-only evidence | Model calls, mid-run policy mutation, outcome-led rule edits |
| Research loop | Read-only outcome observation, hypothesis generation, review and promotion records | Automatic production mutation |

## 3. Candidate Reason Contract Baseline

The factor / structure layer must not emit only a bare candidate list. It must emit ranking and compression reasons that explain why each candidate entered the PA queue.

Candidate reasons are pending claims for PA review, not facts, direction authority, or trade permission.

Required properties:

- candidate reasons must be neutral, descriptive, and falsifiable;
- candidate reasons may describe what happened and why the candidate was ranked;
- candidate reasons must avoid strong interpretive conclusions such as `strong breakout confirmed`, `high probability long`, `bullish setup validated`, `clean short entry`, `trade-ready`, or `execution-worthy`;
- `rank`, `score`, `priority`, `hotness`, or similar scheduler fields may explain queue admission and budget allocation only;
- `observedPolarity` / event-side may exist as a pending event label, but it is not direction authority.

## 4. PA Agent Disposition Baseline

Every candidate reason supplied to the PA Agent must receive exactly one structured disposition:

```text
confirmed | reframed | rejected
```

For every disposition, PA output must:

1. quote or identify the original candidate reason;
2. compare it against anonymous bars, structure anchors, and approved Doctrine available in the pack;
3. provide support references and rationale;
4. avoid treating unreviewed candidate text as an accepted premise.

If the disposition is `reframed`, the PA output must include `reframeClaim`: the PA Agent's replacement structure description. A `reframed` label without a replacement claim is invalid.

`reframed` and `rejected` have equal priority. Reframing is not a weaker rejection; it is a complete semantic review action where PA replaces the factor layer's framing with its own source-grounded structure claim.

## 5. PA Plan Rationale Closure

A confirmed candidate reason does not equal a trade.

The PA Agent must still independently return a verdict such as `long`, `short`, `no_trade`, or `uncertain`. A candidate reason can be confirmed while the final verdict remains `no_trade` or `uncertain`.

Trade-plan and verdict rationale may only reference:

- PA confirmed structure evidence;
- PA `reframeClaim` values;
- anonymous bars and structure anchors directly visible in the pack;
- approved DoctrineUnit IDs included in the pack projection.

Validator should reject any verdict or plan rationale that directly relies on:

- unreviewed candidate reason text;
- a rejected candidate reason;
- `rank`, `score`, `priority`, `hotness`, or factor confidence;
- `observedPolarity` as direct direction support;
- non-pack, invisible, unapproved, or free-text authority.

## 6. Risk And Execution Baseline

Risk Gate has independent deterministic veto authority. A PA trade plan is an input to Risk Gate, not an execution permission.

Risk Gate can reject for reasons including fee profile, liquidity profile, venue/profile authorization, same-bar ambiguity, exposure/position constraints, geometry/risk policy constraints, or execution mode disabled.

Execution Gateway is the only execution entry point. PA Agent and Risk Gate must not directly call exchange, wallet, account, or order interfaces.

Execution intent must be frozen and hash-bound before any future adapter action. Execution mode must be explicit, such as:

```text
disabled | replay_only | paper | live
```

Current baseline grants no Paper, Live, exchange, wallet, account, order, or real-money authority.

## 7. Outcome, Research, And Protected Windows

Replay, outcome, and PnL must not directly mutate factors, structure rules, scheduler budgets, PA prompts, Doctrine, Risk policy, or Execution policy.

Outcome may be used as read-only observation material in offline research by a human or research agent. In that setting, outcome is research material, not system input.

A research conclusion derived from outcome observation can enter the system only through a versioned promotion path that records:

- which outcome observation window or dataset was used;
- the observation scope and sample boundary;
- the review record;
- who authorized promotion;
- which new version is affected.

Protected windows are stricter than ordinary outcome observations. The `2025-02`, `2025-05`, and `2025-08` windows must not be read, imported, summarized, observed, derived, trained on, or used as researchCandidate evidence, even offline.

Production and evaluation decision paths may only use authorized closed causal inputs and cutoff-visible facts. Future bars, outcome, PnL, settlement ledgers, V4/Vegas outcome authority, protected windows, unauthorized private material, and post-cutoff facts are forbidden decision inputs.

## 8. Contract-Layer Mapping

| Grilling decision area | Target contract/document layer | Notes |
|---|---|---|
| Hybrid auto-trading target | Charter / architecture baseline | Long-term goal is auto-trading, with layered authority. |
| Factor / structure funnel | Discovery architecture and future Discovery Phase 0A contracts | Candidate ranking and compression are mandatory; no final direction authority. |
| Candidate reason neutrality | Candidate Pack contract | Neutral, descriptive, falsifiable language requirement. |
| Reason disposition | Candidate-aware PA response contract and validator | Each candidate reason requires confirmed/reframed/rejected. |
| `reframeClaim` | Candidate-aware PA response schema | Required when disposition is `reframed`. |
| Plan rationale closure | PA response contract and validator | Rationale can only cite PA-reviewed claims, visible evidence, and approved Doctrine. |
| Rank/score boundary | Scheduler audit and Candidate Pack contract | Scheduler input only; not PA semantic evidence. |
| `observedPolarity` boundary | Candidate Pack contract and validator | Event-side label only; not direction authority. |
| Risk veto | Risk Gate contract | PA plan is input, not permission. |
| Execution boundary | Execution Gateway contract | Gateway is the only execution entry point. |
| Outcome research loop | ResearchCandidate / promotion governance | Read-only research material only; versioned promotion required. |
| Protected windows | Global project safety boundary | Absolute no-read/no-observe/no-derive. |
| Orca worker workflow | Workflow protocol / task-card template | One worktree, one writer; reviewer read-only by default. |

## 9. Remaining Grilling Closure

The prior grilling is considered bounded for this baseline. No new implementation, provider, replay, data, or execution question is opened by this record.

Reviewer scope-out findings are treated as a workflow protocol item rather than a system target item:

- findings that affect current task safety, authority, test validity, or document truthfulness should be classified as `blocking_for_current_scope`;
- other findings should be classified as `out_of_scope_followup`;
- reviewer must report scope-out findings but must not repair them unless the coordinator assigns a new exact writer scope.

## 10. First Concrete Product

The first concrete product is this baseline record. It should remain documentation/governance-only and should not be described as accepted implementation authority until Calvin explicitly accepts an exact content hash or replacement approval record.

This record should be used as the source checklist for future contract slices. It should not be injected into model prompts as Doctrine.

## 11. Candidate Pack Contract Comes Next

The next contract layer should be Candidate Pack / candidate-aware PA response design, not provider calibration.

Minimum future Candidate Pack contract topics:

- candidate identity and event fingerprint domain;
- rank/score/budget fields and audit-only semantics;
- neutral candidate reason language constraints;
- `observedPolarity` as event-side label only;
- reason disposition requirements;
- `reframeClaim` for reframed dispositions;
- rationale reference closure;
- validator terminal rejects for missing or invalid disposition;
- paired or neutral framing conformance policy, if candidate labels are sent outbound.

## 12. First Implementation Direction

Recommended first implementation direction after this baseline is accepted:

1. Discovery Phase 0A / instrument and candidate identity contract;
2. Candidate Pack and candidate-aware response contract;
3. synthetic validator fixtures for candidate reason disposition and rationale closure.

Theme A Brooks semantic closure remains important, but this hybrid-system baseline suggests first making the factor-to-PA interface auditable. Without that interface, PA semantic closure has no stable way to consume ranked candidates from the deterministic funnel.

## 13. Orca Worker Protocol

Orca workers should only be used after a task card is frozen.

Worker protocol:

- one worktree has one writer at a time;
- coordinator freezes allowed files, forbidden files, commands, and authority boundaries;
- Pi worker with Sudocode `gpt-5.6-luna` max is the preferred implementation worker lane based on the prior preflight;
- Codex CLI should not be used for that provider/model until tool-call compatibility is reverified;
- reviewer defaults to read-only and reports findings;
- scope-out findings go to the coordinator as `blocking_for_current_scope` or `out_of_scope_followup`;
- fixes require a newly assigned writer scope.

No worker may self-authorize Source access, provider calls, replay, market-data ingestion, protected-window access, Paper/Live, execution, wallet/account/order access, or cross-repository mutation.

## 14. Verification Plan

Baseline-stage verification is lightweight and textual. It should use search checks, not replay.

Expected checks:

```bash
rg -n "Paper|Live|exchange|wallet|order|trading|provider|replay|protected|2025-02|2025-05|2025-08" docs/plans/HYBRID_PA_AUTO_TRADING_BASELINE_V1.md
rg -n "confirmed|reframed|rejected|reframeClaim|observedPolarity|rank|score|Risk Gate|Execution Gateway" docs/plans/HYBRID_PA_AUTO_TRADING_BASELINE_V1.md
```

Verification success means the document clearly preserves false/paused authority and contains the core candidate-reason, PA-disposition, risk, execution, outcome, protected-window, and worker boundaries.

Verification does not require tests, provider calls, replay, market data, or dependency installation.
