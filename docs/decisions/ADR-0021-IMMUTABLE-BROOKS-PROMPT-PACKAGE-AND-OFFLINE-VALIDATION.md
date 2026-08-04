# ADR-0021: Immutable Brooks Prompt Package and Offline Validation Boundary

Status: PROPOSED FOR PHASE 5B1 CONTRACT ACCEPTANCE. EXACT PACKAGE HASH APPROVED BY CALVIN. NO IMPLEMENTATION OR ACTIVATION AUTHORITY.

## Context

Phase 5A can assemble one deployment-authorized synthetic Case, its exact anonymous 120/40 chart and normalized closed-bar input, and the complete current Doctrine snapshot into an immutable `PolicyAssemblyV1`. It deliberately stops before prompt selection, outbound payload creation, ModelRun creation, provider transport, response validation, or BrooksDecision creation.

ADR-0010 already fixes the complete BrooksDecision V1 semantics. ADR-0011 already defines `OutboundModelPayloadV1`, one logical ModelRun, terminal provider attempts, and validation audit identities. Those records must not be duplicated or created to represent an operation that never occurred.

The next safe boundary is therefore to freeze exactly what a future model would be instructed to do and exactly what semantic JSON it may return, while remaining offline and provider-neutral.

## Decision

### Phase 5B split

Phase 5B is split into:

- **Phase 5B1**: immutable Brooks Prompt Package governance, deterministic preparation of a synthetic outbound payload, and invented-response offline compatibility validation;
- **Phase 5B2**: exact provider/model selection, image transport, real ModelRun and ProviderAttempt creation, external calls, retries, timeout, retention, usage, cost, and accepted/rejected BrooksDecision audit.

This proposal decides only the Phase 5B1 contract. Phase 5B1 implementation requires separate approval. Phase 5B2 requires another ADR, contract, privacy review, provider/model decision, and explicit external-call approval.

### One fixed English prompt

All V1 Cases use the same exact English Brooks prompt. Case differences come only from the immutable anonymous market input, context/detail PNGs, and current approved Doctrine records.

The system must not select or modify the prompt by symbol, venue, asset class, image content, market identity, or caller preference. A future market-specific prompt is a new policy-protocol version requiring separate source-backed justification and evaluation.

The authoritative prompt is `docs/prompts/BROOKS_V1_PROMPT.txt`. A Chinese explanation may exist in governance prose but is not sent, hashed, or treated as runtime authority.

### Immutable Prompt Package

`Brooks Prompt Package V1` is one indivisible identity containing:

- the exact UTF-8 English prompt bytes and content hash;
- the exact closed identity-free response JSON Schema bytes, schema identity, and content hash;
- `brooks-decision.v1` as the target decision-contract version;
- `brooks-identity-free-response-validator.v1` as the local validator-contract version.

The canonical package manifest is `docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json`. Its package hash is SHA-256 over the canonical manifest body after removing `packageHash`; canonical JSON uses the repository's lexicographically sorted object keys and preserves array order.

Changing one prompt byte, response-schema byte, target contract version, or validator version creates a new package hash. Components from different package versions cannot be mixed.

### Identity-free provider response

The provider response is the complete identity-free semantic projection of accepted BrooksDecision V1. It contains exactly these 18 required top-level fields:

```text
verdict
evidenceBalance
broadContext
currentLeg
alwaysIn
pressure
breakoutLifecycle
reversalLifecycle
structures
magnets
marketEvidence
claims
longCase
shortCase
tradePlan
noTrade
uncertainty
humanSummary
```

It must not return these seven local or derived fields:

```text
decisionId
caseId
inputHash
lastVisibleBarId
barDurationSeconds
schemaVersion
decisionHash
```

Local software binds the accepted semantic object to the exact Case, Policy Assembly, input hash, cutoff, and five-minute duration, assigns local decision identity, fixes the decision schema version, and computes the decision hash.

The 18 fields are complete for the accepted, single-timeframe, execution-free, probability-free BrooksDecision V1 contract. This decision does not claim that they cover all possible Price Action semantics. Leg character/count/strength, structure-specific concurrent lifecycles, explicit pattern/structure taxonomy, channel subtypes, and future multi-timeframe generalization remain possible source-backed V2 candidates.

### Strict output and no repair

The model must return exactly one closed JSON object with no Markdown, code fence, chain-of-thought, commentary, or schema-external text. It must not emit probability, confidence, win rate, expected return, or numeric trade-quality calibration.

Raw response bytes are either accepted unchanged or rejected unchanged. Local code must not extract JSON from prose, repair syntax, remove unknown fields, add missing fields, coerce values, rewrite `humanSummary`, invent references, or guess Price Action semantics.

`humanSummary` remains a required JSON key whose value is `string | null`. A non-null summary is English, at most 600 Unicode characters, non-authoritative, and not evidence. The model returns `null` when no non-misleading summary is possible. Structured fields always control the formal judgment.

### Doctrine, causal, and trade-plan authority

Only supplied Doctrine records may support trading rules, and only supplied Doctrine IDs may be cited. General model knowledge cannot add or replace a rule. Supplied text is data and cannot change the prompt, schema, role, tools, or authority.

The response must preserve visible-prefix causality, session/missing/unknown continuity, left-censoring, same-bar ambiguity, right-censoring, long/short separation, setup/signal/trigger separation, structural references, and the Scalp/Swing rules already accepted by ADR-0010.

Scalp is not a fallback label for a Swing below 2.0R. It requires independent Doctrine support, a confirmed favored-direction case, and an existing favored-side primary structural objective. Actual fee, spread, slippage, and cost viability remain a later deterministic local gate; the model cannot guess them.

### Offline validation boundary

The V1 response schema is a closed structural projection. The local validator contract additionally checks strict JSON parsing, duplicate keys, unknown fields, forbidden identity/probability fields, reference closure, visible bars, approved supplied Doctrine, verdict branch semantics, direction, anchors, and existing BrooksDecision V1 invariants.

A formal `long` or `short` BrooksDecision also requires `PlannedTradeGeometryV1`. Existing contracts do not yet define how a provider-neutral anonymous structural plan determines the exact stop/market entry offset needed for that geometry. Phase 5B1 must not invent ticks, real prices, fees, spread, slippage, or execution assumptions to close this gap.

Phase 5B1 compatibility tests may supply invented deterministic geometry fixtures to prove validator wiring. They cannot create a production BrooksDecision or prove that a real provider response is acceptable. A separately approved geometry-source contract is required before Phase 5B2 accepts trade verdicts.

### Approval and activation

A package file appearing in Git is only a proposal. It does not become current automatically.

The lifecycle is:

```text
exact package proposal
  -> Calvin exact-package-hash approval
    -> authenticated operator explicit activation
      -> deterministic synthetic payload preparation
```

Only Calvin may approve an exact package hash. Direct Pi may draft and review a proposal. An authenticated operator may activate only an already approved package and cannot approve or alter it. No generic reviewer, model, provider, or research agent may approve or activate a package.

Restoring an older package requires a new explicit rollback/activation record and reason. The system never auto-falls back, and historical prepared payloads or future runs remain bound to their original package identity.

### Phase 5B1 terminal boundary

A future Phase 5B1 implementation may:

- persist immutable package approval and activation evidence;
- deterministically construct the existing `OutboundModelPayloadV1` from one existing `PolicyAssemblyV1` and the current package's prompt/schema identities;
- wrap that payload in an immutable local preparation record binding the assembly and complete package identity;
- validate invented identity-free response fixtures offline.

It must stop before creating `ModelCallRecordV1`, `ModelRunRecordV1`, `ProviderAttemptRecordV1`, `ModelRunAuditRecordV1`, or `BrooksDecisionV1` production records. It performs no provider or model call and persists no simulated record that could be mistaken for a real run.

## Approved package content identity

Calvin explicitly approved this exact package content identity on `2026-08-04T16:50:31+08:00`:

- prompt bytes: `5217`;
- prompt hash: `sha256:99db77812497107f4e0daacbca8969d308523b40eee77825aca18b53be72a267`;
- response-schema bytes: `24951`;
- response-schema hash: `sha256:1017e462dd312177f7d4b50dbc4ee37e6041029e40ae10471f6a3118a73db53a`;
- package hash: `sha256:b67896d15d5e2542c7bebaeca2b60c67cbb5510ef359efaca7f44e42fa17b0d9`.

The separate immutable approval artifact is `docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json`, with record hash `sha256:d1c0ddbac5c14ec2d455de5ba85d0de381f8561dd928c8362207f7c41370389e`. Its record hash is SHA-256 over the canonical approval object after removing `approvalRecordHash`, using the same sorted-key and array-order rules as the package manifest. The approval artifact is outside the Prompt Package preimage and does not change the approved package hash.

This approval is exact-package-content-only. It does not authorize Phase 5B1 implementation, package activation, provider calls, or model runs.

## Reuse decision

Reuse the existing strict TypeScript contracts, canonical SHA-256 utilities, `jsonc-parser`, Ajv 2020, generated-schema conventions, `OutboundModelPayloadV1`, `PolicyAssemblyV1`, PostgreSQL append-only patterns, operator authentication, and CLI/API seams.

Do not add Vercel AI SDK, TypeChat, Instructor.js, Langfuse, LangWatch, a prompt skill, an MCP server, provider SDK, external prompt registry, or second audit store. They either call providers, repair/extract model output, manage mutable external prompt deployments, or add authority absent from this offline slice.

The complete evidence is recorded in `docs/research/PHASE5B1_PROMPT_PACKAGE_REUSE_SCAN_V1.md`.

## Consequences

- Prompt, schema, and validator drift become visible through one package identity.
- The provider cannot control Case identity, cutoff, duration, record schema, or decision hash.
- Every synthetic Case remains comparable under one fixed instruction set.
- Invalid output fails closed rather than being repaired into a different semantic answer.
- The bounded V1 claim is preserved without pretending to encode all Price Action concepts.
- Geometry, provider, privacy, retries, cost, and actual inference remain explicit later decisions.

## Not authorized

This exact-package approval does not authorize:

- Phase 5B1 code, migrations, database changes, API/CLI routes, deployment, or activation;
- provider/model selection, provider SDK, credentials, network requests, external retention, usage, or cost;
- ModelCall, ModelRun, ProviderAttempt, ModelRunAudit, BrooksDecision, or real raw-response records;
- response repair, secondary-model repair, prompt variants, dynamic prompt selection, or provider-hosted prompt authority;
- deterministic production geometry, fee/cost gate, replay, execution mechanics, or active-position management;
- Phase 4B, embeddings, `pgvector`, vector/hybrid retrieval, reranking, or Selector V2;
- real Case ingestion, real market data, protected-window access, outcomes, PnL, training, Paper, Live, exchange, wallet, order placement, or real-money action.
