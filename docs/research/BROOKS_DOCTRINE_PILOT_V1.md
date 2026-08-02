# Brooks Doctrine Pilot V1

Status: `draft` for every unit. This is a Phase 1 public-source preflight artifact, not a complete corpus, not a RAG index, and not runtime authority.

## Review rules

- Every unit includes an explicit `doctrineId`, a primary `sourceId`, and a `sourceMapping` list. `sourceMapping` is preflight provenance metadata and is not an addition to the runtime `DoctrineUnitV1` shape.
- `status` remains `draft` until manual source mapping and wording review. No unit is converted to `approved` here.
- The unit text is a bounded derived formulation, not a transcript reproduction. Full transcript text is not committed.
- The V6 layer and stale-trend columns are planning metadata only. They are not provenance and must not be copied into Brooks doctrine.
- Numeric claims, execution mechanics, sizing, and outcome claims are excluded from this pilot unless needed to identify a source boundary. V1 `BrooksDecision` still owns the structured decision contract.

## Six-aspect coverage model used for pilot selection

This preflight uses the public six-aspects article as a **coverage prompt**, not as a replacement for source mapping. The pilot checks whether the current `DoctrineUnitV1` fields can express:

1. chart/price-action representation and causal observation;
2. magnets, support and resistance, and location;
3. market state/context: trend versus trading range;
4. buying/selling pressure and inertia;
5. risk/reward, entry/protection, and trade management;
6. setup/signal/trigger and reversal/breakout lifecycle.

The article itself discusses additional structures and is not treated as a literal six-field doctrine schema.

## Ten-pattern pilot set

The public ten-pattern article names these pattern families. Only the families needed to exercise structural contract boundaries are represented below; this is not a claim that all ten are covered.

- major trend reversal;
- final flag;
- breakout;
- High 2 / Low 2 bull/bear flag;
- wedge;
- trading-range reversal;
- magnets/support/resistance.

Deferred for a later pilot expansion: channels, measured moves, and opening reversals. They remain coverage gaps, not rejected doctrine.

## Draft DoctrineUnits

### `du:pilot:context-over-candle-pattern`

- `doctrineId`: `du:pilot:context-over-candle-pattern`
- `sourceId`: `source:btc-six-aspects-v1`
- `sourceMapping`: `source:btc-six-aspects-v1` — article sections “If not candlesticks or indicators, then what is price action?” and “Market inertia”
- `concept`: `context_over_candle_pattern`
- `rule`: Context and market state are more important than treating a candle pattern in isolation.
- `appliesWhen`: `A candidate setup is being interpreted`; `the same local bar can occur in trend or trading-range context`
- `avoidWhen`: `A single candle is used as sufficient permission`; `the surrounding market state is unknown`
- `decisionEffect`: `Require context evidence before treating a local pattern as actionable`; `allow no_trade or uncertain when context cannot be established`
- `status`: `draft`
- `sourceLocator`: `article sections “If not candlesticks or indicators, then what is price action?” and “Market inertia”`
- `v6CoverageChecklist`: `Broad Context; Local Pattern; Trade Permission`
- `staleTrendPriority`: `P0 — prevent stale local-pattern interpretation from overriding broad context`

### `du:pilot:magnets-are-location`

- `doctrineId`: `du:pilot:magnets-are-location`
- `sourceId`: `source:btc-six-aspects-v1`
- `sourceMapping`: `source:btc-six-aspects-v1` — article sections “Every tick matters”, “Examples of support and resistance”, and “Markets constantly test”
- `concept`: `support_resistance_as_magnets`
- `rule`: Support, resistance, prior highs/lows, channels, trend lines, and measured projections can act as magnets and locations where market behavior is evaluated.
- `appliesWhen`: `The decision identifies an objective or reversal/breakout location`; `a visible structure can be referenced`
- `avoidWhen`: `The level is not visible in the causal prefix`; `a magnet is used to assume an intrabar path or guaranteed reaction`
- `decisionEffect`: `Bind location and objective claims to visible structures`; `do not treat a magnet alone as trade permission`
- `status`: `draft`
- `sourceLocator`: `article sections “Every tick matters”, “Examples of support and resistance”, and “Markets constantly test”`
- `v6CoverageChecklist`: `Location/Magnet; Objective`
- `staleTrendPriority`: `P1 — distinguish valid location from stale target or unsupported reversal expectation`

### `du:pilot:trend-and-range-have-different-defaults`

- `doctrineId`: `du:pilot:trend-and-range-have-different-defaults`
- `sourceId`: `source:btc-six-aspects-v1`
- `sourceMapping`: `source:btc-six-aspects-v1` — article section “Market inertia”; `source:btc-ten-patterns-v1` — section “Trading range reversals”
- `concept`: `trend_vs_trading_range_context`
- `rule`: A trend tends to persist, while a trading range resists change; the same breakout or reversal attempt has different meaning in the two contexts.
- `appliesWhen`: `Classifying broad market state`; `assessing whether a local reversal or breakout is likely to continue`
- `avoidWhen`: `State is inferred from one bar only`; `trend/range evidence conflicts or is incomplete`
- `decisionEffect`: `Keep broad context separate from local setup and pressure`; `require explicit uncertainty or no_trade when state cannot be distinguished`
- `status`: `draft`
- `sourceLocator`: `article section “Market inertia” and ten-pattern article section “Trading range reversals”`
- `v6CoverageChecklist`: `Broad Context; Breakout Lifecycle; Reversal Lifecycle`
- `staleTrendPriority`: `P0 — directly addresses stale-trend and false regime-transition risk`

### `du:pilot:breakout-needs-context-and-follow-through`

- `doctrineId`: `du:pilot:breakout-needs-context-and-follow-through`
- `sourceId`: `source:ask-al-breakouts-2016-09-25`
- `sourceMapping`: `source:ask-al-breakouts-2016-09-25` — sections “Always review context”, “Look for trend resumption or reversal”, and “Limit order bars”
- `concept`: `breakout_context_and_follow_through`
- `rule`: Breakout interpretation depends on context and subsequent market behavior; a breakout attempt is not automatically a durable new trend.
- `appliesWhen`: `A visible bar breaks a support/resistance structure`; `the decision distinguishes trend resumption from reversal or range behavior`
- `avoidWhen`: `Only the breakout bar is visible`; `the relevant prior structure or follow-through is missing`
- `decisionEffect`: `Separate breakout attempt from confirmed lifecycle state`; `do not backfill confirmation into the decision bar`
- `status`: `draft`
- `sourceLocator`: `sections “Always review context”, “Look for trend resumption or reversal”, and “Limit order bars”`
- `v6CoverageChecklist`: `Breakout Lifecycle; Setup; Signal; Trigger`
- `staleTrendPriority`: `P0 — prioritize confirmation versus stale breakout assumptions`

### `du:pilot:signal-is-not-setup`

- `doctrineId`: `du:pilot:signal-is-not-setup`
- `sourceId`: `source:btc-professional-pa-trader-v1`
- `sourceMapping`: `source:btc-professional-pa-trader-v1` — section “Signals vs. Setups”; `source:btc-six-aspects-v1` — support/resistance examples
- `concept`: `setup_signal_trigger_separation`
- `rule`: A setup, signal bar, trigger, and later execution event are distinct observations; a local pattern does not itself establish the exact entry event.
- `appliesWhen`: `A directional case references a setup and entry`; `the visible prefix ends before a new trigger can be observed`
- `avoidWhen`: `The proposed entry claims to have triggered inside the last visible bar`; `signal and trigger are conflated`
- `decisionEffect`: `Keep setup/signal/trigger fields separate`; `new plans remain pending at the causal cutoff`
- `status`: `draft`
- `sourceLocator`: `support/resistance examples in the public six-aspects article, plus the public professional-trader article’s “Signals vs. Setups” section`
- `v6CoverageChecklist`: `Setup; Signal; Trigger; Trade Permission`
- `staleTrendPriority`: `P0 — prevents retroactive entry and stale trigger resurrection`

### `du:pilot:pullback-depth-follows-market-character`

- `doctrineId`: `du:pilot:pullback-depth-follows-market-character`
- `sourceId`: `source:ask-al-pullbacks-entering-2016-05-01`
- `sourceMapping`: `source:ask-al-pullbacks-entering-2016-05-01` — sections “When to enter pullbacks” and “Strong breakouts”
- `concept`: `pullback_depth_depends_on_market_character`
- `rule`: Strong trends tend to have smaller pullbacks; weaker or more two-sided conditions make deeper pullbacks more plausible.
- `appliesWhen`: `Choosing whether a pullback entry premise is coherent`; `trend strength and two-sidedness are evidenced`
- `avoidWhen`: `Trend character is uncertain`; `a preferred pullback depth is treated as a fixed universal rule`
- `decisionEffect`: `Use market character as context for setup and entry assessment`; `keep the premise conditional rather than hard-coding a depth threshold`
- `status`: `draft`
- `sourceLocator`: `sections “When to enter pullbacks” and “Strong breakouts”`
- `v6CoverageChecklist`: `Broad Context; Current Leg; Setup; Entry`
- `staleTrendPriority`: `P1 — counter over-compressed trend/pullback assumptions`

### `du:pilot:range-breakouts-can-fail`

- `doctrineId`: `du:pilot:range-breakouts-can-fail`
- `sourceId`: `source:ask-al-trading-range-breakout-failures-2015-12-27`
- `sourceMapping`: `source:ask-al-trading-range-breakout-failures-2015-12-27` — sections “Odds of breakout failures” and “Get in early—scalp out part”
- `concept`: `trading_range_breakout_failure`
- `rule`: In a trading-range context, strong-looking breakout attempts can fail; lack of immediate follow-through is material evidence against treating the move as a swing continuation.
- `appliesWhen`: `Repeated two-sided breakout attempts and range evidence are visible`; `follow-through can be observed causally`
- `avoidWhen`: `A single failed-looking bar is used to declare the whole market a range`; `later bars are used to justify the earlier decision`
- `decisionEffect`: `Permit no_trade, scalp-only research intent, or uncertain when breakout continuation is not established`; `do not silently promote a failed breakout to reversal authority`
- `status`: `draft`
- `sourceLocator`: `sections “Odds of breakout failures” and “Get in early—scalp out part”`
- `v6CoverageChecklist`: `Broad Context; Breakout Lifecycle; Reversal Lifecycle; Trade Permission`
- `staleTrendPriority`: `P0 — direct failure-mode signal for stale trend and breakout overconfidence`

### `du:pilot:small-pullback-trend-is-not-low-risk-permission`

- `doctrineId`: `du:pilot:small-pullback-trend-is-not-low-risk-permission`
- `sourceId`: `source:ask-al-small-pullback-trend-2017-02-05`
- `sourceMapping`: `source:ask-al-small-pullback-trend-2017-02-05` — sections “Wide stop trading”, “Low probability — wait for reversal”, and “Low risk, high probability”
- `concept`: `small_pullback_countertrend_risk`
- `rule`: A small pullback in a strong trend can make countertrend entries difficult; small apparent risk does not remove low-probability or opposing-context concerns.
- `appliesWhen`: `A countertrend setup is proposed inside a small-pullback trend`; `risk, reward, probability, and opposing pressure are assessed separately`
- `avoidWhen`: `Small signal-bar size is treated as sufficient permission`; `the broader trend or opposing pressure is omitted`
- `decisionEffect`: `Require explicit pressure/context evidence`; `support no_trade or wait-for-reversal when the countertrend case is not sufficiently grounded`
- `status`: `draft`
- `sourceLocator`: `sections “Wide stop trading”, “Low probability — wait for reversal”, and “Low risk, high probability”`
- `v6CoverageChecklist`: `Current Leg; Pressure; Setup; Trade Permission; Uncertainty`
- `staleTrendPriority`: `P0 — direct stale-trend/countertrend failure mode`

### `du:pilot:premise-invalidation-is-not-always-in-flip`

- `doctrineId`: `du:pilot:premise-invalidation-is-not-always-in-flip`
- `sourceId`: `source:ask-al-breakouts-2016-09-25`
- `sourceMapping`: `source:ask-al-breakouts-2016-09-25` — sections “Scalp or swing?” and “Reversal signal”
- `concept`: `premise_invalidation_and_always_in_separation`
- `rule`: A trade premise can invalidate before the broad Always-In direction is formally reversed; these are separate assessments.
- `appliesWhen`: `A swing premise has a structural invalidation level`; `the broad direction and local trade premise are both assessed`
- `avoidWhen`: `A local exit/invalidation is used to rewrite broad context`; `a broad direction is assumed to guarantee a valid trade plan`
- `decisionEffect`: `Store premise invalidation separately from Always-In`; `do not conflate local trade management with doctrine-level reversal confirmation`
- `status`: `draft`
- `sourceLocator`: `sections “Scalp or swing?” and “Reversal signal”`
- `v6CoverageChecklist`: `Always-In; Setup; Premise Invalidation; Reversal Lifecycle`
- `staleTrendPriority`: `P1 — prevents stale direction and local premise conflation`

## Coverage and failure-mode notes

| Layer/checklist | Pilot coverage | Evidence status | Next extraction priority |
|---|---|---|---|
| broad context / trend vs range | covered by units 1, 3, 7, 8 | public article + Ask Al pages | add counterexamples where context remains unresolved |
| current leg / Always-In | partial by units 6, 8 | Ask Al breakout and small-pullback pages | find explicit public source on current-leg handoff |
| location / magnets | covered by unit 2 | six-aspects article | add breakout-test and objective counterexamples |
| buying/selling pressure | partial by units 3, 7, 8 | article and Ask Al pages | extract balanced two-sided pressure and abstention |
| breakout lifecycle | covered by units 3, 4, 7 | article and Ask Al pages | distinguish attempted, tested, confirmed, failed |
| reversal lifecycle | partial by units 3, 4, 8 | article and Ask Al pages | source explicit reversal confirmation versus failed attempt |
| setup / signal / trigger | covered by units 4, 5, 6 | public professional article + Ask Al | locate more direct public Ask Al entry/trigger examples |
| protection / premise invalidation | partial by units 8, 9 | Ask Al breakout/small-pullback pages | keep execution mechanics outside doctrine authority |
| objective / holding / scalp-swing | partial by units 4, 7, 8 | Ask Al pages + public manual | do not promote sizing/partial-exit language into V1 policy |
| uncertainty / no-trade boundary | partial by units 3, 4, 7, 8 | derived from source caution, requires review | add explicit public no-trade/uncertainty wording |

## V6-only priority signal

The V6 rulebook layer model is used here only to identify missing structural categories. The prior V6 50-case stale-trend review is used only as a failure-mode signal: stale trend interpretation, premature countertrend entry, breakout-versus-reversal confusion, pressure versus permission, setup/signal/trigger conflation, and unresolved/no-trade boundaries should receive early public-source search priority.

No V6 case, label, rulebook sentence, outcome, artifact, or conclusion is a Brooks source or a DoctrineUnit source mapping. This file deliberately does not cite a V6 case ID or copy a V6 outcome.

## Manual review queue

Before any unit can be promoted beyond `draft`, a reviewer must verify:

1. the source page and snapshot hash still identify the intended public material;
2. the source locator is precise enough to re-check without committing the full text;
3. the derived wording does not add a stronger rule than the source supports;
4. `appliesWhen`, `avoidWhen`, and `decisionEffect` preserve uncertainty and do not add execution authority;
5. V6 coverage/priority notes did not leak into Brooks semantics;
6. the unit does not become runtime retrieval input while `draft`.
