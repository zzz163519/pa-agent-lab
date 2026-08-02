# ADR-0011: Causal Policy Input and Model-Run Audit Contracts

Status: ACCEPTED. IMPLEMENTED AS A PHASE 1 CONTRACT SLICE. SPECIALIZED BY ADR-0012 FOR CHART ARTIFACTS.

## Decision

PA Agent Lab V1 separates the local causal case from the provider-facing policy input.

A local `BrooksPolicyCaseV1` contains opaque local case and stream identities, raw positive OHLC, stable local bar IDs, closed state, continuity, and the exact last visible bar. It is never itself a provider payload.

A non-censored case contains exactly 120 closed five-minute bars. When 120 valid bars are unavailable, the case is explicitly left-censored and contains between 40 and 119 bars. Fewer than 40 bars fail closed because the accepted detail panel cannot be formed.

Observed bar sequences increase by exactly one. This is local observed-order identity, not proof that source time is continuous. Each bar separately records `contiguous`, `session_boundary`, `missing_data`, or `unknown`; the first visible bar is `unknown` because its predecessor is outside the visible prefix.

## Anonymous model input

`BrooksPolicyInputV1` deterministically replaces local bar IDs with relative anonymous IDs (`bar:000`, `bar:001`, and so on). It contains no case ID, stream ID, source ID, symbol, venue, timestamp, account, outcome, or local raw price.

Prices use the ADR-0005 normalization:

```text
normalizedPrice = rawPrice / firstVisibleClose * 100
```

The context chart manifest covers the complete visible prefix. The detail chart manifest covers exactly the final 40 bars. Both are `image/png`, are content-addressed by SHA-256, and share the same anonymous `lastVisibleBarId`. The model-input hash commits to normalized OHLC, continuity, both chart manifests, and the retrieved Doctrine RAG records.

ADR-0012 now implements deterministic image rendering, byte validation, and local content-addressed storage. Provider-specific multipart/base64 transport remains separate.

## Outbound privacy

`OutboundModelPayloadV1` adds only the prompt hash and output schema identity to the frozen policy input. Its validator uses an exact recursive field allowlist and requires plain JSON-like objects and arrays. Unknown fields, custom prototypes, accessors, symbol fields, sparse arrays, non-enumerable serialization hooks, malformed hashes, and content-hash mismatches fail closed.

Doctrine context remains the simplified ADR-0010 RAG view: stable doctrine ID plus core trading semantics. Approval is enforced by the future retrieval service before it creates these records; source metadata never enters the outbound payload.

## Model-run and attempt audit

One `ModelRunRecordV1` binds one ADR-0008 logical call and its local `caseId`/`caseHash` to the exact anonymous input, outbound payload, prompt, model, output schema, repeat index, and retrieved doctrine IDs. Construction regenerates the anonymous input from the bound local Case and rejects a payload derived from different raw OHLC.

Provider retries do not create new logical calls or decision points. Each terminal `ProviderAttemptRecordV1` records:

- stable `attemptKey` for `(modelRunId, attemptIndex, providerId, modelId, requestHash)`;
- content-hashed `attemptId` covering the complete immutable terminal record;
- `response_received`, `timeout`, or `transport_error`;
- response hash or transport error code, never both;
- non-negative observed latency.

`ModelRunAuditRecordV1` is created only for a received response. It binds the raw-output hash, optional decision hash, deterministic validation-result hash, accepted/rejected state, and rejection codes to the exact run and attempt. Accepted validation requires a decision hash and no rejection codes. Rejected validation requires at least one rejection code.

This slice records provider-neutral evidence. It does not select retry counts, timeouts, rate limits, pricing, provider models, or transport behavior.

## Implementation

Public modules:

- `packages/contracts/src/policy-input-v1.ts`
- `packages/contracts/src/model-run-audit-v1.ts`

Both are exported from `@pa-agent-lab/contracts` and as package subpaths. Builders validate runtime values, use a strict canonical-JSON subset that rejects lossy or cyclic hash preimages, create SHA-256 identities, and deeply freeze accepted records. No runtime dependency is added.

## Deferred to ADR-0013

ADR-0013 now implements strict persisted JSON/OpenAPI parsing and atomic database uniqueness/relationship constraints for this record chain. A running database, API routes, and provider transport remain unauthorized and unimplemented.

## Still not authorized or implemented

This ADR does not authorize or implement:

- provider-specific image transport or external model calls;
- retry, timeout, rate-limit, usage, or pricing policy;
- a running database or API service;
- actual Doctrine retrieval or approval services;
- historical replay, training, Paper, Live, exchange, wallet, or real-money activity.

ADR-0013 enforces uniqueness for model-run identity and `(modelRunId, attemptIndex)`, plus immutable Case/input/chart/run/attempt/audit relationships. Phase 2 must consume those constraints rather than replace them.
