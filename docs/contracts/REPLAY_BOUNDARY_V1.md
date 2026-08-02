# Replay Boundary V1

Status: IMPLEMENTED PHASE 1 CONTRACT. NO REPLAY ENGINE OR EXECUTION AUTHORITY.

Authority: ADR-0007 and ADR-0014.

## Package

```text
@pa-agent-lab/contracts
@pa-agent-lab/contracts/replay-boundary-v1
```

Primary public seams:

- `createDatasetAuthorization` / `assertDatasetAuthorizationIntegrity`;
- `createPostDecisionExecutionDataProvenance` / `assertPostDecisionExecutionDataProvenanceIntegrity`;
- `createExperimentPolicyReference` / `assertExperimentPolicyReferenceIntegrity`;
- `createReplayRequest` / `assertReplayRequestIntegrity`;
- `createReplayResult` / `assertReplayResultIntegrity`.

All accepted records are deeply frozen and use lowercase SHA-256 content identities over canonical JSON preimages.

## Dataset authorization

`DatasetAuthorizationV1` is a local approval record for one exact immutable slice. Required boundaries are:

- exact dataset/version/slice identity;
- artifact and manifest hashes;
- canonical UTC coverage;
- `exact_slice` scope;
- `research_replay` purpose;
- passed protected-window validation evidence;
- explicit Calvin approval evidence.

It does not authorize an entire source or a runtime-selected range. It contains metadata and hashes only, not market rows.

## Post-decision provenance

`PostDecisionExecutionDataProvenanceV1` records the execution-data artifact and manifest identities plus stable first/last event bounds. Every event belongs to a parent policy bar, and the first parent sequence must be strictly greater than the frozen decision-point sequence.

The provenance binds the exact:

```text
dataset authorization
  -> Case
    -> anonymous input
      -> BrooksDecision
        -> policy stream and local cutoff
          -> post-cutoff event range
```

Decision-bar R events and non-monotonic source ranges are rejected. `closed_bars` and `sub_bar_events` identify resolution only; they do not define an OHLC path, tick format, order model, or fill model.

## Experiment policy

`ExperimentPolicyReferenceV1` contains only:

- `policyId`;
- `policyVersion`;
- `assumptionsHash`;
- `isFrozen: true`;
- `mutationPermitted: false`;
- derived `policyHash`.

Mechanical assumptions remain outside this Phase 1 contract. The reference cannot carry sizing, fee, slippage, funding, latency, order, fill, portfolio, or accounting authority.

## Replay request

`createReplayRequest` consumes validated source records during construction but emits a narrow identity-only `ReplayRequestV1`. It selects one accepted frozen result from a replay decision bundle and checks:

- local Case integrity;
- anonymous market derivation and `inputHash`;
- BrooksDecision content hash and Case/input binding;
- bundle and selected logical call identity;
- decision-point bar and sequence;
- dataset authorization, provenance, and policy hashes.

One request is one decision path:

```text
pathId = selected frozen logical callId
pathScope = single_frozen_decision
```

The request includes the authorized first/last event range so result event identities can be range-checked without embedding raw execution data.

The following fields are fixed to false:

- `modelCallsPermitted`;
- `policyMutationPermitted`;
- `futureDataPermitted`;
- `implicitOhlcTraversalPermitted`.

## Replay result

`ReplayResultV1` is an identity and terminal-state envelope, not a fill or accounting record.

| State | Meaning | Required evidence |
|---|---|---|
| `rejected` | a valid request fails a pre-sidecar revocation, artifact, runtime, config, or audit identity gate | rejection reason; `sidecarStarted: false`; null sidecar hashes |
| `resolved` | selected path reached a deterministic terminal event | terminal event inside the authorized event range plus opaque runtime/config/raw hashes |
| `unresolved` | selected path cannot be determined | one explicit unresolved reason and `terminated_fail_closed` |
| `right_censored` | authorized horizon ended first | final authorized censoring boundary and last observed event |

Invalid Case/input/decision/cutoff or malformed request candidates fail before a `ReplayRequestV1` is created; they cannot be represented as a result with a valid `requestHash`. Result-level rejection reasons are limited to dataset-authorization revocation and dataset/provenance/policy/runtime/config/audit identity failures discovered before sidecar startup.

Allowed unresolved reasons:

- `missing_execution_data`;
- `segment_boundary`;
- `same_bar_order_ambiguous`;
- `source_order_unknown`.

`resolved` has no positive or negative outcome meaning. No terminal shape contains PnL, profit, win/loss, probability, order, fill, position, or account fields.

Each result binds:

- `requestHash` and `pathId`;
- dataset authorization, provenance, and experiment-policy hashes;
- validation-audit hash;
- canonical `resultHash`;
- for non-rejected results only, opaque engine-runtime, replay-config, and raw-artifact hashes.

## Generated transport artifacts

Committed transport-only artifacts:

```text
packages/persistence-contracts/schemas/replay-boundary-v1.schema.json
packages/persistence-contracts/openapi/replay-boundary-v1.openapi.json
```

They contain closed `ReplayRequestV1` and `ReplayResultV1` components with no endpoint paths and no `x-pa-record-kinds`. They are generated alongside, but remain separate from, ADR-0013's persisted-record schemas. No replay table or database migration is added.

## Verified behavior

Synthetic tests prove:

- broad or mutable dataset authorization is rejected;
- failed protected-window validation is rejected before access;
- decision-bar or earlier execution events are rejected;
- Case/input/decision/bundle/cutoff mismatches are rejected;
- model calls and experiment-policy mutation are forbidden;
- request content excludes candles and trade-plan bodies;
- missing data, segment boundaries, same-bar ambiguity, and source-order uncertainty terminate the selected path fail closed;
- right-censoring binds the authorized final event;
- rejected results cannot claim sidecar artifacts;
- non-rejected results require runtime/config/raw-artifact audit hashes;
- generated schemas remain synchronized and do not add API or persisted-record authority.

These tests prove contract behavior only. They do not prove replay-engine behavior, Price Action quality, execution correctness, or profitability.

## Deferred

- replay-engine installation or execution;
- exact engine/runtime/config/raw-artifact formats behind the opaque hashes;
- execution-event adapters and normalization;
- orders, fills, risk, sizing, costs, positions, portfolio, accounting, and settlement;
- persistence tables, API routes, or services for replay records;
- Paper, Live, exchange, wallet, credentials, and real-money authority.
