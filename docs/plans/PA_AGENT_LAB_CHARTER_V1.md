# PA Agent Lab Charter V1

Status: ACCEPTED PROJECT IDENTITY AND RESEARCH BOUNDARY. IMPLEMENTATION IS NOT YET AUTHORIZED BY THIS DOCUMENT.

## Identity

PA Agent Lab is a new independent research project for a causal, auditable Price Action agent. It is not CITA V1/V2, not a new Vegas EMA version, and not a repair or reinterpretation of immutable Vegas V1-V6 evidence.

The repository is located at `/home/calvin/pa-agent-lab`. The existing `/home/calvin/vegas-ema-cta-lab` repository remains independent and may later expose approved read-only, versioned interfaces for causal cases, replay, execution simulation, or accounting.

## Long-term goal

The intended capability develops in two distinct stages:

1. understand source-traceable Al Brooks Price Action doctrine and produce complete causal, evidence-grounded research trade judgments with explicit uncertainty and no-trade behavior;
2. after a frozen Brooks baseline is independently evaluated, allow a separate Research Agent to propose improvements and identify new opportunities.

Calvin is an auxiliary reviewer who helps interpret sources, review applications, and expose ambiguity. The first runtime policy target is Brooks doctrine, not imitation of Calvin's personal policy.

## Semantic tracks

Every evaluated case preserves three independent tracks:

- `brooksDecision`: the Brooks Policy Agent's source-grounded assessment and complete research-only trade judgment;
- `calvinReview`: Calvin's offline agreement, clarification, disagreement, uncertainty, or application note;
- `researchCandidate`: an agent hypothesis that has no automatic strategy authority.

The tracks remain separate even when their values agree. Calvin review does not rewrite Brooks doctrine or automatically mutate a Brooks decision. A research candidate cannot overwrite the frozen Brooks baseline without a separate versioned decision and evaluation.

## Intended system boundary

The agent may eventually propose market context, current leg, Always-In bias, location/magnets, pressure, breakout lifecycle, setup, signal, trigger, trade permission, protection, invalidation, holding intent, and an explicit abstention reason.

Deterministic software retains authority over:

- input validity and closed-candle visibility;
- causal prefix and segment boundaries;
- same-bar ambiguity and right-censoring;
- legal tick and order geometry validation;
- execution simulation, fills, fees, slippage, and funding;
- position sizing, capacity, risk, and accounting;
- audit persistence and policy-version identity.

No model output is an exchange order.

## Research and safety boundary

- Protected `2025-02`, `2025-05`, and `2025-08` windows must never be read or derived.
- Calvin's settlement ledger, CITA outcomes, and unauthorized Vegas outcome artifacts are forbidden inputs.
- Existing contacted development windows are not a holdout and cannot establish out-of-sample profitability.
- Paper, Live, exchange submission, order placement, wallet access, and real-money activity are forbidden without separate explicit approval.
- Fine-tuning, preference optimization, reinforcement learning, outcome-based optimization, and parameter sweeps require separately approved experiment contracts.
- Private Brooks source material must be legally held, kept private, and never redistributed through this repository.

## Current authorization

This charter authorizes architecture discussion, decision records, schema design, approved public-source inventory design, the V6 read-only reuse inventory under ADR-0004, the implemented Phase 1 model-call scheduling contract slice under ADR-0008, the BrooksDecision/Doctrine/CalvinReview/Conflict semantic slice under ADR-0010, and the causal Case/input/privacy/ModelRun audit slice under ADR-0011. These slices do not authorize external provider calls, historical outcome inspection, replay-engine execution, or later services by implication. Repository bootstrap and source inventory do not authorize model ingestion, training, replay, or trading.
