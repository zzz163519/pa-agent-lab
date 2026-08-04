# PA Agent Lab Open Decisions

Status: LIVE DISCUSSION INDEX. ITEMS ARE NOT APPROVED BY BEING LISTED HERE.

This file contains only unresolved decisions. Accepted decisions are recorded in the charter and ADRs.

## Doctrine corpus

Accepted source classes are Brooks public materials, direct material from the official Al Brooks YouTube channel, and reviewed third-party Brooks course transcripts such as approved Bilibili sources. ADR-0010 accepts a deliberately simple local Source plus `draft | approved | retired` DoctrineUnit workflow; RAG receives only approved core trading semantics. ADR-0023 records that the current nine approved public pilot units prove the lifecycle/retrieval platform but do not form a coverage-complete V1 Brooks semantic baseline.

Still open:

- accept the exact Phase 3C V1 Brooks semantic coverage matrix, completion criteria, counterexample/conflict requirements, and residual-gap format;
- authorize the exact selected public Source snapshots and bounded read-only access/extraction workflow; the 182 inventory candidates are discovery metadata, not a bulk-ingestion target;
- authorize exact Doctrine proposal batches and explicit item-level approvals or retirements;
- accept the Phase 4A2 expanded Source allowlist, complete-snapshot quality suite, activation, and coverage-acceptance record;
- map selected V6 definition candidates to Brooks semantics before approval without using V6 outcomes or artifacts as doctrine authority.

## Brooks decision and Calvin review

ADR-0003 makes the Brooks Policy Agent the sole first runtime policy and keeps Calvin auxiliary and offline. ADR-0008 fixes scheduling, ADR-0009 fixes five-minute decisions, and ADR-0010 freezes the V1 BrooksDecision, whole-decision CalvinReview, and deterministic Conflict semantics.

Still open:

- decide whether a later version adds calibrated probability output;
- decide whether a later, separately isolated `activePremiseReview` is useful after the entry-only baseline is evaluated.

## V6 reuse

ADR-0004 and `V6_READ_ONLY_REUSE_INVENTORY_V1.md` approve bounded read-only definition reuse.

Still open:

- pin an immutable source identity for currently untracked V2/V3 working-tree candidates before adaptation;
- approve the exact Phase 1 subset to re-author locally;
- produce Brooks provenance for semantic definitions before promotion;
- define the PA-local import manifest schema.

## Model and privacy

ADR-0005 approves anonymous chart plus normalized causal OHLC and a GPT-5.6 versus Gemini 3.6 Flash peer bakeoff. ADR-0011 freezes the provider-neutral anonymous payload and run audit. ADR-0012 freezes deterministic local PNG bytes and manifests. Accepted design-only ADR-0022 fixes the future CLI surfaces and model IDs as `agy`/`gemini-3.6-flash-high` and Codex CLI/`gpt-5.6`, both at high effort. It also fixes one visible attempt, a 300-second timeout, serial execution, minimal local retention, observable token/latency evidence, no model fallback, and a Prompt Package V2 stop/limit normalized-geometry direction. `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json` separately authorized the offline contracts, fake-executable adapter foundation, fixed resource bounds, and exact unapproved Prompt Package V2 proposal only. `PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json`, hash `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`, accepts exact commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` only as that fake-only offline foundation. Post-acceptance review found that its V2 validator did not bind proposed prices to their referenced anchors, so Calvin deferred V2 exact-content approval. `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_AUTHORIZATION_V1.json`, hash `sha256:3ae8d0ace9dc610a78db6fcabb300ffecbfd24b7f62f8c54ff743a3b3de28aef`, authorized only the four adjudicated offline relation checks and their tests. `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json`, hash `sha256:d5358718426069376660ee7d381ca7062f7141926105edd0237d4b5197054d76`, accepts exact commit `7e44a44b34fc4b5695af6f00d7366b989a42e716` only as that correction. `BROOKS_PROMPT_PACKAGE_V2.approval.json`, hash `sha256:429c5d53086a77c9bf826a20c23e11d08d53ef4d36bdda591ceefe18931affce`, separately approves exact package content hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598` without changing package bytes or authorizing activation. None of these records proves installed-CLI capability/privacy, a production supervisor, real CLI invocation, or provider-call eligibility.

Still open:

- separately authorize exact Prompt Package V2 activation and synthetic prepared-payload creation only after the ADR-0023 Phase 3C/4A2 and post-corpus assembly gates are met;
- prove Antigravity interaction-data opt-out, acceptable external retention, isolated exact PNG attachment, and complete plugin/MCP/rule/history exclusion;
- prove no hidden retry and the required machine-output/isolation capabilities for both installed CLIs;
- freeze any future persistence/migration shape needed to reconcile the pure request/terminal contracts with actual runtime records;
- independently authorize any first bounded synthetic external call only after package and implementation acceptance;
- freeze Phase 6 outcome-blind sample, pass thresholds, symmetry, falsification, and any later auditable monetary-cost comparison.

## RAG and memory

Accepted: ADR-0019 and the Phase 4A contract implement the initial exact six-Source platform, complete approved/unretired snapshot projection, operator-only deterministic PostgreSQL lexical retrieval, outcome-free quality checks, explicit activation, and immutable query evidence. The current activation contains the exact nine public pilot DoctrineUnits; “complete” describes projection of that eligible pilot set, not Brooks semantic coverage. ADR-0020 and the accepted Phase 5A contract implement operator-only explicit rollback plus synthetic-only full-current-corpus Policy Assembly with no Case-derived query or model call. PostgreSQL remains the system of record; doctrine, Brooks cases, Calvin review, working memory, research outcome memory, audit, and model registry remain isolated.

Still open:

- implement Phase 4A2 only after its expanded allowlist, complete-snapshot quality suite, activation, and coverage acceptance are separately approved;
- after the Phase 4A2 snapshot count is known, retain full-corpus assembly only if it remains within the exact 32-record/byte bounds; otherwise define and approve Selector V2 or a separately justified assembly revision;
- approve Phase 4B embedding runtime, `pgvector` extension/schema, vector or hybrid retrieval, reranking, provider/privacy boundaries, and associated quality contract only if separately justified; Phase 4B is not a default Phase 4A2 prerequisite;
- define and approve any future Selector V2, including deterministic Case-to-query construction, multi-query union/deduplication, RRF, immutable selector evidence, and policy-worker retrieval authority;
- authorize any future Prompt Package activation or rollback only through a new separate Calvin decision; the first exact V1 standard activation has been performed and is current;
- authorize any Prompt Package V2 activation or rollback only through a new separate Calvin decision; exact V2 package content is approved, but activation/preparation are paused by ADR-0023;
- authorize any real CLI invocation or external call only through a new separate Calvin decision after the ADR-0023 semantic/evaluation prerequisites and installed-CLI privacy/isolation/capability proof; exact offline implementation acceptance is complete but grants no call authority;
- expand the exact public Source allowlist only through a separately approved versioned decision.

## API and user interface

ADR-0015 fixes the Phase 2 synthetic-only operator REST/OpenAPI and PostgreSQL boundary. ADR-0016 fixes the Phase 3A synthetic-only, backend-enforced two-stage whole-decision review and same-origin Research Console. ADR-0018 fixes the local single-user trusted-loopback Compose deployment and its token-free reviewer browser path while preserving operator bearer authentication. ADR-0017 fixes one minimal local Doctrine proposal/approval/retirement workflow, with exact proposal allowlists and Calvin-or-Agent principal binding. None authorizes real data, providers, public deployment, market screening, RAG, replay, or execution.

Still open:

- define the separate real-Case ingestion authorization-before-open contract;
- define a future public-deployment threat model, TLS/OIDC/session/CSRF/authorization boundary if remote access is approved;
- reconsider SSE only if Phase 5 durable asynchronous model jobs demonstrate that REST polling is insufficient.

Local-only, single-user deployment remains accepted for the first version.

## Evaluation

Detailed partition and contact-state machinery is deferred until Phase 6. ADR-0023 requires the real-Case boundary, outcome-blind sample, candidate symmetry, adjudication rubric, thresholds, and falsification criteria to be frozen before provider outputs are inspected.

Still open:

- define and authorize the separate read-only real-Case ingestion boundary, authorization-before-open checks, protected-window rejection, dataset partitions, and contact state;
- freeze the exact outcome-blind case list and permanently exclude any synthetic transport-smoke case from formal evaluation;
- define source-grounded semantic adjudication for determinate BrooksDecision fields without converting CalvinReview into runtime or field-patch authority;
- define doctrine, abstention, consistency, prefix-invariance, mirror, privacy, and retrieval-isolation thresholds;
- define evidence that falsifies the model approach or requires a deterministic baseline;
- define actual valid-decision cost and latency measurement for the model bakeoff.

## Deterministic replay

ADR-0007 accepts NautilusTrader as the first Phase 8 replay sidecar candidate and LEAN only as a bounded conformance challenger. ADR-0014 freezes the provider-neutral Phase 1 request/result identity, exact-slice authorization, strictly post-cutoff provenance, terminal states, and opaque audit hashes. PA Agent Lab will not build a complete replay, matching, portfolio, and accounting engine from scratch. No replay engine installation or execution is authorized before separate Phase 8 approval.

Still open:

- pin the exact NautilusTrader release, image digest, Python/runtime identity, and TypeScript adapter protocol;
- freeze the exact engine config and raw-artifact formats referenced by ADR-0014's opaque hashes;
- freeze deterministic sizing, fee, slippage, funding, latency, order, and portfolio assumptions;
- freeze Phase 8 execution-event normalization beyond ADR-0014's identity/provenance boundary;
- freeze the hand-computed fixtures and tolerances used for the LEAN conformance snapshot;
- prove offline sandboxing, absence of credentials and Paper/Live configuration, and cross-container reproducibility.

## Future agent runtime and market observation

`FUTURE_AGENT_RUNTIME_LEARNING_AND_MARKET_OBSERVATION_DIRECTION_V1.md` records the discussion direction: evaluate Hermes as a future research/learning control plane, retain a narrow repository-owned Policy Worker and deterministic risk/execution boundary, persist market state outside LLM chat history, and design a bounded candidate selector before broad market policy calls. It is not an accepted ADR and grants no implementation or deployment authority.

Still open:

- accept or reject Hermes and pin its exact version, isolation, memory, data-read, and candidate-write permissions;
- select the provider-neutral Policy Worker library and transport;
- define continuous real-market ingestion, provisional state, closed-snapshot, restart, and recovery contracts;
- define selector semantics, coverage/miss measurement, distribution-shift controls, and baseline comparison;
- decide manual versus bounded automatic candidate promotion and rollback gates.

## Autonomous research

Still open:

- define when the Brooks baseline is stable enough to freeze;
- define evidence the Research Agent may inspect;
- define promotion, rejection, supersession, and retirement gates for `researchCandidate` versions;
- decide whether any future outcome optimization is permitted and under what separately approved contract.

## Deployment authority

Paper, Live, exchange submission, order placement, wallet access, and real-money use remain forbidden and are not implied by any architecture decision above.
