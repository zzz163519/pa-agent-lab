# ADR-0009: First Brooks Policy Timeframe

Status: ACCEPTED. IMPLEMENTED IN THE V1 SCHEDULING CONTRACT.

## Decision

The first Brooks Policy Agent stream uses five-minute closed bars:

```text
barDurationSeconds = 300
```

Both `evaluation_sampled` and `continuous_every_close` V1 logical calls use this duration. A different policy timeframe requires a new versioned generalization candidate and cannot be mixed silently into the first baseline.

This is the policy judgment cadence, not the future execution-evidence resolution. Phase 8 may later evaluate approved one-minute or trade-level data to resolve post-decision order sequencing without exposing that finer data to the policy input.

## Rationale

Direct Brooks public material states that Price Action applies across markets and timeframes, while repeatedly using and recommending the five-minute chart as the practical starting point and primary day-trading chart. Starting with five minutes minimizes translation between reviewed doctrine examples and the first policy target.

The accepted 120/40 payload therefore represents:

- 120 context bars covering 10 hours;
- 40 repeated detail bars covering 3 hours and 20 minutes;
- one logical continuous call after each new five-minute close;
- at most 288 logical calls per 24-hour market day and 105,120 per 365-day market stream before sampling, caching, or batching.

The 24-hour cost and limited higher-timeframe context are explicit tradeoffs. Phase 6 uses frozen sampled evaluation rather than a full-history two-model sweep. A later 15-minute candidate may test cost and broader-context generalization only after the five-minute Brooks baseline is frozen.

The prior V6 five-minute and causal 60-minute aggregation definitions are compatibility evidence only. They do not supply outcome, strategy, or profitability authority to this independent repository.

## Source basis

Direct public Brooks references reviewed for this decision:

- <https://www.brookstradingcourse.com/futures-market/day-trading-5-minute-emini/>
- <https://www.brookstradingcourse.com/how-to-trade-manual/day-trading-setup/>
- <https://www.brookstradingcourse.com/trading-strategies/scalping-2-minute-emini-chart/>

The cited material states that the approach applies to all timeframes but identifies five minutes as the efficient or recommended primary starting chart and warns about the decision pressure on much smaller charts.

## Contract enforcement

`packages/contracts/src/model-call-schedule-v1.ts` exports:

```text
FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS = 300
```

V1 logical-call and continuous-state construction reject any other duration before scheduling or provider access. Synthetic tests prove that a 900-second decision point fails closed.

## Consequences

- Five minutes is part of the V1 policy and audit identity, not an unrecorded runtime setting.
- Every logical call continues to persist `barDurationSeconds` even though V1 accepts only 300.
- Model evaluation candidates receive the same five-minute decision points.
- Full-history provider cost must be estimated before continuous inference is authorized.
- One-minute or trade-level data cannot become model context merely because replay may later use it for mechanical sequencing.
- Fifteen-minute, hourly, multi-timeframe, event-filtered, or adaptive-cadence policies require separately versioned decisions and evaluations.
- This ADR does not authorize provider calls, historical replay, Paper, Live, exchange, wallet, or real-money activity.
