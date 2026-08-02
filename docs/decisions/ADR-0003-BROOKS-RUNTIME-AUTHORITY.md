# ADR-0003: Brooks Runtime Authority and Calvin Review

Status: ACCEPTED, SPECIALIZED BY ADR-0010

## Decision

The first runtime policy consists of one Brooks Policy Agent. It produces the complete research-only Price Action decision from source-traceable Brooks doctrine.

Calvin is an auxiliary reviewer, not a second runtime policy stage. Calvin's records are persisted as `calvinReview` and are not retrieved automatically for each policy inference.

The semantic tracks are:

```text
brooksDecision
calvinReview
researchCandidate
```

This ADR supersedes the `calvinPolicy` runtime authority and first-stage alignment target described by ADR-0002. ADR-0002's track-separation, provenance, conflict, and non-overwrite requirements remain in force.

## `brooksDecision`

The Brooks Policy Agent may propose, for research only:

- context, current leg, and Always-In;
- location, magnets, pressure, and breakout/reversal lifecycle;
- setup, signal, trigger, and trade permission;
- `long`, `short`, `no_trade`, or `uncertain`;
- entry premise, protection, invalidation, and holding intent;
- bar evidence and doctrine citations.

It has no position-sizing, order, exchange, account, PnL, Paper, Live, or real-money authority.

## `calvinReview`

Calvin records one outcome-blind evaluation of the complete Brooks decision:

- `agree`;
- `clarify`;
- `disagree`;
- `uncertain`;
- an independent overall verdict and bounded summary.

ADR-0010 forbids claim-level or field-level review patches. Calvin's complete-decision judgment cannot negate or rewrite detailed Brooks semantics. A disagreement is stored as an immutable, deterministically derived whole-decision conflict. Source interpretation issues belong to a separate future doctrine-review workflow.

## `researchCandidate`

A Research Agent remains isolated from the frozen Brooks baseline. Its hypotheses have no automatic doctrine or policy authority.

## Consequences

- There is no runtime Calvin Policy Adapter in the first version.
- Calvin review data is excluded from ordinary Brooks Policy Agent retrieval.
- The first semantic evaluation measures Brooks doctrine competence, evidence use, causal behavior, abstention, and consistency rather than imitation of Calvin.
- The accepted V1 field names, enums, and semantic gates are defined by ADR-0010 and the Phase 1 semantic contracts.
