# Phase 3A Synthetic Blind Review Workflow V1

Status: IMPLEMENTED SYNTHETIC-ONLY REVIEW VERTICAL SLICE.

Authority: ADR-0003, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0015, ADR-0016, and ADR-0018.

## Scope

Phase 3A lets `local:calvin-reviewer` complete one backend-enforced, two-stage, whole-decision review of an existing deployment-authorized synthetic Case and BrooksDecision. It adds no data ingestion, model call, Doctrine approval, replay, market screening, Paper, Live, or execution authority.

## Records

Migration `0003_phase3a_blind_review_workflow_v1.sql` adds three append-only tables:

```text
pa_calvin_independent_assessments
pa_decision_reveal_receipts
pa_calvin_review_workflow_bindings
```

Every table rejects extra top-level JSON keys, recomputes the canonical SHA-256 identity from the hash-free JSON body inside PostgreSQL, checks JSON/column equality, and rejects UPDATE, DELETE, and TRUNCATE. Generated cutoff columns on the anonymous policy input and composite foreign keys bind:

- assessment to the exact decision, Case, input, input cutoff, and frozen independent verdict;
- receipt to the exact assessment and decision;
- binding to the exact assessment, receipt, decision, final review, and matching independent verdict.

### CalvinIndependentAssessmentV1

The record contains assessment identity, Case/input/cutoff identity, hidden BrooksDecision identity, `independentVerdict`, required `blindSummary` of at most 600 characters, `outcomeBlind: true`, `brooksDecisionContentSeen: false`, fixed reviewer principal, and fixed protocol version. It contains no disposition, field patch, probability, confidence, plan, order, outcome, PnL, or client timestamp.

### DecisionRevealReceiptV1

The reveal command requires the exact assessment hash. The server inserts or confirms the immutable receipt before returning BrooksDecision. One assessment and decision have at most one receipt.

### CalvinReviewWorkflowBindingV1

Final submission accepts only Case, assessment, receipt, disposition, and required whole-decision summary. The server rebuilds `CalvinReviewV1` using the frozen independent verdict, validates it against the exact BrooksDecision, creates the binding, and inserts review plus binding in one transaction.

## Derived state

```text
assessment absent                           awaiting_assessment
assessment present, receipt absent          awaiting_reveal
assessment and receipt present              awaiting_final_review
assessment, receipt, review, binding present completed
```

Any skipped, partial, duplicate, or mismatched combination fails closed. The queue sorts deterministically by Case hash and exposes no verdict, conflict, outcome, or priority.

## Blind detail

Before reveal, `ReviewWorkItemDetailV1` contains:

- `sourceScope: synthetic_fixture_only`;
- anonymous Case and draft identities;
- `AnonymousMarketInputV1` without Doctrine records;
- context/detail artifact ID, content hash, panel, and dimensions;
- optional frozen assessment view with decision identity removed;
- `decision: null`, `revealReceipt: null`, `review: null`, `workflowBinding: null`, and `decisionConflict: null`.

After receipt, the same endpoint may return the exact BrooksDecision and receipt. Final records and derived conflict appear only in `completed` state.

## Authentication

- operator routes require the Phase 2 operator token;
- direct host-process reviewer routes require the per-launch reviewer token;
- the ADR-0018 Compose deployment may map an absent Authorization header to `local:calvin-reviewer` only in explicit `trusted_loopback` mode behind the fixed loopback gateway;
- an invalid Authorization header never falls back to trusted reviewer identity;
- the anonymous PNG route accepts either principal;
- health and readiness remain unauthenticated;
- Host and Origin remain explicit loopback allowlists;
- operator and reviewer bearer tokens must be at least 32 characters and unequal;
- reviewer responses and console HTML use `Cache-Control: no-store`.

The direct host-process bootstrap URL is `/console/#token=<per-launch-token>`. `phase3a:server` builds the SPA and sets `PA_CONSOLE_ROOT`; the existing `phase2:server` remains usable without frontend assets. Fragment material is never sent in the HTTP request. The bearer-mode SPA stores it in tab-local `sessionStorage`, removes the fragment, and adds the bearer token to same-origin API/PNG fetches.

The ADR-0018 deployment builds the SPA in trusted-loopback mode and exposes the stable `/console/` URL with no browser token state. PostgreSQL and Console remain on an internal-only Docker network; a credential-free fixed-target gateway alone publishes the loopback port. This is accepted local single-user identity, not public authentication.

## Research Console

The React application provides:

- a durable app shell with only the authorized Review module visible;
- deterministic anonymous queue and four-state progress;
- authenticated 120/40 PNGs with fixed responsive framing;
- causal integrity and normalized OHLC inspection;
- tab-local blind draft auto-save bound to `draftIdentityHash`, removed after a successful freeze or when resumed server state proves that assessment is already frozen;
- per-mount authenticated chart object URLs that are revoked without leaving stale cached blob URLs;
- explicit freeze and final-submit confirmations;
- full read-only BrooksDecision semantics and canonical record after reveal;
- immutable assessment, final review, binding, and conflict views after completion.

No browser state is research authority. Refresh and resume always reload server-derived state.

`seed-review-work-item` is the Phase 3A trial seeder. It persists the same deterministic authorized bundle and BrooksDecision but intentionally omits `CalvinReviewV1`, leaving one `awaiting_assessment` queue item. It never uses the reviewer token.

## Generated transport

```text
packages/persistence-contracts/schemas/phase3a-review-workflow-v1.schema.json
packages/persistence-contracts/openapi/phase3a-review-workflow-v1.openapi.json
```

These artifacts are independent of the unchanged Phase 1 record schema and Phase 2 Case Store schema. Runtime Fastify validation consumes the committed Phase 3A schema bundle and the same five-route manifest used by OpenAPI tests. All reviewer JSON success responses use the generated exact response schemas, while an additional backend state assertion rejects any decision-bearing pre-reveal work item.

## Verification requirements

Required checks include:

- exact-key/hash/cross-binding contract tests;
- PGlite and real PostgreSQL migration/relationship/privilege tests;
- assessment/reveal/final sequencing and identity conflict tests;
- injected failure proving review/binding rollback;
- operator/reviewer cross-principal rejection;
- pre-reveal response scans for BrooksDecision fields and exact identities;
- duplicate-key, unknown-field, body-bound, Host/Origin, CSP, and no-store tests;
- tab-local bearer token/draft tests and token-free trusted-loopback bootstrap tests;
- trusted-loopback API tests proving no-credential reviewer identity, invalid-credential rejection, operator separation, and foreign Host/Origin rejection;
- Compose tests proving fixed loopback publication, internal database/app networks, credential-free gateway, blocked app egress, migration completion, restart persistence, and no-token browser rendering;
- desktop and mobile Chromium workflows using actual Fastify, PGlite, PNG bytes, and production assets;
- chart natural-pixel, layout-overflow, screenshot, and nonblank pixel checks.

Tests prove workflow, authority, privacy, immutability, and causal display behavior. They do not prove Price Action correctness, model quality, or profitability.

## Deferred and forbidden

- DoctrineUnit approval or corpus promotion;
- real Case ingestion and all protected/development/evaluation windows;
- market-universe discovery, deterministic screening, candidate state, and Agent calls;
- SSE, WebSocket, remote/public deployment, OIDC, or user management;
- provider, RAG, evaluation, training, or model orchestration;
- replay engine, fills, sizing, costs, position, portfolio, PnL, or accounting;
- Paper, Live, exchange, wallet, credentials, or real money.
