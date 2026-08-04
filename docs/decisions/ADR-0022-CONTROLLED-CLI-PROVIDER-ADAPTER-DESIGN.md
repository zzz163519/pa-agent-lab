# ADR-0022: Controlled CLI Provider Adapter Design Boundary

Status: ACCEPTED FOR PHASE 5B2A DESIGN. THE OFFLINE PHASE 5B2B CONTRACT/FAKE-EXECUTABLE/PROMPT-V2-PROPOSAL SUBSET WAS LATER AUTHORIZED SEPARATELY; CREDENTIALS, REAL CLI INVOCATION, PROVIDER CALLS, MODEL-RUN RECORDS, AND PROMPT PACKAGE V2 APPROVAL/ACTIVATION REMAIN UNAUTHORIZED.

## Context

Phase 5B1 has one immutable local prepared payload bound to the current synthetic Policy Assembly and Prompt Package V1. It deliberately contains no provider request, model run, response, or production BrooksDecision.

ADR-0005 selects GPT-5.6 and Gemini 3.6 Flash as peer candidates. ADR-0011 fixes anonymous causal input and provider-neutral run/attempt/audit identities. ADR-0021 proves strict offline response validation but leaves four provider-bound gaps unresolved:

- exact provider surfaces and model IDs;
- isolated PNG and structured-output transport;
- retry, timeout, retention, usage, and cost behavior;
- deterministic trade geometry for provider `long` and `short` verdicts.

Calvin approved only a research and governance-design step. The immutable design authorization is `docs/decisions/PHASE5B2A_DESIGN_AUTHORIZATION_V1.json`, record hash `sha256:56567488f68af91b283540e6f4064195973403472cbee2cf4d6ffcd3ac64b610`.

## Decision

### Phase 5B2 split

Phase 5B2 is split again:

- **Phase 5B2A**: accepted provider-adapter design, reuse evidence, privacy and isolation requirements, Prompt Package V2 direction, and a future implementation plan;
- **Phase 5B2B**: any adapter implementation, credential/configuration change, provider subprocess invocation, external request, ModelCall/ModelRun/ProviderAttempt/Audit persistence, or production BrooksDecision creation.

This ADR accepts only Phase 5B2A design. The later immutable `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`, hash `sha256:b13c748a744d2c772006af596411e8ece145a99feed02a043e31cb5cb3f349ae`, separately authorizes only the offline contracts, fake-executable adapter foundation, unapproved V2 proposal, exports, and governance synchronization. A first external call still requires another explicit bounded authorization after independent implementation acceptance, privacy verification, and exact Prompt Package V2 approval and activation.

### Exact peer candidates

The accepted candidate identities are:

| Candidate | Provider surface | Exact model ID | Reasoning effort |
|---|---|---|---|
| Gemini peer | Antigravity CLI through `agy` | `gemini-3.6-flash-high` | `high` |
| GPT peer | Codex CLI through `codex --model gpt-5.6` | `gpt-5.6` | `high` |

Only model IDs are pinned as semantic runtime identity. CLI versions and executable hashes are not pinned. A CLI upgrade must still pass the future adapter's capability and output-protocol preflight. If an exact model ID is absent, the adapter fails closed; it never selects an alias, fallback, lower effort, newer model, or alternate provider automatically.

The two `high` labels do not prove equal hidden compute. They prevent a known local configuration asymmetry and remain provider-specific metadata.

### Controlled-input parity

The repository-controlled inputs must be identical between candidates:

- exact approved and active Prompt Package bytes;
- exact closed response JSON Schema bytes;
- exact anonymous normalized OHLC and continuity payload;
- exact approved Doctrine projection;
- exact context and detail PNG bytes bound by their content hashes;
- the same cutoff, bar duration, and prepared input identity.

Provider-owned hidden system instructions are not byte-equivalent and cannot be represented as repository authority. They are an explicit provider difference. The adapter must prevent additional local rules, skills, plugins, MCP servers, workspace instructions, conversation history, memory, or tool results from entering either request.

### Isolated CLI execution

A future adapter may invoke the approved CLIs only inside a new isolated temporary workspace containing the exact anonymous request artifacts and generic filenames. It must expose no repository, Git metadata, source inventory, local Case identity, secrets, ordinary home-directory files, prior chats, or unrelated environment variables.

The execution profile must:

- use argv-based process spawning, never a shell command string;
- disable or isolate plugins, MCP, local rules, skills, conversation continuation, subagents, and tools;
- prohibit model-generated terminal, file, network, web, or editing actions;
- use machine-readable structured output and the exact package-bound schema;
- attach only the two validated PNG artifacts;
- reject any observed tool/subagent step or extra output;
- delete the temporary CLI session/workspace after terminal evidence is safely committed.

Codex's available design surface includes image attachment, output schema, ephemeral sessions, ignored user config/rules, an isolated working directory, and read-only sandboxing. Antigravity exposes model/effort selection, JSON Schema, machine output, sandboxing, and workspace file references, but it requires stronger proof before use because its product includes plugins, MCP, persistent history, tools, and interaction-data collection.

### Antigravity privacy gate

Before any `agy` request, the operator must independently verify and record that:

- interaction-data collection is disabled for the authenticated account;
- the external retention/training configuration is acceptable for this exact synthetic-only scope;
- no plugin, MCP server, local rule, custom agent, hook, or prior conversation is loaded;
- the isolated workspace cannot read outside its exact anonymous artifacts;
- both PNG files are transmitted unchanged and no source path or unrelated file content is sent.

If any item cannot be verified, the Antigravity adapter is unavailable. The system does not silently replace it with a Google SDK, gateway, or another Gemini route.

### Prompt Package V2 and planned geometry

Prompt Package V1 remains immutable and approved only under its existing hash. It is not edited.

A future Prompt Package V2 proposal must add exact anonymous normalized values for:

- planned entry price;
- planned protection price;
- planned objective price.

The values are provider-proposed policy semantics, not real prices or execution fills. Local deterministic validation must verify finite values, directional ordering, structural references, visible-prefix anchoring, protection/objective side, and the existing Swing `>= 2.0R` requirement without repair.

The initial provider-bound trade-plan subset accepts only `stop` and `limit`. `market_next_event` remains part of historical V1 semantics but is not accepted by this initial provider-bound profile because its exact future event price is unavailable at the decision cutoff. The adapter must not substitute the last close, an average, a guessed tick, or any later event.

Prompt Package V2 bytes, schema, validator version, package hash, approval, activation, and any prepared payload are all separately governed. This ADR approves only the design direction; it approves no exact V2 content.

### Attempts, timeout, and sequencing

The first adapter profile is deliberately narrow:

- one provider attempt per logical run;
- no hidden or automatic retry;
- 300-second hard wall-clock timeout;
- timeout terminates the local process and receives no automatic retry;
- one active invocation total;
- no batching and no concurrent candidate execution.

If a CLI's internal retry cannot be disabled or each underlying request cannot be observed, that adapter fails closed. A rate-limit or transient provider error remains one terminal transport error rather than authority to retry.

### Local retention and audit

A future accepted invocation may retain only:

- exact final JSON result bytes exposed unchanged by the CLI in local content-addressed storage;
- request and response hashes;
- exact model ID and provider surface;
- input, output, and cache-token usage when reported;
- observed latency and terminal status;
- deterministic validation result and rejection codes.

It must not retain chain-of-thought, reasoning traces, tool trajectories, CLI conversation history, unrelated stderr, or provider-generated files. A tool trajectory may be inspected transiently only to reject the invocation; it does not become policy evidence.

CLI-reported token use, cache use, latency, and valid-response rate are measurable. A provider-specific machine envelope may be decoded only under a closed versioned transport schema, with exactly one unchanged terminal result and no tool/subagent event. This is not authority to extract JSON from prose or choose among multiple outputs. If the CLI cannot expose the terminal JSON unchanged, the adapter fails closed. The system must not invent per-call dollar cost when the CLI/subscription does not provide auditable billing. Monetary ranking is deferred until an approved evidence source exists.

### Hard quality gates

Phase 5B2A fixes only outcome-independent rejection gates:

- request/package/model identity mismatch;
- malformed UTF-8 or non-JSON terminal output;
- schema, unknown-field, identity, probability, or strict-parser failure;
- unknown bar, Doctrine, evidence, claim, structure, magnet, setup, or signal reference;
- causal, privacy, geometry, direction, branch, or reward/risk failure;
- input or PNG content mismatch;
- any tool, subagent, plugin, MCP, history, or unauthorized file access;
- unverified external collection/retention behavior;
- timeout, hidden retry, output ambiguity, or resource-bound violation.

Accuracy, pass-rate, abstention, prefix-invariance, consistency, latency, and candidate-selection thresholds remain Phase 6 decisions. They must be frozen against an outcome-blind evaluation sample before outputs are inspected.

## Reuse decision

Future implementation should reuse Node's argv-based `child_process.spawn`, existing canonical hashes, strict JSON/Ajv validation, chart-byte validation, Prompt Package lifecycle, prepared-payload identity, and append-only PostgreSQL patterns.

Do not add TanStack AI, Vercel AI SDK, direct OpenAI/Google SDKs, a gateway, ClawHub provider plugin, MCP server, orchestration framework, or second audit store. They either violate the approved CLI surfaces, add dynamic routing/fallback, introduce credentials and network authority, expose broad tools, or duplicate local validation and persistence.

The evidence is in `docs/research/PHASE5B2A_CONTROLLED_CLI_PROVIDER_ADAPTER_REUSE_SCAN_V1.md`.

## Consequences

- Candidate identity is explicit without freezing incidental CLI packaging.
- CLI convenience remains subordinate to repository privacy, causality, schema, and audit contracts.
- Provider-owned system instructions are disclosed as a comparison limitation rather than mislabeled byte parity.
- No-trade and uncertainty semantics remain available, while trade acceptance waits for an exact approved V2 geometry schema.
- Hidden retries, persistent agent sessions, broad tool access, and unverifiable Antigravity collection settings are hard blockers.
- Cost claims remain limited to observable evidence.

## Later offline implementation note

Under the separate authorization, the repository now contains pure candidate/request/terminal contracts, strict V2 stop/limit geometry validation, fixed resource limits, an isolated five-file workspace, one content-hashed fake executable, bounded process-group supervision including resistant-descendant termination, strict closed-envelope decoding, and non-executing candidate profile builders with bounded self-hashed Codex preflight evidence. The exact Prompt Package V2 files remain an `unapproved` proposal. Antigravity remains unavailable because exact non-interactive PNG transport is not implemented or proved. No real `agy`/Codex invocation, provider request, runtime record, migration, API/CLI route, deployment, credential, or production BrooksDecision was added.

## Not authorized

This ADR does not authorize, and the later offline authorization does not add authority for:

- implementation beyond the exact offline boundary, migrations, runtime provider adapters, API/CLI routes, services, or deployment changes;
- installation or configuration of SDKs, skills, plugins, MCP servers, credentials, or provider accounts;
- `agy -p`, `codex exec`, or any other inference/model subprocess invocation;
- Prompt Package V2 exact content, approval, activation, or payload preparation;
- ModelCall, ModelRun, ProviderAttempt, ModelRunAudit, raw response, or production BrooksDecision records;
- real Case ingestion, real market data, protected-window access, outcomes, replay, training, Paper, Live, execution, exchange, wallet, order placement, or trading.
