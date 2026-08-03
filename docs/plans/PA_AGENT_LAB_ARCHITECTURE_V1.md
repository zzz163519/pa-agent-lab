# PA Agent Lab Architecture V1

Status: DRAFT ARCHITECTURE. RECOMMENDED, NOT YET AN IMPLEMENTATION AUTHORITY.

## Architectural thesis

Price Action judgment should be implemented as a constrained, evidence-grounded model component inside a deterministic causal and accounting shell.

RAG is recommended because doctrine needs source traceability and case precedents need explicit retrieval boundaries. RAG is not equivalent to training, and neither RAG nor fluent rationale proves policy competence.

## Logical flow

```text
Authorized Brooks sources -> Doctrine ingestion -> Doctrine RAG --------+
                                                                          |
Closed causal candles ------> Anonymous chart/OHLC service ---------------+--> Brooks Policy Agent
                                                                          |          |
                                                                          |          v
                                                                          |   Structured Brooks decision
                                                                          |          |
                                                                          |   Deterministic validator
                                                                          |          |
                                                                          +--> Immutable decision audit

Calvin offline reviews -----> Review store ------> adjudication/evaluation only
Research evidence ----------> isolated Research Agent -> researchCandidate only
```

A later Research Agent is isolated from the frozen Policy Agent. It proposes a new `researchCandidate` version and cannot mutate the active policy.

## Knowledge architecture

### Doctrine RAG

ADR-0010 keeps doctrine retrieval deliberately small. Local Source records retain only the minimum source ID, type, title, URL/local reference, content hash, and private flag needed to avoid losing provenance. Those fields do not enter RAG embeddings or model context.

A DoctrineUnit contains:

- stable `doctrineId` and local `sourceId`;
- concept and rule;
- `appliesWhen` and `avoidWhen`;
- `decisionEffect`;
- `draft | approved | retired` status.

The RAG-facing record contains only `doctrineId` plus the five core trading-semantics fields. Only approved records are retrievable.

Approved source classes are:

1. Brooks public materials and direct material from the official Al Brooks YouTube channel;
2. reviewed third-party transcripts of Brooks course material, including approved Bilibili sources;
3. locally reviewed core DoctrineUnits derived from those sources;
4. V6 definition candidates imported under ADR-0004 and reviewed before approval.

Model-generated doctrine remains draft. Complete copyrighted transcripts stay outside Git and outside the RAG record.

### Source examples and review store

Each reviewed case keeps its exact visible-through bar, anonymous normalized input identity, structured BrooksDecision, and optional whole-decision CalvinReview. Calvin review remains separate and unavailable to runtime retrieval. Detailed holdout/contact-state machinery is deferred until Phase 6; Phase 1 does not build it.

### Retrieval method

The initial recommendation is:

1. filter to approved DoctrineUnits;
2. use PostgreSQL terminology/full-text and vector retrieval;
3. assemble a small bounded set of core trading semantics;
4. persist only the retrieved `doctrineId` values with the model run.

A standalone vector or graph database is not recommended initially. PostgreSQL plus `pgvector` is sufficient.

## Memory isolation

Use separate stores or hard authorization boundaries for:

| Memory | Purpose | Brooks Policy Agent access | Automatic writes |
|---|---|---:|---:|
| `doctrine_memory` | source-grounded Brooks concepts | read | no |
| `brooks_case_memory` | approved source-grounded Brooks examples | bounded read | no authoritative writes |
| `calvin_review` | offline agree/clarify/disagree/uncertain records | forbidden | no |
| `working_memory` | current causal segment and active reasoning state | read/write within run | expires or resets by contract |
| `research_outcome_memory` | outcomes, diagnostics, hypotheses | forbidden | research pipeline only |
| `decision_audit` | immutable input/retrieval/output/validation record | append through service | append only |
| `model_registry` | provider, model, prompt, schema, policy versions | read | controlled release process |

Ordinary conversation history is not strategy memory. A conversation item becomes durable only after structured extraction, provenance assignment, and explicit approval.

## Agent boundary

The Brooks Policy Agent emits a schema-validated research proposal, not free-form action authority. Candidate fields include:

- broad context;
- current leg and Always-In;
- location and magnets;
- pressure and breakout/reversal lifecycle;
- setup, signal, and trigger lifecycle;
- `long`, `short`, `no_trade`, or `uncertain`;
- entry premise, protection, and invalidation;
- holding intent;
- evidence references and doctrine citations.

It emits no position size, account action, exchange order, PnL expectation, Paper/Live command, or real-money authority. ADR-0010 and `PHASE_1_SEMANTIC_CONTRACTS_V1.md` define the accepted V1 fields and enums.

## Deterministic boundary

Deterministic services validate input visibility, continuity, evidence references, authority, price geometry, ticks, ambiguity, order sequencing, fills, risk, costs, accounting, and audit persistence. A second language model must not repair invalid output by guessing.

## Deterministic replay platform

ADR-0007 accepts a NautilusTrader-first Phase 8 platform direction behind a versioned TypeScript replay contract. ADR-0014 implements the engine-neutral Phase 1 contract boundary: exact immutable dataset slices, strictly post-cutoff provenance, one frozen decision path per request, explicit `rejected | resolved | unresolved | right_censored` results, and opaque audit hashes. The future engine remains a replaceable local execution-simulation sidecar, not a source of doctrine, policy, or research authority. LEAN is limited to a small point-in-time set of hand-computed conformance fixtures rather than a maintained second integration.

Replay consumes frozen, content-hashed decisions; no model call or policy mutation occurs mid-run. The implemented TypeScript boundary rejects broad, protected, unauthorized, at-cutoff, and pre-cutoff data before sidecar execution; one unresolved request path terminates fail closed without mutating independent paths. Engine-default OHLC traversal cannot resolve same-bar ambiguity silently: approved finer post-decision data may establish order, otherwise the result is `unresolved` with an explicit reason. The exact engine payload normalization and mechanical result fields remain Phase 8 work.

The sidecar is not authorized before Phase 8. When separately approved, it must be pinned, unmodified, process-isolated, offline during authoritative replay, and configured without credentials or Paper/Live connectivity.

## Input modalities

The accepted policy input combines:

- a deterministic anonymous 120-bar context chart;
- a detail panel repeating the final 40 bars with the same closed `lastVisibleBar`;
- normalized causal OHLC and anonymous relative bar identities for every visible bar;
- explicit left-censoring when history is insufficient;
- `barDurationSeconds = 300` for the first V1 Brooks policy stream under ADR-0009, plus per-bar `contiguous | session_boundary | missing_data | unknown` continuity;
- retrieved approved Brooks DoctrineUnit semantics.

Raw prices remain local. External chart and OHLC payloads use `rawPrice / firstVisibleClose * 100` and omit symbol, real timestamp, date, time zone, venue, market class, source/window identity, account information, future bars, outcomes, indicators, and Vegas overlays.

Image-only input loses price and identity precision. Feature-only input risks repeating the current over-compression problem.

## Model evaluation

GPT-5.6 and Gemini 3.6 Flash are peer candidates, not a primary/fallback pair. Exact versions are frozen before a blind, outcome-free comparison on byte-equivalent inputs, retrieval evidence, prompts, schemas, and reasoning budgets.

ADR-0008 separates `evaluation_sampled` from the future `continuous_every_close` baseline. ADR-0009 fixes both first V1 streams to five-minute closed bars. Evaluation points are selected and content-hash committed before outputs or outcomes are inspected, then expanded into an equal point-by-repeat-by-candidate call matrix. A provider retry is an attempt record, not another decision point. Full continuous inference precomputes and freezes at most one logical call per newly closed bar before deterministic replay.

Semantic and causal quality gates run before price comparison. Observable doctrine accuracy, citations, ambiguity handling, abstention, prefix invariance, repeated consistency, valid-decision cost, retries, latency, and throughput determine selection. ADR-0003 removes the runtime Calvin stage, so the accepted comparison is direct model-versus-model evaluation on the complete Brooks decision contract rather than a two-stage 2x2 matrix.

## Technology stack

ADR-0006 accepts:

- a `pnpm` workspace;
- strict TypeScript and ESM for domain contracts, causal services, validator, API, UI, retrieval, model gateway, and audit;
- a pinned PostgreSQL plus `pgvector` Docker image as the sole initial system of record;
- Python only after a separately approved training contract, except for the isolated Phase 8 replay sidecar governed by ADR-0007.

Accepted charting boundary under ADR-0012:

- repository-owned fixed SVG candle/grid/continuity scene;
- unmodified `@resvg/resvg-js@2.6.2` rasterization;
- byte-validated `1200 x 720` PNG artifacts with content-addressed local storage.

Future on-demand agent chart capability should wrap this seam in a project-scoped MCP plus skill rather than fetch market data or control TradingView.

Implemented infrastructure under ADR-0015:

- API: `fastify@5.11.0` consuming the committed ADR-0015 JSON Schema/OpenAPI route manifest through bounded raw-body parsing;
- Case Store: `pg@8.22.0`, parameterized SQL, serializable transaction retry, and content-hashed forward migrations;
- database: `pgvector/pgvector:0.8.6-pg18-trixie` pinned to the accepted Linux amd64 manifest, with vector extension creation deferred to Phase 4;
- CLI: Node `parseArgs` and `fetch`, with no CLI framework dependency.

Implemented Research Console infrastructure under ADR-0016, ADR-0017, and ADR-0018:

- UI: React 19, Vite 8, React Router 8, TanStack Query 5, Lucide, and strict TypeScript;
- serving: Fastify static assets and Helmet CSP on the same loopback origin;
- local deployment: digest-pinned Node/PostgreSQL Compose services, content-hashed one-shot migration, internal-only credential-bearing app/database, and one credential-free fixed-target loopback gateway;
- reviewer identity: bearer mode by default or explicit trusted-loopback server-derived identity in the repository-owned single-user Compose deployment;
- review workflow: backend-derived blind review state over immutable assessment, reveal receipt, review, and binding records;
- Doctrine workflow: one exact proposal, one explicit operator-or-reviewer approval, optional retirement, and an approved-only projection;
- browser verification: Vitest/Testing Library and Chromium Playwright on desktop/mobile.

Implementation candidates that do not yet authorize dependencies are:

- large offline candle analysis: Parquet and DuckDB when needed;
- model access: a small provider-neutral adapter with structured-output support.

The implemented `@pa-agent-lab/contracts` slices have no runtime dependency. `@pa-agent-lab/chart-renderer` uses only ADR-0012's exact resvg-js dependency. `@pa-agent-lab/persistence-contracts` uses ADR-0013's exact Ajv and Microsoft jsonc-parser runtime dependencies; schema generation and PostgreSQL WASM conformance remain dev-only. ADR-0015 adds only exact `pg` and Fastify runtime dependencies in the Case Store/API packages and authorizes one synthetic-only loopback service. ADR-0018 adds no npm runtime dependency; it reuses Node HTTP and Docker Compose with an exact Node image digest. None authorizes provider access, real data ingestion, a replay engine, or execution mechanics.

Do not introduce SQLite, Qdrant, Chroma, Redis, Neo4j, LangChain, or LlamaIndex initially. Explicit retrieval and orchestration code is easier to audit for leakage, authority, and version identity.

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

- exact public source inventory, media/transcript identity, and permitted local excerpt policy beyond the frozen ADR-0017 URL snapshot;
- any separately authorized real-Case ingestion adapter;
- any future public-deployment TLS/OIDC/session/CSRF/authorization and security-log contract;
- dataset partitions, retrieval permissions, and genuinely untouched evaluation cases;
- exact semantic, consistency, and prefix-invariance acceptance thresholds;
- provider-specific pinned model IDs, retirement policy, external data-retention configuration, retry attempts, and rate limits;
- frozen evaluation selection policies, plus criteria for any later 15-minute or multi-timeframe generalization candidate under ADR-0009;
- criteria and exact fixtures for the Phase 8 NautilusTrader adoption gate, LEAN conformance snapshot, and cross-process reproducibility;
- exact engine/runtime/config/raw-artifact formats, Phase 8 execution-event normalization, fee, slippage, funding, latency, sizing, order, fill, position, and portfolio experiment contracts behind ADR-0014's opaque hashes;
- how Calvin reviews are repeated to measure reviewer stability without becoming runtime policy;
- criteria for promoting a `researchCandidate` to a new frozen Brooks-compatible policy version.
