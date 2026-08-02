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

These dependencies remain unmodified external packages. PGlite and ts-json-schema-generator are not production runtime dependencies. The repository does not commit installed package sources, database files, or generated native/WASM binaries.
