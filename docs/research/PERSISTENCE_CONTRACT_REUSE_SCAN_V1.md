# Persistence Contract Reuse Scan V1

Status: COMPLETED REUSE SCAN FOR ADR-0013.

## Need

The Phase 1 persistence slice needs:

- strict JSON syntax and duplicate-key rejection;
- structural validation without rewriting the existing TypeScript contracts by hand;
- OpenAPI 3.1 components that cannot drift silently;
- PostgreSQL migration conformance without starting a long-lived service.

The tools remain subordinate to local causal, privacy, renderer, hash, and audit validators. None may fetch data, open a listener, use credentials, or become semantic authority.

## Search channels

Candidates were inspected through npm metadata, GitHub repository metadata/source documentation, web search, and installed package declarations. Skills and MCP registries do not provide a narrower authoritative schema or PostgreSQL-constraint seam for this local build-time task; adding an MCP server would widen the boundary without removing code or trust.

## Candidates

| Candidate | Evidence | Decision |
|---|---|---|
| Native `JSON.parse` | Zero dependency, but duplicate object names use last-value-wins behavior and no token callbacks exist | Reject as the strict boundary |
| `jsonc-parser@3.3.1` | Microsoft, MIT, about 212 KB unpacked, no runtime dependencies, maintained, about 751 GitHub stars; exposes strict parse errors and object-property visitor callbacks | Select for syntax and duplicate-key detection |
| `ajv@8.20.0` | MIT, maintained JSON Schema implementation with draft 2020-12 support | Select for runtime structural validation |
| `ts-json-schema-generator@2.9.0` | MIT, maintained, about 1,710 GitHub stars; generates closed object schemas from existing exported interfaces | Select as dev-only schema generator |
| Zod 4 + Zod-to-OpenAPI | Mature, but would require re-authoring the existing domain contracts as a second schema authority; Zod is about 4.5 MB unpacked before adapter dependencies | Reject for this slice |
| TypeBox | Mature schema-first option, but migration would duplicate or replace accepted interface and validator definitions | Reject for this slice |
| Fastify schema/OpenAPI plugins | Appropriate after API routes exist, but would create a service dependency and endpoint assumptions in Phase 1 | Defer to Phase 2 |
| `@electric-sql/pglite@0.5.4` | Apache-2.0/PostgreSQL, about 15,705 GitHub stars, PostgreSQL compiled to WASM, executes JSONB, PL/pgSQL, triggers, and constraints in process | Select as dev-only migration conformance runner |
| `pg-mem` | Smaller but reimplements PostgreSQL semantics in JavaScript | Reject for authoritative migration behavior |
| Docker PostgreSQL/pgvector | Correct Phase 2 integration target, but exact image/digest and service lifecycle are not yet frozen | Defer |

## Selected boundary

```text
jsonc-parser token pass
  -> Ajv generated structural schema
    -> existing PA domain validators
      -> PostgreSQL-native constraints
        -> PGlite dev-only conformance
```

The selected libraries remove mature parsing, schema-validation, schema-generation, and PostgreSQL execution work. Repository code remains limited to orchestration, PA-specific metadata identity, generated-document assembly, and accepted database constraints.

## Dependency authority

Runtime dependencies authorized only for `@pa-agent-lab/persistence-contracts`:

- `jsonc-parser@3.3.1`;
- `ajv@8.20.0`.

Dev-only dependencies:

- `ts-json-schema-generator@2.9.0`;
- `@electric-sql/pglite@0.5.4`.

No global package, MCP configuration, database process, Docker image, listener, credential, provider, market-data client, or trading capability is installed by this decision.
