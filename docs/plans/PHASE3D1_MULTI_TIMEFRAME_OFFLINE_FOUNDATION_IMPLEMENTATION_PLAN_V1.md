# Phase 3D1 Multi-Timeframe Offline Synthetic Foundation Implementation Plan V1

Status: EXACT IMPLEMENTATION COMMIT `e1757c4916811260f9e853ccbfcbccb6c06839d3` ACCEPTED BY SEPARATE IMMUTABLE RECORD. SYNTHETIC OFFLINE FOUNDATION ONLY; FULL PHASE 3D AND OPERATIONAL INTEGRATION REMAIN UNACCEPTED.

Date: 2026-08-05

## 1. Authority and baseline

This plan is bound to:

- repository baseline `44ae0cf10191d3f756ff46db9aae59d882f68a82`;
- accepted Phase 3D contract content hash `sha256:989eb4a9717aff887fd5c970abf6bd14e53e97f4e37216779e4d287774a50b90`;
- Phase 3D approval-record identity `sha256:0107f512023f2e0e33bd892ba262e3ba3db24e0224d0dadea50c65b67b6eaf3c`;
- completed reuse-scan content hash `sha256:5bb128384c774d6c4bdf090f1c11156f754c9875c1c143aeea30ed21929ac238`;
- `docs/decisions/PHASE3D1_IMPLEMENTATION_AUTHORIZATION_V1.json`;
- `docs/decisions/PHASE3D1_IMPLEMENTATION_ACCEPTANCE_V1.json`, record hash `sha256:10ebe854fb8daf0ef9e7a033601610f01a6e908bda44a4414e7f807691c9e108`.

The accepted contract remains byte-immutable. Its `DRAFT FOR CALVIN ACCEPTANCE` text is part of the accepted preimage; the external approval record remains acceptance authority.

## 2. Objective

Implement one bounded, repository-owned, offline synthetic foundation for separately versioned multi-timeframe identities:

- required native five-minute primary evidence;
- optional native same-source sixty-minute and daily reference evidence;
- local source/session/snapshot bindings that never enter the anonymous input;
- common five-minute-anchored normalization;
- timeframe-aware anonymous bars and evidence;
- deterministic multi-timeframe PNG artifacts;
- one identity-free response envelope with reference and missing-data assessments;
- one strict unapproved response-schema proposal and offline invented-response validator.

This slice proves contract, causal, privacy, and deterministic-rendering behavior only. It does not establish full Phase 3D completion, Brooks semantic coverage, data-source readiness, provider readiness, or profitability.

## 3. Reuse and dependency boundary

Add zero dependencies.

Reuse only existing repository seams:

- TypeScript and canonical contract utilities;
- `@resvg/resvg-js@2.6.2`, with system fonts disabled and no external resources;
- `ajv@8.20.0` for strict structural validation;
- `jsonc-parser@3.3.1` for duplicate-key and strict JSON parsing.

Do not install or import an aggregation engine, calendar engine, browser chart library, MCP server, market-data client, backtest framework, paper/live engine, broker SDK, provider SDK, or telemetry service.

## 4. Exact implementation write scope

### 4.1 Contracts

New files:

- `packages/contracts/src/brooks-multi-timeframe-input-v1.ts`;
- `packages/contracts/src/brooks-multi-timeframe-response-v1.ts`;
- `packages/contracts/test/brooks-multi-timeframe-input-v1.test.ts`;
- `packages/contracts/test/brooks-multi-timeframe-response-v1.test.ts`.

Necessary export changes only:

- `packages/contracts/src/index.ts`;
- `packages/contracts/package.json`.

### 4.2 Chart renderer

New files:

- `packages/chart-renderer/src/anonymous-multi-timeframe-chart-renderer-v1.ts`;
- `packages/chart-renderer/test/anonymous-multi-timeframe-chart-renderer-v1.test.ts`.

Necessary export changes only:

- `packages/chart-renderer/src/index.ts`;
- `packages/chart-renderer/package.json`.

### 4.3 Strict response validation

New files:

- `docs/prompts/BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_V1.schema.json`;
- `packages/persistence-contracts/src/brooks-multi-timeframe-response-validation-v1.ts`;
- `packages/persistence-contracts/test/brooks-multi-timeframe-response-validation-v1.test.ts`.

Necessary export changes only:

- `packages/persistence-contracts/src/index.ts`;
- `packages/persistence-contracts/package.json`.

No other implementation file is authorized. A required additional file or dependency is a stop condition requiring new adjudication.

## 5. Public seams under test

### 5.1 Multi-timeframe input seam

The new input module will expose pure constructors and integrity/privacy assertions for separately versioned:

- local source/session profile;
- local finalized and provisional native snapshots;
- local multi-timeframe Case;
- anonymous multi-timeframe market input;
- multi-timeframe chart manifests;
- complete anonymous policy input.

The module must enforce:

- five-minute bars required and finalized;
- exactly 120 five-minute bars as complete, 40 through 119 as explicitly left-censored, fewer than 40 and more than 120 rejected;
- optional sixty-minute and daily references in any of the four accepted combinations;
- zero through 120 visible bars for each supplied reference;
- no more than one provisional bar, provisional only as the final visible reference bar, and total count including provisional;
- one immutable five-minute cutoff and no post-cutoff content;
- exact source, instrument, market-surface, price-basis, source/session-profile, alignment, and cutoff binding across supplied timeframes;
- missing reference context as valid and explicit;
- supplied invalid reference context as whole-request rejection, never silent removal;
- no weekly/monthly path and no local aggregation authority.

### 5.2 Normalization and privacy seam

The first visible five-minute raw close is the sole normalization base and becomes exactly `100`. Every supplied timeframe uses that same base.

Anonymous bar IDs must distinguish timeframe and lifecycle while remaining relative to one immutable input. The outbound whitelist must contain no source identity, source bar ID, instrument, venue, market surface, real timestamp/date/timezone, account, outcome, PnL, local path, credential, or raw-price field.

### 5.3 Multi-timeframe chart seam

The new renderer will create a separately versioned artifact and bundle identity:

- five-minute context chart;
- five-minute final-40 detail chart;
- one sixty-minute context chart only when supplied;
- one daily context chart only when supplied.

All artifacts use fixed dimensions, fixed colors, fixed geometry, text-free SVG, system fonts disabled, no network resources, and the existing pinned resvg runtime. Missing references create no placeholder artifact. A supplied zero-bar reference may produce only its explicitly bound deterministic zero-observation context artifact and must not be confused with an absent reference.

### 5.4 Identity-free response seam

The new response envelope will retain one complete Brooks response and add:

- explicit sixty-minute and daily reference assessments;
- `supports | limits | opposes | no_material_effect | uncertain | unavailable_for_this_decision` relationships;
- timeframe-aware evidence catalog entries with bar, field, lifecycle, normalized value, claim scope, and Doctrine references;
- explicit primary and reference missing-data materiality assessments;
- frozen timeframe-aware geometry bindings.

The semantic validator checks evidence existence, timeframe/lifecycle/value consistency, assessment completeness, gap branch consistency, and the already accepted stop/limit and Swing/Scalp geometry relations. It implements no timeframe voting, scoring, fixed priority, blanket conflict veto, or scenario-to-verdict mapping.

### 5.5 Strict JSON seam

The schema is an unapproved response-schema proposal only. The parser must reject duplicate keys, unknown fields, coercion, defaults, repair, prose wrappers, invalid enum branches, non-finite semantics, bad references, and inconsistent nullability before returning deeply frozen invented-response data.

It does not create or modify a prompt or Prompt Package.

## 6. Ordered TDD implementation

1. Verify the authorization commit, accepted hashes, zero dependency delta, and frozen V1/V2 bytes.
2. Write one failing input-contract test for the smallest valid five-minute-only Case; implement the minimum constructor.
3. Add failing count, optional-reference, source-binding, alignment, lifecycle, cutoff, history-start, continuity, and invalid-reference tests one vertical slice at a time.
4. Add failing common-normalization, anonymous-ID, exact-whitelist, and tamper-integrity tests; implement only enough to pass each slice.
5. Add failing multi-timeframe artifact/bundle byte and pixel tests; implement the separate renderer without changing V1.
6. Add failing response-envelope tests for reference assessments, evidence, gaps, provisional anchors, and geometry; implement the pure semantic seam.
7. Add failing strict-schema/parser tests; create the exact unapproved schema proposal and Ajv/semantic validation seam.
8. Cover all four timeframe combinations and all accepted/rejected count and causal boundaries.
9. Add paired cases whose five-minute local bytes, anonymous five-minute bytes, and five-minute PNG bytes remain identical when valid reference contexts are added or removed.
10. Update only authorized package indexes/subpath exports.
11. Run focused and full verification, obtain an independent fresh-context read-only review, create one candidate implementation commit, and stop for Calvin acceptance.

Tests may encode only accepted deterministic contracts. They must not encode desired verdicts, PnL, win rate, trade frequency, parameter ranking, or unapproved Brooks Doctrine.

## 7. Required test matrix

At minimum:

- timeframe combinations: `5m`, `5m+60m`, `5m+1d`, `5m+60m+1d`;
- primary counts: `39` reject, `40` accept left-censored, `119` accept left-censored, `120` accept complete, `121` reject;
- each reference count: `0`, `1`, `119`, `120` accept, `121` reject;
- provisional combinations: zero finalized plus one provisional, 119 finalized plus one provisional, two provisional reject, provisional-not-last reject, post-cutoff reject, finalized-after-cutoff reject;
- source/profile mismatches: source, instrument, market surface, price basis, session profile, alignment, cutoff, and content hash;
- continuity/history states, expected breaks, explicit gaps, and invalid unknown fields;
- common normalization across all supplied timeframes;
- privacy/tampering and exact content hashes;
- absent reference versus supplied zero-bar reference;
- reference relationship and evidence consistency;
- gap materiality branch closure;
- valid and invalid finalized/provisional geometry anchors;
- strict schema and duplicate-key rejection;
- deterministic repeated PNG bytes and independent pixel assertions;
- paired byte-identical five-minute evidence with only reference presence changed.

## 8. Verification and review

The accepted candidate was required to pass:

- focused new tests pass;
- `pnpm test` passes;
- `pnpm typecheck` passes;
- TypeScript LSP reports zero diagnostics for changed source and test files;
- `pnpm install --frozen-lockfile` causes no lockfile drift;
- repeated rendering yields byte-identical PNGs and expected non-background pixels;
- accepted contract, approval, V1/V2 prompt/schema/package, V1 Case/input/chart, and prior acceptance hashes remain unchanged;
- dependency manifests show no new dependency;
- scans find no protected-window material, real-data adapter, network/provider call, credential, aggregation/calendar authority, replay, Paper/Live, order, exchange, wallet, or trading path;
- `git diff --check` passes;
- a separately approved fresh-context read-only reviewer returns a visible `PASS` with zero blockers.

Direct Pi remained the sole writer, verifier, and candidate-commit owner. Four fresh-context read-only reviews were performed; all prior findings were corrected and reverified, and the final review returned `PASS` with zero blocking and zero non-blocking findings. Calvin separately accepted exact commit `e1757c4916811260f9e853ccbfcbccb6c06839d3` and tree `21fa792ba769c5410010e097c026f150ff2948a4` under the immutable acceptance record. The reviewers only read and ran tests; they did not edit files.

## 9. Falsification and stop conditions

Stop and seek a new decision if:

- exact accepted behavior requires an external calendar or aggregation authority;
- any new dependency is required;
- the existing resvg seam cannot prove deterministic artifacts;
- strict behavior cannot be expressed with the existing TypeScript/Ajv/JSONC seams;
- any accepted V1/V2 byte or semantic identity must change;
- real data, Source bodies, protected windows, provider output, outcomes, or execution state would be needed;
- the implementation cannot reject invalid supplied references without silently weakening the contract;
- independent review reports an unresolved blocker.

## 10. Rollback and terminal boundary

The implementation is additive and has no migration, stored state, service, deployment, credential, or external side effect. Exact commit `e1757c4916811260f9e853ccbfcbccb6c06839d3` is accepted only within this offline synthetic boundary and can be reversed by an ordinary non-destructive Git revert.

The acceptance terminal boundary remains before persistence, Policy Assembly, Prompt Package mutation or activation, Source or Doctrine work, installed-provider inspection, provider evaluation or call, runtime record creation, production decisions, real data, replay, training, Paper, Live, exchange, wallet, order, or trading.
