# ADR-0016: Synthetic Blind Review Workflow and Research Console Foundation

Status: ACCEPTED AND IMPLEMENTED FOR PHASE 3A.

## Context

ADR-0010 defines whole-decision `CalvinReviewV1`, but that record alone cannot prove Calvin selected `independentVerdict` before seeing BrooksDecision content. ADR-0015 exposes a full operator audit route, so frontend-only hiding would be bypassable and could not establish blind sequencing.

Phase 3A needs one usable local workflow without authorizing real Case ingestion, Doctrine approval, provider calls, replay, market scanning, public deployment, or trading. It also needs a frontend foundation that can later host separately approved research modules without pretending those modules exist today.

## Decision

### Two-stage workflow

One synthetic BrooksDecision has one immutable workflow:

```text
awaiting_assessment
  -> awaiting_reveal
  -> awaiting_final_review
  -> completed
```

State is derived only from immutable records. There is no mutable workflow-status table.

Before reveal, the reviewer receives only:

- anonymous 120/40 PNG identities and authenticated bytes;
- normalized causal OHLC;
- continuity, missing-data, and left-censoring state;
- anonymous cutoff and five-minute duration;
- a server-owned draft identity hash.

BrooksDecision content, Doctrine content, raw prices, source identity, real time, venue, outcomes, future bars, PnL, and execution state are absent.

### Immutable workflow evidence

Add:

- `CalvinIndependentAssessmentV1` for the complete blind verdict and required bounded summary;
- `DecisionRevealReceiptV1`, inserted before the server returns BrooksDecision content;
- `CalvinReviewWorkflowBindingV1`, binding assessment, receipt, BrooksDecision, final `CalvinReviewV1`, reviewer principal, and protocol.

`CalvinReviewV1` remains unchanged. Final review and workflow binding are inserted in one serializable transaction. Exact retries are idempotent; conflicting reuse is rejected. One BrooksDecision cannot be assessed or reviewed again in V1.

The fixed reviewer is `local:calvin-reviewer`; the server supplies the principal, identities, independent verdict, and formal review fields. After reveal, the client may submit only disposition and one required whole-decision summary.

### Authentication and transport

Phase 2 operator and Phase 3A reviewer tokens are distinct principals. Each route manifest entry declares `operator_token`, `reviewer_token`, `operator_or_reviewer_token`, or `none` explicitly.

Five reviewer workflow routes use loopback REST/OpenAPI:

```text
GET  /v1/reviewer/work-items
GET  /v1/reviewer/work-items/:caseHash
POST /v1/reviewer/independent-assessments
POST /v1/reviewer/work-items/:caseHash/reveal
POST /v1/reviewer/final-reviews
```

The existing anonymous PNG route accepts either local principal; complete Case and audit routes remain operator-only. Reviewer responses use `Cache-Control: no-store`.

The server generates a new reviewer token for every launch and places it only in the URL fragment. The SPA moves it to tab-local `sessionStorage` and removes it from the URL. An unsubmitted blind draft is stored only in that tab under the exact server-owned workflow identity and is deleted after assessment freeze. No token or draft is persisted to PostgreSQL or localStorage.

### Research Console

Create `@pa-agent-lab/research-console` as a React/Vite strict-TypeScript SPA served by Fastify at `/console/` on the same loopback origin. The implemented app shell exposes only the Review module. It does not show empty market, candidate, provider, replay, or execution modules.

The backend remains authoritative for queue state and workflow transitions. TanStack Query synchronizes server state; React Router owns module navigation. The browser performs no candidate screening or research-policy decision.

Fastify serves immutable hashed assets, an uncached index, strict self-only CSP, `no-referrer`, and no CORS. This remains local authentication, not public security authority.

## Dependencies

Runtime dependencies are pinned exactly:

- `react@19.2.8`, `react-dom@19.2.8`;
- `vite@8.2.0`, `@vitejs/plugin-react@6.0.5`;
- `react-router@8.3.0`;
- `@tanstack/react-query@5.101.4`;
- `lucide-react@1.28.0`;
- `@fastify/static@10.1.2`, `@fastify/helmet@13.1.0`.

Vitest, Testing Library, jsdom, and Playwright are dev-only verification tools. No UI kit, CSS framework, ORM, state store, OpenAPI code generator, table/virtualization, market-chart, streaming, or user-management dependency is added.

## Consequences

- Backend evidence, not UI visibility, proves the blind sequence.
- Queue and pre-reveal responses cannot contain BrooksDecision content.
- Pause/resume is supported after assessment or reveal without mutable rows.
- Legacy operator `CalvinReviewV1` remains a Phase 2 semantic path; a reviewer work item containing a review without complete Phase 3A workflow evidence fails closed.
- Public deployment still requires a separate threat model and ADR.
- Doctrine approval, real ingestion, market discovery/screening, provider calls, replay mechanics, Paper, Live, exchange, wallet, and real-money activity remain unauthorized.

## Reuse evidence

`docs/research/PHASE3A_RESEARCH_CONSOLE_REUSE_SCAN_V1.md` records selected and rejected candidates and compatibility evidence.
