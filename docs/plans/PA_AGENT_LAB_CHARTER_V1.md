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

This charter authorizes architecture discussion, decision records, schema design, approved public-source inventory design, the V6 read-only reuse inventory under ADR-0004, the implemented Phase 1 model-call scheduling slice under ADR-0008, the BrooksDecision/Doctrine/CalvinReview/Conflict semantic slice under ADR-0010, the causal Case/input/privacy/ModelRun audit slice under ADR-0011, the deterministic anonymous chart-artifact slice under ADR-0012, the strict persisted-record/OpenAPI/PostgreSQL-constraint slice under ADR-0013, the provider-neutral replay-boundary contract slice under ADR-0014, ADR-0015's local loopback synthetic-only Case Store/API/CLI vertical slice, ADR-0016's synthetic-only backend-enforced blind-review Research Console, ADR-0018's repository-owned local single-user trusted-loopback persistent deployment, ADR-0017's local public-source Doctrine proposal/approval/retirement path, the implemented ADR-0019/ADR-0020/ADR-0021 local Doctrine-to-prepared-payload path, and ADR-0022's Phase 5B2A provider-adapter design-only boundary. ADR-0022 itself authorizes no code, credentials, CLI inference, provider call, or runtime record. The separate Phase 5B2B implementation authorization and exact-commit acceptance cover commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` only as a fake-only offline foundation. The additive correction authorization and acceptance cover commit `7e44a44b34fc4b5695af6f00d7366b989a42e716` only as the four-rule offline V2 geometry correction. The separate V2 package approval covers only exact content hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`. ADR-0023 accepts the sequencing decision and exact Phase 3C V1 single-timeframe coverage design baseline. ADR-0024 requires a versioned multi-timeframe core capability before formal provider evaluation, preserves scaling, active-position management, and intrabar spike/event handling as separate required design tracks, and pauses Doctrine proposal drafting. Calvin authorized drafting and independent review of exact design draft `PHASE3D_VERSIONED_BROOKS_MULTI_TIMEFRAME_CAPABILITY_V1.md`; the draft is not accepted until a separate record binds its exact hash and grants no implementation or operation. These decisions accept no installed-CLI capability/privacy proof, production supervisor, package activation/preparation, external call, or runtime record. They authorize no further Source access, Doctrine mutation, real historical-data ingestion, protected-window access, market screening, public deployment, external provider call, RAG service, replay-engine execution, execution mechanics, or later service by implication. Source inventory and Doctrine approval do not authorize model ingestion, embeddings, training, replay, or trading.
