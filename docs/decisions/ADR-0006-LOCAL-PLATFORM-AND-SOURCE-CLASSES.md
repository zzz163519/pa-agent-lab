# ADR-0006: Local Research Platform and Source Classes

Status: ACCEPTED, AMENDED BY ADR-0007

## Decision

The first PA Agent Lab version is local-only and single-user. It exposes no public network or team authentication surface.

The initial engineering platform is:

- a `pnpm` workspace;
- strict TypeScript and ESM for contracts, API, UI, retrieval, model gateway, validator, and audit;
- a pinned PostgreSQL plus `pgvector` Docker image as the sole initial system of record;
- no SQLite, Qdrant, Chroma, Redis, or Neo4j in the first version;
- Python only after a separately approved model-training contract, except for the isolated deterministic replay sidecar accepted by ADR-0007 when Phase 8 is separately authorized.

No dependency or service is authorized before its implementation phase and contract are approved.

## Approved Brooks source classes

The source inventory may include:

1. Brooks public website materials and other direct public Brooks material;
2. direct material from the official Al Brooks YouTube channel;
3. reviewed third-party transcriptions of Brooks course material, including approved Bilibili sources.

Direct Brooks material is `brooks_primary`. A third-party transcription is a representation of Brooks material, not automatically an error-free official transcript. It requires exact media and transcript provenance, content hashing, review state, and bounded citation locations.

Complete copyrighted course transcripts or private source material must not be committed or redistributed. Local processing, excerpt storage, and citation behavior remain subject to the source inventory and permitted-use contract.

## External model boundary

External model APIs may eventually receive only the deterministically anonymized payload accepted in ADR-0005 plus bounded approved public doctrine evidence. Raw source corpora, raw market identity, outcomes, accounts, protected windows, and complete copyrighted transcripts remain local.

This ADR does not itself authorize provider integration or an external API call. ADR-0005's contract, privacy validator, audit, and evaluation gates must exist first.

## Consequences

- Local deployment, PostgreSQL/`pgvector`, and TypeScript/ESM are accepted architecture decisions rather than recommendations.
- Source-class acceptance does not authorize ingestion before exact sources, hashes, storage boundaries, and permissions are recorded.
- New databases, services, public deployment, or authentication surfaces require a later decision. New language runtimes remain forbidden except for a separately approved training pipeline or the isolated Phase 8 replay sidecar governed by ADR-0007.
