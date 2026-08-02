# Phase 1 Policy Input and Model-Run Audit V1

Status: IMPLEMENTED CONTRACT SLICE. NO PROVIDER, DATABASE, OR REPLAY AUTHORITY.

Authority: ADR-0005, ADR-0008, ADR-0009, and ADR-0011.

## Public seams

The package exports:

```text
@pa-agent-lab/contracts/policy-input-v1
@pa-agent-lab/contracts/model-run-audit-v1
```

Primary builders and validators:

- `createBrooksPolicyCase`
- `createBrooksPolicyInput`
- `createOutboundModelPayload`
- `assertOutboundModelPayloadPrivacy`
- `createModelRunRecord`
- `createProviderAttemptRecord`
- `createModelRunAuditRecord`

Accepted records are deeply frozen and content-addressed with canonical SHA-256 hashes.

## Local case

`BrooksPolicyCaseV1` is local-only and may retain raw price plus opaque local case, stream, and bar identities.

Required invariants:

- `barDurationSeconds = 300`;
- every bar is closed;
- every OHLC value is finite and positive;
- high is at or above open/close and low is at or below open/close;
- local bar IDs are unique;
- observed sequences increase by one;
- the final bar equals `lastVisibleBarId`;
- the first visible continuity state is `unknown`;
- non-censored context has exactly 120 bars;
- left-censored context has 40 through 119 bars.

The local `caseHash` commits to the complete raw causal prefix and local identities. The case itself is never an outbound payload.

## Anonymous policy input

Local bar IDs are replaced deterministically with relative IDs beginning at `bar:000`. Relative sequence begins at zero. The model receives:

- normalized OHLC for every visible closed bar;
- per-bar continuity;
- explicit left-censoring and missing-bar count;
- context and detail chart manifests;
- approved Doctrine RAG records.

The first visible close is exactly `100` after normalization. The context chart bar list equals the entire visible prefix. The detail chart bar list equals the final 40 bars. Both manifests share the same final anonymous bar ID and carry only PNG content hashes, not local file paths or source metadata.

`inputHash` commits to the complete provider-safe policy input except its schema version and own hash field.

## Outbound privacy validator

The outbound payload contains exactly:

- policy-input schema, hash, normalized market input, chart manifests, and doctrine semantics;
- prompt hash;
- output schema version;
- payload schema and payload hash.

The recursive allowlist rejects extra root or nested fields. It also rejects non-plain objects/arrays, accessors, symbol properties, sparse arrays, custom prototypes, and hidden serialization hooks.

Consequently, no field exists for raw price, local case/stream/bar IDs, symbol, venue, real timestamp/date/timezone, source window, account, wallet, position, PnL, outcome, future bars, indicators, or Vegas overlays.

The contract does not inspect chart pixels or doctrine prose. Deterministic chart generation and approved-doctrine retrieval must establish those upstream guarantees before provider transport.

## Audit chain

```text
ModelCallRecordV1
  + OutboundModelPayloadV1
      -> ModelRunRecordV1
          -> ProviderAttemptRecordV1 [0..n]
              -> ModelRunAuditRecordV1 [received response only]
```

A model run verifies that the local Case matches the call stream, final local bar, sequence, and duration. It regenerates the anonymous input from that Case and the exact chart/doctrine records, then verifies the call input, prompt, and output-schema hashes against the outbound payload. The run stores local `caseId`/`caseHash` for audit and only retrieved doctrine IDs from the RAG context.

An attempt is a provider transport terminal record, not a new model decision. `attemptKey` identifies the attempt index within the run. `attemptId` hashes all terminal fields so later mutation is detectable.

A validation audit requires a received response and exact raw-output hash. It supports:

- `accepted`: decision hash required, rejection codes forbidden;
- `rejected`: one or more deterministic rejection codes required, decision hash optional.

Raw model output and chart bytes are content-addressed artifacts referenced by hash; this contract does not choose their storage implementation.

## Verified behavior

Synthetic tests cover:

- anonymous 120/40 input construction and first-close normalization;
- explicit 40-bar left-censoring;
- rejection of incomplete non-censored input and open bars;
- OHLC geometry and detail-panel mismatch rejection;
- rejection of incomplete Doctrine RAG semantics;
- removal of all local case/stream/bar identities from outbound data;
- rejection of root and nested field injection, hidden `toJSON`, and payload-hash tampering;
- canonical-hash rejection of undefined, non-finite, non-plain, and cyclic values;
- exact local Case to anonymous input and call/payload/prompt binding;
- retry attempts remaining under one logical call;
- provider terminal-field combinations;
- accepted and rejected validation records;
- immutable attempt-content tamper detection.

These tests prove contract, causality, privacy-field, and immutable-identity behavior. They do not prove chart anonymity, doctrine quality, model quality, or profitability.

## Deferred

- deterministic anonymous chart renderer and image-byte artifact contract;
- strict persisted JSON/OpenAPI parsing for all records;
- database tables and atomic uniqueness constraints;
- actual RAG approval and retrieval service;
- provider adapters, retry policy, timeouts, rate limits, token usage, and cost;
- model calls, evaluation, replay, training, and any trading authority.
