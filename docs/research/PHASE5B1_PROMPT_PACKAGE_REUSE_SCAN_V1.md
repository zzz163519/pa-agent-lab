# Phase 5B1 Prompt Package Reuse Scan V1

Status: CONTRACT-SELECTION EVIDENCE. NO INSTALLATION OR IMPLEMENTATION AUTHORITY.

## Capability and hard boundary

Phase 5B1 needs a repository-owned, provider-neutral package that can:

- bind exact prompt and response-schema bytes;
- validate strict identity-free JSON offline;
- reuse existing BrooksDecision semantic validators and canonical hashes;
- prepare, but not send, an outbound payload from one immutable Policy Assembly;
- preserve append-only authority and causal/privacy isolation.

It must not add a provider SDK, call a model, choose a provider, repair model output, create ModelRun/ProviderAttempt records, expose a second prompt authority, upload content, read external data, or introduce Paper/Live/execution capability.

## Search channels

The read-only scan covered:

- installed Pi and agent skills;
- skills.sh prompt and structured-output candidates;
- ClawHub prompt, logging, provenance, and deterministic-controller candidates;
- MCP Registry prompt, database, provenance, and audit candidates;
- maintained GitHub and npm projects for structured output, JSON Schema, model transport, prompt registries, and tracing;
- repository contracts, generated schemas, persistence parsers, canonical hash utilities, and PostgreSQL seams;
- official documentation for the serious library candidates.

The local environment also supplied negative evidence: the ClawHub CLI was unavailable, the configured Exa search backend was not installed, and an initial GitHub keyword search returned no usable candidate. Those failures did not authorize guessing or installation; the serious candidates below were evaluated from their documented public boundaries and the repository's already installed dependencies.

## Existing repository reuse

| Existing seam | Decision | Reason |
|---|---|---|
| `canonicalStringify` and `canonicalHash` | Select | Already define the repository's sorted-key canonical JSON and SHA-256 identity rules. |
| `parseStrictJsonText` | Select | Already rejects duplicate keys, comments, trailing commas, syntax errors, and non-JSON text before semantic validation. |
| Ajv 2020 and `jsonc-parser` | Select | Already installed and used for generated closed schemas and strict persisted parsing; no second parser or provider-specific coercion. |
| `ts-json-schema-generator` | Select | Existing schema-generation dependency and workflow; the identity-free schema remains a separately reviewed closed artifact. |
| `BrooksDecisionV1` validators | Select | Existing causal, authority, Doctrine, direction, geometry, Scalp/Swing, uncertainty, and probability gates remain the semantic authority. |
| `PolicyAssemblyV1` and `OutboundModelPayloadV1` | Select | Existing local Case-to-policy-input and provider-neutral payload identities; do not duplicate or mutate their authority. |
| existing PostgreSQL append-only roles/migrations | Select | Preserve the established transaction, role, content-hash, JSON-to-column, and immutable-record patterns. |

The existing schema generator does not by itself implement cross-record or cross-field semantics. The future validator must call the local domain contract after structural validation.

## Serious external candidates

| Candidate | Observed capability | Decision |
|---|---|---|
| Vercel AI SDK | Provider clients, model calls, structured output, retries and gateway integrations | Reject for 5B1: it creates provider/transport authority before provider approval and has a wider capability surface than the offline contract. |
| TypeChat | Generates prompts from TypeScript types and may use model-assisted repair/extraction | Reject: prompt text must be repository-fixed and raw output must pass or reject without repair. |
| Instructor.js | Provider client plus schema extraction, Zod integration, and retry/repair patterns | Reject: provider-bound and semantically capable of rewriting malformed output. |
| Langfuse | External prompt management, tracing, deployment/version tags, and service storage | Reject: creates a second mutable prompt/audit authority and requires external service/privacy decisions. |
| LangWatch | LLM observability, prompts, evaluations, and external telemetry | Reject: external telemetry and mutable prompt/evaluation surface are outside the offline boundary. |
| Prompt-management skills from skills.sh | Human workflow guidance for prompts and structured output | Reject as authority: instructions cannot replace immutable local artifacts, hashes, or validators. |
| ClawHub logging/provenance/controller skills | Agent guidance or emitted logs, sometimes with external integrations | Reject: emitted guidance is not database-enforced domain evidence and may widen storage/tool authority. |
| Generic PostgreSQL/audit MCP servers | Generic SQL, schema, or audit operations through a tool boundary | Reject: adds a second database/tool authority and is unnecessary for existing local seams. |
| LangChain, LlamaIndexTS, Mastra | Broad model, retrieval, agent, telemetry, and workflow orchestration | Reject: no orchestration, retrieval expansion, or provider call is authorized in 5B1. |
| Zod/TypeBox as a new runtime validator | Convenient structural schemas | Reject adding a dependency: Ajv, generated schemas, and existing strict TypeScript validators already cover the required boundary. |

No candidate is selected as a runtime authority. No package, skill, MCP configuration, image, provider, or service is added.

## Privacy and determinism comparison

External provider SDKs and observability systems commonly permit network calls, provider-managed retention, deployment-selected prompts, retries, tool calls, or telemetry. Those are exactly the boundaries not yet decided for Phase 5B2.

A local schema parser also cannot prove Brooks semantics by itself. The selected design keeps structural validation, local identity binding, Doctrine allowlist, causal visibility, trade-plan gates, and hashes in repository-owned code. Any future provider adapter remains subordinate to these validators.

## Selected implementation boundary

```text
repository prompt bytes
  + repository response-schema bytes
  + frozen validator-contract version
    -> canonical package hash
      -> Calvin exact-hash approval
        -> explicit operator activation
          -> existing PolicyAssembly
            -> prepared local payload wrapper
```

The boundary ends before model selection, transport encoding, external call, attempt, response, cost, retention, or decision persistence.

## References inspected or deferred

- Existing `packages/persistence-contracts/src/persisted-json-v1.ts` strict parser and Ajv 2020 integration.
- Existing `packages/contracts/src/contract-utils-v1.ts`, `brooks-decision-v1.ts`, `policy-input-v1.ts`, and `model-run-audit-v1.ts`.
- Existing Phase 1, Phase 2, Phase 3B, Phase 4A, and Phase 5A contracts and migrations.
- Vercel AI SDK: <https://sdk.vercel.ai/docs>
- TypeChat: <https://github.com/microsoft/TypeChat>
- Instructor: <https://github.com/jxnl/instructor-js>
- Langfuse: <https://langfuse.com/docs>
- LangWatch: <https://langwatch.ai/docs>
- skills.sh: <https://skills.sh/>
- ClawHub: <https://clawhub.ai/skills>
- MCP Registry: <https://registry.modelcontextprotocol.io/>

## Verification

The scan is complete as selection evidence. It authorizes no install, provider call, network access, implementation, or package activation. Any later provider transport or external observability choice requires a separate Phase 5B2 reuse/privacy review.
