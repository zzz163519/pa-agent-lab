# Phase 5B2A Controlled CLI Provider Adapter Reuse Scan V1

Status: COMPLETED READ-ONLY REUSE SCAN. NO TOOL, SDK, SKILL, MCP SERVER, CREDENTIAL, CONFIGURATION, OR MODEL CALL WAS INSTALLED OR AUTHORIZED.

Research date: `2026-08-04`

## Capability and constraints

Phase 5B2A needs a future narrow adapter around two user-selected local CLI surfaces:

- `agy` with exact model ID `gemini-3.6-flash-high`;
- `codex --model gpt-5.6` with high reasoning effort.

The adapter output would be policy evidence. It must preserve anonymous causal input, exact PNG and Prompt Package identities, strict closed JSON, one visible provider attempt, append-only audit, no hidden fallback, and complete isolation from repository context, plugins, tools, memory, outcomes, real data, replay, and trading.

The current authorization covers research and governance documents only. No candidate was installed, configured, authenticated, or invoked for inference.

## Search channels

The scan covered:

- installed Pi skills and project skills;
- skills.sh via `npx skills find` with multimodal, structured-output, OpenAI, Gemini, CLI, and adapter queries;
- ClawHub provider and image skills;
- the official MCP Registry and maintained Gemini/multimodal MCP repositories;
- GitHub repository metadata and source/readme inspection;
- npm metadata for maintained TypeScript provider libraries;
- official Codex and Antigravity CLI help, documentation, changelogs, and repository metadata;
- general web search for Antigravity image, schema, sandbox, privacy, and retention behavior.

The agent-reach Exa MCP route returned `Unknown MCP server 'exa'`. The configured read-only web search, official documentation, GitHub, npm, skills.sh, and local CLI help supplied the evidence instead.

## Local CLI evidence

### Antigravity CLI

Observed local read-only commands:

```text
command -v agy
agy --help
agy models
agy changelog
agy agents
```

For the Gemini 3.6 Flash family, the local model catalog contains `gemini-3.6-flash-high`, `-medium`, and `-low`. The approved identity is only `gemini-3.6-flash-high`.

The CLI help exposes non-interactive print mode, model and effort selection, custom JSON Schema, JSON/stream-JSON output, sandboxing, plan mode, project/workspace selection, and plugins. It does not expose a simple Codex-style `--image` flag. Official documentation describes `@` workspace-path references and interactive image pasting; exact non-interactive PNG attachment therefore remains an unproved implementation gate.

Official Antigravity documentation states that the product includes plugins, MCP, rules, hooks, subagents, tools, persistent conversations, and a terminal sandbox that is disabled by default unless configured. Its GitHub README also states that Google may collect and use Interactions data, with opt-out available through settings. Those surfaces are incompatible with this project unless independently disabled and verified before every call.

The public `google-antigravity/antigravity-cli` repository showed about 1.8K stars and latest release `1.1.10` on the research date. GitHub exposed no repository license metadata and the repository contains documentation rather than the shipped binary source. The CLI remains an external executable governed by product terms, not a vendored project dependency.

Decision: retain only as the Calvin-selected Gemini provider surface, subject to fail-closed privacy, isolation, PNG attachment, no-tool, and no-hidden-retry proof. Do not install a replacement Gemini SDK or route.

### Codex CLI

Observed local read-only commands:

```text
codex --help
codex exec --help
codex doctor --help
codex --version
```

Codex `exec` exposes exact image attachment, output schema, JSON events, output-last-message capture, ephemeral sessions, ignored user config, ignored rules, isolated working directory, model selection, and read-only sandboxing. The installed package was `@openai/codex@0.145.0`; this is observation only, not a pin.

The maintained `openai/codex` repository is Apache-2.0, had about 103K stars, and published `0.146.0` near the research date. Its broad coding-agent and tool surface still requires an isolated empty workspace, no-tools policy, exact event rejection, and hidden-retry verification.

Decision: retain only as the Calvin-selected GPT provider surface. Use no Pi provider alias or API SDK fallback.

## Skills and registries

| Candidate | Evidence | Decision |
|---|---|---|
| skills.sh `tanstack-ai` | Popular provider-neutral AI skill; points to the broad TanStack AI framework | Reject as runtime authority; the approved surfaces are `agy` and Codex CLI |
| skills.sh structured-output skills | Prompt/schema guidance and generic validation workflows | Reject as runtime dependency; existing strict JSON/Ajv contracts are narrower and authoritative |
| skills.sh OpenAI CLI/configuration skills | Operator guidance for external CLI configuration | Reject; project must own exact argv, privacy, and audit contracts |
| ClawHub UniGateway provider | MIT plugin, API key, dynamic model discovery, OpenAI-compatible gateway, static fallback catalog | Reject; adds a third-party aggregator, dynamic routing, credentials, and fallback behavior |
| ClawHub Gemini Image Proxy | Uses an OpenAI-compatible proxy and Python SDK for image generation/editing | Reject; wrong direction and adds proxy/API-key authority |
| `rlabs-inc/gemini-mcp` | Gemini MCP with structured output plus web search, code execution, caching, media generation, and API keys | Reject; tool surface and external-data authority are far broader than the policy call |
| `rsmdt/multimodal-mcp` | Multi-provider media generation MCP with auto-discovery and provider keys | Reject; generates media rather than inspecting exact local charts and may auto-select providers |
| official MCP Registry | Discovery mechanism for independently hosted MCP tools | Reject for provider transport; MCP adds mutable tool discovery and a second authority boundary |

No skill or MCP server can replace local Brooks schema validation, authority checks, provider-attempt identity, or append-only audit.

## Maintained SDK and framework candidates

| Candidate | Observed identity | Relevant capability | Decision |
|---|---|---|---|
| TanStack AI | `@tanstack/ai@0.42.0`, MIT, about 3K stars | Provider adapters, structured output, multimodal prompts, usage/telemetry | Reject for this phase; broad dependency and direct provider SDK path violate the approved CLI surfaces |
| Vercel AI SDK | `ai@7.0.51`, Apache-2.0 npm metadata, about 26K stars | Provider-neutral text, object output, images, gateways, agents | Reject; gateway/direct provider configuration adds routing and credential authority |
| OpenAI Node SDK | `openai@7.4.0`, Apache-2.0 | Direct structured and multimodal provider requests | Reject; Calvin selected Codex CLI, not an API-key SDK |
| Google Gen AI SDK | `@google/genai@2.15.0`, Apache-2.0 | Direct Gemini multimodal and structured requests | Reject; Calvin selected Antigravity `agy`, not Google SDK/API |
| LangChain, LlamaIndex, Mastra | Broad agent/model orchestration frameworks | Providers, tools, memory, retries, workflows | Reject without installation; duplicate authority and excessive network/tool surface |

Package versions are research observations, not approved dependencies or pins.

## Selected reuse boundary

A future separately authorized implementation should add no provider framework. It should reuse:

- Node's built-in `child_process.spawn` with an argv array and no shell;
- existing canonical SHA-256 and deep validation utilities;
- existing strict JSON parser and package-bound Ajv schema;
- existing anonymous chart-byte and manifest validators;
- existing Policy Assembly, Prompt Package activation, and prepared-payload identities;
- existing append-only PostgreSQL and restricted-role patterns;
- existing ModelCall/ModelRun/ProviderAttempt/Audit meanings, extended only by new versioned records if required.

The only external executables are the operator-selected installed `agy` and `codex` CLIs. Only model IDs are pinned. CLI upgrades are allowed but must pass capability preflight; executable versions and hashes are not semantic authority.

## Residual blockers before implementation

- No exact Prompt Package V2 proposal, schema, hash, approval, or activation exists.
- Antigravity interaction-data opt-out has not been independently verified.
- Antigravity non-interactive exact PNG attachment has not been proved.
- Plugins/MCP/rules/history isolation has not been proved for `agy`.
- No-hidden-retry behavior has not been proved for either CLI.
- Exact child environment, output byte limits, process-tree termination, usage extraction, and rejection-code schemas remain to be implemented under contract TDD.
- No implementation or external-call authorization exists.

## Verification

This scan performed only documentation search, repository/package metadata reads, local `--help`/model-list diagnostics, and source/readme inspection. It did not:

- run `agy -p` or `codex exec`;
- send prompt, OHLC, Doctrine, chart, payload, or repository content to a model;
- change Antigravity/Codex settings or authentication;
- install a skill, MCP server, SDK, package, plugin, or service;
- access real data, protected windows, outcomes, replay, training, Paper/Live, or trading.
