# PA Agent System Baseline and Research Direction V1

Status: GOVERNANCE BASELINE MEMO. NOT IMPLEMENTATION AUTHORIZATION, SOURCE ACCESS AUTHORITY, DOCTRINE LIFECYCLE AUTHORITY, CORPUS ACTIVATION, PROVIDER AUTHORITY, REPLAY AUTHORITY, PAPER/LIVE AUTHORITY, ORDER AUTHORITY, OR TRADING AUTHORITY.

Prepared: 2026-08-11

Primary review inputs:

- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/plans/OPEN_DECISIONS.md`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/research/PHASE3C_CURRENT_APPROVED_DOCTRINE_COVERAGE_GAP_REASSESSMENT_V7.md`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/decisions/PHASE3C_CURRENT_COVERAGE_GAP_REASSESSMENT_EXECUTION_V7.json`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/contracts/PA_AGENT_ALPHA_EVALUATION_SPEC_V1.md`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/decisions/PA_AGENT_ALPHA_GATE_OVERRIDE_AUTHORIZATION_V1.json`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/decisions/PA_AGENT_ALPHA_SCREENING_EXPERIMENT_FREEZE_V1.json`
- `/tmp/pa-agent-lab-phase3c-doctrine-batch-001/docs/designs/PA_AGENT_DISCOVERY_TO_DECISION_ARCHITECTURE_V1.md`
- `/home/calvin/pa-agent-lab-worktrees/h1-discovery-mvp` isolated implementation candidate and verification output
- `/home/calvin/pa-agent-lab/artifacts/pa-mode-a-shadow-v2_1/2026-05-11_15/cross_run_comparison_v1_v2_v2_1.md`

## 1. Baseline conclusion

The PA Agent Lab system baseline is not a V4 reviewer, not a direct V4 replacement, and not a provider-driven PnL loop.

The intended system is a layered research and decision platform:

```text
Brooks public Source evidence
  -> draft Doctrine proposal
  -> explicit item approval / retirement lifecycle
  -> active approved Doctrine corpus snapshot
  -> deterministic anonymous causal market input
  -> bounded candidate discovery / scheduling
  -> Brooks / PA structured decision
  -> deterministic validator
  -> independent risk / execution boundary
  -> frozen replay / accounting / audit
  -> offline Calvin whole-decision review and research feedback
```

Only the relevant layer may exercise authority. A downstream result cannot retroactively change upstream Doctrine, candidate selection, prompt text, validation rules, or replay assumptions.

The practical research implication is direct: before more provider batches or prompt calibration, the project needs a stable semantic and discovery baseline that can produce independent, falsifiable PA contribution. Mode A and frozen Alpha both show that placing PA directly at final trade admission over broad or weakly structured cutoffs is currently not a productive test shape.

## 2. Current authoritative state

### 2.1 Phase 3C Doctrine and semantic coverage

Latest reviewed state from V7 reassessment:

- Approved and unretired DoctrineUnits: 30.
- Unique Sources represented by the exact approved set: 20.
- Active corpus snapshot remains the historical nine-unit pilot snapshot `sha256:016d293db794020528acd27bc2f64e4780a1052eff8cd133f0262867667c6e5e`.
- Phase 3C entries in current active corpus: 0.
- Formal covered capabilities: 0/27.
- Material support but not closed: 27/27.
- Closed interaction families: 0/11.
- No-trade reason codes fully closed: 0/13.
- Uncertainty reason codes fully closed: 0/8.
- Phase 4A2 remains paused until a future zero-blocker Phase 3C completion report receives separate coverage-completion acceptance.

V7 materially improves positive actionability evidence through D28-D30:

- final-flag failed-continuation transition;
- second-entry continuation flag lifecycle;
- opening-reversal context components.

But these additions still do not close complete actionable long/short routes, complete setup/signal/trigger/cancellation/protection/objective ledgers, bilateral case comparison, no-trade resolution, uncertainty resolution, or Doctrine-conflict handling.

### 2.2 Accepted deterministic policy boundary

The project deterministic causal authority policy is accepted as a project contract foundation. Its authority is deterministic and bounded: it handles causal adequacy, missing/ambiguous data, project-owned no-trade/uncertainty reasons, and fail-closed behavior. It does not supply Brooks semantic permission, strategy activation, provider authority, corpus activation, replay authority, or trading authority.

### 2.3 Prompt package and provider authority

The standard Phase 5 plumbing is accepted only for its bounded offline/synthetic scopes. Prompt Package V2 content is approved but not activated. Installed provider capability/privacy/isolation evidence remains incomplete for general runtime use. Real provider calls remain separately authorized only under exact records and cannot be generalized from Alpha or Mode A.

### 2.4 Replay authority

Replay contracts define identity, frozen input, terminal state, and post-cutoff provenance. They do not authorize a complete replay sidecar, matching engine, portfolio engine, or Paper/Live path. Replay must consume frozen decisions and cannot call or mutate a model.

## 3. Component responsibilities

| Component | Owns | Does not own |
|---|---|---|
| Source inventory and Source access | URL-level metadata, exact access authorization, representation hashes, extraction boundaries | Doctrine approval, runtime retrieval, provider calls, outcomes |
| Doctrine lifecycle | Draft, approval, retirement, exact proposal/approval provenance | Automatic coverage completion, corpus activation, strategy authority |
| Active corpus / retrieval | Approved unretired snapshot activation and bounded retrieval evidence | Creating Doctrine, accepting coverage, selecting trades |
| Market data gate | Closed-bar availability, continuity, source identity, protected-window rejection | Opportunity scoring, direction, trade permission |
| Discovery funnel | Deterministic structure events, candidate identity, dedup, TTL, budget scheduling | Long/short verdict, entry, stop, target, position, execution |
| PA / Brooks decision | Structured source-traceable PA judgment over a bounded causal candidate pack | Risk approval, execution, accounting, automatic Doctrine mutation |
| Deterministic validator | Schema, evidence, geometry, causal and authority invariants | Semantic invention, risk approval, replacing model judgment |
| Risk / execution boundary | Risk, liquidity, position, order and execution admissibility under future explicit authority | Doctrine, PA semantics, model repair |
| Replay / accounting | Frozen-decision replay, terminal state, right-censoring, audit hashes | Runtime model calls, parameter tuning, provider retry |
| Calvin review | Offline whole-decision evaluation and clarification | Runtime automatic field patching or Brooks semantics rewriting |
| Research candidate track | Hypotheses, proposed next tests, candidate capabilities | Automatic promotion to Doctrine, strategy, runtime, or trading authority |

## 4. End-to-end operating baseline

### 4.1 Source to Doctrine

1. Frozen public Source inventory metadata identifies candidate public Brooks materials.
2. Each Source access batch requires exact authorization: URL set, access method, no retry/fallback unless specified, protected/private fail-closed handling, representation hashing, and temporary-body deletion.
3. Derived findings are research-only.
4. Proposal drafting, insertion, item approval, retirement, coverage reassessment, corpus activation, and provider use are separate gates.
5. Approved DoctrineUnits do not enter runtime retrieval until an active corpus snapshot includes them through a separate activation path.

### 4.2 Doctrine to PA decision

1. Active retrieval may expose only approved core trading semantics.
2. A decision input must be anonymous, causal, closed-bar, and bound to chart/input/Doctrine hashes.
3. PA output is a structured BrooksDecision-like assessment, not a raw trading instruction.
4. No model output may contain probability/confidence authority, account action, or hidden state.
5. Deterministic validators must reject outputs that overclaim evidence, violate geometry, use nonvisible anchors, or widen authority.

### 4.3 Discovery to PA decision

The Discovery-to-Decision architecture is the right system shape but remains draft unless separately accepted.

The intended discovery layer should:

- reduce provider calls by finding deterministic structure events first;
- preserve candidate identity, event family, anchor group, TTL, cooldown, and priority tuple;
- package candidates neutrally for PA review;
- never encode V4 admission authority, PnL-derived thresholds, or final long/short permission;
- allow falsifiable evaluation of PA marginal contribution by comparing candidate discovery quality, PA validation quality, abstention behavior, and replay outcomes only after all upstream gates are frozen.

### 4.4 Replay and evaluation

A valid evaluation sequence must be:

1. freeze semantic/corpus/prompt/schema/data/date/provider/replay assumptions;
2. generate provider terminals without replay/PnL disclosure;
3. freeze terminal bundle;
4. validate decision coverage and terminal state accounting;
5. run deterministic replay from frozen decisions only;
6. disclose outcome only after replay hashes are sealed;
7. block prompt, Doctrine, discovery, or replay mutation from outcome feedback unless a later research-candidate path is separately authorized.

## 5. Current branch classification

| Branch or artifact | Current classification | Baseline use |
|---|---|---|
| Phase 3C V7 exact-30 reassessment | Authoritative offline evidence, not completion acceptance | Controls current semantic gap state |
| Active nine-unit corpus snapshot | Authoritative current runtime retrieval snapshot | Shows current runtime corpus is not Phase 3C-complete |
| Phase 3C Source/Doctrine batches 001-010 | Authoritative only within their exact authorization/execution records | Source/proposal evidence, not automatic runtime authority |
| Discovery-to-PA architecture | Draft design | Correct architectural direction, no implementation/runtime authority |
| H1 discovery MVP worktree | Isolated implementation candidate, tested, not merged or accepted | Useful contract/engine candidate for later review, not current baseline authority |
| Mode A V1/V2/V2.1 | Diagnostic positive-control calibration on 2026-05-11 to 2026-05-15 V4 trades | Shows prompt/PA calibration instability and direct-replacement risk; not independent validation |
| Alpha Screening | Frozen bounded research experiment branch | Shows direct blind cutoff scanning/provider validity problems; no PnL or Alpha conclusion |
| Confirmatory Alpha | Sealed and unopened | Must remain unopened |
| Replay/PnL for Alpha | Not performed/disclosed | No economic result may be inferred |

## 6. Mode A diagnostic status

Mode A remains diagnostic evidence only.

Observed pattern:

- V1: high quality but only 6 same-direction approvals, too narrow.
- V2: 26 same-direction approvals but 31 invalid outputs and degraded geometry.
- V2.1: geometry repaired and fail-closed, but only 4 same-direction approvals and 46 rejected winners with deterministic plans already present.

Interpretation:

- PA is treating caution as veto too often.
- Direct trade-moment replacement over V4 winners is not yet an independent PA contribution test.
- Continuing prompt calibration on the same 81 trades risks reverse-fitting to positive-control outcomes.
- Mode A should be archived as diagnostic evidence until the system defines a separate objective for PA marginal contribution.

## 7. Alpha Screening diagnostic status

Alpha Screening was explicitly frozen by Calvin direction because the test method may waste time and the discovery funnel must be reconsidered.

Frozen state:

- scheduled points: 3456;
- terminal points: 98;
- remaining: 3358;
- provider failures: 25;
- validator rejected: 56;
- invalid model output: 1;
- valid decisions: 16;
- valid decision verdicts: 16 no_trade;
- tradable valid decisions: 0;
- replay performed: false;
- PnL disclosed: false;
- confirmatory seal opened: false;
- Paper/Live/trading performed: false.

Interpretation:

- The 16 valid no_trade decisions are valid decision evidence.
- The 82 nonvalid terminals are provider/schema/validator terminal evidence, not no_trade evidence.
- The frozen run is not an Alpha pass/fail and not a profitability result.
- It is evidence that blind all-cutoff provider generation is currently a poor experiment shape without a discovery funnel and stronger semantic closure.

## 8. H1 Discovery MVP candidate status

The `h1-discovery-mvp` background worker initially failed, then completed in an isolated worktree:

`/home/calvin/pa-agent-lab-worktrees/h1-discovery-mvp`

Direct verification in that worktree passed:

- `pnpm exec tsc -p packages/contracts/tsconfig.json`
- `pnpm exec tsc -p packages/discovery-engine/tsconfig.json`
- `node --test packages/contracts/test/discovery-factor-v1.test.ts packages/discovery-engine/test/discovery-engine-v1.test.ts`
- `pnpm typecheck`
- `pnpm test`

Candidate contents:

- `@pa-agent-lab/contracts/discovery-factor-v1`;
- `@pa-agent-lab/discovery-engine`;
- 40/120 history gates;
- closed-bar, continuity, OHLC gates;
- prior-bar-only rolling references;
- optional non-imputed volume;
- five neutral core detectors;
- three context enhancers;
- composite candidates;
- fingerprint, dedup, TTL, cooldown, priority tuple;
- TTL admission and budget deferral;
- neutral text checks against trade-authority leakage.

The subsequent independent review did not accept the implementation. Review artifact:

`/home/calvin/pa-agent-lab-worktrees/h1-discovery-mvp/.pi-subagents/artifacts/66404f50_delegate_0_output.md`

Blocking findings include:

- range/tolerance/activity mechanics do not match the draft contract: the implementation uses a 40-bar range window, fixed 0.25 tolerance, and fixed activity multipliers instead of the specified prior-20 median, `0.5R` tolerance, and p25/p75 buckets;
- midpoint and lower/middle/upper-third observations are absent;
- partial auxiliary activity data can be filtered into a synthetic denominator instead of making the series unavailable;
- disjoint anchors and incompatible same-side hits can be merged;
- cooldown escalation is broader than the exact authorized transition and prior candidates are not sufficiently identity/ordering/integrity checked;
- malformed or duplicate inputs can throw before a fail-closed audit or be silently accepted;
- admission allows pre-effective candidates and does not revalidate candidate integrity/binding;
- event/group identities and suppression audits are incompletely bound to source, window, and current candidate content.

Governance classification:

- This is a tested implementation candidate only, not an accepted implementation baseline.
- The independent review classifies it as **not mergeable**.
- It is not merged into the current workspace.
- It does not authorize market data, provider calls, scheduler/runtime integration, replay, Paper/Live, or trading.
- The H1 task card remains draft and explicitly requires a separate exact implementation authorization; the blockers must be resolved only under that later scope.
- Before adoption, it needs a contract-consistent rewrite or bounded correction review, especially to ensure it does not accidentally encode V4-style direction/admission authority or unsupported fixed thresholds.

## 9. Research decomposition from this baseline

The next work should split into separate, falsifiable tracks. These tracks should not be collapsed into one prompt run.

### Track A: Phase 3C semantic closure

Purpose: close the exact 27 capabilities, state/reason-code ledgers, and 11 interaction families.

Current highest-priority gap families from V7:

1. complete setup, signal, trigger, cancellation, and expiry lifecycle;
2. complete positive actionability routes;
3. complete bilateral actionable case and trade plan;
4. complete breakout, reversal, range, and opening resolution;
5. causal/provenance uncertainty and Doctrine conflict.

Recommended next action: continue bounded Source/proposal/item-approval batches only under exact authorizations until a future zero-blocker report exists. Do not treat partial support as coverage completion.

### Track B: Discovery funnel contract review

Purpose: define and accept the deterministic candidate discovery contract before broad provider use.

Scope:

- instrument registry boundary;
- market-data quality gates;
- core event taxonomy;
- neutral candidate identity;
- dedup, TTL, cooldown, priority tuple;
- scheduler budget semantics;
- candidate pack shape;
- non-authority assertions.

Use the H1 MVP as review material, not authority. The acceptance question is whether the contract creates useful candidate packs without smuggling in final trade permission.

### Track C: Provider/schema reliability

Purpose: separate PA competence from provider transport and validator failure.

Scope:

- one visible attempt invariant;
- terminal state accounting;
- validator rejection taxonomy;
- invalid output taxonomy;
- provider failure taxonomy;
- cost/latency availability;
- no retry/fallback/replacement.

Do not resume Alpha until this track can explain and reduce provider/validator terminal failure without changing outcomes or prompt after inspection.

### Track D: PA structural capability benchmark

Purpose: test whether PA can add value on frozen candidate packs once discovery is not the bottleneck.

Candidate metrics before replay:

- valid decision rate;
- evidence-grounding pass rate;
- abstention reason correctness;
- mirror consistency;
- prefix invariance;
- no-trade versus uncertain separation;
- actionability completeness;
- rejection of unsupported trade permission.

This should be outcome-blind. It should not use Mode A PnL or Alpha replay to tune prompts.

### Track E: Outcome-blind replay readiness

Purpose: prepare replay only after A-D have stable frozen inputs.

Scope:

- exact replay sidecar acceptance;
- deterministic fee/funding/slippage/order assumptions;
- same-bar and missing-data fail-closed rules;
- right-censoring;
- frozen decision-bundle consumption;
- result hash and disclosure timing.

Replay remains downstream evidence only; it cannot mutate Doctrine, discovery factors, prompt, schema, or validator rules.

## 10. Immediate stop rules

Do not perform any of the following without a separate explicit authorization record:

- launch V2.2 or another Mode A provider batch;
- resume the 3456-cutoff Alpha Screening run;
- open the confirmatory Alpha manifest;
- run Alpha replay or disclose PnL;
- activate the exact-30 Doctrine set into Phase 4A2;
- treat H1 Discovery MVP as accepted or merge it;
- fetch new Source URLs;
- create, insert, approve, retire, or mutate DoctrineUnits;
- run real market-data ingestion outside already authorized Alpha artifacts;
- call a provider or model for new decisions;
- connect Paper, Live, exchange, wallet, order, or trading paths;
- use protected `2025-02`, `2025-05`, or `2025-08` material;
- use V4/V6 outcomes or Calvin settlement records as Doctrine or strategy authority.

## 11. Recommended next decision

The next Calvin decision should not be a prompt version or Alpha continuation decision.

Recommended next decision:

```text
Choose the next baseline track:
A. Continue Phase 3C positive-actionability semantic closure;
B. Review and accept/reject the H1 Discovery MVP contract as a neutral candidate-funnel foundation;
C. Build a provider/schema reliability audit over the frozen Alpha terminals;
D. Define an outcome-blind PA structural capability benchmark over candidate packs.
```

The most dependency-correct sequence is A plus B in parallel only if B remains contract/discovery-neutral and does not run providers or replay. C can use frozen Alpha terminal evidence without new provider calls. D should wait until B defines candidate-pack shape and A defines enough positive-actionability semantics to avoid testing an under-specified PA task.
