# Third-Party Notices

PA Agent Lab keeps third-party dependencies narrowly scoped and pinned by `pnpm-lock.yaml`.

## resvg-js

- Packages: `@resvg/resvg-js@2.6.2` and `@resvg/resvg-js-linux-x64-gnu@2.6.2`
- Project: [resvg-js](https://github.com/thx/resvg-js)
- Source release: [v2.6.2](https://github.com/thx/resvg-js/tree/v2.6.2)
- License: [Mozilla Public License 2.0](https://github.com/thx/resvg-js/blob/v2.6.2/LICENSE)
- Use: unmodified SVG-to-PNG rasterization dependency for the ADR-0012 anonymous chart renderer

PA Agent Lab does not copy or modify resvg-js source files. Installed packages retain their own license files and notices. The repository does not commit `node_modules` or native binaries.

## Ajv

- Package: `ajv@8.20.0`
- Project: [Ajv JSON Schema validator](https://github.com/ajv-validator/ajv)
- Source release: [v8.20.0](https://github.com/ajv-validator/ajv/tree/v8.20.0)
- License: [MIT](https://github.com/ajv-validator/ajv/blob/v8.20.0/LICENSE)
- Use: runtime JSON Schema 2020-12 structural validation in the ADR-0013 persistence boundary

## Microsoft jsonc-parser

- Package: `jsonc-parser@3.3.1`
- Project: [node-jsonc-parser](https://github.com/microsoft/node-jsonc-parser)
- Source release: [v3.3.1](https://github.com/microsoft/node-jsonc-parser/tree/v3.3.1)
- License: [MIT](https://github.com/microsoft/node-jsonc-parser/blob/v3.3.1/LICENSE.md)
- Use: strict JSON syntax traversal and duplicate-key detection in the ADR-0013 persistence boundary

## ts-json-schema-generator

- Package: `ts-json-schema-generator@2.9.0`
- Project: [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator)
- Source release: [v2.9.0](https://github.com/vega/ts-json-schema-generator/tree/v2.9.0)
- License: [MIT](https://github.com/vega/ts-json-schema-generator/blob/v2.9.0/LICENSE)
- Use: dev-only deterministic generation of ADR-0013 JSON Schema and OpenAPI components

## PGlite

- Package: `@electric-sql/pglite@0.5.4`
- Project: [PGlite](https://github.com/electric-sql/pglite)
- Source release: [`@electric-sql/pglite@0.5.4` commit](https://github.com/electric-sql/pglite/tree/25d0a55e1f1e4c59f26d9e125150dda88a33fd00)
- License: [Apache-2.0 and PostgreSQL](https://github.com/electric-sql/pglite/blob/25d0a55e1f1e4c59f26d9e125150dda88a33fd00/LICENSE)
- Use: dev-only in-process PostgreSQL WASM conformance tests for the ADR-0013 migration

## Fastify

- Package: `fastify@5.11.0`
- Project: [Fastify](https://github.com/fastify/fastify)
- Source release: [v5.11.0](https://github.com/fastify/fastify/tree/v5.11.0)
- License: [MIT](https://github.com/fastify/fastify/blob/v5.11.0/LICENSE)
- Use: ADR-0015 loopback-only REST routing, bounded raw-body parsing, route injection, and generated-schema consumption

## node-postgres

- Package: `pg@8.22.0`
- Project: [node-postgres](https://github.com/brianc/node-postgres)
- Source release: [`pg@8.22.0`](https://github.com/brianc/node-postgres/releases)
- License: [MIT](https://github.com/brianc/node-postgres/blob/master/LICENSE)
- Use: ADR-0015 PostgreSQL Pool/client access, parameterized SQL, transactions, and SQLSTATE handling

## Phase 3A Research Console runtime

The following MIT-licensed packages are used unmodified for the ADR-0016 local Research Console:

- `react@19.2.8` and `react-dom@19.2.8`: component and browser rendering runtime;
- `react-router@8.3.0`: SPA module routing;
- `@tanstack/react-query@5.101.4`: reviewer API server-state synchronization;
- `lucide-react@1.28.0`: accessible command icons;
- `vite@8.2.0` and `@vitejs/plugin-react@6.0.5`: production SPA build tooling;
- `@fastify/static@10.1.2`: same-origin hashed asset and SPA index serving;
- `@fastify/helmet@13.1.0`: CSP and local HTTP security headers.

Official projects and licenses are distributed in each installed package and are pinned by `pnpm-lock.yaml`. PA Agent Lab does not modify or redistribute their source.

## Phase 3A frontend verification

The following MIT-licensed packages are dev-only:

- `vitest@4.1.10` and `jsdom@30.0.1`;
- `@testing-library/react@16.3.2`, `@testing-library/dom@10.4.1`, and `@testing-library/user-event@14.6.1`;
- `@playwright/test@1.62.1`.

They verify tab-local state, user-visible components, actual loopback HTTP workflows, PNG rendering, responsive layouts, and screenshots. Browser binaries are external test artifacts and are not committed.

## Official Node.js runtime image

- Image: `node:24.18.0-bookworm-slim`
- Multi-platform digest: `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d`
- Project: [Node.js Docker Official Image](https://github.com/nodejs/docker-node)
- License: [MIT for Docker image packaging](https://github.com/nodejs/docker-node/blob/main/LICENSE)
- Use: pinned build/runtime base for the ADR-0018 local Research Console, migrator, and credential-free loopback gateway

## pgvector PostgreSQL image

- Image: `pgvector/pgvector:0.8.6-pg18-trixie`
- Linux amd64 digest: `sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352`
- Project: [pgvector](https://github.com/pgvector/pgvector)
- Source release: [v0.8.6](https://github.com/pgvector/pgvector/tree/v0.8.6)
- License: [PostgreSQL](https://github.com/pgvector/pgvector/blob/v0.8.6/LICENSE)
- Use: pinned local PostgreSQL 18 image for ADR-0015; the vector extension is not installed in Phase 2

These dependencies remain unmodified external packages. PGlite and ts-json-schema-generator are not production runtime dependencies. The repository does not commit installed package sources, database files, container layers, or generated native/WASM binaries.
