# Phase 5B1 Brooks Prompt Package and Offline Validation V1

Status: ACCEPTED CONTRACT. EXACT PACKAGE HASH APPROVED BY CALVIN. OFFLINE IMPLEMENTATION AUTHORIZED; FIRST EXACT LOCAL SYNTHETIC STANDARD ACTIVATION, EXACT NINE-UNIT DOCTRINE PREREQUISITES, AND ONE PREPARED PAYLOAD SEPARATELY AUTHORIZED AND PERFORMED; PROVIDER AUTHORITY REMAINS UNAUTHORIZED.

Authority: ADR-0003, ADR-0008 through ADR-0013, ADR-0015, ADR-0018, ADR-0020, accepted ADR-0021, `docs/decisions/PHASE5B1_IMPLEMENTATION_AUTHORIZATION_V1.json`, `docs/decisions/PHASE5B1_PACKAGE_ACTIVATION_AUTHORIZATION_V1.json`, `docs/decisions/PHASE5B1_FIRST_PACKAGE_ACTIVATION_EXECUTION_V1.json`, `docs/decisions/PHASE5B1_SYNTHETIC_PREPARATION_PREREQUISITE_AUTHORIZATION_V1.json`, and `docs/decisions/PHASE5B1_FIRST_SYNTHETIC_PREPARED_PAYLOAD_EXECUTION_V1.json`.

## Purpose

Freeze one provider-neutral Brooks V1 instruction package and define how a future offline implementation may prepare a synthetic outbound payload without calling a model or creating records that imply a call occurred.

This contract is implemented only within the separately authorized offline Phase 5B1 boundary. The contract itself grants no package activation or provider/model-call authority. Calvin separately authorized one exact local synthetic standard activation, the exact nine public-pilot Doctrine prerequisites, and one prepared payload; all bounded operations were performed and read back without a provider/model call.

## Static package artifacts

The approved package contains exactly:

| Component | File | Exact identity |
|---|---|---|
| English prompt | `docs/prompts/BROOKS_V1_PROMPT.txt` | 5217 UTF-8 bytes; `sha256:99db77812497107f4e0daacbca8969d308523b40eee77825aca18b53be72a267` |
| Identity-free response schema | `docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json` | 24951 UTF-8 bytes; `sha256:1017e462dd312177f7d4b50dbc4ee37e6041029e40ae10471f6a3118a73db53a` |
| Package manifest | `docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json` | manifest body plus computed `packageHash` |

The approved package hash is:

```text
sha256:b67896d15d5e2542c7bebaeca2b60c67cbb5510ef359efaca7f44e42fa17b0d9
```

Calvin approved this exact package content identity on `2026-08-04T16:50:31+08:00`. The separate approval artifact is `docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json`; its canonical record hash is `sha256:d1c0ddbac5c14ec2d455de5ba85d0de381f8561dd928c8362207f7c41370389e`. `approvalRecordHash` is SHA-256 over the canonical approval object after removing `approvalRecordHash`, using the package's sorted-key and array-order rules. The approval artifact is outside the package preimage. Git presence without the exact approval artifact remains non-authoritative.

## Package identity

The manifest body contains exactly:

```text
schemaVersion
packageVersion
prompt.mediaType
prompt.byteLength
prompt.contentHash
responseSchema.schemaId
responseSchema.schemaVersion
responseSchema.mediaType
responseSchema.byteLength
responseSchema.contentHash
brooksDecisionContractVersion
validatorVersion
```

`packageHash` is SHA-256 over `canonicalStringify(manifestBody)`, where object keys sort lexicographically at every level and arrays preserve order. `packageHash` is excluded from its own preimage.

The V1 literals are:

```text
schemaVersion = brooks-prompt-package-manifest.v1
packageVersion = brooks-prompt-package.v1
responseSchemaVersion = brooks-identity-free-response.schema.v1
brooksDecisionContractVersion = brooks-decision.v1
validatorVersion = brooks-identity-free-response-validator.v1
```

A byte-length or content-hash mismatch rejects the package before approval, activation, or payload preparation.

## Fixed prompt rules

- The prompt is exact English UTF-8 text with no runtime prefix, suffix, hidden instruction, per-Case template branch, or caller-supplied fragment.
- Every synthetic V1 Case uses the same prompt bytes.
- The policy input varies by anonymous market input, chart hashes, and complete current Doctrine only.
- Chinese prose is explanatory and never enters the request or package identity.
- Provider or external prompt registries are not authority.
- A prompt change creates a new component hash and package hash.

## Closed identity-free response

The response is one plain JSON object containing all and only these 18 keys:

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

All 18 keys are required. `tradePlan`, `noTrade`, `uncertainty`, and `humanSummary` use explicit nullable branches where defined; nullable does not mean the key may be omitted.

The schema copies the nested structural taxonomy from the existing generated `BrooksDecisionV1` schema, removes the seven local/derived top-level fields, preserves closed objects, and encodes existing basic list and summary bounds where JSON Schema can express them.

The response schema is structural. It does not replace the domain validator for cross-reference, direction, Doctrine, causal, or reward/risk semantics.

## Local-only fields

A response containing any of these top-level fields fails structural validation:

```text
decisionId
caseId
inputHash
lastVisibleBarId
barDurationSeconds
schemaVersion
decisionHash
```

A future local binding step supplies:

| Field | Local source |
|---|---|
| `caseId` | exact Phase 5A Policy Assembly Case binding |
| `inputHash` | exact assembled `BrooksPolicyInputV1` |
| `lastVisibleBarId` | assembled anonymous market input |
| `barDurationSeconds` | fixed accepted value `300` |
| `decisionId` | separately specified local decision identity tied to the logical run |
| `schemaVersion` | fixed `brooks-decision.v1` |
| `decisionHash` | local canonical hash after successful full validation |

Phase 5B1 does not perform the production binding because it creates no logical run or BrooksDecision.

## V1 coverage statement

The 18 fields are sufficient to reconstruct every provider-owned semantic field in accepted BrooksDecision V1 when combined with the seven local/derived fields and the required validation context.

The contract is not a universal Price Action ontology. In particular:

- current-leg character, count, and strength are not separate structured fields;
- nested structures do not carry independent per-structure breakout/reversal lifecycles;
- wedge/triangle and channel subtypes are not exhaustive controlled taxonomies;
- multi-timeframe, volume, probability/calibration, active-position, execution, and outcome semantics are outside V1.

Claims, codes, structures, and Doctrine references may describe some additional concepts, but free text carrying a concept is not proof that the schema deterministically classifies that concept. Phase 6 evidence, not prompt prose, determines whether a source-backed V2 is needed.

## Validator contract V1

`brooks-identity-free-response-validator.v1` is the fixed local validator identity. It must execute the following ordered gates without repair:

1. accept only a non-empty JavaScript string already decoded by a separately approved transport and within a separately fixed local resource bound; invalid UTF-8 byte sequences must fail at the future Phase 5B2 transport boundary before this validator;
2. parse strict JSON with comments and trailing commas disabled and duplicate keys rejected;
3. require exactly one top-level plain object and no bytes outside that JSON value;
4. validate the exact package-bound JSON Schema with coercion, default insertion, property removal, and format repair disabled;
5. reject forbidden probability/calibration names recursively;
6. reject local identity, source identity, provenance, or authoritative hash fields;
7. bind only an invented test binding in Phase 5B1, never a production Case identity;
8. validate bar references against the supplied anonymous visible prefix;
9. validate Doctrine references against the exact supplied approved Doctrine records;
10. validate response-local evidence, claim, structure, magnet, setup, signal, and trade-plan reference closure;
11. validate verdict branch, long/short direction, evidence balance, setup/signal/trigger, protection, objective, no-trade, uncertainty, and existing ADR-0010 invariants;
12. use the existing `createBrooksDecision` semantic gate only with an explicit validation context;
13. return immutable bounded validation evidence for an invented fixture, without persisting a ModelRun, attempt, audit, or BrooksDecision.

The implementation must not:

- locate a JSON substring inside prose;
- ask a second model to repair output;
- replace enum values or unknown IDs;
- remove unknown properties;
- add omitted nulls or required objects;
- coerce strings, numbers, booleans, arrays, or nulls;
- rewrite or translate `humanSummary`;
- infer an intended verdict from malformed content.

### humanSummary validation

`humanSummary` is validated only as `null` or a string of at most 600 Unicode characters. It is not evidence and cannot override structured fields. The V1 local validator does not use another model or unapproved free-text classifier to decide whether a summary is misleading. Prompt adherence and summary/structure consistency remain Phase 6 semantic-evaluation concerns; any deterministic rejection rule requires a separately frozen rule.

### Rejection versus uncertainty

A parse, schema, reference, geometry, or authority failure is a rejected response, not an `uncertain` verdict. `uncertain` is valid only when the response itself is structurally complete and critical causal or semantic evidence is insufficient or conflicting under the existing BrooksDecision contract.

## Planned geometry limitation

`createBrooksDecision` requires `PlannedTradeGeometryV1` for `long` and `short` verdicts. The current response contains structural anchors, not an authoritative exact entry offset. This matters especially for:

- stop entry beyond an anchor, where no anonymous tick/offset contract is fixed;
- market-next-event entry, whose exact price is not visible at decision time;
- later cost viability, which needs separately frozen fee, spread, and slippage assumptions.

Therefore:

- Phase 5B1 tests may provide deterministic invented `PlannedTradeGeometryV1` fixtures;
- Phase 5B1 may prove that a response plus a supplied fixture reaches the existing semantic validator;
- Phase 5B1 cannot derive authoritative geometry or persist a production BrooksDecision;
- Phase 5B2 cannot accept a trade verdict until a separate deterministic geometry-source contract is approved and implemented;
- no missing geometry is repaired by changing Swing to Scalp or moving an objective.

## Package approval and activation

Package lifecycle state is separate from package content identity.

### Proposal

A proposal consists of exact static artifacts and the recomputed package hash. Direct Pi may prepare it. Proposal creation grants no authority.

### Approval

Only Calvin may approve one exact package hash. Approval binds that hash and does not approve future byte changes. Calvin approved the V1 hash recorded above for exact-package-content-only scope. The immutable repository-governed approval artifact records `phase5b1ImplementationAuthorized = false`, `packageActivationPerformed = false`, and `providerCallsAuthorized = false`; the implementation validates that artifact and its canonical hash. The immutable approval artifact remains unchanged because its scope is exact content, while separate ADR/contract acceptance and offline implementation authorization are recorded in `docs/decisions/PHASE5B1_IMPLEMENTATION_AUTHORIZATION_V1.json`. Later operational authorizations and execution evidence are separate immutable records in `docs/decisions/PHASE5B1_PACKAGE_ACTIVATION_AUTHORIZATION_V1.json`, `docs/decisions/PHASE5B1_FIRST_PACKAGE_ACTIVATION_EXECUTION_V1.json`, `docs/decisions/PHASE5B1_SYNTHETIC_PREPARATION_PREREQUISITE_AUTHORIZATION_V1.json`, and `docs/decisions/PHASE5B1_FIRST_SYNTHETIC_PREPARED_PAYLOAD_EXECUTION_V1.json`; they do not rewrite the content approval. No generic runtime prompt-approval route is exposed to operator, reviewer, model, provider, or research-agent roles.

### Activation

An authenticated operator may append an activation only for an exact approved package. The operator cannot select alternate component hashes or modify the package. Highest committed activation sequence is current.

Calvin separately authorized the first exact local synthetic standard activation. On `2026-08-04`, the trusted-loopback deployment appended and read back sequence `1`, activation ID `sha256:eaf1ab36f8dbcba6ab810944d368f8a8a669461e7984862f7e45270d3b227ddc`, for the exact approved package and approval-record hashes. This does not authorize any additional activation or rollback.

### Rollback

Restoring an older approved package appends a new explicit rollback activation with target, replaced activation, reason, operator principal, and new sequence. There is no automatic fallback to the latest Git file or an older apparently valid package.

## Deterministic payload preparation

A Phase 5B1 command accepts only one existing successful `assemblyId`. The server resolves the current package activation once and revalidates:

- exact package approval and activation identity;
- prompt and response-schema bytes against the package manifest;
- exact successful Policy Assembly and its current authority relations;
- exact `BrooksPolicyInputV1` integrity;
- deployment-authorized synthetic Case provenance;
- absence of prior answer, review, outcome, replay, memory, and later-bar influence.

It then constructs the existing `OutboundModelPayloadV1` using:

```text
policyInput = exact assembly policy input
promptHash = exact package prompt contentHash
outputSchemaVersion = exact package responseSchema.schemaVersion
```

Because existing `OutboundModelPayloadV1` does not bind validator or package identity, Phase 5B1 must use a new immutable local preparation wrapper that binds at least:

```text
schemaVersion
preparationId
assemblyId
packageActivationId
packageHash
promptHash
responseSchemaHash
outputSchemaVersion
validatorVersion
payload
payloadHash
operatorPrincipal
```

The wrapper must reconstruct and verify the existing payload hash. It is local preparation evidence, not a ModelRun or provider request. A future Phase 5B2 request identity must bind the preparation and exact package rather than relying on `payloadHash` alone.

The natural idempotency identity is `(assemblyId, packageActivationId, preparationRulesVersion)`. A package rollback has a new activation identity and therefore creates a new preparation even if component bytes match a historical package.

## Persistence and transport direction

The authorized implementation uses:

- strict TypeScript builders and generated JSON Schema/OpenAPI;
- content-hashed forward-only migrations;
- append-only PostgreSQL records rejecting `UPDATE`, `DELETE`, and `TRUNCATE`;
- server-derived principals and exact foreign keys;
- operator-only loopback activation, rollback, and preparation routes/CLI;
- no Research Console route and no reviewer preparation authority.

Static package artifacts remain repository files. PostgreSQL records bind exact package hashes and lifecycle events; the database does not provide mutable prompt text editing.

## Invented adversarial fixtures

Phase 5B1 implementation tests, if separately approved, must use only invented synthetic values and cover at least:

- exact 18-key valid no-trade and uncertain responses;
- long and short fixtures with explicit invented planned geometry;
- extra identity/hash fields;
- probability/confidence fields at nested depths;
- invalid JSON, duplicate keys, trailing text, Markdown fences, unknown fields, omitted required keys, and wrong null branches;
- future/unknown bar IDs and unknown Doctrine/evidence/claim/structure/magnet/setup IDs;
- actionable opposing case, wrong evidence balance, wrong protection side, triggered/backfilled entry, invalid objective side, sub-2R Swing, and Swing-to-Scalp relabel attempts;
- draft/retired/absent Doctrine and general-knowledge-only claims;
- changed prompt/schema bytes and mixed package components;
- unapproved package activation, implicit latest-file activation, and automatic rollback rejection;
- prior answers, CalvinReview, outcomes, PnL, replay, memory, later bars, and forbidden-track fixtures having no effect on preparation identity.

Tests prove contract behavior, not Brooks source completeness, model quality, probability, profitability, or cost viability.

Operational state: the exact package is current under the separately authorized sequence-1 standard activation. The exact nine public-pilot Doctrine proposals were explicitly approved, passed the fixed Phase 4A quality gate, and became current corpus activation sequence 1. Synthetic assembly `sha256:e8f4126db8473017838bffc721457f46bf3022b79a2e16208f8674e28a6ebc41` deterministically produced the one authorized prepared payload `sha256:98128380faee158597deb8d6f097165b45b7a501711dd6a1b0bcac1644bbf961`. No provider/model call or formal model-run record was created.

## Exit gate for Phase 5B1 implementation

Phase 5B1 is complete only when:

- exact package artifacts reproduce byte-for-byte and package hash recomputes;
- only Calvin-approved packages can be explicitly activated;
- one existing synthetic assembly deterministically produces one immutable prepared payload wrapper;
- identity-free invented responses pass or reject without repair under the frozen schema/validator version;
- trade fixtures require explicit invented geometry and no production geometry authority exists;
- no ModelCall, ModelRun, ProviderAttempt, ModelRunAudit, BrooksDecision, provider transport, real data, replay, or trading path is present;
- full repository, generated-artifact, PostgreSQL, causal, privacy, authority, and independent-review gates pass.

## Explicit exclusions

The implementation authorization does not authorize provider/model calls, provider-specific response schema adaptation, credentials, cost, retries, real response storage, production BrooksDecision creation, geometry/cost assumptions, Phase 4B, Selector V2, real data, protected windows, outcomes, replay, training, Paper, Live, execution, exchange, wallet, or real-money action. The bounded operational authorizations covered only one exact local synthetic standard activation, the exact nine Doctrine prerequisites, and one prepared payload; those operations are complete and authorize no additional activation, rollback, Doctrine expansion, or Phase 5B2 capability. The exact-package approval artifact remains content-only and unchanged.
