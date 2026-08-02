# ADR-0014: Provider-Neutral Replay Boundary V1

Status: ACCEPTED FOR THE PHASE 1 CONTRACT SLICE. NO REPLAY ENGINE OR EXECUTION AUTHORITY.

## Context

ADR-0007 accepts a future NautilusTrader-first replay sidecar direction, but it does not freeze the TypeScript request/result boundary or authorize Phase 8 execution. Existing Phase 1 contracts already freeze causal Cases, anonymous inputs, Brooks decisions, logical model calls, accepted frozen model results, and replay decision bundles that set `modelCallsPermitted: false`.

A replay boundary still needs to reject broad or unauthorized data access, bind one decision to its exact causal cutoff, prevent decision-bar OHLC traversal, preserve missing data and ambiguity, and retain deterministic audit identities before any sidecar can be considered. It must do this without inventing order, fill, sizing, fee, slippage, funding, latency, position, portfolio, PnL, or accounting semantics.

## Decision

Implement a dependency-free strict-TypeScript Replay Boundary V1 with content-hashed immutable records and generated transport-only schemas.

### Exact dataset-slice authorization

`DatasetAuthorizationV1` authorizes only one exact, pre-segmented, immutable, content-hashed data slice. It binds:

- dataset, version, and slice identities;
- artifact and manifest hashes;
- canonical UTC coverage start and end;
- `authorizationScope: exact_slice`;
- `approvedPurpose: research_replay`;
- `isImmutable: true`;
- a passed, content-hashed protected-window check;
- a content-hashed Calvin approval record.

Broad dataset, source, directory, or runtime-selected range authority is forbidden. A failed protected-window check is rejected before data access.

### Strictly post-cutoff execution-data provenance

`PostDecisionExecutionDataProvenanceV1` binds the authorized slice to:

- `caseHash`, `inputHash`, and `decisionHash`;
- policy stream, decision-point bar, and decision-point sequence;
- execution-data artifact and manifest hashes;
- `closed_bars | sub_bar_events` resolution identity;
- stable first/last event and parent policy-bar identities;
- `coverageStartRelation: strictly_after_decision_cutoff`.

The first execution event's parent policy-bar sequence must be greater than the decision-point sequence. An event from decision bar R, at or before the cutoff, or without monotonic source ordering is invalid. Later-starting evidence is not treated as continuous; it becomes explicit missing-data evidence at the result boundary.

### Frozen decision and experiment-policy binding

`ExperimentPolicyReferenceV1` is deliberately opaque. It binds only a policy ID, version, assumptions hash, frozen state, mutation prohibition, and derived `policyHash`. It contains no mechanical experiment assumptions.

`ReplayRequestV1` accepts validated local Case/input/decision records, an immutable replay decision bundle, one selected accepted frozen call, dataset authorization, post-decision provenance, and experiment-policy reference. The builder independently verifies:

- Case integrity and anonymous market derivation;
- BrooksDecision content hash and Case/input identity;
- selected result membership, accepted validation, and frozen identity;
- local and anonymous cutoff identities;
- dataset/provenance/policy hash relationships.

One request represents one frozen decision path. Its `pathId` is the selected logical `callId`. This prevents unresolved state in one request from silently mutating another independent path and avoids introducing portfolio dependency semantics.

Every request fixes:

- `modelCallsPermitted: false`;
- `policyMutationPermitted: false`;
- `futureDataPermitted: false`;
- `implicitOhlcTraversalPermitted: false`.

The canonical request contains identity bindings and authorized event bounds, not candles, raw execution data, or the Brooks trade-plan body.

### Terminal-state vocabulary and affected paths

`ReplayResultV1` allows exactly four terminal states:

- `rejected`: a valid request fails a pre-sidecar authorization-revocation or artifact/runtime/config/audit identity gate; `sidecarStarted` is false and sidecar artifact hashes are null;
- `resolved`: the selected mechanical path reached a deterministic terminal event; this does not mean profitable, correct, successful, winning, or losing;
- `unresolved`: evidence cannot determine the selected path; the current path is `terminated_fail_closed` with one of `missing_execution_data`, `segment_boundary`, `same_bar_order_ambiguous`, or `source_order_unknown`;
- `right_censored`: the authorized event horizon ended before the path reached a terminal boundary; the censoring boundary and last observed event remain explicit.

No result may use `success`, `failure`, `win`, `loss`, profitability, probability, or an inferred OHLC path as a substitute state. `unresolved` is never converted automatically to no-fill, exit, loss, or another result.

### Audit hashes

A result binds the request, path, dataset authorization, execution-data provenance, experiment policy, validation audit, and canonical `resultHash`. Non-rejected results require opaque engine-runtime, replay-config, and raw-artifact hashes. A rejected result cannot claim those sidecar artifacts.

These hashes reserve deterministic audit relationships. They do not approve any engine, runtime, configuration format, or mechanical content.

### Transport schemas

Generate separate closed JSON Schema 2020-12 and OpenAPI 3.1.1 component documents for `ReplayRequestV1` and `ReplayResultV1`. They expose no endpoint paths and no persisted-record-kind mapping. The existing six ADR-0013 persisted record kinds and PostgreSQL migration remain unchanged.

## Reuse decision

The implementation reuses the repository's existing canonical hashing, deep freezing, Case/input integrity validators, Brooks decision hash, frozen model-result bundle, and `ts-json-schema-generator` pipeline. No external replay library, service, MCP, skill runtime, dependency, Python/C# runtime, or new database component is needed for this pure contract slice.

ADR-0007 already records the maintained replay-engine candidate review. Repeating engine discovery or installing a candidate before Phase 8 approval would widen authority without helping this contract.

## Consequences

- Unauthorized or broad data authority fails before replay data can be opened.
- A decision formed on closed bar R cannot use R's intrabar path or future evidence.
- One request has one affected decision path, so ambiguity fails that path closed without inventing portfolio propagation.
- Replay request/result identities can be transported and audited without an engine.
- Missing data, segment boundaries, same-bar ambiguity, source-order uncertainty, and right-censoring remain distinct.
- Existing persisted JSON and PostgreSQL contracts do not acquire replay record authority implicitly.

## Deferred and forbidden

This ADR does not authorize or define:

- NautilusTrader, LEAN, another replay engine, or any sidecar process;
- historical data loading or access to protected windows;
- exact execution-event payloads or adapters;
- orders, fills, sizing, fees, slippage, funding, latency, positions, portfolio, risk, PnL, accounting, or settlement;
- a running database, API endpoint, provider call, RAG service, model call, training, or outcome optimization;
- Paper, Live, exchange, wallet, credential, public listener, or real-money capability.

Those remain separate Phase 8 or later decisions. An opaque hash in V1 does not approve the content behind it.
