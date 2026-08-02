# PA Agent Lab Charter V1

Status: ACCEPTED PROJECT IDENTITY AND RESEARCH BOUNDARY. IMPLEMENTATION IS NOT YET AUTHORIZED BY THIS DOCUMENT.

## Identity

PA Agent Lab is a new independent research project for a causal, auditable Price Action agent. It is not CITA V1/V2, not a new Vegas EMA version, and not a repair or reinterpretation of immutable Vegas V1-V6 evidence.

The repository is located at `/home/calvin/pa-agent-lab`. The existing `/home/calvin/vegas-ema-cta-lab` repository remains independent and may later expose approved read-only, versioned interfaces for causal cases, replay, execution simulation, or accounting.

## Long-term goal

The intended capability develops in two distinct stages:

1. understand source-traceable Al Brooks Price Action doctrine and reproduce Calvin's outcome-blind application judgments with explicit uncertainty and no-trade behavior;
2. after a frozen first-stage policy is independently evaluated, allow a separate Research Agent to propose improvements and identify new opportunities.

The long-term objective is not to defeat Calvin in a human-versus-agent contest. Calvin's judgments are the first-stage alignment reference and an important later review source, not a permanent ceiling on research.

## Semantic tracks

Every evaluated case preserves three independent tracks:

- `brooksAssessment`: source-grounded doctrine reading;
- `calvinPolicy`: Calvin-aligned application and trade policy;
- `researchCandidate`: an agent hypothesis that has no automatic strategy authority.

The first two remain separate even when their values agree. A Calvin variation does not rewrite Brooks doctrine. A Brooks-compatible setup does not force Calvin to trade. A research candidate cannot overwrite either track without a separate versioned decision and evaluation.

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

This charter authorizes architecture discussion, decision records, schema design, source inventory design, and implementation planning only. Repository bootstrap does not authorize model ingestion, API calls, training, historical outcome inspection, replay, or trading.
