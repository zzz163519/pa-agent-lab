# Phase 1 Semantic Contracts V1

Status: IMPLEMENTED CONTRACT SLICE. NO DATABASE, PROVIDER, RAG SERVICE, OR REPLAY AUTHORITY.

Authority: ADR-0010. Timeframe: ADR-0009. Scheduling: ADR-0008. Runtime Brooks authority: ADR-0003.

## Public seams

```text
createSource
createDoctrineUnit
toDoctrineRagRecord
resolveApprovedDoctrineReferences
createBrooksDecision
createCalvinReview
deriveDecisionConflict
```

All accepted records are deeply frozen and carry deterministic content identities where required.

## BrooksDecision

A decision binds:

- decision and case identity;
- causal input hash and last visible five-minute bar;
- one final verdict;
- layered context, current leg, Always-In, pressure, breakout, and reversal state;
- up to five anchored structures and three magnets;
- claim-level market evidence and approved doctrine IDs;
- independent long and short cases;
- an optional trade plan only for long or short;
- mutually exclusive no-trade or uncertainty details;
- an optional non-authoritative summary of at most 600 characters.

### Directional case gate

A selected long/short case requires:

```text
case.state = actionable
one primary setup.state = confirmed
signalBasis.state = confirmed
triggerState = pending
opposing case.state != actionable
evidenceBalance favors selected direction
```

Setup candidates are limited to three per side. Signal basis may be a discrete bar, multi-bar structure, or approved no-separate-signal concept.

### Entry and plan gate

A new trade plan:

- is valid only after `lastVisibleBarId`;
- is valid for one subsequent closed bar;
- uses stop, limit, or market-next-event entry;
- references visible anchors or existing structures;
- separately defines entry cancellation, premise invalidation, protection, holding intent, and objective;
- references one existing magnet on the correct side of the trade.

The model never declares that its new plan triggered inside its last visible bar.

### Scalp and Swing

```text
scalp:
  no fixed minimum R:R
  primary magnet required

swing:
  deterministic planned R:R >= 2.0
```

The local geometry audit is non-authoritative research metadata. A later execution path must revalidate actual entry geometry before a simulated fill.

### Terminal states

```text
no_trade:
  sufficient evidence supports no current trade
  1..5 controlled reason codes
  next observable condition required

uncertain:
  critical semantic or causal uncertainty exists
  1..5 controlled reason codes
  conflicting claims, missing evidence, and resolution condition required

rejected:
  not a verdict
  deterministic contract failure
```

## Causal validation

The builder rejects:

- any bar, signal, evidence item, or price anchor outside the visible prefix;
- a last-visible ID that is not the final supplied bar;
- malformed OHLC geometry;
- normalized anchor values that do not match visible OHLC;
- non-five-minute decision duration;
- future-effective or multi-bar-lived new entry plans;
- unknown structures, magnets, claims, evidence, or doctrine IDs.

## Evidence

A MarketEvidence record identifies visible bars, observed fields, and an observation code. A Claim identifies a statement code and references one or more MarketEvidence and approved DoctrineUnit IDs.

Every critical assessment field references claims. Models cannot emit numeric probability, win rate, confidence, expected return, or success chance in V1.

## Simplified Doctrine

Local Source fields:

```text
sourceId
sourceType
title
urlOrLocalRef
contentHash
private
```

DoctrineUnit fields:

```text
doctrineId
sourceId
concept
rule
appliesWhen
avoidWhen
decisionEffect
status = draft | approved | retired
```

The RAG-facing record strips source metadata and status. It contains only doctrine ID and core trading semantics. Resolution accepts only approved IDs present in the retrieved set.

## CalvinReview

CalvinReview is whole-decision only:

```text
scope = whole_decision
disposition = agree | disagree | clarify | uncertain
independentVerdict = long | short | no_trade | uncertain
outcomeBlind = true
```

Field targets, review items, field patches, proposed corrections, and replacement values are forbidden recursively. An agreeing review must share the Brooks verdict.

## DecisionConflict

Conflict kinds are derived, not authored:

```text
none
whole_decision_disagreement
verdict_disagreement
clarification_required
reviewer_uncertain
```

No conflict record contains a winner or field patch. Non-conflict is closed; all other derived conflicts begin open.

## Verified behavior

Synthetic tests cover:

- complete Long/Swing and mirrored Short/Scalp acceptance;
- stop, limit, and market-next-event entry paths;
- valid No Trade and Uncertain separation;
- incomplete setup/signal/plan rejection;
- visible-prefix and anchor validation;
- low-R Scalp acceptance and sub-2R Swing rejection;
- actionable-opponent and actionable-No-Trade rejection;
- stop and limit entry structure checks;
- market-next-event anti-backfill checks;
- directional and primary magnet checks;
- probability and oversized-summary rejection;
- simplified approved-only doctrine retrieval;
- whole-decision Calvin review and patch rejection;
- deterministic conflict derivation without record mutation.

Tests prove schema, causal, semantic-boundary, and authority behavior, not profitability.

## Deferred

Still deferred:

- strict persisted JSON/OpenAPI parsers and unknown-key rejection at the API boundary;
- Case persistence and immutable database constraints;
- actual RAG indexing/retrieval;
- exact Brooks source inventory and approved DoctrineUnit content;
- model run attempts, retries, costs, and provider retention;
- probability calibration;
- active-position review;
- deterministic replay request/result implementation.
