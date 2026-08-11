# PA Agent Monitoring Frontend Slice Plan V1

Status: DRAFT PLAN. NOT IMPLEMENTATION AUTHORITY, PROVIDER AUTHORITY, REPLAY AUTHORITY, PAPER/LIVE AUTHORITY, OR TRADING AUTHORITY.

This document records the corrected plan for the human operator monitoring workbench. It is a future frontend implementation slice only. It does not authorize Candidate Pack preparation, PA Agent prompt changes, provider/model calls, market-data ingestion, replay execution, Paper/Live operation, exchange submission, wallet/account access, order placement, or real-money activity.

The slice extends the existing `packages/research-console` package after the required upstream contracts and API endpoints exist. It must not create a new frontend package.

## 1. Corrected Slice Order

The monitoring frontend is not an early slice. It depends on candidate identity, candidate-pack semantics, PA response semantics, validator rules, Risk Gate state, Execution Gateway state, and API endpoints.

The corrected order is:

```text
Slice 1: Discovery Phase 0A
  candidate identity, event fingerprint, TTL/cooldown schema

Slice 2: Candidate Pack contract, PA response schema, validator rules
  candidate reason format, observedPolarity treatment, disposition,
  reframeClaim, trade verdict, rationale closure, terminal reject rules

Slice 3: Risk Gate contract and Execution Gateway contract
  kill switch signal schema, risk pass/block/block_reason,
  execution gateway mode/status semantics

Slice 4: case-api monitoring endpoints
  append-only kill switch write endpoint, current kill switch read endpoint,
  candidate stream read endpoint, system health read endpoint

Slice 5: research-console monitoring UI
  UI calls only, no backend logic, no contract authority

Slice 6+: factor layer implementation
```

The prior proposal that placed Discovery Phase 0A after the monitoring frontend is rejected. Candidate Stream UI needs candidate identity, event fingerprints, rank/compression reason fields, TTL, and cooldown semantics before it can be a truthful operator view.

## 2. Frontend Slice Is UI-Only

Slice 5 only implements monitoring views and API calls in `packages/research-console`.

It may do:

- render candidate stream records returned by case-api;
- render PA disposition, PA verdict, validator state, Risk Gate state, Execution Gateway state, and system health records;
- open Halt and Resume dialogs;
- call a case-api kill switch endpoint;
- render empty, loading, error, and halted states.

It must not do:

- define the authoritative KillSwitchRecord schema;
- implement append-only storage;
- implement Risk Gate halt or resume logic;
- infer execution state locally;
- modify PA Agent prompts;
- call a provider/model;
- ingest market data;
- run replay;
- display outcome/PnL in the main views;
- provide a manual override for PA verdicts;
- bypass case-api by reading or writing the database directly;
- create a new backend service.

## 3. Kill Switch Contract Ownership

The kill switch contract belongs to Slice 3 Risk Gate contract design, not the frontend slice. The case-api write/read endpoints belong to Slice 4.

The minimum compliant record shape to be defined upstream is:

```ts
interface KillSwitchRecord {
  action: "halt" | "resume";
  reason: string;
  effectiveMode: "operator_halt" | "operator_resume";
  previousRecordHash: string | null;
  linkedHaltRecordHash: string | null;
  operatorSessionHash: string;
  authMode: string;
  recordHash: string;
  timestamp: string;
}
```

Contract rules that must be owned upstream:

- `reason` is required and non-empty;
- `previousRecordHash` is null only for the first valid halt record;
- `resume` must link to a valid prior halt record through `linkedHaltRecordHash`;
- `resume` can only clear `operator_halt`;
- `resume` must not clear system-critical Risk Gate blocks;
- `recordHash` is the content hash for the record preimage;
- `operatorSessionHash` is local-session-derived and must not expose a real human identity;
- Risk Gate reads the latest valid kill switch record before accepting execution intent.

The frontend can render and submit records only through case-api after Slice 3 and Slice 4 define the contract and persistence semantics.

## 4. Status Bar Content

The persistent status bar is allowed, but it must not display PnL-derived values or drawdown percentages in the main UI.

Allowed status bar example:

```text
Positions 2/5 | Daily loss guard: OK | Trading window: OPEN | [HALT]
```

Allowed risk guard states:

```text
OK | WARN | BLOCKED
```

Concrete threshold values and percentage drawdown figures remain internal to the Risk Gate contract and audit records unless a later UI contract explicitly authorizes a bounded operator-local exposure. This plan does not authorize that exposure.

When an operator halt is active, the status bar must switch to a prominent halted state such as:

```text
SYSTEM HALTED BY OPERATOR
```

This UI state is only a display of the upstream kill switch state. It is not the halt authority.

## 5. Execution Gateway UI Enumeration

The UI must not render a bare `SENT` label because human operators can interpret it as a live order submission.

Execution Gateway display values must bind the status to execution mode. Initial allowed UI labels are:

```text
SENT_TO_REPLAY_ONLY
HELD_EXECUTION_DISABLED
EXPIRED_TTL
```

If future Paper or Live modes are authorized, they require their own explicit display labels and contract acceptance. This plan does not authorize Paper, Live, exchange, wallet, account, or order activity.

## 6. Operator-Local Field Boundary

The monitoring workbench may display operator-local fields such as symbol, local timestamp, and local price only when those fields come from the monitoring API and are clearly separated from anonymous PA/provider payloads.

Boundary rules:

- symbol, timestamp, and price may be displayed to the local operator for monitoring context;
- those fields must not enter the PA Agent provider payload;
- those fields must not appear in PA rationale as evidence;
- those fields must not be used to validate candidate reason dispositions;
- Candidate Pack content sent to the PA Agent remains anonymous and causally bounded;
- UI component comments and API type comments should state this boundary where the fields are introduced.

The frontend must not blur operator monitoring identity with PA Agent evidence identity.

## 7. Candidate Card Required Fields

Each decision card must be useful to a human operator without exposing prohibited authority.

Required card-level fields:

- operator-local instrument label when available;
- operator-local event timestamp when available;
- candidate reason text;
- PA disposition: `confirmed`, `reframed`, or `rejected`;
- PA trade verdict: `long`, `short`, `no_trade`, or `uncertain` when available;
- TTL remaining or stale indicator;
- validator state, including rejected reason when rejected;
- Risk Gate state: pass or block;
- Risk Gate rule ID when blocked;
- execution mode and execution gateway state;
- system halt active state or banner when active;
- relevant record hashes or compact hash references for drill-down.

Forbidden card-level fields:

- rank or score numeric values;
- PnL, outcome, win rate, or return fields;
- manual PA verdict override buttons;
- raw provider output controls;
- protected-window references;
- naked `SENT` status.

Rank, score, and budget fields may exist in scheduler audit records, but this UI slice must not render them as operator trading evidence.

## 8. Halt And Resume UX

Halt and Resume are separate UX flows.

`HaltDialog` rules:

- low operational threshold;
- requires a non-empty reason;
- submits `action: "halt"` through case-api;
- does not require the operator to inspect current Risk Gate internals before halting.

`ResumeDialog` rules:

- higher operational threshold;
- requires a non-empty reason;
- displays the current Risk Gate condition snapshot returned by the API;
- displays the latest halt record hash;
- requires explicit operator confirmation that the current state has been reviewed and is safe for operator-halt removal;
- submits `action: "resume"` through case-api;
- can only request removal of `operator_halt`;
- must not remove or override system-critical Risk Gate blocks.

The frontend must not implement resume semantics locally. It only submits the operator request and renders the API result.

## 9. Slice 5 Preconditions

The monitoring frontend slice must not start as a real implementation until Slice 1 through Slice 4 are complete.

Required upstream artifacts:

- Discovery candidate identity schema is versioned;
- event fingerprint and TTL/cooldown schema are versioned;
- Candidate Pack contract schema exists;
- PA response schema exists;
- validator reject rules exist;
- Risk Gate contract exists and includes kill switch signal semantics;
- Execution Gateway contract exists and contains no bare `SENT` display semantics;
- case-api exposes these endpoints:
  - `GET /v1/monitoring/candidate-stream`
  - `GET /v1/monitoring/system-health`
  - `POST /v1/monitoring/kill-switch`
  - `GET /v1/monitoring/kill-switch/current`

If any prerequisite is absent, Slice 5 must remain unstarted except under the stub-only exception below.

## 10. Stub-Only Exception

A stub-only UI prototype is permitted before Slice 1 through Slice 4 are complete only if it is explicitly labeled as stub-only.

Stub-only constraints:

- no real Risk Gate halt or resume is simulated;
- no append-only kill switch record is claimed;
- no real candidate stream semantics are claimed;
- no case-api persistence is bypassed;
- no production data, market data, outcome, PnL, protected window, provider, replay, Paper/Live, or trading path is touched;
- fixture data must be synthetic and must not be presented as real operator state;
- task card and UI labels must state that Risk Gate block integration is absent.

Stub-only work cannot satisfy the real Slice 5 acceptance criteria. It is design validation only.

## 11. Verification Method

Slice 5 verification is frontend/API-fixture verification, not replay.

Required checks for a real Slice 5 implementation:

```bash
pnpm --filter @pa-agent-lab/research-console typecheck
pnpm --filter @pa-agent-lab/research-console test
```

Required test coverage:

- Candidate Stream empty state;
- Candidate Stream populated state;
- card rendering without rank/score numeric display;
- Decision detail rendering with disposition, validator, Risk Gate, execution mode, and record hashes;
- HaltDialog confirm and cancel flows;
- ResumeDialog confirm and cancel flows;
- ResumeDialog displays Risk Gate condition snapshot and latest halt record hash;
- API error handling for kill switch requests;
- system halted banner rendering.

Required synthetic API fixture coverage:

- `candidate-stream` read fixture;
- `system-health` read fixture;
- current kill switch read fixture;
- halt post fixture;
- resume post fixture;
- blocked resume fixture when a system-critical block remains active.

Required textual scans:

```bash
rg -n "\bSENT\b|rank|score|PnL|pnl|outcome|win rate|Paper|Live|provider|replay|protected|2025-02|2025-05|2025-08" packages/research-console/src
```

Textual scans are a lightweight guard only. They are not the only validator. TypeScript transport types and component tests must carry the main enforcement. In particular, forbidden fields should not appear in component props where feasible.

Reviewer acceptance must be read-only and must confirm:

- no PA verdict override entry exists;
- no rank or score numeric display exists;
- no outcome/PnL main-view display exists;
- no bare `SENT` label exists;
- no protected-window reference exists;
- kill switch UI does not claim to implement Risk Gate logic locally;
- symbol/time/price are operator-local only and not PA/provider evidence.

## 12. Landing Path

The next landing step is to keep this plan as a draft task-card source. It should not become implementation authority until the upstream Slice 1 through Slice 4 artifacts exist and Calvin explicitly authorizes the frontend implementation scope.

When the frontend task card is later opened, the allowed file scope should include only `packages/research-console` if and only if Slice 3 and Slice 4 already provide all required backend contracts and endpoints.

If Slice 4 endpoints are not complete, the task card must either remain blocked or be explicitly scoped as stub-only. It must not create backend logic inside the frontend slice.

No Orca worker should be assigned to this slice until the task card freezes:

- exact allowed files;
- exact forbidden files;
- upstream contract hashes or record identities;
- endpoint names and response types;
- validation commands;
- reviewer read-only scope;
- false authority flags for provider, replay, Paper/Live, market data, and trading.
