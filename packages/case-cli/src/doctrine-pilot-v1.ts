import {
  createDoctrineProposalBundle,
  type DoctrineProposalBundleV1,
  type SourceV1,
} from "@pa-agent-lab/contracts";

const sources = {
  sixAspects: source(
    "source:btc-six-aspects-v1",
    "What is Price Action? Six Aspects",
    "https://www.brookstradingcourse.com/price-action/what-is-price-action-6-aspects/",
    "sha256:f1ec149fe8ba929b66836b22b516442b22cb4b7c3fffa260b0250c93b758c372",
  ),
  breakouts: source(
    "source:ask-al-breakouts-2016-09-25",
    "Breakouts",
    "https://www.brookstradingcourse.com/ask-al/breakouts/",
    "sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b",
  ),
  professional: source(
    "source:btc-professional-pa-trader-v1",
    "Professional Price Action Trader",
    "https://www.brookstradingcourse.com/price-action/professional-price-action-trader/",
    "sha256:065ae939131da39f74d61d6e4b83a2a426f3dd1f4de6d3ac90e47cd5a43b7b8c",
  ),
  pullbacks: source(
    "source:ask-al-pullbacks-entering-2016-05-01",
    "Pullbacks and Entering",
    "https://www.brookstradingcourse.com/ask-al/pullbacks-entering/",
    "sha256:5a6f6262d86dc6f0a9094a60bdf9bddac973361cc4ae72ef16320cb884481bdb",
  ),
  rangeFailures: source(
    "source:ask-al-trading-range-breakout-failures-2015-12-27",
    "Trading Range Breakout Failures",
    "https://www.brookstradingcourse.com/ask-al/trading-range-breakout-failures/",
    "sha256:2703c5561739179736e4fbcc5b42bbfc7c27dcec85561dc58912687406bd6378",
  ),
  smallPullback: source(
    "source:ask-al-small-pullback-trend-2017-02-05",
    "Small Pullback Trend",
    "https://www.brookstradingcourse.com/ask-al/small-pullback-trend-bought-many-times/",
    "sha256:e84b0e60cfc574506d58ad214958013704f704efec35a8a3766445c4d3fa3155",
  ),
} as const;

export function createPhase3bPilotDoctrineProposalsV1(): readonly Readonly<DoctrineProposalBundleV1>[] {
  return [
    proposal(sources.sixAspects, {
      doctrineId: "du:pilot:context-over-candle-pattern",
      concept: "context_over_candle_pattern",
      rule: "Context and market state are more important than treating a candle pattern in isolation.",
      appliesWhen: ["A candidate setup is being interpreted", "The same local bar can occur in trend or trading-range context"],
      avoidWhen: ["A single candle is used as sufficient permission", "The surrounding market state is unknown"],
      decisionEffect: ["Require context evidence before treating a local pattern as actionable", "Allow no_trade or uncertain when context cannot be established"],
      locator: "Article sections If not candlesticks or indicators, then what is price action? and Market inertia",
    }),
    proposal(sources.sixAspects, {
      doctrineId: "du:pilot:magnets-are-location",
      concept: "support_resistance_as_magnets",
      rule: "Support, resistance, prior highs and lows, channels, trend lines, and measured projections can act as magnets and locations where market behavior is evaluated.",
      appliesWhen: ["The decision identifies an objective or reversal or breakout location", "A visible structure can be referenced"],
      avoidWhen: ["The level is not visible in the causal prefix", "A magnet is used to assume an intrabar path or guaranteed reaction"],
      decisionEffect: ["Bind location and objective claims to visible structures", "Do not treat a magnet alone as trade permission"],
      locator: "Article sections Every tick matters, Examples of support and resistance, and Markets constantly test",
    }),
    proposal(sources.sixAspects, {
      doctrineId: "du:pilot:trend-and-range-have-different-defaults",
      concept: "trend_vs_trading_range_context",
      rule: "A trend tends to persist, while a trading range resists change; the same breakout or reversal attempt has different meaning in the two contexts.",
      appliesWhen: ["Classifying broad market state", "Assessing whether a local reversal or breakout is likely to continue"],
      avoidWhen: ["State is inferred from one bar only", "Trend or range evidence conflicts or is incomplete"],
      decisionEffect: ["Keep broad context separate from local setup and pressure", "Require explicit uncertainty or no_trade when state cannot be distinguished"],
      locator: "Article section Market inertia; the primary Source must independently support approval",
    }),
    proposal(sources.breakouts, {
      doctrineId: "du:pilot:breakout-needs-context-and-follow-through",
      concept: "breakout_context_and_follow_through",
      rule: "Breakout interpretation depends on context and subsequent market behavior; a breakout attempt is not automatically a durable new trend.",
      appliesWhen: ["A visible bar breaks a support or resistance structure", "The decision distinguishes trend resumption from reversal or range behavior"],
      avoidWhen: ["Only the breakout bar is visible", "The relevant prior structure or follow-through is missing"],
      decisionEffect: ["Separate breakout attempt from confirmed lifecycle state", "Do not backfill confirmation into the decision bar"],
      locator: "Sections Always review context, Look for trend resumption or reversal, and Limit order bars",
    }),
    proposal(sources.professional, {
      doctrineId: "du:pilot:signal-is-not-setup",
      concept: "setup_signal_trigger_separation",
      rule: "A setup, signal bar, trigger, and later execution event are distinct observations; a local pattern does not itself establish the exact entry event.",
      appliesWhen: ["A directional case references a setup and entry", "The visible prefix ends before a new trigger can be observed"],
      avoidWhen: ["The proposed entry claims to have triggered inside the last visible bar", "Signal and trigger are conflated"],
      decisionEffect: ["Keep setup, signal, and trigger fields separate", "New plans remain pending at the causal cutoff"],
      locator: "Public section Signals vs. Setups; the primary Source must independently support approval",
    }),
    proposal(sources.pullbacks, {
      doctrineId: "du:pilot:pullback-depth-follows-market-character",
      concept: "pullback_depth_depends_on_market_character",
      rule: "Strong trends tend to have smaller pullbacks; weaker or more two-sided conditions make deeper pullbacks more plausible.",
      appliesWhen: ["Choosing whether a pullback entry premise is coherent", "Trend strength and two-sidedness are evidenced"],
      avoidWhen: ["Trend character is uncertain", "A preferred pullback depth is treated as a fixed universal rule"],
      decisionEffect: ["Use market character as context for setup and entry assessment", "Keep the premise conditional rather than hard-coding a depth threshold"],
      locator: "Sections When to enter pullbacks and Strong breakouts",
    }),
    proposal(sources.rangeFailures, {
      doctrineId: "du:pilot:range-breakouts-can-fail",
      concept: "trading_range_breakout_failure",
      rule: "In a trading-range context, strong-looking breakout attempts can fail; lack of immediate follow-through is material evidence against treating the move as a swing continuation.",
      appliesWhen: ["Repeated two-sided breakout attempts and range evidence are visible", "Follow-through can be observed causally"],
      avoidWhen: ["A single failed-looking bar is used to declare the whole market a range", "Later bars are used to justify the earlier decision"],
      decisionEffect: ["Permit no_trade, scalp-only research intent, or uncertain when breakout continuation is not established", "Do not silently promote a failed breakout to reversal authority"],
      locator: "Sections Odds of breakout failures and Get in early - scalp out part",
    }),
    proposal(sources.smallPullback, {
      doctrineId: "du:pilot:small-pullback-trend-is-not-low-risk-permission",
      concept: "small_pullback_countertrend_risk",
      rule: "A small pullback in a strong trend can make countertrend entries difficult; small apparent risk does not remove low-probability or opposing-context concerns.",
      appliesWhen: ["A countertrend setup is proposed inside a small-pullback trend", "Risk, reward, probability, and opposing pressure are assessed separately"],
      avoidWhen: ["Small signal-bar size is treated as sufficient permission", "The broader trend or opposing pressure is omitted"],
      decisionEffect: ["Require explicit pressure and context evidence", "Support no_trade or wait-for-reversal when the countertrend case is not sufficiently grounded"],
      locator: "Sections Wide stop trading, Low probability - wait for reversal, and Low risk, high probability",
    }),
    proposal(sources.breakouts, {
      doctrineId: "du:pilot:premise-invalidation-is-not-always-in-flip",
      concept: "premise_invalidation_and_always_in_separation",
      rule: "A trade premise can invalidate before the broad Always-In direction is formally reversed; these are separate assessments.",
      appliesWhen: ["A swing premise has a structural invalidation level", "The broad direction and local trade premise are both assessed"],
      avoidWhen: ["A local exit or invalidation is used to rewrite broad context", "A broad direction is assumed to guarantee a valid trade plan"],
      decisionEffect: ["Store premise invalidation separately from Always-In", "Do not conflate local trade management with doctrine-level reversal confirmation"],
      locator: "Sections Scalp or swing? and Reversal signal",
    }),
  ];
}

function source(
  sourceId: string,
  title: string,
  urlOrLocalRef: string,
  contentHash: SourceV1["contentHash"],
): SourceV1 {
  return { sourceId, sourceType: "brooks_website", title, urlOrLocalRef, contentHash, private: false };
}

function proposal(
  sourceValue: SourceV1,
  value: {
    readonly doctrineId: string;
    readonly concept: string;
    readonly rule: string;
    readonly appliesWhen: readonly string[];
    readonly avoidWhen: readonly string[];
    readonly decisionEffect: readonly string[];
    readonly locator: string;
  },
): Readonly<DoctrineProposalBundleV1> {
  return createDoctrineProposalBundle({
    source: sourceValue,
    doctrineUnit: {
      doctrineId: value.doctrineId,
      sourceId: sourceValue.sourceId,
      concept: value.concept,
      rule: value.rule,
      appliesWhen: value.appliesWhen,
      avoidWhen: value.avoidWhen,
      decisionEffect: value.decisionEffect,
      status: "draft",
    },
    sourceLocator: value.locator,
  });
}
