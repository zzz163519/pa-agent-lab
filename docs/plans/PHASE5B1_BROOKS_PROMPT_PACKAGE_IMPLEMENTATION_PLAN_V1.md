# Phase 5B1 Brooks Prompt Package Implementation Plan V1

Status: PROPOSED CONTRACT-TDD PLAN. EXACT PACKAGE HASH IS APPROVED; IMPLEMENTATION START IS PENDING.

Depends on proposed contracts and one approved exact package identity:

- `docs/decisions/ADR-0021-IMMUTABLE-BROOKS-PROMPT-PACKAGE-AND-OFFLINE-VALIDATION.md`;
- `docs/contracts/PHASE5B1_BROOKS_PROMPT_PACKAGE_AND_OFFLINE_VALIDATION_V1.md`;
- exact static artifacts under `docs/prompts/`.

## Objective

Implement, only after separate approval, the smallest offline Phase 5B1 slice:

1. verify and govern one exact Brooks Prompt Package;
2. permit explicit activation of a Calvin-approved package;
3. deterministically prepare the existing provider-neutral payload from one existing synthetic Policy Assembly;
4. validate invented identity-free response fixtures without repair;
5. stop before ModelCall, ModelRun, provider attempt, external request, or production BrooksDecision creation.

## Approval gates

Before implementation begins, all of the following must be separately true:

- satisfied for package content: Calvin explicitly approved package hash `sha256:b67896d15d5e2542c7bebaeca2b60c67cbb5510ef359efaca7f44e42fa17b0d9`, recorded in `docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json`;
- ADR-0021 and the Phase 5B1 contract have accepted status;
- Calvin has explicitly authorized Phase 5B1 implementation;
- a clean isolated worktree/branch is created from the approved baseline;
- Direct Pi remains coordinator and final writer unless Calvin separately approves a bounded worker-writing scope.

Exact-package approval alone is not implementation approval. Implementation approval is not activation or provider-call approval.

## Reuse result

Add no dependency, provider SDK, service, MCP server, model, image, credential, or listener.

Reuse:

- strict TypeScript and canonical hash utilities;
- `parseStrictJsonText`, Ajv 2020, `jsonc-parser`, and existing schema generation;
- BrooksDecision, Policy Assembly, policy input, outbound payload, chart, Doctrine, and activation validators;
- content-hashed migrations, restricted roles, append-only triggers, Case Store transactions, Fastify loopback operator routes, and CLI patterns;
- PGlite where supported and digest-pinned PostgreSQL 18 for authority/concurrency verification.

Reject/defer Vercel AI SDK, TypeChat, Instructor.js, Langfuse, LangWatch, generic prompt skills, MCP servers, model frameworks, Phase 4B, and Selector V2 for the reasons in the reuse scan.

## Delivery rules

- Use contract TDD: failing test first, minimum implementation, passing focused test, then regression.
- Use invented synthetic values only; never inspect real market data, protected windows, outcomes, or V6 artifacts outside the approved read-only inventory.
- Preserve existing record JSON and hashes; add new versioned records instead of mutating `OutboundModelPayloadV1`.
- Keep static prompt/package artifacts repository-owned and byte-drift tested.
- Do not build a provider request encoder, response listener, queue, scheduler, Console UI, or public endpoint.
- Do not create simulated ModelRun/attempt/audit rows.
- Tests prove contract behavior, not source completeness, model quality, probability, profitability, or cost viability.

## Proposed file map

The future implementation should remain within this bounded map unless a newly discovered need is separately reviewed.

### Domain contracts

```text
packages/contracts/src/brooks-prompt-package-v1.ts
packages/contracts/src/brooks-identity-free-response-v1.ts
packages/contracts/src/prepared-policy-payload-v1.ts
packages/contracts/src/index.ts
packages/contracts/package.json
packages/contracts/test/brooks-prompt-package-v1.test.ts
packages/contracts/test/brooks-identity-free-response-v1.test.ts
packages/contracts/test/prepared-policy-payload-v1.test.ts
```

### Static artifacts and generation

```text
docs/prompts/BROOKS_V1_PROMPT.txt
docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json
docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json
packages/persistence-contracts/scripts/generate-transport-schemas-v1.ts
packages/persistence-contracts/scripts/schema-generator-v1.ts
packages/persistence-contracts/schemas/*phase5b1*
packages/persistence-contracts/openapi/*phase5b1*
packages/persistence-contracts/test/openapi-v1.test.ts
packages/persistence-contracts/test/*phase5b1*
```

### Persistence and roles

```text
packages/persistence-contracts/sql/0008_phase5b1_prompt_package_activation_v1.sql
packages/persistence-contracts/sql/0009_phase5b1_prepared_policy_payload_v1.sql
infra/phase2/application-grants-v1.sql
packages/case-store/src/database-bootstrap-v1.ts
packages/case-store/test/database-bootstrap-v1.test.ts
packages/persistence-contracts/test/phase5b1-postgres-constraints-v1.test.ts
```

### Store, API, and CLI

```text
packages/case-store/src/prompt-package-store-v1.ts
packages/case-store/src/prepared-policy-payload-store-v1.ts
packages/case-store/src/case-store-v1.ts
packages/case-store/src/index.ts
packages/case-store/test/prompt-package-store-v1.test.ts
packages/case-store/test/prepared-policy-payload-store-v1.test.ts
packages/case-store/test/postgres-integration-v1.test.ts
packages/case-api/src/case-api-v1.ts
packages/case-api/test/phase5b1-prompt-package-api-v1.test.ts
packages/case-cli/src/case-cli-v1.ts
packages/case-cli/src/index.ts
packages/case-cli/test/phase5b1-prompt-package-cli-v1.test.ts
```

### Governance synchronization after acceptance

```text
AGENTS.md
docs/plans/OPEN_DECISIONS.md
docs/plans/PA_AGENT_LAB_IMPLEMENTATION_SEQUENCE_V1.md
```

Do not change Research Console source, provider modules, replay modules, market-data modules, or another repository.

## Ordered contract-TDD implementation

### Step 0: Freeze authority and clean baseline

- Confirm exact package hash and component bytes match Calvin's approval.
- Confirm ADR, contract, plan, and explicit implementation authorization.
- Create one isolated worktree from the clean approved baseline.
- Run baseline tests and confirm no credentials or provider configuration exist.

Exit: implementation scope is unambiguous and package bytes are unchanged.

### Step 1: Package contract, red then green

Write failing pure-domain tests for:

- exact manifest keys and version literals;
- exact prompt/schema media type, byte length, and content hash;
- canonical package-hash recomputation excluding `packageHash`;
- changed byte, hash, version, unknown key, mixed component, and malformed SHA rejection;
- deep freeze and deterministic identity.

Implement only the package builder/validator and static artifact loader after tests fail.

Exit: pure TypeScript verifies the exact package proposal without lifecycle or database authority.

### Step 2: Static artifact drift gate

Write failing tests that reproduce:

- prompt hash and exact 5217-byte identity;
- identity-free schema hash and exact 24951-byte identity;
- 18 required top-level fields and seven excluded fields;
- complete `$ref` closure and closed objects;
- package manifest and package hash.

The test must fail on one-byte prompt/schema changes or regeneration drift.

Exit: package artifacts are reproducible and cannot drift silently.

### Step 3: Identity-free response structural contract

Write failing tests for:

- exact 18 required top-level keys;
- nullable-but-present `tradePlan`, `noTrade`, `uncertainty`, and `humanSummary`;
- no local identity/hash fields;
- all nested enum, object, and list boundaries represented in the package schema;
- strict extra-key rejection at every object depth;
- no probability/calibration fields recursively.

Implement the minimum TypeScript interface, exact-object validator, and package-bound Ajv schema validation. Do not add response repair.

Exit: identity-free structural output is isolated from local record identity.

### Step 4: Strict raw JSON validation

Write failing tests before reusing/extracting the strict parser for:

- empty response string, duplicate key, comment, trailing comma, Markdown fence, prose prefix/suffix, multiple JSON values, unknown field, and wrong type;
- no coercion, defaults, property removal, substring extraction, or repair;
- stable bounded rejection categories for invented fixtures.

Use the existing `jsonc-parser`/Ajv seam. The offline API receives an already decoded JavaScript string; invalid UTF-8 byte handling belongs to the separately approved Phase 5B2 transport boundary and must fail before this parser. Do not add a parser or second model.

Exit: raw invented output passes unchanged or rejects unchanged.

### Step 5: Semantic projection and local test binding

Write failing tests that combine the 18 fields with an explicit invented local binding and existing anonymous policy input:

- local Case/input/cutoff/duration values cannot come from response;
- visible bar, evidence, claim, structure, magnet, setup, signal, and Doctrine references close exactly;
- no-trade and uncertainty branches preserve existing semantics;
- long/short direction, selected/opposing case, evidence balance, pending trigger, protection side, and objective side are enforced;
- draft, retired, absent, and unauthorized Doctrine fail;
- future bars and later events fail or remain right-censored.

Use existing `createBrooksDecision`; do not implement a second semantic engine.

Exit: invented semantic responses can reach the existing validator only through explicit local test bindings.

### Step 6: Planned-geometry fail-closed boundary

Write failing tests proving:

- a trade response evaluated with `plannedGeometry: null` in the local validation context rejects;
- invented valid Long/Short geometry supplied through that local context can pass offline compatibility tests;
- wrong-side geometry and sub-2R Swing reject;
- low-R Scalp does not imply cost viability;
- no code derives a stop offset, market-next-event price, tick, fee, spread, slippage, or cost assumption;
- no Swing failure is repaired by changing to Scalp or moving an objective.

Implementation may accept geometry only as an explicit invented test dependency. It must expose no production geometry source.

Exit: the known geometry gap is enforced rather than hidden.

### Step 7: Prepared payload domain record

Write failing tests for a new wrapper around existing `OutboundModelPayloadV1`:

- exact assembly, package activation, package, prompt, response schema, validator, payload, and payload-hash bindings;
- fixed synthetic source/rules versions;
- natural identity `(assemblyId, packageActivationId, preparationRulesVersion)`;
- exact repeat idempotency and changed activation/version append behavior;
- no model/provider/call/attempt fields;
- canonical hash and deep freeze.

Construct the existing payload through `createOutboundModelPayload`; do not change its V1 hash contract.

Exit: one local record proves what could later be sent without claiming it was sent.

### Step 8: Prompt approval and activation contracts

Write failing tests for:

- repository-governed Calvin exact-hash approval allowlist;
- no generic runtime prompt-approval mutation;
- operator activation of approved exact package only;
- highest committed activation as current;
- changed/unapproved/mixed package rejection;
- explicit rollback to an older approved package with new sequence and reason;
- no automatic latest-file activation or fallback.

The approval artifact must bind the package hash Calvin approved. Direct Pi/operator/model identity cannot substitute for Calvin approval.

Exit: draft, approved, activated, and rollback authority remain distinct.

### Step 9: Transport contract

Write failing generated-schema/OpenAPI tests for operator-only loopback commands:

- activate an approved package;
- explicitly roll back to an approved historical package with bounded reason;
- prepare one exact successful synthetic `assemblyId`;
- read current package activation and prepared record.

Requests must not accept prompt text, component hashes, package parts, principal, model, provider, retry, cost, response, or BrooksDecision fields.

Exit: malformed or widened requests fail before store access.

### Step 10: PostgreSQL migrations, red then green

Create content-hashed migrations `0008` and `0009` only after domain/transport tests pass.

They must enforce:

- exact package/lifecycle/preparation JSON-to-column identity;
- append-only `UPDATE`, `DELETE`, and statement-level `TRUNCATE` rejection;
- immutable foreign keys to exact Policy Assembly, policy input, package approval/activation, and component hashes;
- activation sequence and approved-package gate;
- rollback causation and earlier-target rules;
- natural idempotency uniqueness;
- no ModelRun/attempt/audit/decision insertion by Phase 5B1 operations;
- migration-owner/application-role separation and minimum grants.

Exit: SQL independently enforces the local lifecycle and preparation chain.

### Step 11: Store transactions

Implement package activation/rollback and preparation under bounded `SERIALIZABLE` transactions:

- resolve and lock exact current package authority;
- revalidate static bytes/hashes and Calvin approval;
- load and validate exact successful Policy Assembly and synthetic provenance;
- construct the existing outbound payload and preparation wrapper atomically;
- return existing only for exact natural-identity replay;
- reject changed authority, retirement invalidation, or integrity drift;
- never read prior decisions, reviews, outcomes, replay, memory, or later bars.

Exit: concurrency cannot mix package components or assembly authority.

### Step 12: API and CLI

Add only operator-token loopback routes and matching CLI commands after store tests pass. Preserve host/origin, request-size, token, request-ID, error mapping, and trusted-loopback boundaries.

No Research Console route, reviewer preparation permission, provider route, response upload, scheduler, SSE, WebSocket, or public listener.

Exit: local operator can activate/rollback approved packages and prepare one synthetic payload, but cannot send it.

### Step 13: Adversarial isolation and regression

Prove with invented fixtures that preparation identity is unchanged by:

- prior model answers or BrooksDecision values;
- CalvinReview, blind assessment, reveal receipt, or conflict;
- ModelRun, attempt, or audit rows;
- outcomes, PnL, replay, active positions, memory, or research candidates;
- later bars or protected-window markers;
- draft/retired/unauthorized Doctrine;
- dynamic prompt, provider registry, or environment variable content.

Scan for forbidden provider SDKs, endpoints, credentials, public listeners, vector extensions, real data, and execution terms in executable paths.

Exit: Phase 5B1 remains offline, synthetic-only, and history-isolated.

### Step 14: Generated artifacts and fresh PostgreSQL 18

- Regenerate schema/OpenAPI and require byte-identical second generation.
- Run focused domain, transport, store, API, CLI, and migration tests.
- Run a disposable digest-pinned PostgreSQL 18 integration covering roles, activation ordering, rollback, idempotency, concurrency, FK integrity, and append-only enforcement.
- Remove and verify removal of container and volume.

Exit: both TypeScript and real PostgreSQL enforce the same contract.

### Step 15: Full gates and independent review

Run:

- frozen-lockfile install;
- all Node tests and Research Console tests;
- strict typecheck and LSP diagnostics;
- generated-artifact drift checks;
- coverage, production/full audits, Markdown-link, secret, dependency, listener, provider, vector, protected-window, replay, and trading-boundary scans;
- `git diff --check` and complete staged-diff audit.

Obtain an independent fresh-context read-only `PASS` from a complementary model. A preamble, hidden reasoning, missing verdict, path error, or truncated report is incomplete; resume once, then use the approved fallback sequence without a tool-budget cap.

Exit: one reviewed implementation commit is ready, but still has no provider-call authority.

### Step 16: Commit and fast-forward merge

Only after all gates pass:

- create one implementation commit in the isolated branch;
- verify main remains at the approved baseline and has no conflicting tracked changes;
- merge with `git merge --ff-only`;
- rerun post-merge smoke, package hash, schema drift, typecheck, and clean-tree checks;
- remove the temporary worktree/branch.

Exit: main contains the reviewed offline Phase 5B1 slice, and Phase 5B2 remains unauthorized.

## Verification matrix

| Requirement | Minimum evidence |
|---|---|
| exact package | raw byte counts/hashes plus canonical package-hash recomputation |
| Calvin-only approval | exact approved-hash fixture and rejection of every other principal/path |
| explicit activation/rollback | ordered append-only lifecycle tests and PostgreSQL concurrency |
| 18/7 boundary | schema, TypeScript, extra-field, and local-binding tests |
| raw pass/reject | duplicate/syntax/prose/coercion/repair adversarial tests |
| causal/Doctrine semantics | existing BrooksDecision validator with invented bindings |
| geometry limitation | explicit fixture dependency and production-null rejection |
| prepared payload only | no ModelCall/Run/Attempt/Audit/Decision rows or routes |
| privacy/history isolation | exact identity comparisons under forbidden-track fixture changes |
| no widened authority | dependency, endpoint, credential, listener, vector, replay, and trading scans |

## Stop condition

If implementation discovers that the existing `OutboundModelPayloadV1`, BrooksDecision validator, planned-geometry boundary, or package approval model cannot satisfy this contract without changing accepted semantics, stop and return to Calvin with one minimal decision. Do not hide the conflict in an adapter, fixture, repair step, or database trigger.

## Explicit non-authority

This plan does not authorize itself. It authorizes no code edits, package activation, provider selection/call, response persistence, production BrooksDecision, geometry/cost assumption, real data, protected window, outcome, replay, training, Paper, Live, exchange, wallet, order, or real-money action.
