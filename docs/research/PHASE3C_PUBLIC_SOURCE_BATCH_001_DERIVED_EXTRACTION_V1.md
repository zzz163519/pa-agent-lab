# Phase 3C Public Source Batch 001 Derived Extraction Report V1

Status: DRAFT DERIVED EXTRACTION EVIDENCE ONLY. NOT A DOCTRINE PROPOSAL, DOCTRINE APPROVAL, COVERAGE-COMPLETION ACCEPTANCE, CORPUS INPUT, OR RUNTIME AUTHORITY.

Authorization: `PHASE3C_PUBLIC_SOURCE_BATCH_001_ACCESS_AUTHORIZATION_V1.json`

Authorization record hash: `sha256:90f9d63674df8acf70b3250ecbf14a6f899ec5b639ba6c6e42be754c71b6f77b`

Governing Phase 3C contract hash: `sha256:5aedc6ad98c74b09f2703e3b6e1d58042ea513d409c62815449f075fd933f0a6`

Fetch window: 2026-08-05T17:11:48+08:00 through 2026-08-05T17:12:03+08:00.

## 1. Scope and method

Direct Pi used the agent-reach web platform with the Jina Reader backend to read each of the four exact authorized public Ask Al URLs once. No link, pagination page, related article, image, audio, video, attachment, login surface, or additional URL was fetched. Fetched representations existed only in a restrictive `/tmp` directory for review and were deleted after this report and the execution record were completed.

The report retains only public Source identity metadata, representation hashes, precise heading/question locators, simplified derived semantics, and explicit gaps. It retains no complete page body and no verbatim teaching excerpt. Page titles and section headings appear only as source identity or locator metadata.

The four pages identify Al Brooks as the speaker/author and are official public Ask Al Q&A transcript pages. Publisher copyright remains retained. This batch grants no redistribution right and no full-text retention.

## 2. Exact fetched Source identities

| Source ID | Exact URL | Public page identity | Published time reported by reader | Fetched bytes | Fetched representation SHA-256 | Availability and retention status |
|---|---|---|---|---:|---|---|
| `source:ask-al-always-in-major-trend-reversal-analysis-2016-07-31` | `https://www.brookstradingcourse.com/ask-al/always-in-major-trend-reversal-analysis/` | `Always In and Major Trend Reversal Market Analysis`; BPA trading-room Q&A dated 2015-11-06; signed Al Brooks | `2016-07-31T01:00:23-07:00` | 3868 | `sha256:4400276c03d0452e074866b35827578313fc69c0f8fbbfdbe1e3a5a8bb48a949` | public official transcript page; publisher copyright retained; derived notes only |
| `source:ask-al-trading-buying-selling-pressure-2016-10-02` | `https://www.brookstradingcourse.com/ask-al/trading-buying-selling-pressure/` | `Ask Al: Buying and selling pressure`; BPA trading-room Q&A dated 2016-06-09; signed Al Brooks | `2016-10-02T01:35:59-07:00` | 5687 | `sha256:eb5c972e9d822e85dd74a67bd81f81044b00f612e5eb3b9431e28a8080d8eb26` | public official transcript page; publisher copyright retained; derived notes only |
| `source:ask-al-structuring-limit-stop-order-trades-2017-01-08` | `https://www.brookstradingcourse.com/ask-al/structuring-limit-stop-order-trades/` | `Ask Al: Structuring limit and stop order trades`; BPA trading-room Q&A dated 2016-01-27; signed Al Brooks | `2017-01-08T00:12:50-08:00` | 3665 | `sha256:8b2f3ed02fc02403a7575585e45f1d70fe50d1d294b48390ceb718c84bfb913e` | public official transcript page; publisher copyright retained; derived notes only |
| `source:ask-al-missing-swing-trades-measured-moves-spikes-2016-12-11` | `https://www.brookstradingcourse.com/ask-al/missing-swing-trades-measured-moves-spikes/` | `Ask Al: Missing swing trades, measured moves, trading spikes`; BPA trading-room Q&A dated 2016-04-05; signed Al Brooks | `2016-12-11T08:06:39-08:00` | 8760 | `sha256:0a6da7bb477f82e2aa6fadfdbeeab996a22c0e2bc3ec9804004cefa1d0afe685` | public official transcript page; publisher copyright retained; derived notes only |

The hashes identify the reader representations observed in this batch. They do not claim that the publisher's future bytes are immutable. A later content change requires a new Source identity and authorization decision.

## 3. Derived semantic findings

Every item below is a review candidate, not approved Doctrine. `Candidate` means it may be shaped into an exact later proposal only after separate proposal-batch authorization. `Gap preserved` means this batch did not close the obligation.

### B001-F01 — Major versus minor reversal is contextual

- Source: `source:ask-al-always-in-major-trend-reversal-analysis-2016-07-31`
- Locator: H2 `Always In and Major Trend Reversal trading setups` > H3 `Major trend reversals`; H3 `Minor trend reversals`.
- Derived semantic: A reversal label depends on the prior trend, the strength and persistence of the opposing move, and the broader directional context. A local opposing breakout or higher/lower-low structure does not automatically establish a major reversal.
- Positive/applicability path: classify a reversal as stronger only when the broader context and the developing opposite move support more than a minor interruption.
- Limitation/counterexample: a short-lived prior trend followed by an opposing breakout and higher/lower-low formation can remain a minor reversal.
- Uncertainty boundary: if the visible prefix does not show enough preceding context to distinguish interruption from major transition, preserve uncertainty rather than promote the label.
- Maps to: C05, C06, C13; I01, I03.
- Disposition: `Candidate`.

### B001-F02 — Look left before converting channel continuation into reversal

- Source: `source:ask-al-always-in-major-trend-reversal-analysis-2016-07-31`
- Locator: H2 `Always In and Major Trend Reversal trading setups` > H3 `Look further to left for broad channels`.
- Derived semantic: A lower-high or higher-low formation can be part of an ongoing broad channel rather than a major trend reversal. The visible broader channel context must be assessed before assigning a reversal role to the local structure.
- Positive/applicability path: use sufficient left context to distinguish continuation inside a broad channel from an actual transition.
- Limitation/counterexample: the presence of a lower high alone does not prove a bear major reversal, and the mirrored higher-low case alone does not prove a bull major reversal.
- Resolution path: additional closed-bar context that establishes channel continuation or a sustained opposite transition.
- Maps to: C04, C05, C09, C10, C13; I01, I03.
- Disposition: `Candidate`.

### B001-F03 — Always-In assessment can persist through weak opposing signals

- Source: `source:ask-al-always-in-major-trend-reversal-analysis-2016-07-31`
- Locator: H2 `Always In and Major Trend Reversal trading setups` > H3 `Always In trading`.
- Derived semantic: Weak opposing signals do not automatically reverse the Always-In assessment. Structural context and the quality of later evidence determine whether the state persists, exits, or hands off.
- Permission/actionable path: an Always-In state can support a directional case only when the separate setup, signal, trigger, and plan obligations also hold.
- Limitation/counterexample: range context or a material opposing structure can end the prior directional premise without immediately proving a new opposite actionable case.
- Maps to: C07, C14, C15, C17, C19; I01, I05, I07.
- Disposition: `Candidate with narrow source scope`; the page is a chart-specific illustration and cannot by itself define a universal Always-In algorithm.

### B001-F04 — Buying/selling pressure requires bilateral participant reasoning

- Source: `source:ask-al-trading-buying-selling-pressure-2016-10-02`
- Locator: H2 `Buying and selling pressure areas` > H3 `Trading logic`; H3 `Creative trading — Use your imagination`.
- Derived semantic: Pressure assessment should consider what bulls and bears, and both swing and scalp participants, are likely to do rather than reason from one favored direction only. The assessment remains comparative and objective.
- Positive/applicability path: build explicit long and short cases from visible evidence and compare them before permission.
- Limitation/counterexample: recognizing pressure or participant interest on one side does not by itself create an actionable case.
- Maps to: C08, C17, C18, C19; I04, I06, I07.
- Disposition: `Candidate`.

### B001-F05 — Support/resistance confluence and context affect pressure relevance

- Source: `source:ask-al-trading-buying-selling-pressure-2016-10-02`
- Locator: H2 `Buying and selling pressure areas` > H3 `Computer algos`.
- Derived semantic: Buying/selling interest around a price area becomes more decision-relevant when visible support/resistance factors align with the surrounding context. Location and pressure remain separate assessments.
- Positive/applicability path: identify visible structure, assess whether several visible factors reinforce its role, and then evaluate each directional case.
- Limitation/counterexample: a support/resistance location can be relevant while the evidence remains balanced, insufficient, or unfavorable for a new trade.
- Maps to: C08, C09, C10, C11, C18; I02, I04, I06.
- Disposition: `Candidate limited to the accepted single-timeframe visible prefix`.
- Scope gap: the page explicitly invokes higher timeframes. Multi-timeframe evidence is not available to V1 and remains `future_version_candidate`; it cannot be implied from the five-minute input.

### B001-F06 — Reward, protection, and remaining objective must be considered together

- Source: `source:ask-al-trading-buying-selling-pressure-2016-10-02`
- Locator: H2 `Buying and selling pressure areas` > H3 `Probability, risk and reward`.
- Derived semantic: Favorable location or apparent directional pressure does not remove the need to compare protection distance with the remaining structural objective. A case can have attractive location but weak permission because the trade plan is incomplete or poorly balanced.
- Limitation: V1 does not retain the page's numerical probability claims, expected outcomes, options example, active-position state, or PnL language. No numeric confidence or probability field may be derived.
- Maps to: C19, C23, C24, C25, C26; I04, I09, I10.
- Disposition: `Candidate after removing V1-excluded probability/outcome content`.

### B001-F07 — Entry order type alone does not grant permission

- Source: `source:ask-al-structuring-limit-stop-order-trades-2017-01-08`
- Locator: H2 `Limit and stop order trades probability?` > H3 `General rule for probability`; H3 `Structure and manage your trade`.
- Derived semantic: Stop versus limit entry type does not by itself determine whether a trade is permitted. Either direction and entry type still requires a complete contextual premise, protection, and objective.
- Positive/applicability path: choose an entry type only after the directional case and trade structure are established.
- Limitation/counterexample: an available stop or limit relation is not a substitute for setup, signal, location, or complete plan evidence.
- Maps to: C19, C20, C23, C25; I05, I08, I09.
- Disposition: `Candidate after removing numerical probability and profitability language`.

### B001-F08 — Scaling and active management are outside current V1

- Source: `source:ask-al-structuring-limit-stop-order-trades-2017-01-08`
- Locator: H2 `Limit and stop order trades probability?` > H3 `Using wide stop, scaling in`; H3 `Structure and manage your trade`.
- Derived disposition: The page links some limit-order structures with wide protection and scaling. Current V1 has no position size, scale-in, fill, active-position, or ongoing trade-management input. These mechanics cannot be represented as current V1 Doctrine authority.
- Maps to: Scope and Gap Ledger.
- Disposition: `future_version_candidate` for any later active-position/execution policy; not a Phase 3C Doctrine candidate.

### B001-F09 — Poor location can support a complete no-trade judgment

- Source: `source:ask-al-missing-swing-trades-measured-moves-spikes-2016-12-11`
- Locator: H2 `Missing swing trades` > Question 1 > H3 `Big up, big down`; H3 `Logical not to sell`.
- Derived semantic: Declining a swing can be a valid decision when entry location is poor, the opposing structure remains material, required protection is large relative to the visible objective, and the broader context does not strongly support the direction.
- Positive no-trade path: evidence can be sufficient to conclude that the current trade structure is unattractive without classifying the market assessment itself as unknown.
- Limitation/counterexample: a tight directional channel can still support a directional premise, but the premise is not automatically actionable when location and trade structure are weak.
- Resolution path: a better location, stronger continuation evidence, or a new structure that improves the complete plan.
- Maps to: C10, C18, C19, C23, C25, C26; I04, I07, I08, I10.
- Disposition: `Candidate`.

### B001-F10 — Measured-move relevance differs between range and strong-trend context

- Source: `source:ask-al-missing-swing-trades-measured-moves-spikes-2016-12-11`
- Locator: H2 `Missing swing trades` > Question 2 > H3 `Never too late to enter swing trade`; H3 `Trading range days`.
- Derived semantic: A potential measuring gap or measured-move structure is contextual. In a trading range, apparent gaps and breakouts are more vulnerable to closing or failing; in a strong trend, an established breakout can support a further measured objective.
- Positive/applicability path: identify the structure and assess broad state and breakout follow-through before assigning it objective relevance.
- Limitation/counterexample: the presence of a gap or projected measured structure alone does not prove continuation or justify a late entry.
- Uncertainty boundary: if range-versus-trend state or follow-through remains unresolved, the measured objective remains provisional or non-primary.
- Maps to: C04, C09, C10, C11, C12, C20, C25; I02, I07, I09.
- Disposition: `Candidate`.

### B001-F11 — Range breakouts remain provisional until strength changes the premise

- Source: `source:ask-al-missing-swing-trades-measured-moves-spikes-2016-12-11`
- Locator: H2 `Missing swing trades` > Question 2 > H3 `Trading range days`.
- Derived semantic: In a trading-range context, a breakout can remain a scalp or failure candidate until follow-through establishes a stronger trend premise. A breakout event is not automatically a swing permission.
- Positive/applicability path: stronger continuation evidence can change the lifecycle and holding premise.
- Limitation/counterexample: an isolated large breakout in a range does not by itself prove a sustained trend.
- Maps to: C04, C12, C19, C20, C24, C26; I02, I05, I07, I09.
- Disposition: `Candidate`.

### B001-F12 — Intrabar spike handling does not close `market_next_event`

- Source: `source:ask-al-missing-swing-trades-measured-moves-spikes-2016-12-11`
- Locator: H2 `Missing swing trades` > Question 3 > H3 `Immediately get in on spikes`; H3 `Limit orders`.
- Derived disposition: The source discusses immediate decisions during spikes, changing to a one-minute chart, active management, scaling, and repeated entries. Those inputs and actions are not available in the current anonymous five-minute closed-bar V1 policy input.
- V1 effect: this page may later inform a separate future event-entry research candidate, but it does not establish a causally valid five-minute `market_next_event` Doctrine rule.
- Current V2 effect: remains `profile_unsupported_fail_closed`.
- Maps to: C16, C20; Scope and Gap Ledger.
- Disposition: `Gap preserved`; future-version candidate for separately contracted intrabar/watcher behavior.

## 4. Batch-level coverage effects

No capability becomes `covered` from this report because no finding is an approved DoctrineUnit and no complete positive/counterexample/permission/uncertainty set has passed the Phase 3B approval chain.

| Coverage area | Batch result |
|---|---|
| Always-In / broad trend / reversal distinction | useful candidate evidence found; chart-specific scope and mirror review still required |
| Buying/selling pressure and bilateral cases | useful candidate evidence found; multi-timeframe passages excluded from V1 |
| Stop versus limit entry premise | limited candidate evidence found that order type alone is insufficient |
| Entry cancellation and premise invalidation | intended coverage not closed; no sufficiently general source-grounded condition rule extracted |
| Protection | qualitative interaction with entry/location found; scaling and active management excluded; precise V1 protection selection remains incomplete |
| Swing / measured move / objective | useful contextual candidate and counterexample evidence found |
| No-trade versus uncertainty | useful explicit no-trade candidate found for poor location and weak complete structure; broader uncertainty examples remain required |
| `market_next_event` | not closed; source relies on intrabar and one-minute behavior outside V1 input and current V2 profile |
| Numeric probability/confidence | explicitly excluded from V1 despite repeated Source discussion |
| Active position, scaling, fills, trade management, and outcomes | explicitly excluded or future-version candidates; no runtime authority |

## 5. Candidate proposal groups for a later separate authorization

A later proposal-batch decision may select, reshape, split, or reject these groups:

1. `candidate-group:contextual-reversal-v1` — B001-F01 and B001-F02;
2. `candidate-group:always-in-opposing-signal-v1` — B001-F03;
3. `candidate-group:bilateral-pressure-and-location-v1` — B001-F04 and B001-F05;
4. `candidate-group:trade-plan-balance-v1` — B001-F06 and B001-F09;
5. `candidate-group:entry-type-not-permission-v1` — B001-F07;
6. `candidate-group:measured-move-context-v1` — B001-F10;
7. `candidate-group:range-breakout-provisional-v1` — B001-F11.

B001-F08 and B001-F12 are gap/scope records, not Doctrine proposal candidates.

No candidate group is approved, inserted, retrievable, or usable by a model. Exact DoctrineUnit wording, fields, proposal hashes, and item-level decisions require a separate authorization.

## 6. Explicit residual gaps and next decision

The first batch does not close:

- all 27 capabilities or 11 interaction families;
- complete long/short mirror evidence;
- `market_next_event` five-minute closed-bar semantics;
- general entry-cancellation and premise-invalidation conditions;
- protection selection independent of excluded scaling mechanics;
- all setup/signal/trigger state boundaries;
- all 13 no-trade and 8 uncertainty reason codes;
- complete positive, counterexample, permission/abstention, uncertainty, and resolution paths;
- any Phase 3C coverage-completion condition.

The next governance decision is whether to authorize an exact Doctrine proposal batch from selected candidate groups or to authorize another bounded Source batch for the highest-priority gaps. Neither action is authorized by this report.
