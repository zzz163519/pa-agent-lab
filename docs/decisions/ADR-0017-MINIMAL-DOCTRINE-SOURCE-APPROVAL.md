# ADR-0017: Minimal Doctrine Source Approval

Status: ACCEPTED FOR PHASE 3B IMPLEMENTATION.

## Decision

Phase 3B adds one local, explicit approval path for source-mapped draft DoctrineUnits. It reuses `SourceV1`, `DoctrineUnitV1`, the existing loopback API, PostgreSQL store, operator/reviewer bearer principals, CLI, and Research Console.

One `DoctrineProposalBundleV1` binds one Source, one `draft` DoctrineUnit, one precise source locator, and one canonical proposal hash. The deployment admits only exact authorized proposal hashes.

Either authenticated principal may approve:

- `local:calvin-reviewer` records Calvin approval;
- `local:phase2-operator` records approval by the authorized Direct Pi/agent operator.

The server derives the principal from the bearer credential. A client cannot choose or forge it. The proposer may later perform the explicit approval, but proposal creation never implies approval.

One approval record changes the derived status from `draft` to `approved`. One later retirement record changes it to `retired`. Proposal, approval, and retirement records are immutable and append-only; no mutable status table or record replacement exists.

## Source boundary

The public URL inventory distinguishes `doctrine_candidate` from `inventory_only`. Candidate status is discovery eligibility only. Proposal authorization and a precise locator are still required.

Official site ownership alone does not make contributor market analysis Brooks doctrine. Time-specific analysis, translations, unverified speakers, user/member content, and publisher metadata remain inventory-only. Direct third-party interviews can become proposals only when Al Brooks is the attributable speaker and the exact public snapshot and locator are reviewable.

Full copyrighted text is not persisted. Protected `2025-02`, `2025-05`, and `2025-08` market windows remain forbidden.

## API and interface

Phase 3B adds synchronous request/response routes to append an authorized proposal, list/get work items, approve, and retire. The existing same-origin Research Console adds a read-only source/semantics view with Approve and Retire commands. Draft creation and editing remain outside the browser.

## Not authorized

This ADR does not authorize embeddings, `pgvector` installation, retrieval, provider calls, private corpus access, real Case ingestion, evaluation, replay execution, training, Paper, Live, exchange, wallet, or real-money action.
