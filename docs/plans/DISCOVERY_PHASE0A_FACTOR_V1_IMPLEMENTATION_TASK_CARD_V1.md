# Discovery Phase 0A / Factor V1 Slice 1 Implementation Task Card

Status: DRAFT TASK CARD.
NOT IMPLEMENTATION AUTHORITY.
NOT PROVIDER AUTHORITY.
NOT REPLAY AUTHORITY.
NOT PAPER/LIVE AUTHORITY.
NOT TRADING AUTHORITY.

Related draft contract: `docs/contracts/DISCOVERY_FACTOR_V1.md` (`discovery-factor-v1.draft.1`).

This card describes a future pure TypeScript contract slice. It does not authorize runtime factor detection, market-data ingestion, provider/model calls, replay, Paper/Live, execution, wallet/account access, order placement, or trading.

## 1. Objective

Implement the approved future contract surface for Discovery Phase 0A / Factor V1 only after Calvin accepts the exact contract version, parameter register, and implementation scope.

The contract surface must represent:

- closed five-minute causal bar eligibility;
- history gate and left-censored state;
- price and same-source total-volume observations;
- confirmed pivot and prior rolling-range anchors;
- core factor observations and context enhancers;
- neutral candidate reasons;
- Composite Candidate identity;
- primary/secondary event types;
- event fingerprint and dedup group identity;
- candidate revision and candidate ID;
- provisional TTL/cooldown state;
- deterministic scheduler priority tuple;
- fail-closed audit results.

The slice does not implement the eight-factor detector. Factor-engine implementation is a later, separately scoped slice.

## 2. Preconditions

Before implementation begins, all of the following must be present:

- Calvin acceptance of the related draft contract or an exact versioned replacement;
- Calvin acceptance of the provisional parameter register, or an explicit decision to leave named parameters open;
- exact scope authorization for the TypeScript contract and synthetic tests;
- confirmation that no accepted immutable artifact will be modified;
- confirmation that no runtime service, data adapter, provider, replay, or execution path is included.

The factor-driven candidate stream must not be treated as an accepted replacement for `continuous_every_close`. Any future model-call gating proposal requires a separate scheduling decision.

## 3. Allowed Future Files

Only the following files may be considered for a future implementation of this task card:

```text
packages/contracts/src/discovery-factor-v1.ts
packages/contracts/test/discovery-factor-v1.test.ts
packages/contracts/src/index.ts              # exports only, if separately listed
```

The current task card does not authorize changes to those files. It only records the future scope.

No new package, runtime service, API route, database migration, CLI, frontend component, scheduler service, factor engine, provider adapter, replay sidecar, or execution adapter is in scope.

## 4. Contract Implementation Requirements

A future implementation must:

- use strict TypeScript and existing repository canonical hashing/deep-freeze utilities;
- use typed canonical preimages, not delimiter-joined strings;
- reject open bars and malformed causal prefixes;
- preserve explicit `left_censored` context;
- keep volume unavailable distinct from low volume;
- exclude the current event bar from rolling references;
- preserve same-source and same-timeframe volume provenance;
- share anchor identity across factor records;
- keep core triggers separate from context enhancers;
- merge compatible same-cutoff observations deterministically;
- split opposite, incompatible, disjoint, or order-ambiguous observations;
- keep `eventFingerprint`, `dedupGroupKey`, `candidateRevision`, and `candidateId` distinct;
- apply cooldown to `dedupGroupKey`, not `eventFingerprint`;
- keep TTL and cooldown as explicit closed-bar counts;
- mark `ttlBars=3` and `cooldownBars=6` as provisional bootstrap values;
- preserve semantic escalation through predecessor linkage;
- produce a lexicographically comparable priority tuple;
- prevent numeric ranking from becoming PA evidence;
- return explicit terminal audit outcomes;
- fail closed on unknown schema/state and same-bar ambiguity.

## 5. Future TypeScript Surface

The future module may define builders, readonly types, validators, and hash helpers for:

```text
DiscoveryBarEligibilityV1
DiscoveryVolumeObservationV1
DiscoveryRollingReferenceV1
DiscoveryAnchorV1
DiscoveryAnchorGroupV1
DiscoveryFactorObservationV1
DiscoveryCandidateReasonV1
DiscoveryCompositeCandidateV1
DiscoveryEventFingerprintV1
DiscoveryDedupGroupV1
DiscoveryCandidateRevisionV1
DiscoveryCandidateLifecycleV1
DiscoveryPriorityTupleV1
DiscoveryFactorAuditResultV1
```

The future module must not define:

```text
PA verdict authority
entry / stop / target
sizing or position state
Risk Gate approval
Execution Gateway action
provider request or response
replay request/result
outcome/PnL authority
Paper/Live/trading operation
```

## 6. Synthetic Fixtures

The future test module must use invented fixtures only. It must cover:

- history counts at 39, 40, 119, and 120 closed bars;
- open/provisional bar rejection;
- left-censored versus normal context;
- current-bar exclusion from rolling median/percentile reference;
- valid same-source total volume;
- missing, invalid, and unavailable volume;
- zero/non-finite denominator;
- confirmed and unconfirmed pivots;
- prior range anchors and canonical anchor groups;
- each of the five core trigger observations;
- each of the three context enhancers attached to a core Candidate;
- compatible same-cutoff Composite Candidate;
- opposite polarity, disjoint anchor, incompatible premise, and different-cutoff splits;
- deterministic primary event priority;
- event fingerprint changes across effective bars;
- stable dedup group across the same structural thread;
- ordinary cooldown suppression;
- semantic escalation with predecessor linkage;
- candidate revision and immutable predecessor;
- TTL expiration and budget deferral;
- priority tuple tie-breaking;
- same-bar ambiguity;
- data-quality and unknown-state terminal rejects;
- complete audit reason and identity binding.

No fixture may use real market rows, provider output, replay output, account data, or outcome/PnL artifacts.

## 7. Contract Test Requirements

Tests must prove:

- strict schema validation and unknown-field rejection;
- finite/ordered/closed-bar invariants;
- causal-prefix stability;
- history gate and left-censoring;
- current event bar excluded from rolling references;
- same-source volume provenance;
- volume unavailable is not low volume;
- shared anchor identity and confirmation state;
- neutral candidate reason constraints;
- core/enhancer role separation;
- deterministic Composite merge and split;
- fixed primary-event priority;
- typed fingerprint, dedup, revision, and candidate-ID preimages;
- cooldown on `dedupGroupKey`;
- TTL on concrete candidate lifecycle;
- semantic escalation linkage;
- deterministic priority tuple and tie break;
- fail-closed ambiguity and data-quality outcomes;
- immutable content hashes and tamper detection.

Tests must not claim profitability, predictive accuracy, provider quality, replay-engine behavior, or trading safety.

## 8. Acceptance Criteria

A future implementation is acceptable only when:

- the public module exports only the authorized contract surface;
- all records are readonly/deep-frozen according to repository convention;
- all content identities use canonical typed preimages;
- the 20 traceable decisions in `DISCOVERY_FACTOR_V1.md` have corresponding tests or explicit contract assertions;
- provisional numeric defaults are visible as provisional in code and fixtures;
- no direction, execution, provider, replay, market-data adapter, or outcome field is introduced;
- all required synthetic fixtures pass;
- unknown and ambiguous states fail closed;
- the task's exact allowed-file scope is preserved;
- a separate read-only reviewer reports no blocking authority, causal, privacy, or determinism finding.

This acceptance does not accept the factor detector, a candidate scheduler service, a PA-call gate, or any trading outcome.

## 9. Verification Commands

After a future implementation is separately authorized, the responsible writer must run the repository's relevant contract checks, including the package's typecheck and test commands as defined by the current workspace scripts. The exact command must be recorded in the implementation receipt.

The current draft-only verification is limited to document checks:

```bash
rg -n '^Status: DRAFT|NOT IMPLEMENTATION AUTHORITY|NOT PROVIDER AUTHORITY|NOT REPLAY AUTHORITY|NOT PAPER/LIVE AUTHORITY|NOT TRADING AUTHORITY' \
  docs/contracts/DISCOVERY_FACTOR_V1.md \
  docs/plans/DISCOVERY_PHASE0A_FACTOR_V1_IMPLEMENTATION_TASK_CARD_V1.md

rg -n 'DISCOVERY-DECISION-(00[1-9]|01[0-9]|020)|ttlBars|cooldownBars|priorityTuple|same_bar_ambiguity|dedupGroupKey|candidateRevision' \
  docs/contracts/DISCOVERY_FACTOR_V1.md \
  docs/plans/DISCOVERY_PHASE0A_FACTOR_V1_IMPLEMENTATION_TASK_CARD_V1.md

git diff --check -- docs/contracts/DISCOVERY_FACTOR_V1.md \
  docs/plans/DISCOVERY_PHASE0A_FACTOR_V1_IMPLEMENTATION_TASK_CARD_V1.md
```

These checks prove document completeness only. They do not authorize or prove runtime behavior.

## 10. Forbidden Scope

The future writer must not:

- read, import, derive, or summarize protected data;
- read outcome/PnL artifacts or select parameters from them;
- call a provider/model CLI;
- run replay;
- connect market data;
- install dependencies;
- modify accepted immutable artifacts;
- modify unrelated uncommitted files;
- start a service;
- create Paper/Live/exchange/wallet/order behavior;
- commit to git;
- delegate mutation-capable work without a new explicit authorization.

## 11. Open Decisions And Calvin Gate

Before implementation, Calvin must decide or explicitly defer:

- the provisional pivot width, range lookback, boundary tolerance, and percentile buckets;
- the exact `observedPolarity` enum;
- canonical anchor-group construction;
- mechanical pullback and magnet predicates;
- scheduler budget/fairness/in-flight limits;
- whether factor candidates gate PA calls or remain a separate discovery/observability layer under ADR-0008;
- the separately authorized offline validation route for TTL/cooldown review.

An open decision is not a license for the implementation writer to choose silently. Any accepted numeric revision must be versioned and bound to an exact content hash.

## 12. Writer And Review Protocol

Direct Pi remains the only writer for this repository unless Calvin separately approves an exact worker scope. No mutation-capable worker is assigned by this draft card.

When implementation is later authorized:

- one worktree has one writer;
- the writer reports changed files, commands, validation output, and residual risks;
- a fresh-context reviewer is read-only;
- reviewer scope-out findings are reported, not silently repaired;
- Direct Pi performs final diff and contract-boundary verification.
