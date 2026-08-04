# Phase 5B2A Controlled CLI Provider Adapter Implementation Plan V1

Status: PHASE 5B2B OFFLINE STEPS 0-9 AND THE FOUR-RULE V2 GEOMETRY CORRECTION ARE IMPLEMENTED AND ACCEPTED UNDER SEPARATE IMMUTABLE RECORDS. EXACT COMMIT `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` IS ACCEPTED ONLY AS A FAKE-ONLY OFFLINE FOUNDATION, AND EXACT COMMIT `7e44a44b34fc4b5695af6f00d7366b989a42e716` ONLY AS THE OFFLINE GEOMETRY CORRECTION. PROMPT PACKAGE V2 REMAINS AN UNAPPROVED PROPOSAL. INSTALLED-CLI CAPABILITY/PRIVACY PROOF, PERSISTENCE, API/CLI EXPOSURE, DEPLOYMENT, CREDENTIALS, REAL CLI INVOCATION, PROVIDER CALLS, AND RUNTIME RECORD CREATION REMAIN UNAUTHORIZED.

Depends on:

- `docs/decisions/ADR-0022-CONTROLLED-CLI-PROVIDER-ADAPTER-DESIGN.md`;
- `docs/contracts/PHASE5B2A_CONTROLLED_CLI_PROVIDER_ADAPTER_DESIGN_V1.md`;
- `docs/decisions/PHASE5B2A_DESIGN_AUTHORIZATION_V1.json`;
- `docs/research/PHASE5B2A_CONTROLLED_CLI_PROVIDER_ADAPTER_REUSE_SCAN_V1.md`;
- `docs/decisions/PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`, hash `sha256:b13c748a744d2c772006af596411e8ece145a99feed02a043e31cb5cb3f349ae`;
- `docs/decisions/PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json`, hash `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`;
- `docs/decisions/PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_AUTHORIZATION_V1.json`, hash `sha256:3ae8d0ace9dc610a78db6fcabb300ffecbfd24b7f62f8c54ff743a3b3de28aef`;
- `docs/decisions/PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json`, hash `sha256:d5358718426069376660ee7d381ca7062f7141926105edd0237d4b5197054d76`.

## Objective

Describe the contract-TDD path for a narrow, synthetic-only, fail-closed subprocess adapter around:

```text
agy / gemini-3.6-flash-high / high
codex / gpt-5.6 / high
```

The future implementation must preserve exact repository-controlled input parity, CLI isolation, one visible attempt, strict response validation, immutable local evidence, and the complete absence of real data, replay, or trading authority.

This plan does not authorize itself.

## Required approvals before code

The implementation authorization required before code is the immutable `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`. It binds baseline commit `63c2a47`, Direct Pi as final writer, the exact offline file/module boundary, fixed resource limits, and `providerCallsAuthorized = false` plus all credential, persistence, deployment, real-data, replay, training, and trading authorities as false.

Before any model subprocess or external request, separate later approvals must exist for:

1. exact Prompt Package V2 bytes and package hash;
2. package activation and prepared payload creation;
3. provider-adapter implementation acceptance, satisfied only by exact foundation commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` and exact four-rule correction commit `7e44a44b34fc4b5695af6f00d7366b989a42e716` within their fake-only offline boundaries;
4. Antigravity privacy/retention proof;
5. exact bounded conformance-call count, candidates, synthetic payload, and terminal boundary.

The third gate is recorded separately and grants no authority to infer any other gate. No approval may be inferred from an earlier step.

## Implemented offline boundary

The separately authorized and now accepted Phase 5B2B implementation includes:

- exact immutable candidate profiles for `agy`/`gemini-3.6-flash-high` and Codex/`gpt-5.6`, both at `high`, with no fallback and no CLI packaging pin;
- exact identity-free response V2 stop/limit geometry contracts and strict invented-response validation, including the accepted strict stop-entry/protection-side relations and exact visible-anchor equality for limit entries and objectives;
- unapproved Prompt Package V2 proposal hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`, with V1 bytes unchanged;
- content-hashed request envelope, fixed five-file anonymous staging manifest, terminal evidence, bounded rejection vocabulary, and minimal retention contracts;
- isolated `0700` workspaces with `0600` files, hash-before-write, symlink/extra-file rejection, and cleanup;
- repository fake executable supervision only, using `shell: false`, an exact environment, complete process-group `SIGTERM`/`SIGKILL` termination including resistant descendants, one attempt, global concurrency one, and fixed output bounds;
- strict decoding of exactly one closed `provider-cli-terminal-envelope.v1`, preserving the unchanged terminal JSON and rejecting prose, ANSI, partial/multiple JSON, invalid UTF-8, unknown events, and tool/subagent use;
- a reviewable but non-executable Codex invocation profile generated only from bounded injected help/model/config evidence, an exact-model token check, explicit hidden-retry disposition, and a self-hashed capability proof; web search is explicitly disabled, while Antigravity remains fail-closed until exact non-interactive PNG transport is implemented and proved.

No migration, persistence seam, API/CLI route, Console change, deployment change, credential, real provider executable, external request, ModelRun/ProviderAttempt/Audit, or production BrooksDecision was added. Independent acceptance is recorded separately in `PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json` for the fake-only foundation and `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json` for the four-rule geometry correction; both preserve every later package, capability, privacy, production-seam, and external-call gate.

## Reuse and dependency rule

Add no AI framework, provider SDK, MCP server, plugin, gateway, telemetry service, queue, or second audit store.

Use:

- Node built-in process and filesystem APIs;
- existing strict parser, Ajv, canonical hash, and schema-generation seams;
- existing chart, Policy Assembly, package, payload, and audit contracts;
- fake executable fixtures for subprocess tests;
- existing PostgreSQL migration, grant, append-only, and API/CLI conventions only if separately authorized.

CLI upgrades are allowed. Do not persist CLI version or binary hash as semantic authority. Runtime preflight verifies capabilities; model ID is the fixed identity.

## Proposed implementation boundary

A future implementation should be split so offline adapter construction can be accepted without enabling external calls.

### Pure domain contracts

Possible versioned modules:

```text
packages/contracts/src/provider-candidate-profile-v1.ts
packages/contracts/src/provider-request-envelope-v1.ts
packages/contracts/src/provider-terminal-evidence-v1.ts
packages/contracts/src/brooks-identity-free-response-v2.ts
```

These names are planning placeholders, not approved public seams.

### Offline subprocess preparation

Implemented module boundary:

```text
packages/case-store/src/provider-invocation-profile-v1.ts
packages/case-store/src/provider-isolated-workspace-v1.ts
packages/case-store/src/provider-process-supervisor-v1.ts
packages/case-store/src/provider-terminal-envelope-v1.ts
```

The supervisor accepts only the content-hashed repository fake executable. Production `agy`/Codex invocation is absent and hard-rejected until a later external-call authorization and a separately implemented production supervisor seam.

### Static V2 artifacts

A future exact proposal may include:

```text
docs/prompts/BROOKS_V2_PROMPT.txt
docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V2.schema.json
docs/prompts/BROOKS_PROMPT_PACKAGE_V2.json
```

File names and bytes remain proposals until separately approved. V1 files and hashes must not change.

### Persistence and transport

If V1 records cannot represent actual invocation options, usage, resource bounds, or terminal evidence without semantic overloading, add new versioned records and forward-only migrations. Never mutate historical JSON or reinterpret `requestHash`.

No provider-call API route should be added by implementation authorization alone. A future operator-only invocation seam requires separate explicit approval and must not be reachable by reviewer or Research Console authority.

## Ordered contract-TDD path

### Step 0: Authority and baseline

- verify clean `main` and all Phase 5B1 immutable hashes;
- verify current deployment still has zero ModelRun/ProviderAttempt/Audit records;
- verify exact implementation authorization;
- run the full baseline suite;
- scan executable paths for provider endpoints, credentials, SDKs, and existing hidden call surfaces.

Exit: implementation scope is exact and no call authority exists.

### Step 1: Candidate profile contract

Write failing pure tests for:

- exact candidate IDs, provider surfaces, model IDs, and `high` effort;
- exact model ID required with no alias or fallback;
- CLI version/hash excluded from semantic identity;
- capability preflight result separated from model identity;
- changed/missing model ID rejection;
- unknown provider/candidate fields rejected;
- canonical identity and deep freeze.

Implement only the pure contract.

Exit: candidate identity is deterministic without freezing CLI packaging.

### Step 2: Prompt Package V2 proposal tests

Before creating V2 bytes, write tests proving V1 remains byte-identical and current.

Draft failing V2 tests for:

- exact geometry fields and trade-branch closure;
- `stop` and `limit` only in the initial provider profile;
- `market_next_event` rejection;
- normalized finite entry/protection/objective values;
- no real price, tick, fill, fee, spread, slippage, quantity, account, or identity field;
- exact null/absence behavior for no-trade and uncertainty;
- unchanged strict parser and no-repair rules;
- changed schema/prompt byte creates a new package hash.

Draft proposal bytes only after tests fail. Do not approve or activate them.

Exit: one exact reviewable V2 proposal exists with no runtime authority.

### Step 3: Geometry semantic validation

The initial accepted implementation covered branch closure, finite values, directional ordering, references, objective side, and reward/risk, but did not bind the three normalized prices to the referenced anchors. Under the separate correction authorization, use the existing identity-free V2 validation function as the public test boundary and add failing invented-response tests for:

- valid long and short stop geometry;
- long stop entry at or below its referenced anchor and short stop entry at or above its referenced anchor;
- valid long and short limit geometry whose entry equals one anchor in the referenced structure;
- limit entry detached from every anchor in the referenced structure;
- long protection at or above its referenced anchor and short protection at or below its referenced anchor;
- objective price detached from every anchor in the selected magnet's referenced structure;
- wrong directional ordering;
- unknown or mismatched entry structure/anchor;
- wrong-side protection or objective;
- sub-2R Swing;
- low-R Scalp without false cost authority;
- attempted market-next-event plan;
- response missing one geometry value;
- local repair or Swing-to-Scalp relabel forbidden.

Reuse and specialize the existing BrooksDecision semantic gate. Do not add execution, tick, tolerance, buffer, or fill logic. Do not change Prompt Package V2 prompt, schema, manifest, validator-version literal, or proposal hash.

Exit: exact provider-proposed normalized geometry can pass or reject deterministically. The separate exact corrected-commit acceptance is recorded in `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json`.

### Step 4: Request-envelope contract

Write failing tests binding:

- prepared-payload identity and complete package activation;
- candidate profile and exact model ID;
- prompt/schema/input/chart content hashes;
- anonymous file manifest with generic names;
- isolation profile, timeout, attempt limit, concurrency limit, and retention profile;
- one canonical request-envelope hash;
- no credentials, local paths, source identity, retry count above one, batching, or caller-selected prompt/model.

Do not change `OutboundModelPayloadV1` or the historical prepared record.

Exit: local code can prove exactly what a future adapter is allowed to stage without spawning it.

### Step 5: Isolated workspace builder

Write failing filesystem tests using invented bytes and temporary directories:

- creates only the exact allowlisted generic files;
- validates every byte/hash before write;
- uses restrictive permissions;
- rejects symlinks, special files, traversal, pre-existing content, and extra files;
- exposes no Git, home, repository, environment secret, or local identity;
- cleans up on success, rejection, signal, and exception;
- leaves no persistent CLI session file.

Exit: staging is deterministic and private without a provider process.

### Step 6: Process supervisor with fake executables

Write failing tests against repository-owned fake fixture programs only:

- argv array and `shell: false`;
- exact environment allowlist;
- 300-second configured hard timeout using a short injected test clock;
- complete process-tree termination;
- stdout/stderr byte bounds;
- response, timeout, and transport-error terminal states;
- one attempt only;
- no automatic restart;
- global concurrency one and batching rejection;
- partial, multiple, ANSI, prose-progress, unknown-event, tool, and invalid-UTF-8 output rejection;
- exact closed fake CLI envelope acceptance only when it carries one unchanged terminal JSON result and bounded usage;
- temporary inspection detects tool/subagent events but does not persist trajectories.

No test may execute `agy -p`, `codex exec`, or make network requests.

Exit: process supervision behavior is proven without a model.

### Step 7: Codex invocation-profile builder

Write failing argv-generation tests for the approved design:

- exact model ID `gpt-5.6` and high reasoning effort;
- `exec`, isolated working directory, exact two images, exact output schema;
- ephemeral mode;
- ignored user config and rules;
- read-only sandbox;
- no resume, writable workspace, tools, fallback model, public listener, or shell string.

Validate help/capability text through injected fixtures. A real `codex exec` remains forbidden.

Exit: Codex argv can be reviewed without being executed.

### Step 8: Antigravity invocation-profile builder

Write failing argv/config-generation tests for:

- exact model ID `gemini-3.6-flash-high` and high effort;
- print mode, exact JSON Schema, machine output, plan/strict sandbox profile;
- new isolated project/workspace;
- no continuation, plugins, MCP, rules, hooks, skills, slash expansion, tools, or history;
- mandatory verified interaction-data opt-out and external retention evidence;
- exact two-PNG attachment manifest;
- hidden-retry capability proof.

If the installed CLI cannot express or prove any requirement, the builder returns an unavailable result and no executable argv.

Exit: `agy` fails closed offline until every capability is provable.

### Step 9: Strict terminal parsing and validation evidence

Write failing tests for:

- exact terminal JSON result-byte preservation through a closed versioned CLI envelope or dedicated final-output file;
- parsed/reformatted-only, multiple-terminal, unknown-envelope, or ambiguous result rejection;
- invalid UTF-8 before parser;
- strict package schema and semantic validation;
- stable bounded rejection codes;
- response/tool/progress wrappers rejected rather than extracted;
- only final raw JSON and allowed metrics retained;
- no chain-of-thought, tool trajectory, conversation log, or unrelated stderr persisted;
- token/cache fields optional and absent distinguished from zero;
- monetary cost absent/unavailable, never invented.

Exit: received bytes pass unchanged or reject unchanged.

### Step 10: Versioned persistence, if authorized

Only under an authorization that explicitly includes persistence:

- write PostgreSQL constraint tests first;
- preserve V1 record meanings;
- add exact relationship/uniqueness constraints;
- enforce append-only UPDATE/DELETE/TRUNCATE denial;
- keep migration and application roles separate;
- store raw response bytes only in approved local content-addressed storage;
- bind database records to exact content hashes;
- do not insert simulated successful model records.

Exit: real records can only represent operations that actually occurred, but no operation is yet callable.

### Step 11: API/CLI exposure, if separately authorized

A future operator seam must accept only a pre-approved request identity or preparation identity. It cannot accept prompt, schema, model, provider, retry, timeout, geometry, principal, or raw response fields from the caller.

Reviewer and Research Console receive no invocation authority. Keep loopback/operator authentication and no public listener.

Exit: transport cannot widen authority, while external-call capability remains disabled by a separate deployment gate.

### Step 12: Offline adversarial verification

Run:

- focused contract and fake-process tests;
- complete repository tests and typecheck;
- generated artifact drift checks;
- PostgreSQL constraint tests when included;
- forbidden provider/network/credential scan;
- protected-window, real-data, replay, training, and trading boundary scans;
- independent read-only review.

Prove zero external DNS/connect activity during the implementation suite and zero new live ModelRun/ProviderAttempt/Audit rows.

Exit: one implementation candidate is reviewable but still cannot call a model.

## Later conformance-call gate

A first model call is a separate operation, not an implementation test. Its authorization must bind:

- exact approved implementation commit;
- exact approved/active Prompt Package V2 and prepared payload;
- exact synthetic Case and both PNG hashes;
- exact candidate/model IDs;
- maximum call and attempt counts;
- verified Antigravity privacy/retention evidence;
- fixed terminal stop before any second case, evaluation expansion, production data, replay, or trading.

The operator must audit counts before and after and record immutable execution evidence.

## Verification criteria

Exact commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` met the bounded offline criteria and is accepted under record `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`. The acceptance excludes installed-CLI capability/privacy proof, production signal/crash cleanup, production supervision and cross-process concurrency, and final terminal-source authority. Those limitations must fail closed until separately implemented, reviewed, and authorized.

The accepted offline implementation was reviewed against these criteria:

- no SDK/framework/dependency is added without separate approval;
- no hidden retry, model fallback, tool use, context leak, or output repair exists;
- only model IDs are fixed; CLI upgrade compatibility is preflighted;
- both candidates receive identical repository-controlled bytes;
- provider-owned hidden instructions remain disclosed differences;
- geometry accepts only exact stop/limit V2 semantics;
- Antigravity fails closed until collection, retention, isolation, and PNG transport are proved;
- no model call occurs during implementation or verification;
- tests prove contract behavior, not model quality or profitability.

## Explicit non-authority

This plan, the separate offline implementation authorization, and the exact-commit acceptance grant no Prompt Package V2 approval/activation, installed-CLI capability/privacy proof, credentials, account changes, production cleanup/supervision, real CLI invocation, provider calls, model records, real data, protected windows, outcomes, replay, training, Paper/Live, execution, exchange, wallet, order, or trading action. They grant no implementation beyond the exact boundary in `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`.
