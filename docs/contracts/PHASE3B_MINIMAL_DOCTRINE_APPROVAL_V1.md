# Phase 3B Minimal Doctrine Approval V1

Status: ACCEPTED IMPLEMENTATION CONTRACT. Authority: ADR-0017.

## Purpose

Phase 3B lets Calvin or the authorized Direct Pi/agent operator explicitly approve a deployment-authorized, source-mapped draft DoctrineUnit. It is local-only and adds no RAG or provider behavior.

## Records

`DoctrineProposalBundleV1` contains exactly:

- `schemaVersion` and canonical `proposalHash`;
- one validated public `SourceV1` whose reference is an absolute HTTPS URL;
- one validated `DoctrineUnitV1` whose status is `draft` and whose `sourceId` matches the Source;
- one non-empty source locator of at most 600 characters.

`DoctrineApprovalV1` binds the exact proposal hash, doctrine ID, source ID, source content hash, and authenticated approver principal. It has one canonical approval hash.

`DoctrineRetirementV1` binds the exact approval and proposal, doctrine ID, authenticated principal, and a required reason of at most 400 characters. It has one canonical retirement hash.

The visible status is derived:

- no approval: `draft`;
- approval and no retirement: `approved`;
- retirement: `retired`.

Changing source metadata, locator, or doctrine wording creates a different proposal hash. Existing accepted records are never updated.

## Authorization

Proposal insertion requires the operator token and an exact deployment-authorized proposal hash. List, detail, approve, and retire accept the existing operator or reviewer token. The API supplies the principal from authenticated request state; command JSON contains no principal field.

Approval is one explicit command. There is no automatic promotion, dual-agent review, voting, blind stage, mutable draft editor, or generic workflow state machine.

## Persistence

Three PostgreSQL tables persist proposals, approvals, and retirements. Database constraints independently enforce exact top-level JSON keys, canonical hashes, source/doctrine identity agreement, one approval, retirement only after approval, and append-only protection including `TRUNCATE`.

## Research Console and CLI

The Console lists proposal status and shows source title, URL/reference, locator, and the five DoctrineUnit semantic fields. It can approve a draft or retire an approved unit. It does not fetch source content or edit proposals.

The CLI can seed the initial public pilot proposals, approve, retire, and inspect work items. Seeding never approves.

## Exclusions

Draft and retired units cannot produce `DoctrineRagRecordV1`. Phase 3B does not install `pgvector`, generate embeddings, run retrieval, call providers, read private/member material, ingest real Cases, or add replay/trading authority.

Tests prove identity, provenance, principal binding, persistence, transport, and lifecycle behavior. They do not prove doctrine correctness, market applicability, model quality, or profitability.
