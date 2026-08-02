# ADR-0010: Brooks Decision, Doctrine, and Review Contracts

Status: ACCEPTED. IMPLEMENTED AS A PHASE 1 CONTRACT SLICE.

## Decision

PA Agent Lab V1 uses a complete, structured, five-minute Brooks research decision. One decision has one final verdict (`long`, `short`, `no_trade`, or `uncertain`) while evaluating both `longCase` and `shortCase`.

`no_trade` means sufficient evidence supports not trading now. `uncertain` means causal or semantic evidence is insufficient or conflicting. A schema, reference, geometry, or authority violation is not a valid uncertain decision; deterministic validation rejects it.

A `long` or `short` verdict means a complete research trade plan is currently permitted, not merely that trend or Always-In direction favors that side. It requires:

- one actionable selected directional case and a non-actionable opposing case;
- exactly one confirmed primary setup, with at most two additional confluence setups;
- a confirmed single-bar, multi-bar, or source-supported no-separate-signal basis;
- a new conditional trigger that becomes valid only after the last visible closed bar and expires after one further closed bar;
- structural entry, entry-cancellation, premise-invalidation, protection, holding, and objective fields;
- claim-level visible-bar evidence and approved DoctrineUnit references.

A new model decision never retroactively claims an entry triggered inside its last visible bar. V1 does not receive active positions, fills, previous-plan results, PnL, account state, or wallet state. Trigger, cancellation, ambiguity, objective, and protection events belong to later deterministic replay.

## Market semantics

V1 separates broad market state, trend direction, current leg, Always-In, buying pressure, selling pressure, breakout lifecycle, and reversal lifecycle. Pressure does not grant trade permission. Breakout and reversal remain independent; climax, shock, pullback, overshoot, or failed breakout cannot by themselves promote a reversal to confirmed.

Location is represented by no more than five anchored structures and three magnets. A trade objective references an existing directionally valid magnet. Scalp objectives use a primary magnet.

V1 entries are limited to:

- stop entry beyond a visible-bar anchor;
- limit entry at an existing structure;
- market at the first legal event after the decision bar.

No order quantity, partial exit, scaling, runner, stop-limit, TWAP, exchange order, or real price is model authority.

## Holding and reward/risk

V1 holding intent is `scalp` or `swing` only.

- Scalp has no fixed minimum reward/risk ratio. It requires a complete favored-direction case and a primary structural objective. Future calibrated probability may be introduced only through a separate versioned research contract.
- Swing requires a deterministic planned reward/risk ratio of at least `2.0R`. The model supplies structural anchors; local deterministic geometry supplies the audit calculation and must recheck before any later simulated entry.

The model cannot emit probability, win rate, expected return, or confidence scores in V1.

## Evidence and summary

Each critical semantic field references structured claims. Claims reference visible market evidence and stable IDs of approved DoctrineUnits retrieved for that decision. Free-form `humanSummary` is optional, non-authoritative, and limited to 600 characters.

## Simplified doctrine

The source workflow is intentionally small:

- local Source: source ID, type, title, local/URL reference, content hash, and private flag;
- DoctrineUnit: doctrine ID, source ID, concept, rule, applies-when, avoid-when, decision effect, and `draft | approved | retired` status;
- RAG view: only the five core trading semantics plus stable doctrine ID.

Only approved DoctrineUnits from the retrieved set may support a decision. Full private/copyrighted materials remain local. No multi-stage provenance workflow or model-generated citation token system is introduced.

## Calvin review and conflict

`calvinReview` evaluates the complete Brooks decision only. It stores an outcome-blind overall disposition (`agree`, `disagree`, `clarify`, or `uncertain`), Calvin's independent overall verdict, and a bounded summary.

It cannot target, patch, replace, or negate individual Brooks claims or fields. Source-semantic review belongs to a separate future doctrine-review workflow.

Decision Conflict is derived deterministically from the immutable whole BrooksDecision and whole CalvinReview. It can record whole-decision disagreement, verdict disagreement, clarification requirement, or reviewer uncertainty. It has no winner and changes neither source record.

## Implementation

Public modules:

- `packages/contracts/src/brooks-decision-v1.ts`
- `packages/contracts/src/doctrine-v1.ts`
- `packages/contracts/src/calvin-review-v1.ts`
- `packages/contracts/src/decision-conflict-v1.ts`

The builders perform runtime semantic validation, produce canonical SHA-256 identities, and deeply freeze accepted records. They use no runtime dependency.

## Not authorized or implemented

This ADR does not authorize or implement:

- database or API persistence;
- an actual RAG service or corpus ingestion;
- model-provider calls;
- provider retry/attempt accounting;
- active-position model management;
- replay, fills, Paper, Live, exchange, wallet, or real-money activity;
- probability output or calibration;
- later timeframes or multi-timeframe input.

## Consequences

- The first model bakeoff can target observable Price Action semantics instead of prose quality.
- Deterministic software rejects future bars, invalid anchors, unapproved doctrine, incomplete trade plans, wrong directional geometry, and Swing plans below 2R.
- Calvin's whole-decision opinion remains separate from detailed Brooks semantic authority.
- Detailed holdout/contact-state machinery remains deferred until evaluation work needs it; closed-candle causality, protected-window exclusion, and authority separation remain mandatory.
