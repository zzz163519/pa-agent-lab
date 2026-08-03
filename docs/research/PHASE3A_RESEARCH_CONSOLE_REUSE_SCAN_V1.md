# Phase 3A Research Console Reuse Scan V1

Status: IMPLEMENTED SELECTION RECORD.

## Requirement

Build a long-lived, local, data-dense PA Agent Lab Research Console foundation while implementing only the synthetic blind-review module. The selected stack must preserve backend authority, exact schemas, same-origin loopback security, tab-local token handling, deterministic testing, and future module boundaries without importing market, provider, replay, or execution behavior.

## Discovery surfaces

The review checked:

- available local agent skills and MCP/search capability;
- official React, Vite, React Router, TanStack Query, Fastify Static, Fastify Helmet, Vitest, Testing Library, and Playwright documentation;
- npm package metadata, current versions, licenses, engines, and peer dependencies;
- current workspace TypeScript, Node test, Fastify, generated-schema, and package conventions.

The configured Exa MCP backend returned `Unknown MCP server 'exa'`; official project documentation, configured web search, Jina-readable pages, npm metadata, and installed package manifests supplied the compatibility evidence instead. No repository file or private source was sent to a provider.

## Selected candidates

| Capability | Selection | Reason |
| --- | --- | --- |
| View runtime | React 19 | Mature component model; exact Phase 3A components use it directly. |
| Build | Vite 8 | Small SPA build, strict TS support, hashed assets, no SSR authority. |
| Routing | React Router 8 data router | Durable module navigation without adding a full-stack framework. |
| Server state | TanStack Query 5 | Queue/detail cache, mutation invalidation, authenticated chart fetches, and later separately approved pagination/polling seams. |
| Icons | Lucide React | Familiar accessible command icons without hand-authored SVG. |
| Static serving | `@fastify/static` 10 | Fastify 5-compatible same-origin immutable assets and uncached SPA index. |
| Security headers | `@fastify/helmet` 13 | Fastify 5-compatible CSP, referrer, frame, and MIME defenses. |
| Component tests | Vitest 4 + Testing Library + jsdom | Vite-aware tab-state and user-visible component tests. |
| Browser tests | Playwright 1.62, Chromium only | Actual production assets, Fastify, PGlite, PNG, desktop/mobile, screenshot, and overflow verification. |

All versions are exact in package manifests and `pnpm-lock.yaml`. React Router 8's Node and React peer ranges are satisfied by Node 24.18 and React 19.2. Vite 8 and Vitest 4 are supported by the same Node runtime. `@fastify/static >=8` and `@fastify/helmet >=12` support Fastify 5.

## Rejected or deferred candidates

| Candidate | Decision | Reason |
| --- | --- | --- |
| Next.js, Remix framework mode, React Server Components | Reject | SSR, server framework, deployment, and public-site concerns are unnecessary for this loopback SPA and would compete with Fastify authority. |
| TanStack Router | Reject for V1 | React Router already satisfies routing; a second router adds no Phase 3A value. |
| Redux, Zustand, MobX | Reject | Workflow state is server-owned; local form state and TanStack Query are sufficient. |
| Tailwind, CSS-in-JS, design-system package | Reject | One hand-authored tokenized stylesheet is enough for the current module and avoids generated style/runtime dependencies. |
| Material UI, Ant Design, Chakra, shadcn-generated component set | Reject | Their component/pattern surface exceeds the current operational UI and would constrain the future domain design prematurely. |
| OpenAPI runtime/client generator | Defer | TypeScript transport contracts are already the source for generated JSON Schema/OpenAPI; the Phase 3A client uses type-only imports and a narrow fetch adapter. |
| AG Grid, TanStack Table, virtualization | Defer | The synthetic review queue is small; install only when a separately approved market/candidate module proves the need. |
| TradingView, Lightweight Charts, ECharts, D3 | Defer | Phase 3A must display immutable deterministic PNGs. Future interactive market charts are a different contract. |
| SSE, WebSocket, GraphQL, gRPC, queue client | Reject | Five synchronous reviewer routes need no streaming or event transport. |
| Authentication/user packages | Reject | V1 has one fixed local reviewer and per-launch token; public or multi-user deployment requires a new ADR. |
| Browser-stored database or offline sync | Reject | Browser state cannot become workflow authority. |
| Agent skill or MCP UI generator | Reject | No inspected skill supplied the exact backend-enforced immutable review protocol; importing generated UI would not reduce contract risk. |

## Boundaries proved by implementation

- only the Review feature module is mounted;
- no empty market/execution navigation exists;
- the API, not React, computes workflow state;
- no CORS or Vite proxy is used;
- token and draft state remain tab-local;
- BrooksDecision content arrives only after persisted reveal receipt;
- PNG rendering remains the ADR-0012 artifact path;
- dependencies provide UI/build/test capability only and no trading semantics.
