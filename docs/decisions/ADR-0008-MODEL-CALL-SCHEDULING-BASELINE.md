# ADR-0008: Model Call Scheduling Baseline

Status: ACCEPTED, SPECIALIZED BY ADR-0009. PHASE 1 SCHEDULING CONTRACT SLICE IMPLEMENTED.

## Decision

PA Agent Lab distinguishes two model-call scheduling modes:

1. `evaluation_sampled` for governed semantic evaluation and the peer model bakeoff;
2. `continuous_every_close` as the baseline for a future continuous policy stream.

The continuous baseline schedules at most one logical model call for every newly closed bar in a policy stream. It never schedules an open candle. ADR-0009 fixes the first V1 Brooks policy stream to `barDurationSeconds = 300`.

The evaluation mode uses only a selection frozen before model outputs or outcomes are inspected. Its selection policy and commitment hash are persisted. Every peer candidate receives the same decision points, input hashes, prompt hash, output schema, reasoning budget, and repeat count.

A deterministic or model-generated event filter is not part of the baseline. A later proposal to reduce call frequency is a separate research candidate and must be evaluated against `continuous_every_close` for missed cases, distribution shift, and cost.

## Logical call identity

Every scheduled logical call records and hashes at least:

- scheduling schema version and mode;
- opaque local policy-stream identity;
- `decisionPointBarId` and monotonic decision-point sequence;
- `barDurationSeconds`;
- `selectionPolicyId`;
- causal input hash;
- candidate and pinned model identity;
- prompt hash, output schema version, and reasoning-budget identity;
- evaluation repeat index.

A logical call is distinct from a provider attempt. ADR-0011 defines provider-neutral terminal attempt records; retry count, timeout, rate-limit, and provider transport policy remain open and must not alter which decision points are scheduled.

Hash preimages use typed canonical JSON arrays rather than delimiter-joined free-form text. This keeps identity field boundaries unambiguous even when an opaque local identifier contains whitespace or control characters.

## Replay boundary

Model results are precomputed and cached by logical call identity. A result must carry raw-output, normalized-decision, and validation-result hashes and be explicitly frozen before it can enter a replay decision bundle.

A replay bundle:

- identifies only precomputed frozen model results;
- fixes `modelCallsPermitted` to `false`;
- has a deterministic content identity;
- remains subordinate to ADR-0007 and does not authorize replay execution.

Phase 8 consumes frozen decisions. It never invokes, retries, or mutates a model during replay.

## Causal and authority boundary

- A decision point is eligible only after its candle is closed.
- Duplicate delivery or later reuse of any previously scheduled bar ID cannot create another call.
- A conflicting input for an already scheduled sequence fails closed.
- Appending future bars cannot change prior logical call identities.
- Protected windows are forbidden before scheduling, model access, caching, or replay.
- `selectionPolicy` controls dataset membership only; it is not Brooks doctrine or trade authority.
- Neither mode authorizes external provider calls, Paper, Live, exchange, wallet, or real-money access.

## Implementation

Public TypeScript contract:

- `packages/contracts/src/model-call-schedule-v1.ts`

Synthetic contract tests:

- `packages/contracts/test/model-call-schedule-v1.test.ts`
- `packages/contracts/test/continuous-every-close-v1.test.ts`
- `packages/contracts/test/evaluation-sampled-v1.test.ts`
- `packages/contracts/test/frozen-model-result-v1.test.ts`
- `packages/contracts/test/causal-scheduling-v1.test.ts`

The implementation has no runtime dependency. Node's built-in test runner exercises the public contract, and pinned TypeScript performs strict static validation.

## Consequences

- Semantic evaluation can remain bounded without redefining the future continuous policy cadence.
- A full continuous offline decision set may require one logical call per five-minute closed bar per policy stream, so batching, cost limits, and provider rate controls remain open.
- Caching avoids paying again for an identical logical call but does not create cache hits across different causal input hashes.
- Candidate-model symmetry is enforced by construction rather than by post-hoc count comparison.
- Model inference remains outside deterministic replay.
