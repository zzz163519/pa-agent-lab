# Discovery Phase 0A / Factor V1 Contract

Status: DRAFT CONTRACT.
NOT IMPLEMENTATION AUTHORITY.
NOT PROVIDER AUTHORITY.
NOT REPLAY AUTHORITY.
NOT PAPER/LIVE AUTHORITY.
NOT TRADING AUTHORITY.

Version: `discovery-factor-v1.draft.1`

This document records the currently adjudicated Discovery Phase 0A / Factor V1 design for the hybrid PA automatic-trading direction. It is a contract proposal and governance artifact only. It does not authorize runtime factor detection, market-data ingestion, Candidate Pack preparation, model/provider calls, replay execution, Paper/Live operation, exchange submission, wallet/account access, order placement, or real-money activity.

The factor layer is a deterministic discovery funnel. It identifies price-action structure events that are worth sending to a later PA review boundary. It does not own final direction, entry, protection, objective, risk acceptance, execution permission, accounting, or outcome interpretation.

## 1. Scope And Authority

The contract covers:

- closed five-minute causal input eligibility;
- price and same-source total-volume observations;
- rolling reference boundaries;
- confirmed swing pivots and prior rolling-range anchors;
- five core trigger factors and three context enhancers;
- composite candidate identity and deduplication;
- candidate revision and lifecycle fields;
- provisional TTL/cooldown defaults;
- deterministic scheduler priority and compression reasons;
- fail-closed and same-bar ambiguity outcomes;
- the future TypeScript contract, synthetic fixture, and test scope.

The contract does not cover:

- final `long` or `short` authority;
- entry, stop, target, sizing, or position management;
- Brooks doctrine interpretation;
- PA verdict generation;
- Validator semantic repair;
- Risk Gate decisions;
- Execution Gateway actions;
- provider/model payloads or provider calls;
- replay engine behavior;
- outcome/PnL-based rule selection;
- Paper, Live, exchange, wallet, account, or trading authority.

The current target is the primary closed five-minute decision stream. This draft does not authorize multi-timeframe voting or silently extend the accepted Brooks capability boundary.

## 2. Accepted Semantic Baseline

The following semantics are recorded as accepted for this draft. They are not implementation acceptance and are not authority to run them.

### 2.1 Causal bar gate

- Only closed five-minute bars can be evaluated.
- A provisional or open bar cannot trigger a Candidate.
- The current event bar is compared against prior observations; it is excluded from its own rolling reference baseline.
- All input records must be finite, ordered, source-consistent, and causally visible at the evaluation cutoff.

### 2.2 History gate

```text
fewer than 40 closed 5m bars
  -> reject with insufficient_history

40 through 119 closed 5m bars
  -> evaluation allowed with contextState = left_censored

120 or more closed 5m bars
  -> evaluation allowed with contextState = normal
```

A left-censored Candidate must carry the state into later validation and audit. It must not be silently represented as a full-context observation.

### 2.3 Price and volume observations

Price OHLC is required for price-structure evaluation. Volume is an optional context input:

- valid volume is total bar volume from one authorized source, instrument, and timeframe;
- no taker-buy/taker-sell interpretation is part of V1;
- no direct cross-venue volume sum is part of V1;
- volume unavailable does not reject an otherwise valid price-structure Candidate;
- volume unavailable disables volume-based enhancers and must be explicit;
- missing volume must not be filled with zero, the previous value, a mean, or a rolling median;
- a Candidate reason must not mention volume when volume state is unavailable.

Allowed neutral descriptions include:

```text
bar range was above the same-source rolling reference
same-source total volume was above its rolling reference
pullback volume was lower than the preceding movement reference
volume was unavailable for this observation
```

The factor layer must not emit volume conclusions such as buyer/seller dominance, accumulation, distribution, bullish confirmation, bearish confirmation, or probability claims.

### 2.4 Rolling causal baseline

A rolling baseline uses only closed bars strictly before the event bar. For event bar `bar_t`:

```text
rangeBaseline = median(range(bar_t-N) ... range(bar_t-1))
volumeBaseline = median(volume(bar_t-N) ... volume(bar_t-1))
```

The current bar may be the numerator or observed value, but it must not be inserted into the denominator/reference set before the feature is calculated. A non-finite or zero denominator makes that feature unavailable; it must not cause division by zero or silent imputation.

Rolling medians and percentile buckets are relative activity descriptors. They are not direction authority.

### 2.5 Decision Traceability

The following twenty rows bind the session's adjudicated decisions to the contract sections and future verification surface. The rows record accepted semantics; numeric values explicitly marked `PROVISIONAL` remain non-authoritative.

| Decision ID | Adjudicated rule | Contract section | Future verification |
|---|---|---|---|
| `DISCOVERY-DECISION-001` | Fewer than 40 closed 5m bars rejects; 40-119 is left-censored; 120 or more is normal context. | 2, 12 | history-gate fixtures/tests |
| `DISCOVERY-DECISION-002` | V1 includes neutral price and activity/volume observations without direct direction authority. | 2, 5 | feature-boundary tests |
| `DISCOVERY-DECISION-003` | Relative activity uses rolling median/percentile rather than fixed absolute thresholds. | 2, 12 | rolling-reference fixtures |
| `DISCOVERY-DECISION-004` | V1 contains eight PA structure-event factors. | 4 | factor-catalog fixture matrix |
| `DISCOVERY-DECISION-005` | Five factors are core triggers and three are context enhancers. | 4, 5 | trigger-role tests |
| `DISCOVERY-DECISION-006` | Enhancers can improve compression/ranking but do not change core event identity or independently trigger PA. | 4, 6, 10 | enhancer-only rejection tests |
| `DISCOVERY-DECISION-007` | Compatible same-cutoff core hits merge into one Composite Candidate; incompatible observations split. | 6 | merge/split fixtures |
| `DISCOVERY-DECISION-008` | `primaryEventType` uses a fixed deterministic priority. | 7 | primary-priority tests |
| `DISCOVERY-DECISION-009` | `eventFingerprint` uses stable event fields including effective bar, not rank/score/context/downstream results. | 8 | canonical preimage tests |
| `DISCOVERY-DECISION-010` | `candidateId` binds event fingerprint, revision, and schema version. | 8 | revision identity tests |
| `DISCOVERY-DECISION-011` | TTL/cooldown use closed 5m bar counts, not wall-clock time. | 9 | lifecycle transition tests |
| `DISCOVERY-DECISION-012` | All core factors start with TTL 3 and cooldown 6 as provisional common defaults, subject to later explicit re-adjudication. | 9, 12 | provisional-parameter assertions |
| `DISCOVERY-DECISION-013` | Missing/unreliable volume does not reject a valid price Candidate but disables volume enhancers and is explicit. | 2, 11 | volume-unavailable fixtures |
| `DISCOVERY-DECISION-014` | V1 volume means same-source, same-instrument, same-timeframe total bar volume only. | 2 | provenance tests |
| `DISCOVERY-DECISION-015` | Rolling references exclude the current event bar and use only prior closed bars. | 2 | causal-prefix tests |
| `DISCOVERY-DECISION-016` | Anchors come from confirmed swing pivots and prior rolling-range references shared across factors. | 3 | anchor confirmation tests |
| `DISCOVERY-DECISION-017` | Structure relations trigger Candidates; activity/volume strength only enhances explanation and ranking. | 4, 5 | no-structure/no-candidate tests |
| `DISCOVERY-DECISION-018` | `eventFingerprint` identifies one bar; `dedupGroupKey` identifies a cross-bar structure thread; cooldown applies to the latter; escalation links predecessors. | 6, 8, 9 | cross-bar dedup/escalation tests |
| `DISCOVERY-DECISION-019` | Ranking uses a deterministic tuple and discrete buckets, not a numeric alpha score. | 10 | tuple/tie-break tests |
| `DISCOVERY-DECISION-020` | Missing data, unresolved anchors, same-bar ambiguity, unknown states, suppression, deferral, and expiry remain explicit and fail closed. | 11 | terminal-audit matrix |

## 3. Structure Anchors

V1 uses one shared deterministic anchor vocabulary:

```text
confirmed swing pivot
prior rolling range high
prior rolling range low
prior rolling range midpoint
canonical anchor group
magnet reference
```

A swing pivot becomes usable only after its required confirmation bars have themselves closed before the evaluation cutoff. An unconfirmed pivot is not a valid evidence anchor.

A prior rolling range uses only bars before the event cutoff. Its high, low, and midpoint must carry the reference window identity and the normalization/anchor rule version.

All factor detectors must reference shared `anchorId` values. A detector must not invent a private meaning for `prior high`, `support`, `resistance`, `magnet`, or `range`.

If an anchor cannot be uniquely selected, the observation is `ambiguous_anchor` and no dependent Candidate is emitted. A correction produces a new anchor or candidate revision; old records remain immutable.

## 4. Factor Catalog

### 4.1 Core trigger factors

A core factor may independently create a Candidate when its deterministic structure predicate is satisfied.

| Factor | Neutral observation boundary |
|---|---|
| `range_boundary_interaction` | A closed bar enters the versioned tolerance zone of a prior range boundary without being classified as a more specific breakout or failed-breakout lifecycle event. |
| `breakout_attempt` | A closed bar's observed high/low or close crosses a visible prior boundary. This records a boundary penetration attempt and does not claim breakout success. |
| `failed_breakout_candidate` | A previously observed boundary penetration is followed by a later closed observation that returns near or inside the prior structure. The factor cannot predict failure before the return is observed. |
| `pullback_to_structure` | After an observed movement away from a confirmed anchor, a later closed observation returns toward that anchor's tolerance zone. This does not claim continuation or reversal. |
| `magnet_proximity` | A closed observation enters the tolerance zone of a confirmed pivot or prior range reference that is explicitly classified as a magnet. This does not claim that price must reach, reject, or cross it. |

### 4.2 Context enhancers

Context enhancers normally enrich a core Candidate and do not independently create a PA call.

| Enhancer | Neutral observation boundary |
|---|---|
| `compression_expansion` | Relative range activity changes from a contracted reference state to an expanded state using prior closed-bar observations. Valid volume may add a separate volume descriptor. |
| `trend_leg_first_pullback` | A displacement leg away from a shared anchor is observed, followed by the first detected return toward structure. The label does not declare trend authority. |
| `trading_range_top_bottom_context` | The observation is located in the upper or lower region of a prior rolling range. The label does not imply fade, breakout, long, or short. |

A volume or activity observation without a core structure relationship is not sufficient to emit a Candidate.

## 5. Candidate Reason Boundary

Every emitted Candidate contains a neutral, descriptive, falsifiable reason. It describes what was observed and why the deterministic funnel admitted it. It is a pending claim for later PA review, not a fact, trade permission, or directional rationale.

Allowed fields include:

```text
primaryEventType
secondaryEventTypes
contextEnhancers
observedPolarity as an event-side label
reasonText
compressionBasis
evidenceRefs
contextState
volumeState
```

Forbidden factor-layer authority includes:

```text
long
short
buy
sell
entry
stop
target
trade-ready
high probability
confirmed setup
PA-approved
execution-worthy
profit expectation
```

`rank`, `score`, `priority`, `hotness`, and `rankBucket` explain scheduler admission only. They cannot be cited as PA evidence or trade-plan rationale.

## 6. Composite Candidate Rules

Multiple core hits are merged before identity hashes are computed when all of the following hold:

- same `instrumentId`;
- same evaluation cutoff bar;
- same event-side/polarity;
- overlapping anchors or the same `canonicalAnchorGroupId`;
- compatible structural premises.

The merged record contains one deterministic `primaryEventType`, remaining core hits as `secondaryEventTypes`, and context enhancers separately.

The record is split when any of the following holds:

- opposite event-side/polarity;
- disjoint anchor groups;
- different evaluation cutoffs;
- incompatible structural premises;
- an interpretation requires an unavailable intrabar order.

A compatible same-cutoff Composite does not create multiple PA calls. A later structural state transition is a new event observation, not a duplicate UI label.

## 7. Primary Event Priority

When multiple compatible core factors are present, the primary event is selected by this fixed order:

```text
1. failed_breakout_candidate
2. breakout_attempt
3. range_boundary_interaction
4. pullback_to_structure
5. magnet_proximity
```

The priority is a stable naming and scheduling rule. It is not a probability, confidence, directional verdict, or execution permission.

## 8. Identity, Fingerprint, Deduplication, And Revision

The contract separates four concepts:

```text
eventFingerprint
  = one concrete event observation at one effective bar

dedupGroupKey
  = one continuing structural thread across adjacent bars

candidateRevision
  = immutable version number for the event record

candidateId
  = immutable identity of one event revision
```

The future implementation must use typed canonical preimages rather than delimiter-joined strings.

Recommended V1 preimages are:

```ts
eventFingerprintPreimage = [
  "discovery-event-fingerprint-v1",
  instrumentId,
  primaryEventType,
  anchorIds,
  effectiveBarId,
  observedPolarity,
  normalizationVersion,
];

dedupGroupKeyPreimage = [
  "discovery-dedup-group-v1",
  instrumentId,
  canonicalAnchorGroupId,
  observedPolarity,
  eventFamily,
  normalizationVersion,
];

candidateIdPreimage = [
  "discovery-candidate-id-v1",
  eventFingerprint,
  candidateRevision,
  candidateSchemaVersion,
];
```

`eventFingerprint` includes `effectiveBarId` and therefore identifies a specific observation. `cooldown` applies to `dedupGroupKey`, not `eventFingerprint`; otherwise every later bar would create a different fingerprint and bypass cross-bar suppression.

A correction, anchor recalculation, normalization change, or governance-approved contract correction creates a new `candidateRevision` and `candidateId`. No accepted record is overwritten.

A semantic escalation such as:

```text
breakout_attempt -> failed_breakout_candidate
```

may create a new candidate in the same structural thread. It must link `predecessorEventFingerprint` and preserve the old record.

## 9. TTL And Cooldown

V1 uses closed five-minute bar counts, not wall-clock duration:

```text
ttlBars = 3
cooldownBars = 6
```

Both values are:

```text
PROVISIONAL_BOOTSTRAP_DEFAULT
NOT APPROVED NUMERIC AUTHORITY
```

Semantics:

- TTL begins at the candidate's effective closed bar and expires after the configured number of closed bars;
- an expired Candidate cannot be newly admitted to PA;
- cooldown suppresses ordinary repeated emissions for the same `dedupGroupKey`;
- semantic escalation with an explicit predecessor link may supersede ordinary duplicate suppression;
- all expiry and suppression decisions are audited;
- all core trigger factors share 3/6 in V1;
- future event-type-specific values require a new version and an explicit acceptance record.

A future authorized offline validation may review TTL and cooldown using operational evidence such as expiry-before-admission, queue latency, queue depth, duplicate rate, and suppression rate. Automatic tuning is forbidden.

## 10. Deterministic Priority And Compression

V1 does not produce a weighted numeric alpha score. It produces a deterministic scheduler tuple and neutral compression reasons.

Recommended tuple order:

```ts
priorityTuple = [
  eligibilityClass,
  eventStagePriority,
  ttlUrgencyBucket,
  structuralSpecificity,
  contextSupportBucket,
  activityBucket,
  queueAge,
  candidateId,
];
```

The tuple is compared lexicographically. The final `candidateId` tie-breaker makes equal observations stable across deterministic runs.

Recommended semantics:

- invalid or stale inputs never enter the tuple;
- semantic escalation precedes ordinary repeated observation;
- shorter remaining TTL is more urgent;
- primary event specificity follows the fixed event priority;
- context support uses discrete buckets, not a freely additive score;
- activity uses `expanded`, `typical`, `contracted`, or `unavailable` descriptors;
- queue age prevents permanent starvation;
- budget compression records a reason instead of silently dropping a Candidate.

The PA Agent must not receive numeric priority, full-market rank, or priority weights as semantic evidence.

## 11. Fail-Closed, Ambiguity, And Audit Results

The factor evaluator must emit an explicit terminal evaluation result:

```text
candidate_emitted
no_trigger
no_applicable_anchor
suppressed_cooldown
deferred_budget
expired_before_admission
rejected_data_quality
rejected_ambiguity
```

Required fail-closed cases:

| Condition | Required result |
|---|---|
| open/provisional bar | do not evaluate as an event bar |
| invalid, missing, unordered, or conflicting OHLC | `rejected_data_quality` |
| fewer than 40 closed bars | `insufficient_history` under data rejection audit |
| no confirmed anchor | `no_applicable_anchor` |
| competing valid anchors cannot be selected | `rejected_ambiguity` with `ambiguous_anchor` |
| opposite or incompatible same-bar structural premises | `rejected_ambiguity` with `same_bar_ambiguity` |
| unavailable volume | continue price evaluation; mark `volumeState=unavailable` |
| non-finite or zero activity denominator | affected activity field unavailable; no imputation |
| duplicate structural thread inside cooldown | `suppressed_cooldown` |
| TTL passed before PA admission | `expired_before_admission` |
| PA budget unavailable | `deferred_budget`, then later expiry if TTL passes |
| source or anchor correction | new revision, immutable predecessor link |
| unknown schema or unrecognized state | terminal reject |

Every result must bind at least:

```text
contractVersion
normalizationVersion
cutoffBarId
inputHash
anchor references
factor observations
candidate identity when emitted
reasonCode
audit timestamp/sequence
```

An audit result is not a trade result and does not contain profitability authority.

## 12. Provisional Parameter Register

The following values are conservative suggestions only. They are not approved implementation defaults until an exact future contract acceptance record says so.

| Parameter | Suggested initial value | Status | Re-adjudication trigger |
|---|---:|---|---|
| primary bar duration | 300 seconds | ACCEPTED SEMANTICS | separate timeframe proposal only |
| hard minimum history | 40 closed bars | ACCEPTED SEMANTICS | explicit contract revision |
| left-censored range | 40-119 closed bars | ACCEPTED SEMANTICS | explicit contract revision |
| standard visible context | 120 closed bars | ACCEPTED SEMANTICS | explicit capability revision |
| short rolling baseline | 20 prior closed bars | PROVISIONAL | first contract validation |
| context rolling baseline | 40 prior closed bars | PROVISIONAL | first contract validation |
| full context reference | 120 prior closed bars | PROVISIONAL | first contract validation |
| pivot confirmation width | 2 bars left / 2 bars right | PROVISIONAL | synthetic edge-case review |
| prior range lookback | 20 prior closed bars | PROVISIONAL | synthetic edge-case review |
| boundary tolerance | 0.5 x prior 20-bar median range | PROVISIONAL | geometry review |
| price-move lookback | 3 prior closed bars | PROVISIONAL | factor fixture review |
| activity percentile buckets | below p25 / p25-p75 / above p75 | PROVISIONAL | distribution review without outcome selection |
| close-location buckets | lower third / middle third / upper third | PROVISIONAL | geometry review |
| TTL | 3 closed bars | PROVISIONAL BOOTSTRAP | first authorized replay/offline validation |
| cooldown | 6 closed bars | PROVISIONAL BOOTSTRAP | first authorized replay/offline validation |
| same-cutoff composite merge | exact same cutoff only | ACCEPTED SEMANTICS | explicit merge-contract revision |
| per-instrument in-flight cap | 1 | PROVISIONAL | scheduler contract review |

No provisional value may be described as approved, production-ready, profitable, or outcome-validated.

## 13. Future TypeScript Contract Scope

This draft defines the future contract surface but does not implement it. A separately authorized Slice 1 implementation may add only the following contract files:

```text
packages/contracts/src/discovery-factor-v1.ts
packages/contracts/test/discovery-factor-v1.test.ts
packages/contracts/src/index.ts          # export-only change, if authorized
```

The future pure contract must cover:

- closed-bar and history-gate input;
- source/instrument/timeframe identity;
- volume quality and causal rolling references;
- anchor and anchor-group records;
- factor observation records;
- neutral Candidate reason;
- Composite Candidate;
- event fingerprint and dedup group preimages;
- candidate revision and immutable candidate ID;
- TTL/cooldown state;
- deterministic priority tuple and compression reason;
- terminal audit result;
- strict validation, deep freezing, and content hashes.

The actual eight-factor detector, market-data adapter, scheduler service, PA call gate, API route, persistence, UI, replay, provider, and execution code are outside Slice 1.

## 14. Future Synthetic Fixture Scope

Fixtures must be invented, local, and content-hashed only for contract tests. Required fixture families are:

- 39, 40, 119, and 120 closed-bar history cases;
- left-censored versus normal context;
- current event bar excluded from rolling baseline;
- valid same-source total volume;
- missing, invalid, and unavailable volume;
- zero and non-finite rolling denominator;
- confirmed and unconfirmed pivots;
- prior rolling range anchors and magnet anchors;
- one fixture for each core trigger;
- one fixture for each context enhancer attached to a core event;
- compatible same-cutoff Composite;
- opposite polarity and disjoint-anchor split;
- primary event priority ties;
- eventFingerprint versus dedupGroupKey across bars;
- candidate revision and predecessor linkage;
- ordinary cooldown suppression;
- semantic escalation bypass with explicit predecessor;
- TTL expiry and budget deferral;
- deterministic priority tuple ties;
- same-bar ambiguity;
- data-quality rejection and audit reason completeness.

Fixtures must not contain real market rows, provider output, replay output, account data, outcome/PnL artifacts, or protected-window material.

## 15. Future Contract Test Scope

Future tests must prove contract behavior only:

- strict schema and enum validation;
- canonical preimage and hash stability;
- immutable record/tamper detection;
- closed-candle and causal-prefix invariance;
- history gate and left-censoring;
- rolling baseline exclusion of current event bar;
- same-source volume semantics and explicit unavailability;
- shared anchor identity;
- core/enhancer trigger role separation;
- Composite merge/split determinism;
- primary event priority determinism;
- fingerprint/dedup/revision relationships;
- TTL and cooldown state transitions;
- priority tuple and deterministic tie-break;
- same-bar ambiguity and unknown-state fail-closed behavior;
- complete audit outcomes;
- absence of directional, execution, provider, or outcome authority in the factor contract.

No test may claim profitability, predictive accuracy, PA semantic competence, provider quality, or replay correctness.

## 16. Compatibility And Conflict Review

### Hybrid baseline

Compatible. The factor layer owns discovery, ranking, compression reasons, TTL/cooldown inputs, and scheduler inputs. It does not own final direction, entry, protection, objective, risk, execution, accounting, or promotion authority.

### Monitoring frontend plan

Compatible. Discovery Phase 0A is explicitly before the Candidate Stream UI. The frontend consumes candidate identity, TTL/stale state, neutral reasons, validator state, and later Risk/Execution/API records. This contract does not modify the frontend plan.

### ADR-0008 and closed-bar scheduling

Compatible only with an explicit boundary. This draft defines Candidate discovery, not an accepted replacement for `continuous_every_close`. An eventual factor-driven call filter would be a separate scheduling research candidate and must be compared against the accepted baseline before it can gate model calls.

### ADR-0009

Compatible. The primary V1 decision timeframe remains five-minute closed bars. This draft does not authorize a new timeframe or timeframe voting.

### ADR-0010 and ADR-0011

Compatible. Factor reasons remain neutral and pending PA review. Local discovery identity and raw local features must be separated from the future anonymous provider payload. The factor layer emits no Brooks decision and no provider attempt.

### ADR-0014

Compatible. No replay engine, dataset authorization, replay request, post-cutoff data, or replay result is created by this draft. Any future validation of TTL/cooldown requires separate replay/validation authority and cannot use outcome-led selection.

### ADR-0023 and ADR-0024

Compatible. This draft does not change Brooks semantic coverage, Doctrine, multi-timeframe capability, scaling, active-position management, intrabar handling, or provider-evaluation sequencing.

### Accepted immutable artifacts

No accepted immutable artifact is modified, activated, rolled back, or rehashed by this draft package.

## 17. Open Decisions For Calvin

The following are intentionally recorded rather than silently resolved:

- acceptance of the provisional numeric parameter register;
- exact `observedPolarity` enum names and whether `ambiguous` is audit-only;
- exact pivot confirmation and canonical anchor-group algorithm;
- exact boundary tolerance and percentile implementation;
- exact pullback displacement and first-pullback mechanical predicate;
- exact magnet classification list;
- exact scheduler budget, fairness, and in-flight limits;
- whether a future factor candidate stream gates PA calls or remains an observability/research layer under ADR-0008;
- authorization and design scope for the first future offline validation of TTL/cooldown.

None of these open decisions authorizes runtime changes. A future decision must bind the exact affected contract version and content hash.

## 18. Draft Acceptance Boundary

This document becomes implementation-relevant only after Calvin separately accepts:

- this exact draft content or a versioned replacement;
- the provisional parameter register or a revised parameter register;
- the exact Slice 1 task-card scope;
- the future TypeScript schema and test implementation authorization.

Until then, this is a DRAFT CONTRACT PACKAGE, not an authority record.
