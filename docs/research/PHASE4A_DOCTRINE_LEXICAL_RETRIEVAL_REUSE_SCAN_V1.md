# Phase 4A Doctrine Lexical Retrieval Reuse Scan V1

Status: CONTRACT-SELECTION EVIDENCE. NO IMPLEMENTATION AUTHORITY.

## Need

Phase 4A needs deterministic metadata and lexical retrieval over the exact approved, unretired `DoctrineRagRecordV1` projection. It must remain local, operator-authenticated, append-only, reproducible, and isolated from source text, draft or retired doctrine, Calvin review, research memory, model output, protected windows, and unauthorized V6 material.

Phase 4A does not fetch source pages, store full articles or transcripts, generate embeddings, enable `pgvector`, call a provider, read Cases, or generate an answer.

## Hard constraints

- PostgreSQL remains the sole system of record under ADR-0006 and ADR-0015.
- The initial corpus is small and closed: six exact public Source snapshots already represented by the Phase 3B pilot proposal seam.
- Retrieval searches only `concept`, `rule`, `appliesWhen`, `avoidWhen`, and `decisionEffect`.
- A query binds an immutable corpus snapshot and retrieval-profile hash.
- Ranking and tie-breaking are deterministic under the pinned Linux amd64 PostgreSQL runtime.
- Physical search indexes are acceleration structures, not semantic or audit authority.
- No new listener, credential, external service, crawler, embedding runtime, vector store, or model framework is permitted.

## Search channels

The scan inspected:

- installed Pi and agent skills;
- the skills.sh leaderboard and `npx skills find` results for `postgresql full text search`, `rag retrieval`, and `knowledge base ingestion`;
- ClawHub searches for `rag` and `postgresql`;
- the official MCP Registry searches for PostgreSQL and RAG servers;
- npm metadata and GitHub source/maintenance metadata;
- PostgreSQL 18 official full-text-search documentation;
- maintained JavaScript search libraries, PostgreSQL search extensions, and general RAG frameworks.

No skill, MCP server, or framework provides the project-specific approval, retirement, snapshot, immutable-evidence, or authority-isolation contract. Those rules must remain local TypeScript and PostgreSQL authority.

## Candidates

| Candidate | Evidence | Decision |
|---|---|---|
| PostgreSQL 18 built-in full-text search | PostgreSQL License; already present in the digest-pinned Phase 2/3 image; explicit `regconfig`, `tsvector`, query parsers, `ts_rank`/`ts_rank_cd`, and native GIN/GiST support; official docs state GIN is preferred but an index is not required for correct text search | Select `tsvector` plus a pinned V1 profile; permit native GIN only as non-authoritative acceleration |
| Existing `pg@8.22.0` | MIT; already pinned with exact npm integrity and already used by the Case Store | Reuse; no new package |
| Pinecone full-text-search skill | skills.sh result with 115 installs; requires `pinecone` Python SDK 9, Pinecone's remote preview API `2026-01.alpha`, asynchronous remote indexing, and service access | Reject: external service, Python runtime, preview API, credentials, and remote storage violate Phase 4A |
| skills.sh `wiki-ingest` | 1.3K installs; compiles arbitrary text into a mutable local wiki with its own storage and entity model | Reject: useful documentation workflow, but no approved-doctrine lifecycle or immutable retrieval evidence |
| ClawHub OpenClaw RAG skill | Local ChromaDB plus `all-MiniLM-L6-v2`; automatically indexes sessions, workspace code, skills, and memory | Reject: embeddings, broad automatic ingestion, chat/research-memory mixing, and a second store are explicitly forbidden |
| ClawHub general RAG guidance | Covers chunking, embeddings, hybrid retrieval, reranking, model providers, and mutable operational memory | Reject as implementation authority; its stable-ID and tie-break advice is consistent with, but cannot replace, the local contract |
| Official Registry PostgreSQL MCP servers | Expose generic database query/schema or remote integration tools; some are hosted services and permit arbitrary SQL surfaces | Reject: an MCP boundary adds database authority and network/tool exposure without removing local code |
| MiniSearch `7.2.0` | MIT, zero dependencies, about 6K GitHub stars, local in-memory full-text search | Reject: creates a second mutable in-process index and ranking authority beside PostgreSQL |
| FlexSearch `0.8.212` | Apache-2.0, about 13.7K GitHub stars, active, supports in-memory and persistent search across several stores | Reject: broad configurable indexing surface and second ranking implementation are unnecessary for the tiny PostgreSQL corpus |
| `@orama/orama@3.1.18` | Apache-2.0 in npm metadata, about 10.5K GitHub stars, full-text/vector/hybrid search and optional embedding/provider plugins | Reject: duplicates the system of record and brings vector/provider surfaces that Phase 4A excludes |
| `pg-tsquery@8.4.2` | ISC, about 60 GitHub stars, parses user strings into PostgreSQL queries | Reject: PostgreSQL's pinned `plainto_tsquery` is sufficient and avoids a second query grammar |
| ParadeDB `pg_search` | Maintained PostgreSQL BM25 extension, about 9.1K GitHub stars, AGPL-3.0 repository license | Reject: new PostgreSQL extension/image and ranking system are disproportionate to the initial corpus |
| VectorChord-BM25 | PostgreSQL BM25 extension plus a separate tokenizer extension/model path; about 375 GitHub stars | Reject: extra native extensions, tokenizer/model identity, and image changes are outside Phase 4A |
| LangChain, LlamaIndexTS, and Mastra | Maintained general RAG/agent frameworks with model, workflow, provider, telemetry, or broad parsing dependencies | Reject: no generation or orchestration is authorized, and they would duplicate existing strict contracts |
| Elasticsearch, OpenSearch, Meilisearch, Typesense, or another search service | Mature dedicated search options, but each introduces another service, persistence lifecycle, listener, and operational trust boundary | Reject for the closed V1 corpus |
| `pgvector` and embedding frameworks | The pinned image contains pgvector files, and the architecture retains a future vector direction | Defer to separately approved Phase 4B; do not create the extension or vector schema in Phase 4A |

## Selected boundary

```text
approved Phase 3B projection
  -> immutable canonical RAG records
    -> immutable corpus snapshot
      -> explicit PostgreSQL lexical ingestion run
        -> passed frozen quality suite
          -> append-only activation
            -> operator-only bounded query
              -> immutable ordered retrieval evidence
```

The V1 retrieval profile uses explicit PostgreSQL text-search configuration and functions. It must never rely on `default_text_search_config`, mutable synonym tables, query rewrites, fuzzy matching, highlights, or planner order.

A GIN index may accelerate the `@@` predicate. Its physical pages and planner choice are not stable content artifacts and therefore are not hashed as authority. The authoritative lexical manifest hashes the ordered canonical RAG records, their deterministic `tsvector` representations, the corpus snapshot, and the retrieval profile. Exact ranking plus `doctrineId` tie-breaking determines the audited order independently of index scan order.

## Dependency and service decision

Phase 4A adds no npm package, Python package, MCP configuration, external service, Docker image, or provider. It reuses:

- the existing digest-pinned PostgreSQL 18 image;
- PostgreSQL-native full-text-search types/functions and optional GIN acceleration;
- existing `pg@8.22.0`, strict JSON, generated schema/OpenAPI, Fastify, migration, role, API, and CLI seams.

The image contains pgvector binaries, but Phase 4A does not execute `CREATE EXTENSION vector`, create vector columns, generate embeddings, or perform vector/hybrid retrieval.

## References

- PostgreSQL 18, Controlling Text Search: <https://www.postgresql.org/docs/18/textsearch-controls.html>
- PostgreSQL 18, Preferred Index Types for Text Search: <https://www.postgresql.org/docs/18/textsearch-indexes.html>
- PostgreSQL 18, Additional Text Search Features: <https://www.postgresql.org/docs/18/textsearch-features.html>
- skills.sh: <https://skills.sh/>
- ClawHub: <https://clawhub.ai/skills>
- Official MCP Registry: <https://registry.modelcontextprotocol.io/>
