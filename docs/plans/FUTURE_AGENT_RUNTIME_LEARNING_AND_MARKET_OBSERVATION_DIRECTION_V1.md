# Future Agent Runtime, Learning, and Market Observation Direction V1

Status: RECORDED DISCUSSION DIRECTION. NOT AN ADR. NO IMPLEMENTATION, PROVIDER, REAL-DATA, PAPER, LIVE, OR EXECUTION AUTHORITY.

## Purpose

Record the preferred direction discussed before Phase 4A without changing any accepted PA Agent Lab contract.

The long-term objective is economically useful market performance, not compliance work for its own sake. Reproducibility, version identity, experiment evidence, and rollback remain necessary only to determine whether learning improved performance and to contain harmful changes.

## Candidate runtime split

The preferred future separation is:

```text
market ingestion and deterministic state
  -> bounded market candidate selector
    -> Brooks Policy Worker
      -> deterministic risk and execution boundary

mature research evidence and outcomes
  -> Hermes research/learning control plane
    -> versioned research candidate
      -> evaluation and shadow gate
        -> separately governed champion promotion
```

- Direct Pi remains the development, contract, and research coordinator.
- Hermes Agent is the preferred candidate for a future long-running research, learning, scheduling, monitoring, and reporting control plane.
- A repository-owned Policy Worker remains the preferred narrow model-inference boundary. Interactive Pi, Hermes, or Codex session history is not itself policy state.
- Risk and any future execution boundary remain deterministic and separate from Hermes and the policy model.

This direction does not yet select a Hermes release, deployment topology, provider, memory backend, permission set, or production operating contract.

## Learning direction

Hermes capabilities such as persistent memory, cron, skills, and background operation are potentially useful for:

- finding recurring failure modes and regime changes;
- proposing prompt, Doctrine, selector, model, or evaluation candidates;
- scheduling offline evaluation and shadow comparison;
- monitoring data quality, cost, latency, rejection, and degradation;
- reporting promotion or rollback recommendations.

Hermes experience memory or self-improved skills are not automatically evidence of improved market performance. A future market-learning loop should distinguish agent workflow learning from strategy learning based on mature, causally eligible research outcomes.

The preferred adoption sequence is:

1. automatic candidate research with explicit human champion promotion;
2. later bounded automatic promotion only after separately accepted gates and rollback controls;
3. online adaptive policy mutation only after the earlier stages demonstrate reliable improvement.

Current PA authority still forbids automatic promotion. This document does not change that rule.

A future learning loop should keep a minimal experiment ledger containing at least champion and candidate version, data cutoff, eligible evidence identity, net-of-cost evaluation, promotion reason, and rollback identity. This is operational evidence for profitability and recovery, not a claim that compliance-grade audit is the product goal.

## Persistent market observation

The future system may continuously ingest and persist market events. V1 Brooks policy judgment remains limited to newly closed five-minute bars under ADR-0008 and ADR-0009.

The preferred state model is:

```text
live source events
  -> append-only event log and source cursor
    -> deterministic bar builder
      -> provisional open-bar operational state
        -> immutable closed-bar snapshot
          -> continuous_every_close decision point
```

A persistent watcher may maintain source sequence, current open-bar aggregation, closed-bar history, continuity, missing-data state, session boundaries, and recovery checkpoints. An open bar may support operational health checks but cannot enter the V1 Brooks policy payload.

The LLM should reconstruct each V1 judgment from the exact immutable causal snapshot rather than depend on a never-ending chat session. Any future model-generated longitudinal observation state requires a separate versioned contract, explicit provenance and expiry, and comparison against the stateless closed-bar baseline.

## Candidate preselection

A preselection layer is preferred so the policy model does not subjectively scan every instrument. Its exact design is deferred.

A future selector contract must address:

- high-recall candidate generation and bounded LLM workload;
- versioned inputs, rules/models, and candidate-set evidence;
- missed-opportunity and rejected-candidate sampling;
- distribution shift and selection bias;
- comparison with the accepted `continuous_every_close` baseline;
- prevention of unreviewed outcome-led selector mutation.

The selector does not gain strategy, provider, market-data, or execution authority from this discussion.

## Open decisions

Before this direction can become an implementation ADR, separately decide:

- whether Hermes is accepted as the research/learning control plane and its exact version and isolation;
- what data and mature outcomes Hermes may read;
- what candidate records Hermes may create and where it may write;
- manual versus bounded automatic promotion and rollback gates;
- the provider-neutral Policy Worker library and transport;
- the continuous real-market ingestion and recovery contract;
- selector semantics, coverage measurement, cadence, and evaluation;
- future Paper/Live risk and execution authority, if ever proposed.

## Explicit non-authority

This direction does not authorize real market ingestion, provider calls, automatic policy mutation, outcome-led tuning, Paper, Live, exchange access, wallet access, order submission, or real-money action. Existing ADRs and `AGENTS.md` remain authoritative.
