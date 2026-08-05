# ADR-0024: Versioned Brooks Capability Expansion Before Provider Evaluation

Status: ACCEPTED ROADMAP AND EXACT PHASE 3D DESIGN BASELINE. PHASE 3D1 OFFLINE SYNTHETIC FOUNDATION IMPLEMENTATION AUTHORIZED; NO OPERATIONAL AUTHORITY.

## Context

The accepted `BrooksDecisionV1` and Phase 3C coverage contract deliberately define a single-timeframe, five-minute closed-bar, entry-decision baseline. ADR-0009 records limited higher-timeframe context as a V1 tradeoff. ADR-0010 excludes active positions, fills, scaling, partial exits, and intrabar model judgment from V1.

Phase 3C public Source batch 001 produced useful source-mapped candidates, but it also exposed four important Brooks practice surfaces that current V1 cannot honestly express:

1. multi-timeframe context;
2. scaling and aggregate risk;
3. active-position management;
4. intrabar spike or event handling.

Classifying all four merely as distant future candidates would understate their importance. Multi-timeframe context in particular can materially change broad state, location, pressure, and trade permission, so a formal provider evaluation limited to V1 could otherwise be mistaken for evaluation of the intended broader Brooks policy.

At the same time, silently inserting these capabilities into V1 or the approved Prompt Package V2 would destroy exact identities and mix distinct responsibilities. Scaling is not merely a chart interpretation; active management requires post-entry state; intrabar spike handling requires a different observation cadence and causal event model.

## Decision

### Preserve accepted bytes and evidence

`BrooksDecisionV1`, its five-minute scheduling identity, the exact Phase 3C V1 coverage contract, Prompt Package V1, and approved-but-inactive Prompt Package V2 remain immutable within their recorded scopes. Existing pilot Doctrine, Source batch 001 evidence, approvals, and execution records remain historical facts.

This ADR does not amend V1 or V2 bytes and does not reclassify any existing V1 exclusion as already implemented.

### Pause Doctrine proposal drafting

No Doctrine proposal batch is to be drafted, inserted, or approved from Source batch 001 until the capability-expansion contract has defined how source semantics are allocated across the current V1 baseline and the new versioned capability tracks. This prevents a multi-timeframe, scaling, management, or intrabar rule from being simplified into an input contract that cannot support it.

Further bounded Source metadata review may be proposed separately, but this ADR grants no Source access or extraction authority.

### Exact Phase 3D design acceptance

After one-question-at-a-time adjudication, Calvin authorized Direct Pi on 2026-08-05 to draft and independently review `docs/contracts/PHASE3D_VERSIONED_BROOKS_MULTI_TIMEFRAME_CAPABILITY_V1.md`.

Calvin subsequently accepted exact contract content hash `sha256:989eb4a9717aff887fd5c970abf6bd14e53e97f4e37216779e4d287774a50b90`. `PHASE3D_MULTI_TIMEFRAME_CAPABILITY_CONTRACT_APPROVAL_V1.json`, record hash `sha256:0107f512023f2e0e33bd892ba262e3ba3db24e0224d0dadea50c65b67b6eaf3c`, is the external status authority. The contract's `DRAFT FOR CALVIN ACCEPTANCE` text remains unchanged because it is part of the accepted exact preimage.

Design acceptance grants no schema, prompt, code, Source, Doctrine, data, provider, replay, training, or trading authority.

### Exact Phase 3D1 implementation authorization

After the completed reuse scan and exact implementation-plan review, Calvin authorized the bounded Phase 3D1 offline synthetic foundation on 2026-08-05. `PHASE3D1_IMPLEMENTATION_AUTHORIZATION_V1.json`, record hash `sha256:85b4102a24874ff46fee7be7b07856c6ff0cb7f05f5448feb17f77b85c35f1fb`, binds baseline `44ae0cf10191d3f756ff46db9aae59d882f68a82`, implementation-plan hash `sha256:fd9fa0c30228151ce8d5f17020c6b7b601531c773f7bc13b307501c13d5ab390`, and reuse-scan hash `sha256:5bb128384c774d6c4bdf090f1c11156f754c9875c1c143aeea30ed21929ac238`.

The authorization permits only separately versioned pure contracts, synthetic fixtures, deterministic multi-timeframe PNG artifacts using the existing pinned resvg seam, one unapproved response-schema proposal, strict offline invented-response validation, necessary exports, and one fresh-context read-only review. It adds zero dependencies and requires an isolated worktree with Direct Pi as sole writer and final verifier.

Implementation acceptance remains a separate gate. No migration, persistence, API/CLI, Policy Assembly, prompt or Prompt Package change, Source or Doctrine work, installed-provider inspection, provider call, real data, replay, training, Paper/Live, exchange, wallet, order, or trading authority is granted.

### Multi-timeframe is a pre-provider-evaluation core capability

A separately accepted versioned input and decision contract must add causal multi-timeframe context before formal provider semantic evaluation. The accepted Phase 3D design defines at least:

- five minutes as the required primary decision timeframe, native sixty-minute as the critical optional reference, native daily as an additional optional reference, and weekly/monthly as excluded from this target;
- one immutable closed-five-minute decision cutoff with finalized history and explicitly provisional, cutoff-frozen higher-timeframe snapshots;
- native same-signal-source provenance, fixed versioned session alignment, and local five-minute aggregation as validation only rather than replacement authority;
- anonymous cross-timeframe bar identities and one common five-minute-anchored normalization;
- the inherited five-minute 120/40 boundary, optional zero-through-120 higher-timeframe windows, short-history provenance, continuity, and missing-data materiality;
- one primary Brooks decision with structured higher-timeframe reference assessments rather than votes or independent decisions;
- explicit timeframe-aware evidence and geometry references;
- disagreement, ambiguity, and no-trade/uncertainty treatment according to approved Brooks Doctrine rather than fixed timeframe priority;
- immutable provisional/correction lifecycles, byte-equivalent candidate inputs, and independent causal tests;
- provider payload, chart, schema, package-version, privacy, and cost consequences.

Formal provider evaluation must not claim broader Brooks competence until this capability's exact design, implementation, source-grounded semantics, and evaluation prerequisites are accepted. A separately labeled V1 single-timeframe baseline may still be evaluated only if Calvin explicitly authorizes that narrower experiment and it is not represented as the target multi-timeframe Brooks policy.

### Scaling, active management, and intrabar spike handling are required separate design tracks

The following are important required design tracks, not discarded ideas:

1. **Scaling and aggregate risk contract** — position legs, quantities, average price, total and incremental risk, maximum exposure, fill state, cancellation, and the separation between Brooks premise and deterministic risk authority.
2. **Active-position management contract** — immutable entry premise, current position/fill state, later closed observations, hold/exit/protection/objective/re-entry semantics, expiry and supersession, and strict exclusion of PnL/outcomes from doctrine authority.
3. **Intrabar spike/event contract** — authorized event or lower-timeframe input, freshness, event ordering, provisional versus closed evidence, same-event ambiguity, deterministic watcher versus model reassessment, geometry/risk revalidation, and no execution implication.

These tracks must remain separated from one another and from the entry-decision contract unless a later accepted design proves a minimal combined boundary is safer and more auditable. Their sequencing relative to formal provider evaluation requires separate explicit Calvin adjudication in their own exact design tracks; they cannot be silently postponed or treated as already supported.

### One versioned multi-timeframe design before resumed corpus promotion

The current bounded Phase 3D design task defines:

- the exact multi-timeframe target;
- shared causal identities and evidence references;
- source-semantic routing to V1 versus multi-timeframe and the explicit quarantine of claims requiring unresolved tracks;
- contract/package/evaluation migration and compatibility;
- the multi-timeframe prerequisites that must be implemented before formal provider evaluation.

It inventories scaling, active-management, and intrabar as separate required tracks but does not design them or decide their sequencing by implication.

The accepted Phase 3D design defines the multi-timeframe target and inventories the separate required tracks. Only a separately authorized Doctrine proposal batch may resume for claims that the accepted V1 or multi-timeframe contracts can honestly express. Scaling, active-management, intrabar, and other still-unexpressible claims remain paused until their own exact designs are accepted.

## Consequences

- The exact Phase 3D multi-timeframe design baseline is accepted; implementation remains unauthorized.
- Phase 3C V1 remains a valid single-timeframe baseline but no longer represents the complete intended pre-provider Brooks capability target.
- The Phase 3C final completion route must be revised or supplemented before it can unlock formal provider evaluation.
- Current Prompt Package V2 remains inactive and does not gain multi-timeframe, scaling, active-management, intrabar, or `market_next_event` support.
- Source batch 001 candidate groups remain draft extraction evidence only.
- No model call, real Case, replay, order, Paper/Live, or trading path is created.

## Governance synchronization

Calvin approved this roadmap correction directly on 2026-08-05 after reviewing why the four capabilities were excluded from V1. Direct Pi recorded the decision.

`AGENTS.md`, `OPEN_DECISIONS.md`, `PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md`, the Charter, and ADR-0023 record the accepted exact Phase 3D design without modifying accepted V1/V2 contract or prompt bytes. The immutable Source batch 001 report and execution record remain unchanged; ADR-0024 and the external approval record govern their later proposal-routing interpretation.

## Not authorized

This ADR does not authorize:

- modifying code, schemas, prompts, packages, migrations, tests, dependencies, services, deployment, or credentials;
- opening, fetching, extracting, storing, or summarizing any additional Source;
- drafting, inserting, approving, retiring, ingesting, activating, or querying Doctrine or corpus records;
- multi-timeframe data ingestion, aggregation, chart rendering, payload preparation, or provider calls;
- position, fill, scaling, active-management, watcher, intrabar, execution, risk, or accounting implementation;
- Prompt Package V2 activation or preparation;
- real Case or market-data access, protected-window access, outcomes, PnL, evaluation execution, replay, training, Paper, Live, exchange, wallet, order placement, or trading.
