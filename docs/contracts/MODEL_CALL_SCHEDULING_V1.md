# Model Call Scheduling Contract V1

Status: IMPLEMENTED PHASE 1 CONTRACT SLICE. NO PROVIDER OR REPLAY EXECUTION AUTHORITY.

Authority: ADR-0008. Replay boundary: ADR-0007. Input and peer-model boundary: ADR-0005.

## Scope

This contract governs logical model-call scheduling, not provider transport, retry attempts, Brooks decision semantics, storage, or replay execution.

The public seam is exported from `@pa-agent-lab/contracts/model-call-schedule-v1`. V1 exports `FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS = 300` and rejects any other decision duration before scheduling.

## Modes

| Mode | Purpose | Eligibility |
|---|---|---|
| `evaluation_sampled` | Bounded semantic evaluation and peer bakeoff | Only points committed by a frozen, outcome-blind selection policy |
| `continuous_every_close` | Future continuous baseline | At most one call for each newly closed bar in a policy stream |

No `event_filtered`, setup-triggered, indicator-triggered, or model-triggered mode is accepted in V1.

## Decision point

A V1 decision point carries:

- opaque local `policyStreamId`;
- stable local `decisionPointBarId`;
- non-negative monotonic `decisionPointSequence`;
- positive integer `barDurationSeconds`, fixed to `300` in V1 by ADR-0009;
- versioned `selectionPolicyId`;
- lowercase SHA-256 causal `inputHash`;
- explicit closed-candle state.

A scheduling service must not derive eligibility from future bars, outcomes, PnL, protected windows, Calvin review, or research memory.

## Logical call record

`createModelCallRecord` validates a closed decision point and returns an immutable `ModelCallRecordV1`. Its SHA-256 `callId` commits to the scheduling mode, decision-point identity, duration, selection policy, input, candidate, model, prompt, output schema, reasoning budget, and repeat index.

The logical `callId` is also the cache key for the frozen result. Its hash preimage is a typed canonical JSON array, so embedded delimiters in opaque identifiers cannot change field boundaries. ADR-0011 adds separate provider-neutral ModelRun and terminal attempt records; retry count, timeout, rate-limit, transport, and billable-usage policy remain deferred.

## Continuous scheduler

`createContinuousScheduleState` fixes one policy stream, bar duration, candidate, model, prompt, schema, and reasoning budget.

`advanceContinuousSchedule` is a pure transition:

- open bar: `not_scheduled / bar_not_closed`;
- exact repeated latest bar: `not_scheduled / duplicate_closed_bar`;
- older bar: `not_scheduled / stale_closed_bar`;
- same sequence with changed bar identity or input: contract error;
- reuse of any previously scheduled bar ID under a new sequence: contract error;
- new closed bar: one immutable call plus new immutable state.

The V1 in-memory state retains scheduled bar IDs to enforce this contract. Phase 2 persistence must replace or reinforce that registry with an atomic uniqueness constraint on policy stream plus bar ID.

The fixed selection policy is `continuous_every_close.v1`.

## Evaluation plan

`createEvaluationCallPlan` requires:

- an explicitly frozen selection;
- a selection commitment hash;
- at least one closed decision point;
- at least two uniquely identified peer candidates;
- one shared prompt, output schema, and reasoning budget;
- a positive, equal repeat count.

The resulting plan is the full decision-point by repeat by candidate cross-product. This provides candidate symmetry before any output is observed.

## Frozen result and replay bundle

`createFrozenModelResult` binds raw output, normalized decision, and deterministic validation hashes to a logical call and marks the record frozen.

`createReplayDecisionBundle` rejects empty, unfrozen, duplicate, or malformed result identities. It produces a deterministic bundle with:

```text
source = precomputed_frozen_model_results
modelCallsPermitted = false
```

The bundle is an input contract only. It does not install or invoke NautilusTrader or LEAN.

## Verified invariants

Synthetic tests prove:

- only the two adjudicated modes are accepted;
- required call identity fields are retained and hashed;
- open candles cannot produce calls;
- one closed bar produces at most one continuous call;
- conflicting duplicate sequences and reused bar IDs fail closed;
- structured hash encoding prevents free-form delimiter collisions;
- appending future bars preserves every prior call record and call ID;
- frozen evaluation points are distributed symmetrically to peer candidates;
- replay accepts only precomputed frozen results and forbids model calls.

These tests prove contract and causal behavior, not model quality or profitability.

## Implemented by ADR-0013

ADR-0013 now provides strict persisted JSON/OpenAPI parsing and database uniqueness for call-linked ModelRun and ProviderAttempt records.

## Implemented by ADR-0014

ADR-0014 now consumes the frozen bundle through a one-selected-path `ReplayRequestV1`, rechecks Case/input/decision/cutoff identity, forbids model calls and policy mutation, and emits only explicit terminal-state/audit identities.

## Deferred contracts

Still unresolved:

- exact sampled selection policies and dataset partitions;
- exact pinned provider model IDs;
- retry count, timeout, rate-limit, transport, usage, and valid-decision cost policy;
- exact Phase 8 engine adapter, execution-event payload, and mechanical result schemas behind ADR-0014's opaque hashes.
