# PA Agent Lab Architecture V1

Status: DRAFT ARCHITECTURE. RECOMMENDED, NOT YET AN IMPLEMENTATION AUTHORITY.

## Architectural thesis

Price Action judgment should be implemented as a constrained, evidence-grounded model component inside a deterministic causal and accounting shell.

RAG is recommended because doctrine needs source traceability and case precedents need explicit retrieval boundaries. RAG is not equivalent to training, and neither RAG nor fluent rationale proves policy competence.

## Logical flow

```text
Authorized Brooks sources -> Doctrine ingestion -> Doctrine RAG ----+
                                                                    |
Calvin blind labels -------> Case store -------> Case RAG ----------+--> PA Policy Agent
                                                                    |          |
Closed causal candles -----> Context/evidence service --------------+          v
                                                                       Structured decision
                                                                               |
                                                                       Policy validator
                                                                               |
                                                            Replay/execution/risk/accounting
                                                                               |
                                                                      Immutable audit record
```

A later Research Agent is isolated from the frozen Policy Agent. It proposes a new `researchCandidate` version and cannot mutate the active policy.

## Knowledge architecture

### Doctrine RAG

Doctrine RAG should store source-grounded semantic units rather than arbitrary token chunks. A doctrine unit should eventually include:

- source identity, content hash, edition or version, and location;
- primary quotation or authorized extract;
- concept tags and applicable market context;
- causal prerequisites and exclusions;
- commonly confused concepts;
- approved interpretation and review status;
- supersession and conflict links.

Suggested authority tiers remain open for approval:

1. legally held Brooks primary course, book, transcript, or manual material;
2. official public Brooks glossary, manuals, and Ask Al material;
3. human-reviewed doctrine cards derived from primary material;
4. Calvin application notes, stored outside doctrine authority;
5. model-generated interpretations, stored only as candidates.

### Case RAG

Case RAG should retrieve causal precedents, not future outcomes. Each case requires:

- exact visible-through bar and source commitment;
- anonymous normalized chart and causal OHLC payload;
- structured `brooksAssessment` and `calvinPolicy` tracks;
- no-trade, uncertainty, invalidation, and correction evidence;
- dataset split and retrieval-access policy;
- immutable case and label version identities.

Training cases may be retrievable by an aligned policy. Evaluation and holdout cases must be excluded by server-side authorization, not merely by prompt instructions.

### Retrieval method

The initial recommendation is hybrid retrieval:

1. authority and dataset metadata filtering;
2. PostgreSQL full-text or exact terminology retrieval;
3. vector similarity retrieval;
4. deterministic reranking and bounded context assembly;
5. persisted citations and retrieved-chunk hashes.

A standalone vector database and a graph database are not recommended initially. PostgreSQL plus `pgvector` is sufficient unless measured scale or relationship queries prove otherwise.

## Memory isolation

Use separate stores or hard authorization boundaries for:

| Memory | Purpose | Policy Agent access | Automatic writes |
|---|---|---:|---:|
| `doctrine_memory` | source-grounded Brooks concepts | read | no |
| `case_memory` | Calvin examples, labels, corrections | bounded read | no authoritative writes |
| `working_memory` | current causal segment and active reasoning state | read/write within run | expires or resets by contract |
| `research_outcome_memory` | outcomes, diagnostics, hypotheses | forbidden | research pipeline only |
| `decision_audit` | immutable input/retrieval/output/validation record | append through service | append only |
| `model_registry` | provider, model, prompt, schema, policy versions | read | controlled release process |

Ordinary conversation history is not strategy memory. A conversation item becomes durable only after structured extraction, provenance assignment, and explicit approval.

## Agent boundary

The Policy Agent should emit a schema-validated proposal, not free-form action authority. Candidate fields include:

- broad context;
- current leg and Always-In;
- location and magnets;
- pressure and breakout lifecycle;
- setup, signal, and trigger lifecycle;
- direction and trade permission;
- entry premise, protection, and invalidation;
- holding intent;
- no-trade or abstention reason;
- evidence references and doctrine citations.

The exact fields and enums require a separate contract. The model should be allowed to emit `uncertain` and `no_trade` without being penalized merely for not producing a trade.

## Deterministic boundary

Deterministic services validate input visibility, continuity, evidence references, authority, price geometry, ticks, ambiguity, order sequencing, fills, risk, costs, accounting, and audit persistence. A second language model must not repair invalid output by guessing.

## Input modalities

The recommended policy input combines:

- an anonymous normalized chart for global geometry;
- exact causal OHLC and bar identities for precision;
- deterministic continuity and boundary metadata;
- retrieved doctrine and allowed precedent evidence.

Image-only input loses price and identity precision. Feature-only input risks repeating the current over-compression problem.

## Recommended technology stack

These are recommendations, not accepted dependency choices:

- domain contracts, causal services, validator, replay integration, and API: TypeScript;
- API: Fastify, Zod, and generated OpenAPI;
- UI: React, Vite, and TypeScript;
- charting: TradingView Lightweight Charts or an audited repository-local renderer;
- system of record: PostgreSQL;
- vector retrieval: `pgvector`;
- large offline candle analysis: Parquet and DuckDB when needed;
- model access: a small provider-neutral adapter with structured-output support;
- fine-tuning and preference optimization: a separate Python pipeline only after an approved training contract.

Do not introduce LangChain or LlamaIndex initially. Explicit retrieval and orchestration code is easier to audit for leakage, authority, and version identity.

## Audit identity

Every evaluated decision should persist at least:

- policy and schema version;
- model provider, model ID, and model configuration;
- prompt/template hash;
- visible input hash and last visible bar;
- doctrine and case retrieval IDs plus content hashes;
- raw model output;
- schema and deterministic validation results;
- accepted, rejected, uncertain, or censored terminal state;
- any later human correction as a new immutable event.

## Open architecture questions

The following remain unresolved:

- legally available Brooks source corpus and permitted local processing;
- local versus external model providers and privacy boundary;
- first decision schema and annotation granularity;
- chart renderer and multimodal model requirements;
- database deployment and backup model;
- training, validation, and genuinely untouched evaluation partitions;
- how Calvin labels are repeated to measure human self-consistency;
- criteria for promoting a `researchCandidate` to a new frozen policy version.
