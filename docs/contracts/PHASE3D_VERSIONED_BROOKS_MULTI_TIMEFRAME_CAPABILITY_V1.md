# Phase 3D Versioned Brooks Multi-Timeframe Capability V1

Status: DRAFT FOR CALVIN ACCEPTANCE. DESIGN-ONLY DRAFT AUTHORIZED 2026-08-05. NOT ACCEPTED. NO IMPLEMENTATION OR OPERATION AUTHORITY.

Authority context: ADR-0003, ADR-0005, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0023, and ADR-0024.

## 1. Purpose

This contract defines the proposed semantic, causal, privacy, and evaluation boundary for a separately versioned Brooks multi-timeframe policy capability.

It preserves the five-minute Brooks Price Action judgment as the primary decision surface while allowing native sixty-minute and daily context to inform that judgment when valid context is available. It does not turn higher timeframes into independent policies, votes, or hard per-request prerequisites.

This contract is a design draft. It does not modify an existing contract, schema, prompt, package, implementation, database, service, deployment, or provider path.

## 2. Compatibility and authority

The following accepted identities remain immutable:

- `BrooksDecisionV1` and its complete accepted semantic surface;
- the V1 five-minute scheduling identity;
- the V1 120/40 policy-input and chart contract;
- the accepted Phase 3C V1 semantic coverage design;
- Prompt Package V1;
- approved but inactive Prompt Package V2;
- Source batch 001 authorization, execution, and derived-evidence records.

The proposed capability requires new versioned Case, policy-input, chart-manifest, evidence-reference, decision-envelope, response-schema, prompt-package, validator, persistence, and evaluation identities before implementation. Exact implementation names are not granted by this design draft.

Prompt Package V2 does not acquire multi-timeframe support. `market_next_event`, scaling, active-position management, and intrabar policy judgment remain outside this contract.

## 3. Fixed timeframe profile

### 3.1 Decision timeframe

Five minutes is the required primary Brooks Price Action decision timeframe:

```text
barDurationSeconds = 300
```

A logical policy decision occurs only at an immutable closed-five-minute cutoff. The final visible five-minute bar is closed. No open five-minute bar, post-cutoff price, future bar, outcome, fill, position, PnL, or execution state enters the policy input.

### 3.2 Reference timeframes

The proposed reference profile is:

```text
primary: 5m
reference: 60m, 1d
excluded from this target: 1w, 1mo
```

The sixty-minute context is the critical higher-timeframe reference. Daily context is included as an additional reference. Weekly and monthly inputs are not required and do not become completion blockers for this target.

The capability to accept and correctly use sixty-minute and daily context is a pre-provider-evaluation requirement. Availability of those contexts in every individual request is not a requirement.

A valid five-minute Case may therefore contain:

```text
5m only
5m + 60m
5m + 1d
5m + 60m + 1d
```

Absent reference context must be explicit. It is never invented, inferred from model memory, or treated as an input failure by absence alone.

## 4. One Brooks decision, not timeframe voting

Each logical call produces one complete Brooks policy judgment with five minutes as its primary trade-decision surface.

Sixty-minute and daily contexts may contribute structured reference assessments. They do not produce independent direction votes, entries, protections, objectives, trade permissions, or standalone Brooks decisions.

The model must use approved Brooks Price Action Doctrine to judge the role of each available timeframe. The deterministic layer must not implement:

- daily-always-wins or sixty-minute-always-wins priority;
- majority voting;
- fixed timeframe weights or scores;
- cross-timeframe conflict as an automatic `no_trade`;
- a fixed scenario-to-verdict map.

For each supplied reference timeframe, the proposed decision envelope records a relationship to the primary judgment:

```text
supports
limits
opposes
no_material_effect
uncertain
unavailable_for_this_decision
```

Each non-unavailable relationship requires visible timeframe-aware evidence and approved Doctrine references. The relationship label has no deterministic mapping to trade, `no_trade`, or `uncertain`.

## 5. Authoritative market-source relationship

### 5.1 Native same-source bars

Native five-minute, sixty-minute, and daily bars from one approved signal source form the market-input authority for this capability.

A local Case must bind and verify, without exposing the identities outbound:

- signal-source identity and versioned source profile;
- venue or market surface;
- instrument identity;
- price basis and adjustment policy;
- timeframe identity;
- session/calendar profile;
- fixed timeframe alignment;
- immutable decision cutoff;
- source bar and snapshot identities;
- content hashes for every supplied slice and snapshot.

Every supplied timeframe must refer to the same instrument, venue or market surface, compatible price basis, and decision cutoff. A supplied reference timeframe with unverified identity, post-cutoff content, or incompatible alignment invalidates the submitted request.

The system must not silently remove invalid supplied reference context and continue. A caller may create a separate explicit five-minute-only request after the invalid request terminates.

### 5.2 Deterministic local aggregation

Local aggregation from closed five-minute bars may be used only as a consistency and causal validation check. It is not a second semantic market-data authority and must not silently replace missing, misaligned, or invalid native sixty-minute or daily bars.

A detected native-versus-validation mismatch is explicit terminal evidence. The future implementation contract must define exact tolerances or exact-equality requirements from the approved source price basis before any data operation is authorized.

## 6. Fixed timeframe and session alignment

Sixty-minute and daily bars use fixed, versioned, auditable boundaries declared by the approved source/session profile.

Rolling windows anchored anew at each decision are forbidden. In particular, a sixty-minute bar must not mean the most recent twelve five-minute bars at every call.

The future source profile must bind:

- canonical sixty-minute boundaries;
- trading-session start and end rules;
- daily boundary;
- timezone and calendar version;
- holidays, breaks, partial sessions, and cross-date sessions where applicable;
- a fixed day boundary for a 24/7 market.

If a supplied reference timeframe's identity or alignment cannot be verified, that supplied request fails closed. The system must not guess a market calendar or day boundary.

Local source/session identities stay outside the anonymous model payload. The outbound input may expose only the relative session and lifecycle facts required for causal Price Action judgment.

## 7. Causal finalized and provisional evidence

### 7.1 Finalized history

Finalized sixty-minute and daily bars are native closed bars from the approved signal source. Their OHLC must not change inside an immutable Case.

### 7.2 Provisional current bars

At each closed-five-minute decision cutoff, an available sixty-minute or daily context includes:

- zero or more finalized native bars; and
- at most one native provisional current bar.

A provisional bar is an as-of-cutoff snapshot. It may include only source observations available by the immutable five-minute cutoff and must contain no later source update. It is not represented as finalized.

The provisional snapshot binds:

- timeframe;
- source bar identity;
- immutable decision cutoff;
- normalized and local raw OHLC identities;
- snapshot content hash;
- finalized/provisional lifecycle;
- progress metadata;
- source/session profile hash.

The snapshot may be validated against the available closed-five-minute causal prefix, but native source bytes remain the input authority under Section 5.

### 7.3 Provisional progress

A provisional reference bar must expose anonymous, auditable period progress:

```text
completedBaseIntervals
scheduledBaseIntervals
progressStatus
```

The first two values describe completed and scheduled five-minute intervals under the fixed session profile. `progressStatus` distinguishes verified progress from explicitly unverified progress when a special session prevents a valid denominator.

Progress does not create a fixed evidence weight. Approved Brooks Doctrine governs whether an early or nearly finalized provisional bar matters.

The outbound payload contains no real timestamp, date, timezone, venue, instrument, or source identity.

## 8. Window and history rules

### 8.1 Five-minute window

The primary five-minute window inherits the accepted V1 engineering boundary:

```text
120 closed bars: complete context
40 through 119 closed bars: admitted with explicit left-censoring
fewer than 40 closed bars: input rejection before model judgment
```

The context chart contains the complete visible five-minute prefix up to 120 bars. The detail chart repeats the final 40 closed five-minute bars.

The 120/40 boundary is an accepted engineering contract, not a claim that Brooks Doctrine mandates those numbers.

### 8.2 Sixty-minute and daily windows

Each optional reference timeframe admits zero through 120 total visible bars. There is no minimum finalized-bar count.

If a provisional bar is present, it counts toward the 120-bar maximum:

```text
up to 119 finalized + 1 provisional
```

If no provisional bar is present, the input may contain up to 120 finalized bars.

Legitimate short history is valid reference context. Examples include zero finalized bars plus one provisional bar, a newly listed instrument, and a session-limited market. Short reference history does not itself cause request rejection, `no_trade`, `uncertain`, or a trading prohibition.

### 8.3 History-start classification

Each supplied reference timeframe records exactly one history-start state:

```text
instrument_history_start
window_truncated
source_history_limit
unknown
```

Meaning:

- `instrument_history_start`: the source authority confirms the visible start is the instrument or listing history start;
- `window_truncated`: older valid bars exist but are omitted by the 120-bar payload bound;
- `source_history_limit`: the market may have older history, but the approved source cannot provide it;
- `unknown`: the reason for the visible start cannot be proved.

All four states may provide visible local structure. Only `instrument_history_start` may support complete-lifetime claims. The other states prohibit claims such as all-time high/low, first event since listing, or complete lifecycle structure unless separate visible evidence proves the claim.

The system must not infer a new listing merely from a short series.

## 9. Anonymous multimodal input

### 9.1 Chart layout

The proposed deterministic chart set is:

```text
5m: context chart + final-40 detail chart
60m: one context chart when available
1d: one context chart when available
```

Every available timeframe also includes exact normalized OHLC for exactly the bars rendered in its chart or charts.

Missing reference context produces an explicit unavailable state, not an empty chart, fabricated bar, or placeholder market shape.

### 9.2 Common normalization

All supplied timeframes use one common anonymous price basis:

```text
base = raw close of the first visible 5m bar
normalizedPrice = rawPrice / base * 100
```

The first visible five-minute close remains exactly `100`. Sixty-minute and daily finalized/provisional OHLC use the same base. Each chart may use its own visual axis range, but its OHLC values remain on the common normalized price coordinate.

Independent per-timeframe normalization is forbidden because it destroys exact cross-timeframe price relationships.

### 9.3 Timeframe-aware anonymous identities

Every outbound bar and evidence reference has an anonymous timeframe-aware identity. It exposes no source bar ID or real time.

The exact implementation format is versioned, but it must distinguish at least:

```text
5m finalized bar
60m finalized bar
60m provisional bar
1d finalized bar
1d provisional bar
```

A bar identity is stable only inside its immutable input. It cannot be resolved to an instrument, venue, real timestamp, date, account, or source outside the local audit chain.

## 10. Continuity and missing data

### 10.1 Required distinctions

The input must distinguish:

- contiguous observations;
- expected session boundaries or scheduled market breaks;
- explicit missing data inside an expected observation interval;
- unknown continuity at a visible left boundary;
- legitimate short instrument history;
- source-history limitation;
- invalid identity, alignment, or cutoff.

Expected closure or a session break is not missing market data. Missing bars must never be interpolated, forward-filled, copied, or fabricated.

### 10.2 Five-minute gap assessment

A visible missing-data gap in the primary five-minute window is explicit but is not a blanket deterministic trading veto.

The Brooks policy output must assess every material visible gap with:

```text
materiality: material | immaterial | uncertain
affectedClaims
evidenceReferences
doctrineClaimReferences
resolutionCondition
```

Rules:

- `material`: the gap affects a required setup, signal, trigger, pressure, structure, premise, or geometry claim; an actionable trade plan is forbidden;
- `uncertain`: materiality cannot be resolved; the result fails closed to a non-actionable branch;
- `immaterial`: an actionable plan is permitted only when the output provides auditable Brooks-Doctrine reasoning and the plan does not depend on unobserved structure;
- omitted or invalid gap assessment fails closed.

The deterministic validator checks completeness and branch consistency. It does not encode a fixed number, location, or duration of missing bars that is always material.

### 10.3 Reference-timeframe gaps

An identity-correct, cutoff-valid sixty-minute or daily context may contain explicit missing reference data without automatically rejecting the five-minute request.

The model must assess the gap's materiality and must not depend on missing structure. A reference timeframe may be marked `unavailable_for_this_decision`, after which a final five-minute judgment may proceed from valid five-minute evidence.

An actionable plan may not cite or geometrically depend on a missing reference region. Invalid identity, future content, or unverified alignment remains an input-level rejection rather than a semantic gap.

## 11. Evidence and geometry

### 11.1 Timeframe-aware evidence

Every market-evidence reference in the proposed decision version identifies:

- timeframe;
- anonymous bar ID;
- exact observed OHLC or relationship field;
- finalized or provisional lifecycle;
- claim scope;
- associated approved Doctrine claim where doctrine is required.

A rationale without valid visible references does not satisfy the evidence contract.

### 11.2 Cross-timeframe anchors

Entry, protection, and objective geometry may reference a visible sixty-minute or daily anchor when Brooks Doctrine supports that use.

Every anchor binds:

```text
timeframe
barId
field: open | high | low | close
lifecycle: finalized | provisional
normalizedValue
```

A higher-timeframe anchor does not create an independent trade permission.

The separately versioned geometry validator must preserve the already accepted relation semantics for supported stop/limit plans:

- long stop entry is strictly above its referenced visible anchor;
- short stop entry is strictly below its referenced visible anchor;
- long protection is strictly below its referenced visible anchor;
- short protection is strictly above its referenced visible anchor;
- limit entry equals its referenced visible anchor exactly;
- objective equals its referenced visible anchor exactly;
- no tick, buffer, tolerance, or minimum-distance inference is invented;
- Swing remains subject to deterministic `>= 2.0R`; Scalp has no fixed minimum R:R.

This statement defines the future multi-timeframe design direction. It does not mutate or activate Prompt Package V2.

### 11.3 Frozen provisional anchors

A plan may reference a visible provisional anchor only with an explicit provisional lifecycle. The anchor OHLC and normalized planned geometry freeze at the decision cutoff.

Later updates to the same native higher-timeframe bar do not mutate the old decision, evidence, entry, protection, or objective. A later five-minute decision receives a new snapshot and may produce a different plan.

This contract creates no watcher, automatic revalidation, order replacement, or execution authority. Those mechanics remain in separately accepted future contracts.

## 12. Immutable snapshot and correction lifecycle

Every multi-timeframe Case, anonymous input, chart set, model request, model response, validation result, and accepted decision is content-addressed and immutable.

When a provisional source bar later changes or finalizes:

- the old provisional snapshot remains unchanged;
- the next closed-five-minute decision binds a new snapshot;
- finalized OHLC is not backfilled into an old provisional Case;
- a later source correction does not overwrite old evidence.

A source correction may create an append-only correction/audit record that identifies affected Cases and old/new source content hashes. Correction evidence does not automatically rerun a model, replace a BrooksDecision, change a plan, or authorize an outcome-led rule change.

Any re-evaluation workflow requires separate design and authorization.

## 13. Provider evaluation requirements

Formal provider semantic evaluation must not begin under this design draft. A later Phase 6 contract must include the multi-timeframe capability only after exact design acceptance, implementation authorization, exact implementation acceptance, source-grounded Doctrine prerequisites, package acceptance/activation, installed-provider capability/privacy proof, and a separate provider-output authorization.

The future frozen evaluation set must cover at least:

```text
5m only
5m + 60m
5m + 1d
5m + 60m + 1d
legitimate short reference history
early started provisional reference bar
nearly finalized provisional reference bar
reference context supporting the primary assessment
reference context limiting or opposing the primary assessment
60m and 1d disagreement
explicit primary and reference continuity gaps
reference context unavailable for the decision
```

The evaluation must include paired causal cases that hold the five-minute input byte-identical while adding or removing valid higher-timeframe context.

Requirements for each pair:

- different final decisions are not required;
- any changed claim or verdict must cite the added visible evidence and approved Doctrine;
- an unchanged decision must account for why the added context has no material effect when the schema requires an assessment;
- after context removal, the model must not claim to observe the removed structure;
- candidate providers receive byte-equivalent inputs, charts, Doctrine, prompts, schemas, and reasoning budgets.

Hard semantic failures include:

- fixed timeframe priority, voting, or scoring;
- invented unavailable higher-timeframe evidence;
- reference to a nonexistent or wrong-timeframe bar;
- representing provisional evidence as finalized;
- using post-cutoff updates;
- changing a conclusion without visible evidence and approved Doctrine;
- omitting a required missing-data or conflict assessment;
- claiming complete instrument history without authorized history-start evidence.

Tests prove semantic, causal, privacy, and contract behavior. They do not prove profitability.

## 14. Doctrine and capability routing

Approved Brooks Source semantics govern how the model interprets five-minute, sixty-minute, and daily evidence. Model-generated rationale, CalvinReview, V6 artifacts, CC Trader logic, outcomes, and PnL do not become Doctrine authority.

Source batch 001 remains candidate evidence only. No Doctrine proposal may be drafted, inserted, or approved from it until:

1. Calvin accepts the exact content hash of this design contract through a separate approval record;
2. governance files are synchronized to that exact acceptance;
3. a separate exact Doctrine proposal-batch authorization identifies the permitted candidate groups and Source hashes.

A future proposal must route each semantic claim to the capability that can honestly express it. It must not simplify multi-timeframe, scaling, active-management, or intrabar semantics into V1 fields that cannot observe the required evidence.

## 15. Separate required design tracks

This contract does not design or defer away the importance of:

1. scaling and aggregate risk;
2. active-position management;
3. intrabar spike/event handling.

They remain required separate design tracks under ADR-0024. Their exact input state, lifecycle, authority, and sequencing relative to formal provider evaluation require separate Calvin adjudication and exact contracts.

This contract also does not add `market_next_event` support. Its event price, watcher, freshness, inference-delay, premise, risk, geometry, R:R revalidation, and execution boundaries remain unresolved.

## 16. Required future implementation boundaries

A future implementation authorization must separately identify exact write scope and tests for:

- versioned local Case and anonymous input schemas;
- source/session profile and snapshot records;
- deterministic chart manifests and rendering;
- common normalization and timeframe-aware evidence;
- decision/response schema and validator;
- strict privacy allowlists;
- append-only persistence and correction records;
- prompt/package versioning and compatibility;
- synthetic fixtures for every causal and semantic boundary;
- provider-neutral evaluation fixtures.

No implementation may silently reuse a V1/V2 schema identity for changed bytes or semantics.

## 17. Acceptance and exit gates

This design draft becomes an accepted baseline only through a separate immutable approval record binding its exact content hash. Drafting, review, or a clean commit does not imply acceptance.

Design acceptance would still not authorize implementation. The remaining gates are separate:

1. exact design-contract approval;
2. exact implementation authorization;
3. exact implementation acceptance;
4. separately approved Source and Doctrine prerequisites;
5. exact prompt/package content approval and activation/preparation;
6. installed-provider capability, privacy, and isolation proof;
7. frozen Phase 6 evaluation contract;
8. separately authorized provider output.

## 18. Not authorized

This draft does not authorize:

- code, schema, prompt, package, migration, test, dependency, service, deployment, or credential changes;
- Source access, extraction, proposal creation, Doctrine approval, corpus mutation, retrieval activation, or RAG operation;
- real or synthetic market-data ingestion, snapshot capture, chart rendering, or payload preparation;
- Prompt Package V2 mutation, activation, rollback, or preparation;
- installed `agy` or Codex inspection or invocation;
- provider/model calls, ModelRun, ProviderAttempt, validation audit, or production BrooksDecision creation;
- scaling, active management, watcher, intrabar, execution, risk, or accounting implementation;
- protected-window access, outcomes, PnL, replay, training, Paper, Live, exchange, wallet, order placement, or trading.
