# ADR-0024: Versioned Brooks Capability Expansion Before Provider Evaluation

Status: ACCEPTED ROADMAP DECISION. DESIGN AND IMPLEMENTATION REMAIN UNAUTHORIZED.

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

### Multi-timeframe is a pre-provider-evaluation core capability

A separately accepted versioned input and decision contract must add causal multi-timeframe context before formal provider semantic evaluation. The future design must define at least:

- exact higher-timeframe durations and which duration remains the decision cadence;
- closed-bar-only alignment at one immutable decision cutoff;
- deterministic aggregation or exact read-only source-slice provenance;
- anonymous cross-timeframe bar identities and normalization;
- missing history, session/boundary, continuity, and left-censoring behavior per timeframe;
- which `BrooksDecision` assessments may use higher-timeframe evidence;
- explicit evidence references that identify the supporting timeframe;
- disagreement, ambiguity, and no-trade/uncertainty treatment across timeframes;
- byte-equivalent candidate inputs and independent causal tests;
- provider payload, chart, schema, package-version, privacy, and cost consequences.

Formal provider evaluation must not claim broader Brooks competence until this capability's exact design, implementation, source-grounded semantics, and evaluation prerequisites are accepted. A separately labeled V1 single-timeframe baseline may still be evaluated only if Calvin explicitly authorizes that narrower experiment and it is not represented as the target multi-timeframe Brooks policy.

### Scaling, active management, and intrabar spike handling are required separate design tracks

The following are important required design tracks, not discarded ideas:

1. **Scaling and aggregate risk contract** — position legs, quantities, average price, total and incremental risk, maximum exposure, fill state, cancellation, and the separation between Brooks premise and deterministic risk authority.
2. **Active-position management contract** — immutable entry premise, current position/fill state, later closed observations, hold/exit/protection/objective/re-entry semantics, expiry and supersession, and strict exclusion of PnL/outcomes from doctrine authority.
3. **Intrabar spike/event contract** — authorized event or lower-timeframe input, freshness, event ordering, provisional versus closed evidence, same-event ambiguity, deterministic watcher versus model reassessment, geometry/risk revalidation, and no execution implication.

These tracks must remain separated from one another and from the entry-decision contract unless a later accepted design proves a minimal combined boundary is safer and more auditable. Their sequencing relative to formal provider evaluation must be explicitly decided in the capability-expansion contract; they cannot be silently postponed or treated as already supported.

### One versioned expansion design before resumed corpus promotion

The next design task is a bounded capability-expansion contract that inventories:

- the exact multi-timeframe target;
- shared causal identities and evidence references;
- the separate scaling, active-management, and intrabar contracts;
- source-semantic routing to V1 versus each expansion track;
- contract/package/evaluation migration and compatibility;
- what must be implemented before provider evaluation versus what may be evaluated in a separately labeled later stage.

Only after Calvin accepts that design may Doctrine proposal drafting resume under a new exact proposal-batch authorization.

## Consequences

- Phase 3C V1 remains a valid single-timeframe baseline but no longer represents the complete intended pre-provider Brooks capability target.
- The Phase 3C final completion route must be revised or supplemented before it can unlock formal provider evaluation.
- Current Prompt Package V2 remains inactive and does not gain multi-timeframe, scaling, active-management, intrabar, or `market_next_event` support.
- Source batch 001 candidate groups remain draft extraction evidence only.
- No model call, real Case, replay, order, Paper/Live, or trading path is created.

## Governance synchronization

Calvin approved this roadmap correction directly on 2026-08-05 after reviewing why the four capabilities were excluded from V1. Direct Pi recorded the decision.

`AGENTS.md`, `OPEN_DECISIONS.md`, `PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md`, the Charter, and ADR-0023 are synchronized without modifying accepted V1/V2 contract or prompt bytes. The immutable Source batch 001 report and execution record remain unchanged; ADR-0024 governs their later proposal-routing interpretation.

## Not authorized

This ADR does not authorize:

- modifying code, schemas, prompts, packages, migrations, tests, dependencies, services, deployment, or credentials;
- opening, fetching, extracting, storing, or summarizing any additional Source;
- drafting, inserting, approving, retiring, ingesting, activating, or querying Doctrine or corpus records;
- multi-timeframe data ingestion, aggregation, chart rendering, payload preparation, or provider calls;
- position, fill, scaling, active-management, watcher, intrabar, execution, risk, or accounting implementation;
- Prompt Package V2 activation or preparation;
- real Case or market-data access, protected-window access, outcomes, PnL, evaluation execution, replay, training, Paper, Live, exchange, wallet, order placement, or trading.
