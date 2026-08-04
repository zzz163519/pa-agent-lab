# Phase 5B2A Controlled CLI Provider Adapter Design Contract V1

Status: ACCEPTED DESIGN CONTRACT. EXACT OFFLINE IMPLEMENTATION COMMIT `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` IS ACCEPTED ONLY AS A FAKE-ONLY FOUNDATION, EXACT CORRECTION COMMIT `7e44a44b34fc4b5695af6f00d7366b989a42e716` IS ACCEPTED ONLY FOR THE FOUR OFFLINE V2 GEOMETRY RELATION CHECKS, AND EXACT PROMPT PACKAGE V2 CONTENT HASH `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598` IS SEPARATELY APPROVED. PACKAGE ACTIVATION/PREPARATION, INSTALLED-CLI CAPABILITY/PRIVACY PROOF, REAL CLI INVOCATION, CREDENTIALS, PERSISTENCE, DEPLOYMENT, AND ALL PROVIDER/MODEL CALLS REMAIN UNAUTHORIZED.

Authority: ADR-0005, ADR-0010 through ADR-0022, and `docs/decisions/PHASE5B2A_DESIGN_AUTHORIZATION_V1.json`.

## Purpose

Define the fail-closed contract a future synthetic-only CLI provider adapter must satisfy before any implementation or external-call authorization can be considered.

This document does not itself authorize code, credentials, configuration changes, subprocess inference, external requests, or runtime records. The later immutable implementation authorization permitted only its exact offline boundary. Separate exact-commit acceptance records verify that bounded fake-only foundation and its four-rule V2 geometry correction without changing any external/provider authority from false. The later exact-content approval artifact approves only one package identity and leaves activation, preparation, and every external/provider authority false.

## Fixed candidate profile

The exact V1 design profile is:

```text
candidate:gemini-antigravity-v1
  providerSurface = antigravity-cli
  executable = agy
  modelId = gemini-3.6-flash-high
  reasoningEffort = high

candidate:gpt-codex-v1
  providerSurface = codex-cli
  executable = codex
  modelId = gpt-5.6
  reasoningEffort = high
```

Only `modelId` is pinned. CLI version and executable content hash are diagnostic metadata, not authority fields. Every invocation must run a capability preflight against the exact CLI currently installed. A missing exact model ID, unsupported required flag, or changed output protocol rejects the candidate. No fallback or alias resolution is permitted.

## Required upstream authority

A future request is eligible only when all of the following are current and exact:

- one successful deployment-authorized synthetic `PolicyAssemblyV1`;
- one approved and active Prompt Package V2;
- one prepared payload bound to that package activation and assembly;
- exact validated context/detail PNG bytes matching the policy input manifests;
- exact anonymous normalized OHLC and Doctrine records;
- a separately approved provider-adapter implementation;
- a separately approved bounded external-call authorization.

The existing Prompt Package V1 and preparation do not satisfy the V2 geometry requirement and must not be sent under this profile.

## Repository-controlled request parity

For a paired comparison, both candidates receive the same repository-controlled bytes and semantic values:

1. package-approved prompt bytes;
2. package-approved closed response-schema bytes;
3. exact prepared anonymous normalized policy input;
4. exact approved Doctrine projection in canonical order;
5. exact context PNG bytes;
6. exact detail PNG bytes;
7. identical output-only instruction and no tools.

The adapter must verify every content hash immediately before process creation. Generic temporary filenames and process-local paths are transport details outside the model payload identity and must reveal no Case, source, market, time, or repository identity.

Provider-owned hidden instructions are an explicit candidate difference. No local instruction source may add to them.

## Prompt Package V2 geometry profile

The future closed response schema must preserve the accepted semantic response while adding exact anonymous normalized planned geometry for trade verdicts:

```text
entryNormalizedPrice
protectionNormalizedPrice
objectiveNormalizedPrice
```

All three values are required and finite for `long` or `short`; all are absent or null according to the exact V2 branch for `no_trade` and `uncertain`.

The initial accepted entry-type set is exactly:

```text
stop
limit
```

`market_next_event` is unsupported in this profile and rejects. The provider cannot estimate a future event price. Local code cannot replace it with the last close, an average, an inferred tick, or later data.

The local validator must recompute and verify:

- directionally valid price ordering;
- a long stop entry is strictly above its referenced visible anchor and a short stop entry is strictly below, with no inferred tick or minimum distance;
- a limit entry exactly equals at least one visible anchor price in its referenced structure;
- long protection is strictly below its referenced visible anchor and short protection is strictly above, with no inferred tick or buffer;
- an objective exactly equals at least one visible anchor price in the structure referenced by its selected magnet;
- exact reward and risk from normalized values;
- Swing reward/risk of at least `2.0R`;
- Scalp semantics without inventing a minimum ratio;
- no conversion from failed Swing to Scalp;
- no real-price, tick, fee, spread, slippage, fill, or cost inference.

Provider-proposed geometry remains policy output. Deterministic local validation decides only whether that proposal satisfies the frozen contract.

## Process isolation

A future adapter must create a unique temporary workspace with a fixed allowlist of files such as:

```text
request.json
prompt.txt
response.schema.json
context.png
detail.png
```

The workspace contains no Git directory, repository files, source metadata, credentials, home-directory links, sockets, prior output, or writable persistent volume.

The adapter must spawn the executable directly with an argv array. Shell parsing, interpolation, command substitution, profile loading, and caller-provided argv are forbidden.

Both candidate profiles must enforce:

- fresh non-resumed conversation;
- machine-readable output;
- exact JSON Schema;
- sandbox enabled;
- no tools, subagents, web, shell, file edits, plugins, MCP, hooks, skills, memory, or history;
- no repository or ordinary home-directory access;
- no output file other than adapter-owned temporary capture;
- bounded stdout/stderr and process-tree termination;
- temporary workspace/session deletion after committed terminal evidence.

Any observed tool or subagent step is a terminal rejected attempt even if the final JSON is otherwise valid.

## Candidate-specific preflight

### Antigravity CLI

Before `agy` can become eligible, offline evidence must prove:

- `agy models` contains exactly `gemini-3.6-flash-high`;
- model and `high` effort flags are honored in non-interactive print mode;
- custom JSON Schema applies to the final result;
- exact PNG bytes can be attached without revealing unrelated paths or files;
- terminal sandbox and strict permissions are active;
- interaction-data collection is disabled for the authenticated account;
- external retention/training configuration is recorded and accepted;
- plugins, MCP servers, rules, hooks, skills, custom agents, history, and slash-command expansion are disabled or absent;
- automatic internal retries are disabled or each underlying request is observable as its own attempt.

Failure to prove any item makes the candidate unavailable. A different Gemini transport is not selected automatically.

### Codex CLI

Before Codex can become eligible, offline evidence must prove:

- `gpt-5.6` is accepted as the exact model ID;
- reasoning effort is explicitly `high`;
- `exec` supports exact image attachment and output schema;
- the invocation is ephemeral;
- user configuration and repository/user rules are ignored;
- the working directory is the isolated temporary workspace;
- sandbox is read-only and provider-visible tools are disabled;
- automatic internal retries are disabled or each underlying request is observable as its own attempt.

Failure to prove any item makes the candidate unavailable. No current Pi provider or GPT alias is a fallback.

## Invocation state machine

A future invocation may use only this state sequence:

```text
preflight_pending
  -> preflight_rejected
  -> request_ready
  -> process_started
  -> response_received | timeout | transport_error
  -> validation_accepted | validation_rejected
  -> evidence_committed
```

A transition may skip directly to a terminal rejection when a prerequisite fails. It may never repair, restart, resume, or silently create a second attempt.

## Attempt and resource policy

- maximum attempts per logical run: `1`;
- hidden retry: forbidden;
- hard wall-clock timeout: `300` seconds;
- retry after timeout or transport error: forbidden;
- global invocation concurrency: `1`;
- batching: forbidden;
- paired candidates: independent sequential invocations over the same frozen input;
- stdout limit: `262144` bytes;
- stderr limit: `65536` bytes;
- unchanged terminal JSON limit: `131072` bytes;
- rate-limit response: one terminal transport error, not retry authority.

The process supervisor must terminate the complete process tree on timeout and distinguish timeout from transport error and invalid response.

## Strict terminal output

A provider-specific machine envelope may be decoded only under an exact closed versioned transport schema. It must contain exactly one terminal result, bounded diagnostics/usage, and no tool or subagent event. The semantic validator receives only the unchanged final JSON result bytes exposed by that envelope or by a dedicated final-output file. If the CLI exposes only a parsed/reformatted object, ambiguous multiple results, or no unchanged terminal result, the attempt rejects.

Unknown event wrappers, ANSI escapes, prose progress, diagnostics outside the closed envelope, Markdown, tool events, duplicate terminal results, and trailing bytes reject.

The adapter must not:

- locate a JSON substring inside prose or an unstructured CLI transcript;
- choose the last apparently valid object or terminal event;
- treat decoding a closed CLI envelope as authority to repair its terminal result;
- coerce or repair output;
- ask the same or another model to repair output;
- convert a transport failure into `uncertain`;
- infer a production decision from a partial response.

Invalid UTF-8 rejects before strict JSON parsing.

## Privacy and authority validation

Before spawn, recursively validate the prepared payload and chart bytes. Environment variables passed to the child must use an exact allowlist and must not contain database URLs, operator/reviewer tokens, provider secrets from unrelated services, market/source identifiers, account/wallet data, or protected-window references.

No raw-price Case, real symbol, venue, timestamp, date, time zone, source/window identity, outcome, PnL, replay, settlement, prior BrooksDecision, CalvinReview, memory, or future bar may enter the workspace or request.

The Antigravity interaction-data opt-out and acceptable external retention are mandatory runtime preconditions, not documentation assumptions.

## Local evidence and retention

A future successful or rejected terminal attempt may retain only:

- exact unchanged final JSON result bytes exposed by the CLI when a response exists;
- request and response content hashes;
- provider surface and exact model ID;
- terminal status and bounded error code;
- observed wall-clock latency;
- reported input, output, and cache tokens when present;
- deterministic validation status, result hash, and rejection codes.

The record must not persist chain-of-thought, reasoning summaries exposed as hidden traces, tool trajectories, CLI session logs, conversation history, unrelated stderr, or temporary workspace paths.

The future schema must reconcile this evidence with existing `ModelRunRecordV1`, `ProviderAttemptRecordV1`, and `ModelRunAuditRecordV1` without mutating their V1 meanings. If existing `requestHash` or usage fields are insufficient, add a new versioned request/attempt envelope and migration rather than overloading a field.

## Cost evidence

Record only observable token counts, cache counts, latency, terminal status, and valid-response rate. Missing provider billing is `unavailable`, never zero. No USD estimate or model cost ranking is allowed until an exact auditable price/billing contract is separately approved.

## Hard rejection vocabulary

The separately authorized offline implementation freezes bounded codes covering:

- `MODEL_ID_UNAVAILABLE`;
- `CAPABILITY_PREFLIGHT_FAILED`;
- `PRIVACY_CONFIGURATION_UNVERIFIED`;
- `EXTERNAL_RETENTION_UNVERIFIED`;
- `HIDDEN_RETRY_UNVERIFIED`;
- `INPUT_HASH_MISMATCH`;
- `CHART_HASH_MISMATCH`;
- `UNAUTHORIZED_CONTEXT_SOURCE`;
- `TOOL_OR_SUBAGENT_USED`;
- `TIMEOUT`;
- `TRANSPORT_ERROR`;
- `OUTPUT_RESOURCE_LIMIT`;
- `INVALID_UTF8`;
- `STRICT_JSON_REJECTED`;
- `SCHEMA_REJECTED`;
- `REFERENCE_REJECTED`;
- `GEOMETRY_REJECTED`;
- `SEMANTIC_REJECTED`.

The pure code vocabulary and record schemas grant no runtime, persistence, or provider-call authority.

## Quality boundary

Hard structural, causal, privacy, authority, and semantic gates precede any quality score. Phase 5B2A does not set pass-rate or winner thresholds. Phase 6 must freeze an outcome-blind evaluation case list, candidate symmetry, repeat count, thresholds, and falsification criteria before provider outputs or outcomes are inspected.

## Design verification

Phase 5B2A design was complete at its accepted design commit when:

- candidate surfaces, exact model IDs, and high effort are explicit;
- only model IDs are pinned and fallback is forbidden;
- repository-controlled parity and provider-owned differences are distinguished;
- Antigravity collection/retention is a fail-closed precondition;
- isolated process, attempt, timeout, concurrency, retention, and cost rules are fixed;
- Prompt Package V2 geometry direction is explicit without proposing exact bytes;
- reuse evidence covers installed skills, skills.sh, ClawHub, MCP, maintained SDKs, and official CLI documentation;
- no dependency, credential, configuration, code, model call, or runtime record is added.

## Explicit exclusions

This contract itself does not authorize implementation. The later offline implementation authorization and exact-commit acceptance do not authorize Prompt Package V2 content approval/activation, installed-CLI capability or privacy proof, external-call conformance, provider calls, credentials, production cleanup/supervision, persistence, API/CLI exposure, deployment, ModelRuns, production decisions, real data, protected windows, replay, training, Paper, Live, exchange, wallet, orders, or trading.
