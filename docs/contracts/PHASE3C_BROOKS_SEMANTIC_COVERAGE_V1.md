# Phase 3C Brooks Semantic Coverage Contract V1

Status: DRAFT FOR CALVIN ACCEPTANCE. NO SOURCE-ACCESS, DOCTRINE, CORPUS, PROVIDER, OR IMPLEMENTATION AUTHORITY.

Contract version: `phase3c-brooks-semantic-coverage.v1`

Authority and sequencing: ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0017, ADR-0019, ADR-0020, ADR-0021, ADR-0022, ADR-0023, the accepted Phase 3B/4A/5A/5B contracts, and the separately accepted Phase 5B2B geometry-correction record within their recorded boundaries. The exact Prompt Package V2 content approval is `sha256:429c5d53086a77c9bf826a20c23e11d08d53ef4d36bdda591ceefe18931affce`, approving package content hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`; the approval is outside this contract and the package preimage.

The contract content hash is recorded only by a separate acceptance or execution record. It is not embedded in this document's own preimage, so the document remains content-identifiable without a self-referential hash.

## 1. Purpose

This contract defines a finite, auditable Brooks Price Action semantic coverage baseline for the accepted `BrooksDecisionV1` policy surface.

It answers one bounded question:

> Which Brooks decision capabilities, state boundaries, interactions, evidence obligations, and authority boundaries must be source-grounded before the project may claim that the V1 semantic baseline is coverage-complete?

This contract does not claim to exhaust all Brooks teaching, all Price Action knowledge, or every possible market pattern. Coverage completion is defined against the accepted V1 decision surface, not against the number of URLs, DoctrineUnits, pattern names, or model calls.

This document is a governance contract draft. It does not itself approve a Source, open a Source URL, create a Doctrine proposal, approve a DoctrineUnit, activate a corpus, prepare a payload, call a provider, or authorize implementation.

## 2. Non-negotiable boundaries

The following remain in force:

- use closed candles and causal event ordering only;
- do not access, import, derive, summarize, embed, or train on the protected `2025-02`, `2025-05`, or `2025-08` windows;
- do not use settlement ledgers, CITA outcomes, unauthorized Vegas outcomes, PnL, or outcome-derived rules;
- keep `brooksDecision`, `calvinReview`, and `researchCandidate` separate;
- Brooks public Source material is doctrine authority only after the exact Source, snapshot hash, locator, proposal hash, and explicit approval chain are bound;
- Calvin review, V6 definitions, CC Trader mechanisms, model output, model summaries, and general model knowledge may identify gaps but cannot become Brooks authority;
- no numeric probability, confidence, win rate, expected return, or success chance is part of V1 BrooksDecision authority;
- no minimum trade count, frequency target, PnL target, or outcome-led Doctrine change may be used to force model activity;
- no `partial` coverage disposition is permitted;
- no provider-profile limitation may be recorded as a V1 semantic exclusion;
- any unresolved semantic issue that could change a required V1 output is an `unresolved_in_scope_blocker`;
- all later Source access, Doctrine mutation, Phase 4A2 activation, Prompt Package V2 activation, provider execution, real-Case ingestion, replay, training, Paper, Live, and trading remain separately gated.

### 2.1 Source classes and derived-wording boundary

The eligible Source classes for later separately authorized Phase 3C access are limited to:

- Brooks public materials;
- direct material from the official Al Brooks YouTube channel;
- reviewed third-party Brooks course transcripts, including an explicitly approved Bilibili source where its exact media/transcript provenance is recorded.

This contract does not select snapshots or authorize access. Snapshot selection, access, and extraction remain a later exact-batch decision. Private, unauthorized, protected-window, outcome-bearing, settlement, PnL, and unapproved third-party material is ineligible.

For every selected Source, the inventory/provenance record must preserve copyright status, source type, exact URL or local reference, snapshot/content hash, and locator policy. Stored Doctrine wording must be simplified, source-mapped semantics rather than redistributed Source text. Verbatim excerpts are limited to the separately approved excerpt allowance for the Source; absent such an allowance, no verbatim excerpt is retained. Derived wording must be necessary for the approved DoctrineUnit, reviewable against the locator, and content-identifiable. A Source whose provenance, copyright status, or permitted-retention boundary cannot be established cannot close a coverage item.


## 3. Scope identity: V1 domain versus provider profile

### 3.1 Semantic baseline identity

The Phase 3C semantic baseline is bound to the complete accepted `BrooksDecisionV1` domain. Its entry semantic surface includes:

```text
stop
limit
market_next_event
```

`market_next_event` is therefore an in-scope V1 domain semantic obligation. The baseline must determine, from approved Brooks Source and accepted project policy, when this entry premise is applicable, when it is not, what causal boundary it has, and what evidence would resolve uncertainty.

This does not authorize an execution watcher, market order, order submission, or any real or Paper action.

### 3.2 Current Prompt Package V2 compatibility identity

The separately approved but inactive Prompt Package V2 has a narrower provider profile:

| Entry type | Current V2 provider profile |
|---|---|
| `stop` | supported |
| `limit` | supported |
| `market_next_event` | unsupported; fail closed |

The V2 prompt, schema, manifest, validator version, and package hash are not changed by this contract. V2 must not be described as a complete V1 provider profile while this difference remains.

The difference is recorded as a compatibility disposition, not as deletion of the V1 semantic obligation. A future profile may remain explicitly restricted or may require a new Prompt Package version after separately resolving future event price, inference delay, freshness, geometry/R:R revalidation, and execution-contract questions.

### 3.3 `plannedGeometry` disposition

V2 adds provider-proposed `plannedGeometry` for the numeric expression of a long or short trade plan. It is not a new independent Brooks PA capability. The semantic questions remain entry premise, protection selection, and objective selection; the exact numeric values are governed by accepted project policy and deterministic validation.

`plannedGeometry` is therefore tracked in the field disposition and provider-compatibility ledgers, but it is not counted as a twenty-eighth Brooks capability and does not expand the V1 semantic ontology.

The current V2 four-rule geometry correction remains authoritative within its separate acceptance:

- long stop entry strictly above its referenced visible anchor; short stop entry strictly below;
- long protection strictly below its referenced visible anchor; short protection strictly above;
- limit entry exactly equal to a visible anchor in its referenced structure;
- objective exactly equal to a visible anchor in the structure referenced by its selected magnet.

Phase 3C does not silently infer tick size, buffer, tolerance, minimum distance, projected-price formula, or a fixed scenario-to-verdict mapping. If a Brooks semantic structure cannot be represented by the current V2 profile, the result is a recorded provider-profile gap, not an unreviewed deletion of the V1 semantic obligation.

## 4. Capability inclusion test

A capability belongs in the V1 Capability Ledger when all three conditions hold:

1. it is observable from, or reasonably assessable using, the accepted anonymous five-minute closed-bar input and supplied approved Doctrine context;
2. it can affect at least one provider-owned structured V1 semantic output;
3. it is not solely deterministic validation, serialization, identity, persistence, or execution machinery.

A capability may have multiple authority classes. For example, causal sufficiency can depend on accepted project causal policy, while the market interpretation of sufficient evidence depends on Brooks Source semantics. The ledger must record those authorities separately.

## 5. Part I — Capability Ledger

The exact V1 capability inventory is the following 27 semantic capabilities. A combined row is allowed only where the row explicitly preserves the named independent obligations.

| ID | Capability | Required provider-owned semantic obligations | Main V1 paths |
|---|---|---|---|
| C01 | Causal Input Adequacy | Decide whether continuity, missing data, left-censoring, session/boundary information, and same-bar ordering are adequate for the required assessment; distinguish resolvable uncertainty from a conclusion that is sufficiently supported now. | `uncertainty`, `noTrade`, all critical assessments |
| C02 | Visible Market Evidence Selection | Select relevant visible bars and observed OHLC/relationship fields for each material assessment; do not treat a merely legal reference as semantically sufficient evidence. | `marketEvidence[]`, `observationCode`, claim references |
| C03 | Claim and Doctrine Grounding | Form claims that are actually supported by selected market evidence and supplied approved Doctrine; do not substitute general model knowledge for supplied Doctrine; preserve source-supported claim boundaries. | `claims[]`, `statementCode`, `doctrineIds` |
| C04 | Market State Classification | Assess the broad state as trend, trading range, breakout mode, transition, or uncertain, with positive and limiting evidence. | `broadContext.marketState` |
| C05 | Broad Trend Direction | Assess broad bull, bear, none, or uncertain direction independently from market state and the current leg. | `broadContext.trendDirection` |
| C06 | Current Leg Direction | Assess the currently visible price leg as up, down, sideways, or uncertain without rewriting broad context from one local move. | `currentLeg.direction` |
| C07 | Always-In State | Assess long, short, not established, or uncertain Always-In state, separately from current leg and from permission to open a new trade. | `alwaysIn.state` |
| C08 | Buying/Selling Pressure Assessment | Assess buying and selling pressure independently, including absent/present/dominant/uncertain sides and their pressure evidence balance; pressure alone never grants trade permission. | `pressure.buying`, `pressure.selling`, `pressure.balance` |
| C09 | Visible Structure Identification | Identify decision-relevant visible structures and their source-grounded kind, including prior high/low, trading-range high/low/midpoint, breakout point, gap boundary, trend-channel boundary, and measured-move structure where the V1 representation permits them. | `structures[]`, `structures[].kind`, anchors |
| C10 | Contextual Structure-Role Assessment | Assess what a structure means in the current context rather than assigning a permanent direction: rejection, breakout attempt, provisional/confirmed/failed/testing lifecycle, reversal context, follow-through, retest, pressure, and both directional cases. | `structures[]`, lifecycle fields, claims |
| C11 | Magnet Selection and Relevance | Identify visible magnets, their above/below side and primary/secondary relevance, and why a selected magnet matters; a magnet alone is not trade permission. | `magnets[]`, `magnetId`, side, relevance |
| C12 | Breakout Lifecycle Assessment | Distinguish none, attempt, provisional, confirmed, failed, testing, and uncertain breakout states and their direction; do not equate touching, piercing, or one breakout bar with confirmation. | `breakoutLifecycle` |
| C13 | Reversal Lifecycle Assessment | Distinguish none, potential, transitioning, confirmed, failed, and uncertain reversal states with from/to direction; a failed breakout, climax, shock, pullback, or overshoot does not by itself confirm reversal. | `reversalLifecycle` |
| C14 | Setup Assessment | Identify source-supported setup candidates, applicability, forming/confirmed/invalidated/expired/uncertain state, primary versus confluence role, and opposing setup evidence without creating an exhaustive unapproved pattern taxonomy. | `longCase.setupCandidates[]`, `shortCase.setupCandidates[]` |
| C15 | Signal Basis Assessment | Distinguish discrete-bar, multi-bar-structure, and Doctrine-supported `no_separate_signal` bases and assess absent/forming/confirmed/rejected/expired/uncertain state; `no_separate_signal` is never a default for missing evidence. | `signalBasis.kind`, `signalBasis.state`, signal bars/Doctrine |
| C16 | Trigger Readiness Assessment | Distinguish not applicable, pending, triggered, cancelled, expired, and ambiguous trigger state; a new V1 decision leaves a new trigger pending and never claims an intrabar trigger in the last visible bar. | `longCase.triggerState`, `shortCase.triggerState`, entry timing |
| C17 | Bilateral Directional Case Assessment | Construct and assess both long and short cases, including each side's state, setup, signal, trigger, claims, and evidence balance; preserve explicit long/short mirror obligations where doctrine is symmetric. | `longCase`, `shortCase` |
| C18 | Comparative Evidence Balance | Compare the complete long and short cases and determine whether evidence favors long, favors short, is balanced, insufficient, or conflicting; this is distinct from pressure balance even though both use `EvidenceBalanceV1`. | top-level `evidenceBalance`, case balances |
| C19 | Final Verdict and Trade Permission | Select long, short, no_trade, or uncertain only after both directional cases and the required evidence/plan conditions are assessed; distinguish a complete no-trade judgment, genuine uncertainty, and deterministic rejection. | `verdict`, branch fields |
| C20 | Entry Premise and Entry-Type Selection | State why an entry premise is valid or not, choose the V1 domain entry type and relation, bind the causal effective time, and distinguish stop, limit, and market-next-event semantics without fabricating future price. | `tradePlan.entry`, entry claims, `validAfterBarId` |
| C21 | Entry Cancellation | Define the structural condition that cancels an untriggered entry premise, including the visible anchor and evidence supporting the condition. | `tradePlan.entryCancellation` |
| C22 | Premise Invalidation | Define the structural condition that invalidates the underlying trade premise, separately from entry cancellation and broad Always-In reversal. | `tradePlan.premiseInvalidation` |
| C23 | Protection Selection | Select the protection anchor and side consistent with the directional plan and source-grounded premise; the deterministic shell checks the accepted relation but does not choose the anchor or policy. | `tradePlan.protection` |
| C24 | Holding Intent | Choose scalp or swing from approved Doctrine, favored case, and structural objective before reward/risk evaluation; do not relabel an invalid swing as a scalp. | `tradePlan.holdingIntent` |
| C25 | Objective Selection | Select an existing directional magnet, explain its relevance, and distinguish primary scalp objective from secondary context; do not invent a target or guarantee a path. | `tradePlan.objective`, `objective.magnetId` |
| C26 | No-Trade Boundary | Determine when evidence is sufficient to conclude that no current trade is permitted, ensure neither directional case remains actionable, select the source/policy-grounded reason(s), and state the next observable condition. | `verdict = no_trade`, `noTrade` |
| C27 | Uncertainty Boundary and Resolution | Determine when missing or conflicting causal/semantic evidence could materially change the decision, identify conflicts/missing evidence, and state a concrete resolution condition; uncertainty is not a malformed response and is not a substitute for no_trade. | `verdict = uncertain`, `uncertainty` |

### 5.1 Trade-plan sub-obligation rule

The six trade-plan semantic questions are C20–C25:

```text
Entry Premise
Entry Cancellation
Premise Invalidation
Protection Selection
Holding Intent
Objective Selection
```

`plannedGeometry` is the V2 numeric expression of relevant parts of these obligations and is tracked separately as project-policy/provider-profile expression. It is not a seventh Brooks capability.

### 5.2 Open semantic code fields

`observationCode`, `statementCode`, and `conditionCode` are intentionally open strings in V1. Phase 3C does not invent a universal code dictionary. Coverage must nevertheless bind the meaning of each eventual code usage to visible evidence, claims, Doctrine, and the relevant condition. A future closed vocabulary is a separate candidate and cannot be smuggled into this contract through extraction.

## 6. Part II — State and Boundary Ledger

The following V1 domain and profile state values are also binding obligations:

| Surface | Exact states or values | Boundary obligations |
|---|---|---|
| Observed field | `open`, `high`, `low`, `close`, `relationship` | Selection must identify which visible price or relationship evidence supports a material observation; no field may be treated as meaningful without a source-grounded observation interpretation. |
| Price-anchor field | `open`, `high`, `low`, `close` | The provider selects a visible anchor field for a structure or condition; the validator verifies that its normalized value equals the visible OHLC field. |
| Direction literals | `long`, `short` | Long/short case and plan direction are explicit and mirror-checked; direction is not inferred from a structure kind or magnet side alone. |
| Entry effective boundary | `validAfterBarId = lastVisibleBarId`, `validForClosedBars = 1` | A new closed-bar decision may create a pending one-closed-bar entry plan only; the model cannot claim an intrabar trigger or use later bars. |
| Uncertainty conflict support | `conflictingClaimIds`, `missingEvidence`, `resolutionCondition` | Conflicting claims, missing evidence, and resolution must be separately represented; none may be replaced by generic prose or no_trade. |
| Deterministic V1 collection bounds | `structures ≤ 5`, `magnets ≤ 3`, `setupCandidates ≤ 3` per direction, reason-code lists `1..5`, `marketEvidence.barIds ≤ 120`, claim doctrine/evidence reference bounds, `missingEvidence ≤ 12`, `humanSummary ≤ 600` characters | Bounds are accepted project-policy/contract limits, not Brooks semantic claims. A V1 semantic obligation that cannot be represented within an accepted bound is an `unresolved_in_scope_blocker`, not a silent omission or truncation. |

The following state/value sets are the complete V1 semantic state surface to disposition. Each value must receive, in the eventual coverage report, a source-grounded positive or applicability rule, a limitation/counterexample, a permission or actionable path where relevant, a true uncertainty boundary, and a resolution path. A value that cannot be supported or represented must be recorded as an explicit gap disposition rather than silently omitted.

| Surface | Exact states or values | Boundary obligations |
|---|---|---|
| Final verdict | `long`, `short`, `no_trade`, `uncertain` | Long/short require complete actionable plans; no_trade means sufficient evidence supports no current trade; uncertain means material causal/semantic insufficiency or conflict; deterministic failure is `rejected`, not a verdict. |
| Evidence balance | `favors_long`, `favors_short`, `balanced`, `insufficient`, `conflicting` | Pressure balance, case balance, and final comparative balance must not be conflated; insufficient/conflicting evidence does not automatically force one fixed verdict without the branch contract. |
| Broad market state | `trend`, `trading_range`, `breakout_mode`, `transition`, `uncertain` | State must not be inferred from one bar; transition and uncertainty require explicit resolution or limiting evidence. |
| Broad trend direction | `bull`, `bear`, `none`, `uncertain` | Must remain independent from state, current leg, and Always-In. |
| Current leg | `up`, `down`, `sideways`, `uncertain` | A local leg cannot silently rewrite broad direction or Always-In. |
| Always-In | `long`, `short`, `not_established`, `uncertain` | Always-In is not a new-trade permission and is not identical to current leg. |
| Pressure side | `absent`, `present`, `dominant`, `uncertain` for each buying/selling side | Buying and selling sides are assessed separately; pressure does not itself authorize long or short. |
| Breakout state | `none`, `attempt`, `provisional`, `confirmed`, `failed`, `testing`, `uncertain` | Touch, pierce, breakout bar, failed breakout, retest, and follow-through require distinct dispositions; failed breakout is not automatic reversal confirmation. |
| Breakout direction | `up`, `down`, `both`, `none`, `uncertain` | Direction and lifecycle remain separately assessed; inactive state cannot imply a structure. |
| Reversal state | `none`, `potential`, `transitioning`, `confirmed`, `failed`, `uncertain` | Pullback, climax, shock, overshoot, and failed breakout do not independently prove confirmed reversal. |
| Reversal directions | `fromDirection` and `toDirection`, each `bull`, `bear`, `none`, `uncertain` | Directional transitions require source-grounded interpretation and mirror review; no automatic flip is inferred. |
| Structure kind | `prior_high`, `prior_low`, `trading_range_high`, `trading_range_low`, `trading_range_midpoint`, `breakout_point`, `gap_boundary`, `trend_channel_boundary`, `measured_move_structure` | Every kind requires an applicability and role disposition. V1 does not claim exhaustive wedge/triangle/channel subtype taxonomy. Representation compatibility with V2 geometry is tracked separately. |
| Magnet side | `above`, `below` | Side is contextual and must not be treated as a fixed trade direction. |
| Magnet relevance | `primary`, `secondary` | Relevance is a semantic selection, not merely a list position; scalp objective requires a primary magnet under accepted project policy. |
| Setup state | `forming`, `confirmed`, `invalidated`, `expired`, `uncertain` | Formation, confirmation, invalidation, expiry, and insufficient evidence require separate examples and boundaries. |
| Setup role | `primary`, `confluence` | At most one confirmed primary setup is required for a trade verdict; confluence does not independently authorize a trade. |
| Signal kind | `discrete_bar`, `multi_bar_structure`, `no_separate_signal` | The no-separate-signal path requires explicit approved Brooks Source support. |
| Signal state | `absent`, `forming`, `confirmed`, `rejected`, `expired`, `uncertain` | A confirmed signal is not a triggered entry; rejected/expired signal is not silently reused. |
| Trigger state | `not_applicable`, `pending`, `triggered`, `cancelled`, `expired`, `ambiguous` | New trade plans are pending at the closed-bar cutoff; later event ordering is deterministic and right-censored here. |
| Directional case state | `absent`, `forming`, `actionable`, `invalidated`, `uncertain` | Both long and short cases must be assessed; a selected trade case must be actionable and the opposing case cannot also be actionable. |
| Entry type in V1 domain | `stop`, `limit`, `market_next_event` | `market_next_event` remains a V1 semantic obligation but is unsupported by current V2. No future price may be guessed or substituted. |
| Stop entry relation | `break_above`, `break_below` | Relation must match direction and reference a visible anchor; exact geometry validation is project policy/deterministic validation. |
| Limit entry relation | `pullback_to` | The structure role and pullback premise require Brooks semantic support; current V2 exact anchor equality is a separate provider-profile rule. |
| Holding intent | `scalp`, `swing` | Scalp has no fixed minimum R:R; swing requires accepted deterministic `>= 2.0R`; intent is not changed to rescue geometry. |
| Protection relation | `below`, `above` | Directional side is deterministic validation; anchor selection and premise are semantic. |
| No-trade reason codes | `no_setup`, `setup_forming`, `signal_absent`, `signal_rejected`, `poor_location`, `opposing_pressure`, `balanced_evidence`, `breakout_unconfirmed`, `reversal_unconfirmed`, `entry_condition_not_permitted`, `trade_plan_incomplete`, `doctrine_prohibits_entry`, `swing_reward_insufficient` | Every code requires an authority classification and positive/counterexample boundary. Provider-profile inability, schema failure, or geometry failure must not be mislabeled as Brooks doctrine. |
| Uncertainty reason codes | `insufficient_causal_evidence`, `missing_data`, `continuity_unknown`, `left_censored_context`, `same_bar_order_unknown`, `market_structure_conflict`, `doctrine_evidence_conflict`, `source_provenance_uncertain` | Causal, semantic, provenance, and authority uncertainty must remain distinguishable; each requires a materiality and resolution path. |

### 6.1 Permission and abstention symmetry

For every capability that can affect a trade verdict, the eventual Doctrine coverage must contain all of the following where applicable:

1. **Positive/applicability path** — what evidence is sufficient for the state or premise to hold;
2. **Permission/actionable path** — how that state can participate in a complete actionable case without independently authorizing a trade;
3. **Limitation/counterexample** — a similar-looking case that remains insufficient, invalid, or rejected;
4. **Uncertainty boundary** — what missing or conflicting evidence could materially change the conclusion;
5. **Resolution path** — what later causal observation or provenance decision would resolve it.

This rule prevents both premature trading and signal starvation. It does not set a minimum number of trades and does not permit PnL or outcomes to tune Doctrine.

### 6.2 `no_trade`, `uncertain`, and `rejected`

These terminal categories are not interchangeable:

- `no_trade`: evidence is sufficiently clear for a current no-permission judgment and neither directional case is actionable;
- `uncertain`: a material causal or semantic gap or conflict could change the judgment, and the response identifies what would resolve it;
- `rejected`: schema, parse, reference, causal, geometry, or authority failure; it is deterministic validation, not model abstention.

`noTrade.nextObservableCondition`, `uncertainty.conflictingClaimIds`, `uncertainty.missingEvidence`, and `uncertainty.resolutionCondition` are provider-owned semantic support fields for C26/C27 and must be included in final coverage evidence. They are not separate top-level capabilities.

### 6.3 Branch-boundary obligations

The following are substantive V1 branch boundaries and must be recorded in the coverage report as the conjunction of `accepted_project_policy` and `deterministic_validator`:

- a `long` or `short` verdict requires both the top-level `evidenceBalance` and the selected directional case's `evidenceBalance` to match that verdict's direction;
- a trade verdict requires exactly one confirmed primary setup in the selected case, a confirmed signal, a pending trigger, a complete trade plan, and a non-actionable opposing case;
- an `uncertain` verdict requires at least one currently representable critical uncertainty state: top-level evidence balance `conflicting` or `insufficient`, either directional case state `uncertain`, either signal state `uncertain`, or either trigger state `ambiguous`;
- a causal or semantic concern that cannot be expressed through those accepted uncertainty states is not automatically covered by the `uncertain` branch. If Source-grounded Phase 3C review requires that route, the mismatch is an `unresolved_in_scope_blocker` requiring a versioned contract revision rather than validator bypass;
- `no_trade` requires no actionable directional case and a non-empty source/policy-grounded next observable condition; deterministic schema, reference, causal, geometry, or authority failures remain `rejected`.

These rules do not define a Brooks decision algorithm or prescribe which market evidence produces a verdict. They define the accepted boundary of what a structurally valid V1 response can express.


## 7. Part III — Interaction Scenario Matrix

The following eleven scenario families are mandatory minimum coverage. Each family must be reviewed with concrete source-grounded positive cases, counterexamples or conflicts, and the three horizontal checks below. The matrix does not prescribe a fixed verdict for any scenario. Every capability C01–C27 must map to at least one interaction family in the coverage report; every interaction family must map back to one or more capabilities. An unmapped capability or an interaction that cannot be supported by the ledgers is an `unresolved_in_scope_blocker`.

| ID | Scenario family | Required boundary questions |
|---|---|---|
| I01 | Broad context × current leg × Always-In | Can broad state, local leg, and Always-In differ without the model collapsing them? What evidence changes each assessment? |
| I02 | Structure role × breakout lifecycle | Can the same range boundary support rejection/sell-high context, breakout attempt, failed breakout, confirmed follow-through, or retest depending on causal evidence? |
| I03 | Breakout lifecycle × reversal lifecycle | Does a failed breakout remain distinct from a confirmed opposite reversal? Can both be uncertain or in transition? |
| I04 | Location × pressure × trade permission | Does pressure remain separate from permission? Can a location be relevant but still produce no_trade or uncertain? |
| I05 | Setup × signal × trigger | Can a setup form without a confirmed signal, a signal confirm while trigger remains pending, and a signal expire or be cancelled without retroactive entry? |
| I06 | Long case × short case × evidence balance | Are both cases built and compared? Are mirror obligations preserved? How is balanced or conflicting evidence represented? |
| I07 | Directional case × final verdict | What makes a case actionable, non-actionable, invalidated, or uncertain, and how does that map to long/short/no_trade/uncertain without a fixed algorithm? |
| I08 | Entry × cancellation × invalidation × protection | Are entry premise, entry cancellation, premise invalidation, and protection distinct, causally timed, and supported by visible structure? |
| I09 | Holding intent × magnet × objective | Does scalp/swing intent follow the favored case and existing objective? Is primary versus secondary magnet relevance preserved without inventing a target? |
| I10 | Evidence adequacy × no_trade × uncertain | Does the model distinguish clear no-permission from material uncertainty and from deterministic rejection? Can resolution conditions prevent indefinite abstention? |
| I11 | Doctrine evidence conflict × verdict/abstention | Can competing approved or source-scoped interpretations remain explicit, affect the relevant directional cases, and resolve to actionable, no_trade, or uncertain without silent model arbitration? |

### 7.1 Mandatory horizontal checks

Every interaction family and every source-grounded capability row must be checked for:

- **Long/short mirror** where the underlying doctrine is directionally symmetric;
- **Permission/abstention symmetry**, including both actionable paths and abstention boundaries;
- **Causal robustness**, including prefix extension, closed-bar cutoff, missing continuity, left-censoring, and same-bar ambiguity;
- **Language consistency**, with the coverage report using the exact English labels `positive/applicability path`, `permission/actionable path`, `limitation/counterexample`, `uncertainty boundary`, and `resolution path`.

A scenario is not complete merely because one long example or one positive pattern exists.

## 8. Part IV — Authority and Evidence Ledger

### 8.1 Authority classes

| Authority class | What it may establish | What it may not establish |
|---|---|---|
| `brooks_source_semantic` | Brooks trading meaning, applicability, exceptions, counterexamples, setup/signal/trigger semantics, contextual roles, directional cases, and source-grounded no-trade/uncertainty doctrine | JSON validity, causal data integrity, V2 profile support, execution, or authority promotion |
| `accepted_project_policy` | Five-minute closed-bar boundary, V1 verdict meanings, `market_next_event` domain existence, V2 profile restriction, scalp/swing project rules, geometry profile, privacy/authority boundaries, and scheduling boundaries | Brooks doctrine meaning unless separately supported by Brooks Source |
| `deterministic_validator` | Schema/parse/ID/reference closure, visible-prefix and OHLC checks, exact geometry relations, reward/risk arithmetic, branch invariants, and rejection of malformed or unauthorized records | Whether a market structure, setup, pressure reading, or target is doctrinally correct |

`plannedGeometry` is provider-proposed project-policy expression validated by the deterministic shell. It is not Brooks Source authority and is not a standalone capability.

### 8.2 Non-authoritative gap-finding material

The following may be used only to find omissions, prioritize review, or generate a research candidate:

```text
Calvin conversation and calvinReview
V6 definitions, rulebook layers, cases, outcomes, and artifacts
CC Trader mechanisms, scores, parameters, and outcomes
model-generated summaries, embeddings, rationales, or proposals
general model knowledge
outcomes, PnL, settlement, replay, or trading results
unapproved third-party or private material
```

None may be cited as a Brooks semantic authority in a DoctrineUnit or coverage acceptance.

### 8.3 Required Source-to-Doctrine binding

For every Doctrine proposal used to close a coverage obligation, the evidence record must bind:

- exact `sourceId`;
- exact public Source snapshot/content hash;
- precise non-empty locator;
- derived wording and its content identity;
- `doctrineId`;
- exact Phase 3B proposal hash;
- exact approval hash and authenticated approver principal;
- status `approved`, with no retirement visible to the relevant corpus snapshot;
- capability IDs, state values, interaction IDs, and counterexample/conflict records supported by the unit.

A URL inventory row, `doctrine_candidate` status, or an unapproved draft does not satisfy this binding. Source access and proposal batches are separately authorized after this contract is accepted.

### 8.4 Conflict and ambiguity evidence

When Sources disagree, are ambiguous, or support different scopes, the project must preserve an explicit conflict record containing provenance, affected capability/state/interaction scope, competing interpretations, adjudication status, and the reason for any accepted resolution. Silent synthesis or model arbitration is forbidden.

### 8.5 Proposal rejection and retirement criteria

A Doctrine proposal must be rejected when its exact Source/provenance binding is missing, its locator cannot support the derived claim, its wording exceeds the permitted retention boundary, it relies on excluded or non-authoritative material, it conflates deterministic validation with Brooks doctrine, or it does not close the claimed capability/state/interaction obligation without material ambiguity. Rejection does not itself prove the contrary rule and cannot close coverage.

An approved DoctrineUnit must be retired when its bound Source or proposal identity is no longer reproducible, its authority or retention permission is withdrawn, its wording is found materially unsupported by its locator, it is superseded by an explicitly versioned correction, or an accepted conflict adjudication invalidates its claimed scope. Retirement is append-only and fail-closed; it reopens affected coverage items under §9.2.

## 9. Part V — Scope and Gap Ledger

Every capability, state/value, reason code, interaction, schema path, provider-profile difference, and future-input dependency receives exactly one applicable V1 semantic disposition in the relevant V1 ledger. Provider compatibility is a separate axis and receives exactly one profile disposition per applicable profile. An item may therefore be `covered` for V1 semantics and `profile_unsupported_fail_closed` for current V2 compatibility without contradiction.

### 9.1 Disposition vocabularies

**V1 semantic disposition:**


| Disposition | Meaning | Effect on final Phase 3C acceptance |
|---|---|---|
| `covered` | Exact V1 obligation has source/policy authority, positive path, counterexample/limitation, permission/abstention treatment, interaction closure, and evidence binding. | May close the item. |
| `unresolved_in_scope_blocker` | An unresolved semantic, authority, representation, or evidence issue could change a required V1 output. | Blocks the sole final coverage acceptance. |
| `v1_excluded` | The item is intentionally outside the accepted V1 policy/input/profile, with the exclusion explicitly recorded and not presented as covered. | Does not block if the exclusion is itself accepted and no V1 obligation is being claimed. |
| `future_version_candidate` | The item may be valuable but requires a new input, schema, timeframe, provider profile, or separately versioned policy. | Does not block V1 if it is not required by V1. |

**Provider-profile compatibility disposition:**

| Profile disposition | Meaning |
|---|---|
| `profile_supported` | The current named provider profile can represent the obligation and its accepted validation boundary. |
| `profile_unsupported_fail_closed` | The profile intentionally rejects the obligation rather than guessing, substituting, or silently omitting it. |
| `profile_representation_gap` | The V1 obligation is relevant but the profile cannot represent it without a separately versioned contract/profile change. |
| `profile_not_applicable` | The provider-profile axis does not apply to the item. |

`partial`, `mostly covered`, `implicitly covered`, and `covered by pattern count` are invalid dispositions on either axis.

### 9.2 Required residual-gap record shape

Every non-`covered` V1 item and every non-`profile_supported` compatibility item must have a residual-gap record containing:

```text
itemId
ledgerPart
capabilityOrSurface
v1Disposition or profileDisposition
scopeReason
requiredOutputPaths
authorityClass
sourceIds and sourceSnapshotHashes, when applicable
proposalIds and approvalHashes, when applicable
conflictIds, when applicable
resolutionCondition
blockingForPhase3C
recordHash
```

A `covered` item must still retain the corresponding evidence bindings and interaction mapping. A retired DoctrineUnit reopens every affected V1 coverage item as `unresolved_in_scope_blocker` until an approved replacement or explicit accepted exclusion closes it. A rejected proposal cannot close coverage; rejection reason and any replacement request remain auditable.

### 9.3 Known boundary dispositions to preserve

The final coverage report must include, at minimum, these explicit two-axis records:

| Item | V1 semantic baseline | Current V2 provider profile |
|---|---|---|
| `market_next_event` | In-scope V1 semantic obligation; source and policy applicability must be covered or blocked. | `profile_unsupported_fail_closed`; current V2 must fail closed rather than guess future price. |
| `plannedGeometry` | No separate Brooks capability; numeric expression is subordinate to entry/protection/objective semantics. | `profile_supported` as provider-owned project-policy expression plus deterministic validation; not a universal V1 semantic ontology. |
| `measured_move_structure` | Must receive source-grounded structure/role/magnet/plan disposition; no silent exclusion before Source review. | Geometry compatibility is a separate profile disposition; incompatibility cannot erase V1 semantic coverage. |
| `trend_channel_boundary` | Must receive source-grounded structure/role/magnet/plan disposition; no silent exclusion before Source review. | Geometry compatibility is a separate profile disposition; incompatibility cannot erase V1 semantic coverage. |
| `trading_range_midpoint` | Must receive source-grounded structure/role/magnet/plan disposition; no silent exclusion before Source review. | Geometry compatibility is a separate profile disposition; incompatibility is separately recorded. |
| `swing_reward_insufficient` | Requires source/policy explanation of when a Swing premise is insufficient, while the fixed `>= 2.0R` arithmetic is accepted project policy/deterministic validation. | V2 response must preserve the existing branch invariants and must not change Swing to Scalp or invent geometry to avoid the reason. |
| `entry_condition_not_permitted` | Requires explicit authority classification; it must not silently mean provider-profile inability. | V2 profile inability is a compatibility/rejection condition, not automatically a Brooks `no_trade` reason. |
| `humanSummary` | Non-authoritative optional prose; not a Brooks semantic completion obligation. | Structural nullable field only; it cannot override structured judgment or evidence. |

### 9.4 V1 excluded or future-version boundaries


The final report must explicitly disposition capabilities not expressible by the accepted V1 input or policy, including as applicable:

- opening/session-relative context, exchange session semantics, and futures-roll semantics when the required input is absent;
- multi-timeframe reasoning;
- volume or order-flow fields;
- intrabar model judgment or model reading of a forming five-minute candle;
- active-position, fill, prior-plan outcome, PnL, account, wallet, sizing, or execution state;
- numeric probability, confidence, calibration, expected return, and outcome optimization;
- exhaustive wedge/triangle/channel subtype taxonomy beyond accepted V1 structure fields;
- any provider-specific capability absent from the current approved profile.

A capability that can be required by an existing V1 provider-owned output is not made `future_version_candidate` merely because the current pilot corpus lacks evidence. It is an in-scope blocker until source coverage or an explicit policy exclusion is accepted.

## 10. Final coverage acceptance and falsification

### 10.1 One acceptance only

Phase 3C has one final coverage acceptance. Drafting or accepting this contract is not a second semantic acceptance. Source approvals, Doctrine approvals, Phase 4A2 contract/implementation acceptance, corpus activation, and provider gates remain separate governance events.

The sole final Phase 3C coverage acceptance must bind:

- this exact contract content hash;
- the exact Capability, State/Boundary, Interaction, Authority/Evidence, and Scope/Gap ledgers;
- every provider-owned V1 semantic path and all enum/reason-code values;
- every approved Doctrine ID, proposal hash, approval hash, Source snapshot/content hash, and locator used by the coverage set;
- every conflict/ambiguity record and its adjudication status;
- the complete coverage report hash;
- zero `unresolved_in_scope_blocker` items;
- explicit profile compatibility dispositions, including the V1/V2 `market_next_event` difference;
- confirmation that no protected, private, outcome, PnL, unauthorized V6, model-generated, or unapproved authority entered the evidence set.

### 10.2 Falsification criteria

The V1 semantic baseline or its coverage-complete claim is falsified, reopened, or must be revised when any of the following is discovered:

1. an accepted V1 provider-owned semantic path, enum value, reason code, or required branch has no ledger entry or no source/policy evidence;
2. a source review reveals a required positive path, counterexample, conflict, or uncertainty boundary absent from the corresponding capability or interaction;
3. the same evidence can legitimately support materially different verdict/abstention routes but the contract records no boundary or resolution path;
4. a supposedly symmetric Brooks rule fails a long/short mirror check without an explicit source-grounded asymmetry;
5. a causal-prefix, missing-data, left-censoring, or same-bar ambiguity case changes the required assessment but is not represented;
6. a DoctrineUnit, Source locator, content hash, proposal hash, or approval hash cannot be reproduced or does not support the claimed obligation;
7. V6, Calvin review, model output, outcomes, PnL, or general model knowledge has been used as authority rather than gap-finding material;
8. current V2 profile limitations are represented as complete V1 provider support, or V1 obligations are silently deleted to fit V2;
9. a deterministic validator rule is presented as Brooks doctrine, or a provider/model judgment is presented as deterministic fact;
10. later Phase 6 outcome-blind adjudication shows systematic false abstention on pre-adjudicated sufficiently supported actionable cases or systematic premature trading on insufficient cases. Phase 6 must freeze its exact sample, thresholds, and falsification procedure before provider output is inspected; no minimum trade count is used.

A discovered new V1 semantic gap requires a versioned contract revision and a new content hash. It must not be patched silently into this contract, an approved DoctrineUnit, a current corpus snapshot, or a historical acceptance record.

## 11. Authorized next steps after contract acceptance

Only after Calvin accepts this exact contract may a separate decision authorize the first bounded public Source batch. That later authorization must name the exact Source identities/snapshots, access method, content-hash procedure, locator rules, protected/private exclusions, retention boundary, and proposal scope.

The intended sequence is:

1. accept this contract as the Phase 3C design baseline;
2. authorize one exact bounded public Source batch;
3. read only that batch and freeze content hashes and locators;
4. create draft Doctrine proposals with exact proposal hashes;
5. explicitly approve, reject, retire, or request evidence for individual proposals;
6. update the five ledgers and preserve conflicts/gaps;
7. repeat bounded batches only under separate authorization;
8. produce one complete coverage report;
9. perform the sole Phase 3C coverage acceptance;
10. separately design and authorize Phase 4A2 expanded corpus activation;
11. only then reconsider post-corpus assembly, Prompt Package V2 preparation, installed-CLI proof, Phase 6, or any other later gate.

## 12. Explicit non-authority

This contract grants no authority to:

- open, fetch, refresh, crawl, or store any Source;
- create or mutate Doctrine, corpus, activation, PolicyAssembly, or prepared payload records;
- modify Prompt Package V1/V2 bytes, schemas, manifests, validators, code, migrations, dependencies, services, deployment, credentials, or API/CLI routes;
- activate or prepare Prompt Package V2;
- run `agy`, `codex exec`, any provider CLI, or any model/provider call;
- access real market data or Cases, protected windows, outcomes, PnL, replay, training, Paper, Live, exchange, wallet, order, or trading capability.

The repository's current nine-unit pilot remains plumbing evidence only. It is not coverage-complete Brooks semantic evidence.
