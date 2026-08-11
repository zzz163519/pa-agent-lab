# Claude Architecture Manager Handoff V1

## Purpose

Claude now owns architecture guidance and delivery management for PA Agent Lab. Use plain language, keep design work time-boxed, and move approved work toward runnable vertical slices. Do not restart completed H1 design work or reopen frozen decisions without new evidence.

## Current role split

- Calvin: product intent, strategy and authority decisions, scope expansion, and final commit/merge/deployment approval.
- Claude: Architecture Manager. Read the repository, freeze goals and non-goals, define boundaries and acceptance checks, dispatch bounded work, resolve ordinary engineering choices, and summarize progress.
- Pi + Sudocode `sudocode/gpt-5.6-luna` at max effort: Implementation Worker inside an Orca-managed isolated worktree. One writer per worktree.
- Codex: fresh-context, read-only Independent Auditor. Findings first, severity and file/line evidence, plus independently run tests/typechecks.

Calvin has approved this operating model. Within an already approved objective and authority boundary, Claude may split and dispatch implementation work without asking Calvin to approve every subtask. Any new real-data, protected-window, provider/model-call, replay, Paper/Live, exchange, wallet, order, execution, or trading-runtime authority still requires separate explicit approval.

## H1 Discovery MVP status

H1 implementation is complete and independently reviewed in this isolated worktree:

- Worktree: `/home/calvin/pa-agent-lab-worktrees/h1-discovery-mvp`
- Branch: `feat/h1-discovery-mvp`
- Base/HEAD: `a40da8c14974c7ab86305840df6028fcb987d010`
- State: uncommitted, unstaged, not pushed, not merged
- Reviewer result: no blockers

Implemented deliverables:

- `@pa-agent-lab/contracts/discovery-factor-v1`
- Pure TypeScript `@pa-agent-lab/discovery-engine`
- Five core detectors and three non-triggering context enhancers
- Composite Candidate grouping and deterministic priority
- Fingerprint, dedup thread, revision and candidate identity
- TTL, cooldown, exact semantic escalation and admission checks
- Deterministic audit records and malformed-input fail-closed behavior
- Synthetic-only fixtures and tests
- Workspace exports, package integration and lockfile update with no external dependency

Expected changed files in the H1 worktree:

- `package.json`
- `pnpm-lock.yaml`
- `packages/contracts/package.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/discovery-factor-v1.ts`
- `packages/contracts/test/discovery-factor-v1.test.ts`
- `packages/discovery-engine/package.json`
- `packages/discovery-engine/src/discovery-engine-v1.ts`
- `packages/discovery-engine/src/index.ts`
- `packages/discovery-engine/test/discovery-engine-v1.test.ts`
- `packages/discovery-engine/tsconfig.json`

## Fresh verification evidence

Direct verification after the correction passes:

- Focused Discovery contract and engine tests: `27/27` passed.
- Full Node suite: `306 passed`, `1 skipped`, `0 failed`.
- Research Console Vitest: `7/7` passed.
- Full repository `pnpm typecheck`: passed.
- TypeScript LSP diagnostics on all H1 TypeScript source/test files: `0` diagnostics.
- Public root and subpath import smoke tests: passed.
- `git diff --check` and untracked-file whitespace checks: passed.
- No staged files.
- Fresh-context read-only reviewer: no blockers.

The reviewer did not run commands because its reviewer session remained in plan mode; its result is code-review evidence only. The command evidence above was run independently by Direct Pi afterward.

## Frozen H1 decisions

Do not change these during merge or cleanup unless Calvin explicitly reopens them:

- Discovery is a deterministic research funnel, not a trading signal or execution authority.
- It must not emit final `long/short`, `buy/sell`, entry, stop, target, confirmed setup, probability, confidence, or execution permission.
- Closed five-minute bars only. Event ordering must remain causal.
- History gate: fewer than 40 bars is `insufficient_history`; 40-119 is `left_censored`; 120 or more is normal.
- References use only the 20 closed bars before the event bar.
- R-7 `p25`, median and `p75`; no epsilon replacement and no partial imputation.
- Price-range activity is independent of volume availability.
- Optional volume is valid only when every prior-20 bar plus the event bar has reliable, finite, non-negative volume under the same source/instrument/timeframe.
- General mechanics are `PROVISIONAL`; only TTL/cooldown lifecycle defaults are `PROVISIONAL_BOOTSTRAP_DEFAULT`.
- V1 mechanics: tolerance `0.5 * prior median range`, movement lookback 3, pivot confirmation 2/2, lower/middle/upper thirds, TTL 3 bars, cooldown 6 bars.
- The only cooldown bypass is same-thread `breakout_attempt -> failed_breakout_candidate`, with exact predecessor linkage.
- `eventFingerprint` includes `effectiveBarId`; `dedupGroupKey` excludes it; `candidateId` binds fingerprint, revision and schema version.
- ADR-0008 `continuous_every_close` scheduling semantics must not change.

## Main-worktree warning

The main worktree `/home/calvin/pa-agent-lab` contains substantial user-owned uncommitted and generated work unrelated to H1. Do not stash, reset, clean, overwrite, stage, commit, or revert it.

Known overlap requiring care:

- Main currently modifies `packages/contracts/package.json` and `packages/contracts/src/index.ts` for unrelated work.
- Main contains untracked current H1 design files:
  - `docs/contracts/DISCOVERY_FACTOR_V1.md`
  - `docs/plans/DISCOVERY_PHASE0A_FACTOR_V1_IMPLEMENTATION_TASK_CARD_V1.md`
- The H1 implementation worktree modifies the same contracts package integration files.

Treat the main-worktree files as user-owned. Inspect and combine changes deliberately only after Calvin authorizes integration. Never use a destructive checkout/reset to resolve the overlap.

## Authority boundaries

H1 does not authorize real market data ingestion, provider/model calls, ModelRuns, replay, API/UI integration, Paper/Live, public deployment, exchange access, wallet access, order placement or trading. Protected windows `2025-02`, `2025-05` and `2025-08` remain forbidden. `/home/calvin/vegas-ema-cta-lab` remains read-only and independent.

Tests prove deterministic, causal, privacy and authority behavior. They do not prove PA quality or profitability.

## Next plan

1. Read `AGENTS.md`, this handoff, the two H1 design files in the main worktree, and the complete H1 diff in the isolated worktree.
2. Confirm there has been no drift since the recorded verification. Do not redesign H1.
3. Give Calvin a short, plain-language choice for integration: keep the branch parked, authorize a commit only, or authorize a careful merge into the dirty main worktree.
4. If Calvin authorizes commit/merge, preserve all main-worktree user changes, resolve only the two known contracts integration overlaps, rerun focused and full verification, then ask Codex for a final read-only audit of the integrated result.
5. For the next Discovery slice, produce a short design brief with goal, non-goals, interfaces, acceptance tests, worktree ownership and at most three Calvin decisions. Dispatch implementation to Pi + Luna Max through Orca after the scope is approved.

## First response expected from Claude

Acknowledge the handoff in plain language. State what is complete, whether any immediate blocker exists, and the single next decision needed from Calvin. Do not produce another long contract or restart H1 architecture work.
