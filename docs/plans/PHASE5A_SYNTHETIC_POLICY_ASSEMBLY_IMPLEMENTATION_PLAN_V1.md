# Phase 5A Synthetic Policy Assembly Implementation Plan V1

Status: IMPLEMENTED AND FRESHLY VERIFIED. PHASE 5B AND SELECTOR V2 REMAIN UNAUTHORIZED.

Depends on accepted:

- `docs/decisions/ADR-0020-EXPLICIT-CORPUS-ROLLBACK-AND-SYNTHETIC-POLICY-ASSEMBLY.md`;
- `docs/contracts/PHASE5A_SYNTHETIC_POLICY_ASSEMBLY_V1.md`.

## Objective

Implement two ordered local slices under the recorded explicit implementation-start authorization:

1. operator-only explicit rollback to an earlier still-eligible ordinary Doctrine activation;
2. synthetic-only deterministic assembly of one existing Case and the complete current active Doctrine snapshot into immutable `PolicyAssemblyV1` plus `BrooksPolicyInputV1`.

The implementation must stop before outbound payload creation, ModelRun creation, provider transport, model inference, BrooksDecision creation, Case-derived retrieval, embeddings, real data, replay, or trading.

## Approval gates

ADR-0020, the Phase 5A contract, this plan, and the explicit Phase 5A implementation start are accepted. Direct Pi is the sole writer for the authorized implementation.

Any proposed worker write delegation still requires Calvin to approve its exact reason, write scope, and retained Direct Pi responsibilities.

Direct Pi remains coordinator, final writer, verifier, and merger. No worker delegation is assumed. If delegation is later useful, one writer may own one isolated worktree; the main agent retains contract review, test review, real PostgreSQL verification, final diff audit, commit, and `--ff-only` merge responsibility.

## Reuse-first result

### Search performed

The 2026-08-03 read-only scan covered:

- installed Pi/agent skills and skills.sh;
- ClawHub provenance and deterministic-control skills;
- MCP-oriented provenance/audit projects;
- npm and GitHub packages for state machines, durable workflows, provenance, and rank fusion;
- the repository's current contracts, Case Store, API, CLI, migrations, role grants, and tests.

No package, skill, MCP server, service, image, or provider should be installed for Phase 5A.

### Reuse

Use the existing repository-owned seams:

- `createBrooksPolicyInput`, `assertBrooksPolicyInputIntegrity`, canonical serialization/hash, and deep freeze;
- `BrooksPolicyCaseV1`, `DoctrineRagRecordV1`, chart manifest/metadata, and synthetic CaseBundle validators;
- Phase 4A activation, snapshot, quality-report, retirement, and RAG-record validators;
- `CaseStoreDatabaseV1` and its bounded `SERIALIZABLE` retry policy;
- strict persisted JSON and generated JSON Schema/OpenAPI 3.1 pipeline;
- content-hashed migration runner and restricted PostgreSQL roles;
- Fastify operator-token loopback routes and Node built-in CLI parsing/fetch;
- PGlite for supported conformance and digest-pinned PostgreSQL 18 for authority tests.

### Reject or defer

| Candidate | Decision | Reason |
|---|---|---|
| XState | Reject | One atomic command has no independent long-lived state machine; local status is derived from immutable records |
| Temporal TypeScript SDK | Reject | Adds workers, durable async orchestration, native runtime pieces, and service operations absent from this synchronous slice |
| LangGraph.js | Reject | Agent/model orchestration is outside Phase 5A and would weaken the narrow deterministic worker boundary |
| `@inflexa-ai/tsprov` | Reject | W3C PROV interchange does not replace fixed local authority relations; adds a dependency and a more permissive graph model |
| MCP Witness | Reject | Python MCP sidecar, separate storage, keys/anchoring, dashboard, and deletion semantics create another audit authority |
| TRACE | Reject | Python MCP session logs depend on explicit client emission and do not enforce PostgreSQL domain invariants |
| ClawHub `log` | Reject | Emits privacy-aware logs but explicitly delegates persistence and immutability to the host |
| ClawHub provenance/controller skills | Reject | Procedural agent guidance is not runtime contract or transactional evidence |
| `fusion-rank` | Defer | RRF may be evaluated for Selector V2; Phase 5A performs no query or fusion and uses the complete corpus |
| Phase 4B/vector frameworks | Defer | Embeddings, `pgvector`, hybrid retrieval, and reranking need a separate ADR and quality/privacy contract |

Reference surfaces inspected include:

- <https://github.com/statelyai/xstate>
- <https://github.com/temporalio/sdk-typescript>
- <https://github.com/inflexa-ai/tsprov>
- <https://github.com/edwiniac/mcp-witness>
- <https://github.com/Thru-Echoes/TRACE>
- <https://clawhub.ai/agistack/log>
- <https://www.npmjs.com/package/fusion-rank>

## Delivery rules

- Work in the dedicated clean implementation worktree.
- Keep one writer in that worktree.
- Use contract TDD for each behavior slice: red test, smallest implementation, green test, then broader regression.
- Do not change existing record JSON or hashes unless the accepted contract explicitly requires a new version.
- Preserve all user/unrelated changes and avoid broad refactors.
- Add no dependencies or services.
- Never read protected windows or real market data.
- Tests use deterministic invented synthetic records only and assert contracts, not outcomes or profitability.

## Proposed file map

The authorized implementation remains bounded to this file map.

### Domain contracts

```text
packages/contracts/src/doctrine-corpus-rollback-v1.ts
packages/contracts/src/policy-assembly-v1.ts
packages/contracts/src/index.ts
packages/contracts/package.json
packages/contracts/test/doctrine-corpus-rollback-v1.test.ts
packages/contracts/test/policy-assembly-v1.test.ts
```

### Transport and generated artifacts

```text
packages/persistence-contracts/src/policy-assembly-transport-v1.ts
packages/persistence-contracts/src/doctrine-retrieval-transport-v1.ts
packages/persistence-contracts/src/persisted-json-v1.ts
packages/persistence-contracts/src/index.ts
packages/persistence-contracts/scripts/generate-transport-schemas-v1.ts
packages/persistence-contracts/scripts/schema-generator-v1.ts
packages/persistence-contracts/schemas/*phase5a*
packages/persistence-contracts/openapi/*phase5a*
packages/persistence-contracts/test/*phase5a*
packages/persistence-contracts/test/openapi-v1.test.ts
```

### PostgreSQL and roles

```text
packages/persistence-contracts/sql/0006_explicit_doctrine_corpus_rollback_v1.sql
packages/persistence-contracts/sql/0007_phase5a_synthetic_policy_assembly_v1.sql
infra/phase2/application-grants-v1.sql
packages/case-store/src/database-bootstrap-v1.ts
packages/case-store/test/database-bootstrap-v1.test.ts
packages/persistence-contracts/test/phase5a-postgres-constraints-v1.test.ts
```

### Store, API, and CLI

```text
packages/case-store/src/doctrine-retrieval-store-v1.ts
packages/case-store/src/policy-assembly-store-v1.ts
packages/case-store/src/case-store-v1.ts
packages/case-store/src/index.ts
packages/case-store/test/doctrine-corpus-rollback-v1.test.ts
packages/case-store/test/policy-assembly-v1.test.ts
packages/case-store/test/postgres-integration-v1.test.ts
packages/case-api/src/case-api-v1.ts
packages/case-api/test/policy-assembly-api-v1.test.ts
packages/case-cli/src/case-cli-v1.ts
packages/case-cli/src/index.ts
packages/case-cli/test/policy-assembly-cli-v1.test.ts
```

### Governance synchronization after acceptance

```text
AGENTS.md
docs/plans/PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md
docs/plans/OPEN_DECISIONS.md
```

Do not change Research Console source, provider modules, replay modules, market-data modules, or another repository.

## Ordered implementation

### Step 0: Freeze accepted text

Before code changes:

- confirm ADR-0020, the Phase 5A contract, and this plan remain accepted and unchanged;
- preserve all exclusions under the recorded implementation-start authorization;
- identify any newly discovered contract wording that requires a Calvin decision;
- use the isolated worktree and confirm clean baseline tests.

Exit: accepted text and implementation authority are unambiguous; no unresolved semantic choice is hidden in code.

### Step 1: Rollback domain contract, red then green

Write failing domain tests first for:

- strict command and record keys;
- reason normalization and 1/500-scalar bounds;
- standard-versus-rollback activation union;
- activation and reason hash recomputation;
- exact target/run/snapshot/profile/report copying;
- invalid sequence, target kind, principal, hash, and extra-key rejection;
- deep freeze and canonical repeat identity.

Then implement only the domain builders and validators. Do not touch SQL, API, or CLI until the domain tests pass.

Exit: pure TypeScript can represent and reject rollback records without database authority.

### Step 2: Rollback transport contract

Write failing strict transport and drift tests for:

- command schema with only `targetActivationId` and `reason`;
- ordinary/rollback current-activation response union;
- operator-only route manifest entries;
- no caller principal or sequence fields;
- JSON Schema 2020-12 and OpenAPI 3.1 reference closure.

Generate and review artifacts only after the TypeScript structural and domain validators agree.

Exit: malformed or widened rollback requests fail before store access.

### Step 3: Rollback PostgreSQL prerequisite

Create content-hashed migration `0006` under tests.

The migration should:

- preserve every existing ordinary activation JSON value and ID;
- add a database-level activation-kind distinction/read model;
- replace global `(run_id, quality_report_hash)` uniqueness with ordinary-only uniqueness;
- allow run/report reuse only when the inserted row is a structurally valid rollback activation;
- add rollback causation columns/relations and exact JSON checks;
- enforce target earlier than replaced/current sequence through trigger validation;
- revalidate target run/report/snapshot/profile and retirement state;
- keep retrieval query/evidence foreign keys bound to either activation kind;
- install row-mutation and statement-truncation rejection;
- grant only required `SELECT`, `INSERT`, and sequence use to the application role.

Red/green tests must cover PGlite-supported constraints and real PostgreSQL-only partial index, trigger, role, and concurrency behavior.

Exit: SQL can append a valid rollback authority but cannot disguise an ordinary repeated activation as rollback.

### Step 4: Rollback store, API, and CLI

Implement store behavior in one `SERIALIZABLE` transaction:

- resolve current;
- load exact historical ordinary target;
- revalidate eligibility;
- allocate sequence;
- append rollback;
- return existing only for the contract-defined immediate exact retry.

Then add operator-only API/CLI seams and read paths. Preserve existing route authentication, request-size, host/origin, request ID, error mapping, and `201`/`200` mutation behavior.

Regression tests must prove existing ordinary activation and retrieval semantics still pass. In particular, a retirement still fails closed and never invokes rollback.

Exit: rollback is complete and independently verified before Policy Assembly persistence begins.

### Step 5: Assembly domain contract, red then green

Write failing tests for:

- fixed schema/rules/source literals;
- exact closed success and failure records;
- canonical Doctrine-context hash and UTF-8 byte length;
- ordered unique Doctrine manifest;
- chart binding and policy-input integrity;
- activation/snapshot/run/report/profile relations;
- `inputHash` equality;
- canonical assembly/failure hashes and deep freeze;
- exact four expected failure codes;
- rejection of unknown keys, malformed nullability, duplicate codes, wrong bounds, and wrong principal.

Implement pure builders/validators using existing canonical utilities and `createBrooksPolicyInput`. Do not create a second policy-input implementation.

Exit: pure contracts deterministically represent success and expected failure.

### Step 6: Assembly transport contract

Write failing tests for:

- request body exactly `{ caseHash }`;
- success/failure mutation response union;
- operator-only route manifest;
- success/failure read responses;
- `201` for new terminal records and `200` for existing records;
- no activation, snapshot, Doctrine, query, principal, prompt, model, or provider input fields;
- generated schema/OpenAPI drift and reference closure.

Exit: transport cannot grant selection or model authority.

### Step 7: Assembly PostgreSQL persistence

Create content-hashed migration `0007` under tests.

Add append-only tables/relations for:

- `PolicyAssemblyV1`;
- ordered Doctrine bindings;
- `PolicyAssemblyFailureV1`;
- required Case/input/chart and activation parent bindings.

Reuse `pa_policy_inputs` for the rebuilt input. Add an assembly-specific Case/input/chart relation and do not insert another `pa_case_policy_inputs` row, because existing Phase 2 CaseBundle audit/review loading requires that original binding to remain unique.

Constraints must enforce the success natural identity `(caseHash, activationId, assemblyRulesVersion)`, exact reconstructed `sourceBundleHash`, manifest order/count, input/chart hashes, activation chain, JSON identities, bounded failure shape, and complete transaction relationships. Add grants only after role tests fail as expected.

Exit: the database independently rejects partial, mutable, conflicting, or cross-bound assembly chains.

### Step 8: Assembly store

Implement the contract algorithm in one `SERIALIZABLE` transaction.

Important implementation checks:

- reconstruct the unique original Phase 2 CaseBundle and require its recomputed `bundleHash` in the configured deployment allowlist before deciding whether a research failure is permitted;
- load Case before deciding whether a failure record is permitted;
- resolve current activation once and never query for an older eligible one;
- fetch complete snapshot entries without lexical query machinery;
- compute limits before inserting a policy input;
- derive chart manifests from validated Case/chart authority, not prior Doctrine-bearing input content;
- ensure all prior Case/input bindings converge on the same canonical chart artifacts;
- revalidate content-addressed PNG bytes before success;
- ignore prior policy-input Doctrine arrays;
- never join decision, review, model-run, outcome-like, replay, or memory tables;
- persist either complete success through an assembly-specific Case/input/chart relation, or one bounded expected failure, never both;
- never add a second Phase 2 `pa_case_policy_inputs` binding.

Use query-capture tests or an equivalent store harness to prove the forbidden tables are not accessed.

Exit: one synthetic Case produces exact current-corpus input with full local evidence and no model boundary crossing.

### Step 9: Assembly API and CLI

Add only the accepted operator routes and bounded CLI commands. Reuse the existing API server and CLI transport; do not add another listener, server, auth mechanism, or process.

Test:

- unauthorized, malformed, not-found, inserted, existing, expected-failure, conflict, and dependency responses;
- reviewer and trusted-loopback identity cannot assemble or rollback;
- GET responses revalidate persisted records before returning them;
- no Console route, navigation, browser storage, or anonymous access appears.

Exit: operator can create and inspect a terminal assembly through existing local seams.

### Step 10: Isolation and adversarial regression

Use invented synthetic fixtures only. For one fixed allowed parent chain, add conflicting records to forbidden tracks and prove the assembly ID, input hash, Doctrine context, and failure identity remain unchanged. Separately prove that the original allowlisted source bundle is retained only as authorization provenance and that its fixture Doctrine never enters the rebuilt policy input.

Cover:

- old fixture Doctrine is absent from the rebuilt Doctrine array while the exact original bundle hash remains bound;
- preservation of existing unique Phase 2 CaseBundle audit/review loading after the assembled input is persisted;
- prior BrooksDecision and CalvinReview;
- blind assessment/reveal/workflow records;
- ModelRun/provider-attempt/audit records;
- invented outcome/PnL/replay/memory-shaped values where a test seam exists;
- later bars that are not part of the selected immutable Case;
- draft, retired, private, model-generated, Calvin, research-memory, and unauthorized V6 Doctrine fixtures.

Do not create or reference protected-window data, even as a test body.

Exit: only the approved Case/chart/current-activation chain can influence output.

### Step 11: Fresh real PostgreSQL verification

Run a disposable digest-pinned PostgreSQL 18 environment from the package context that resolves existing `pg` dependencies. Wait for readiness before the integration process.

Verify:

- ordered migration hashes including `0006` and `0007`;
- clean bootstrap and existing-database restart;
- migration-owner versus application-role separation;
- ordinary activation, rollback, retirement, and assembly serialization races;
- current activation after rollback;
- all foreign keys, partial uniqueness, immutable triggers, and grants;
- no partial rows after transaction failures;
- no `vector` extension in `pg_extension`;
- no public listener or credential-bearing gateway change.

Remove the disposable container and volume after verification.

Exit: behavior is proven against the authoritative PostgreSQL runtime, not only PGlite.

### Step 12: Full audit and merge

Run fresh:

```bash
pnpm generate:transport-schemas
pnpm test
pnpm typecheck
pnpm --filter @pa-agent-lab/research-console test
```

Also run LSP diagnostics on every changed TypeScript file and inspect:

- `git diff --check`;
- changed-file list against the approved scope;
- generated artifact drift;
- migration content hashes and grants;
- absence of new dependencies, provider/model code, network fetch, vector schema, Console changes, real data, replay, and trading paths;
- clean worktree after commit.

An independent read-only review should check contract compliance, authority leakage, SQL races, and missing negative tests. Direct Pi applies any fixes as the sole writer, reruns affected and full gates, commits one coherent Phase 5A change, and merges with `git merge --ff-only` only after approval.

Exit: accepted requirements are implemented and freshly verified with no known required work remaining.

## Acceptance matrix

| Requirement | Primary evidence |
|---|---|
| Explicit rollback only | domain, SQL trigger, API auth, and no-auto-fallback tests |
| Historical target remains eligible | run/report/Source/approval/retirement integration tests |
| New rollback authority identity | database sequence and hash tests |
| Full current corpus | ordered snapshot-to-manifest-to-input equality tests |
| No Case-derived query | query-capture tests and zero retrieval-evidence delta |
| 32 record bound | 32-success and 33-failure fixtures |
| 512 KiB bound | 524,288-success and 524,289-failure fixtures |
| No truncation | exact count/hash assertions on both boundaries |
| Old fixture Doctrine discarded | conflicting prior-input fixture test |
| Idempotency/versioning | exact repeat, new activation, rollback, and rules-version tests |
| Complete local provenance | source-bundle allowlist plus Case/chart/activation/snapshot/Doctrine/input FK and hash tests |
| Expected failure persistence | exact four-code success-path tests |
| Invalid requests not research records | auth/schema/not-found/integrity negative tests |
| Historical isolation | forbidden-track adversarial fixtures |
| Append-only database | `UPDATE`/`DELETE`/`TRUNCATE` tests for every new table/relation |
| Operator-only local boundary | API/CLI auth and loopback deployment tests |
| No Phase 4B/5B | dependency, schema, route, and changed-file audit |
| Real PostgreSQL behavior | fresh digest-pinned integration run |

## Stop conditions

Stop and return to Calvin before continuing if implementation discovers any need to:

- choose a provider, model, prompt, retry policy, timeout, or image transport;
- create an outbound payload, ModelRun, provider attempt, BrooksDecision, or asynchronous job;
- derive Case-specific lexical queries or add a selector/ranker;
- exceed or silently alter the 32-record or 512 KiB bounds;
- change Phase 4A Source allowlist or ingest source text;
- add a dependency, service, MCP server, scheduler, queue, or public listener;
- read real Case data, protected windows, outcomes, PnL, replay, or settlement evidence;
- weaken retirement, append-only, operator-authentication, or complete-transaction behavior;
- modify the independent `/home/calvin/vegas-ema-cta-lab` repository.

These are contract changes, not implementation details.

## Completion report requirements

The Phase 5A completion report must state:

- exact changed files and commit;
- fresh contract, transport, PGlite, API, CLI, and real PostgreSQL results;
- full repository test, Research Console test, typecheck, and LSP results;
- migration/grant/immutability evidence;
- explicit confirmation that no provider, model, vector, real-data, replay, or trading authority was added;
- residual gaps and the next separately approved discussion;
- whether Calvin must decide anything before Phase 5B or Selector V2 planning.
