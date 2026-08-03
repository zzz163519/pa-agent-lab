# PA Agent Lab Open Decisions

Status: LIVE DISCUSSION INDEX. ITEMS ARE NOT APPROVED BY BEING LISTED HERE.

This file contains only unresolved decisions. Accepted decisions are recorded in the charter and ADRs.

## Doctrine corpus

Accepted source classes are Brooks public materials, direct material from the official Al Brooks YouTube channel, and reviewed third-party Brooks course transcripts such as approved Bilibili sources. ADR-0010 accepts a deliberately simple local Source plus `draft | approved | retired` DoctrineUnit workflow; RAG receives only approved core trading semantics.

Still open:

- choose the initial exact source set and create the first approved DoctrineUnits;
- map selected V6 definition candidates to Brooks semantics before approval.

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

ADR-0005 approves anonymous chart plus normalized causal OHLC and a GPT-5.6 versus Gemini 3.6 Flash peer bakeoff. ADR-0011 freezes the provider-neutral anonymous payload and run audit. ADR-0012 freezes deterministic local PNG bytes, manifests, and content-addressed chart artifacts without authorizing provider transport or calls.

Still open:

- pin exact provider/model versions and retirement behavior;
- verify provider endpoints accept the approved image and structured-output contract;
- freeze retry counts, timeout policy, rate limits, batching, usage audit, and valid-decision cost without changing logical decision-point symmetry;
- freeze provider-specific invalid-response codes and external retention configuration;
- define provider-specific image transport from validated local PNG bytes;
- define the quality gate and cost calculation before model evaluation.

## RAG and memory

Accepted: PostgreSQL plus `pgvector` as the first system of record; doctrine, Brooks cases, Calvin review, working memory, research outcome memory, audit, and model registry remain isolated.

Still open:

- define exact retrieval permissions when an actual RAG service is implemented;
- populate approved core DoctrineUnits and define a small retrieval-quality check;
- enforce exclusion of Calvin review and research memory from runtime retrieval.

## API and user interface

ADR-0015 fixes the Phase 2 synthetic-only operator REST/OpenAPI and PostgreSQL boundary. ADR-0016 fixes the Phase 3A synthetic-only, backend-enforced two-stage whole-decision review and same-origin Research Console. ADR-0018 fixes the local single-user trusted-loopback Compose deployment and its token-free reviewer browser path while preserving operator bearer authentication. ADR-0017 fixes one minimal local Doctrine proposal/approval/retirement workflow, with exact proposal allowlists and Calvin-or-Agent principal binding. None authorizes real data, providers, public deployment, market screening, RAG, replay, or execution.

Still open:

- define the separate real-Case ingestion authorization-before-open contract;
- define a future public-deployment threat model, TLS/OIDC/session/CSRF/authorization boundary if remote access is approved;
- reconsider SSE only if Phase 5 durable asynchronous model jobs demonstrate that REST polling is insufficient.

Local-only, single-user deployment remains accepted for the first version.

## Evaluation

Detailed partition and contact-state machinery is deferred until Phase 6. When evaluation begins, freeze a simple outcome-blind case list and identical candidate inputs.

Still open:

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

## Autonomous research

Still open:

- define when the Brooks baseline is stable enough to freeze;
- define evidence the Research Agent may inspect;
- define promotion, rejection, supersession, and retirement gates for `researchCandidate` versions;
- decide whether any future outcome optimization is permitted and under what separately approved contract.

## Deployment authority

Paper, Live, exchange submission, order placement, wallet access, and real-money use remain forbidden and are not implied by any architecture decision above.
