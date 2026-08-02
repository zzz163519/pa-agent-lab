# Two-Track Preflight Audit and Minimal Replay Gap V1

Status: `audit_and_plan`, not a replay implementation and not an approval of Phase 8 execution mechanics.

## Audit conclusion

### Track A — public Brooks corpus preflight

The repository now has enough public-source evidence for a bounded preflight artifact:

- public modern Brooks Trading Course pages provide the primary source surface;
- the public Ask Al archive exposes 113 category items across 12 visible pagination pages;
- individual Ask Al pages can expose transcript/audio/video metadata and public YouTube links;
- the existing `DoctrineUnitV1` fields (`concept`, `rule`, `appliesWhen`, `avoidWhen`, `decisionEffect`) are sufficient for a small source-mapped pilot;
- the pilot must remain local metadata/derived records with `draft` status, not runtime retrieval.

Implemented artifacts:

- [`SOURCE_INVENTORY_V1.md`](./SOURCE_INVENTORY_V1.md)
- [`BROOKS_DOCTRINE_PILOT_V1.md`](./BROOKS_DOCTRINE_PILOT_V1.md)

No source text was committed. The artifacts preserve URL, type, approximate volume, availability/copyright inventory status, snapshot hash, extraction priority, source locator, and draft lifecycle.

### Track B — provider-neutral replay contract shell

The existing contracts already cover some prerequisites:

- `BrooksPolicyCaseV1` and `BrooksDecisionV1` have local identity, case/input identity, and final visible bar identity;
- `BrooksPolicyInputV1` has anonymous input identity, closed-bar boundary, continuity states, left-censoring, and content-addressed chart manifests;
- `ModelCallRecordV1`, `FrozenModelResultV1`, and `ReplayDecisionBundleV1` bind precomputed decisions and set `modelCallsPermitted: false`;
- existing validators reject future visible bars and malformed causal input.

The following replay boundary is still a contract gap and remains open:

| Required boundary | Existing evidence | Gap / next slice |
|---|---|---|
| frozen Case/BrooksDecision identity + causal cutoff | `caseHash`, `decisionHash`, `lastVisibleBarId`, `decisionPointBarId` | add one replay request binding that accepts only a frozen decision bundle and independently checks case/decision/cutoff identity |
| authorized dataset/input identity | `inputHash` and local policy Case identity | no dataset authorization record or protected-window rejection seam exists |
| post-decision execution-data provenance | none in current Phase 1 contracts | define provenance identity, visibility start (`strictly after` cutoff), source hash, and resolution status; do not add data or engine |
| experiment-policy identity hash | model call/replay bundle only carries model result identities | define a content-hashed opaque experiment policy reference; do not freeze sizing/fees/slippage yet |
| segment / missing-data / same-bar ambiguity / right-censoring | input continuity and decision uncertainty have related states | replay needs explicit result-side state vocabulary and affected-path fail-closed rules |
| ReplayRequest | no provider-neutral request record | define the narrow request after identity and state semantics are approved |
| ReplayResult | no canonical execution result | defer mechanics, fills, sizing, economics, and accounting to separately approved Phase 8 contract |
| audit/raw artifact/config/engine hashes | existing ModelRun/provider audit hashes cover model boundary | replay-specific raw artifact, config, engine/runtime, and canonical-result identities are absent |
| future data / implicit OHLC traversal / mid-run calls / policy mutation | ADR-0007 and frozen model bundle prohibit them normatively | encode these as request/result invariants and negative tests in the next approved replay slice |

## Minimal next implementation slice (not performed here)

1. Freeze only the provider-neutral identity/state vocabulary in a new replay contract ADR/contract document.
2. Write failing tests for: frozen bundle only; case/input/cutoff mismatch; unauthorized dataset; execution data at or before cutoff; missing data; segment reset; same-bar ambiguity; right-censoring; model calls forbidden; policy hash mutation rejected.
3. Implement the smallest pure TypeScript `ReplayRequest`/audit identity shell with opaque hashes and no order/fill/portfolio/economic assumptions.
4. Add generated transport schema only after the TypeScript seam is settled.
5. Keep `ReplayResult` mechanical fields deferred unless a later decision freezes them; a terminal state plus hashes is safer than inventing fills.
6. Use an independent read-only reviewer before merging a substantial validator.

## Explicitly not done / not authorized

- no NautilusTrader or LEAN installation or execution;
- no database/API service;
- no provider call, embedding, vector retrieval, RAG service, or training;
- no Paper/Live/exchange/wallet/real-money action;
- no protected-window, settlement-ledger, CITA/Vegas-outcome, or private-Brooks access;
- no V6 conclusion, case, rulebook, or artifact became Brooks doctrine authority.

## Decision needed later

No Price Action semantic grilling is needed for this audit. The next replay slice does require a separate contract approval for the exact replay result terminal-state vocabulary and the post-decision execution-data provenance shape. Until that is approved, this repository should not implement a mechanical `ReplayResult` that implies order, fill, sizing, fee, slippage, funding, latency, or accounting semantics.
