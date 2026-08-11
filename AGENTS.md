# PA Agent Lab work rules

## Project identity

- This is an independent Price Action agent research project.
- It is not CITA V1/V2, not a Vegas EMA version, and not a continuation of V6 authority.
- No CITA or Vegas strategy rule, outcome, generated artifact, Paper/Live authority, or settlement evidence carries over implicitly.
- Any future reuse from another repository must be read-only, explicitly approved, versioned, content-hashed, and documented.

## Research boundary

- Use closed candles and causal event ordering only.
- Never read, import, derive, summarize, embed, or train on the protected `2025-02`, `2025-05`, or `2025-08` windows.
- Never use Calvin's settlement ledger, CITA outcomes, or unauthorized Vegas outcome artifacts.
- Paper, Live, exchange submission, order placement, wallet access, and real-money action are forbidden without separate explicit Calvin approval.
- No outcome-led rule change, parameter sweep, reinforcement objective, or fine-tuning run is authorized merely by this repository existing.
- ADR-0007 accepts only the Phase 8 replay platform direction. Do not install or run NautilusTrader or LEAN before separate Phase 8 contract and implementation approval.
- Missing data, same-bar ambiguity, source uncertainty, and right-censoring must remain explicit and fail closed.

## Semantic authority

Keep these tracks separate even when they agree:

1. `brooksDecision`: the source-traceable Brooks Policy Agent assessment and complete research-only trade judgment;
2. `calvinReview`: Calvin's offline review, clarification, disagreement, or uncertainty record;
3. `researchCandidate`: an agent-proposed hypothesis with no automatic strategy authority.

- Brooks source material defines doctrine and the first runtime policy target.
- `calvinReview` is a whole-decision offline evaluation only; it cannot target, patch, negate, or rewrite individual Brooks claims or fields, and it never becomes an automatic runtime input.
- Model-generated summaries, embeddings, rationales, and research candidates are never promoted to authority automatically.
- A conflict must be stored explicitly with provenance, scope, and adjudication status.

## Repository relationship

- `/home/calvin/vegas-ema-cta-lab` is an independent repository and must not be modified from this project.
- ADR-0004 explicitly approves read-only, versioned, content-hashed adaptation of selected V6 definitions, contracts, deterministic boundaries, and synthetic test patterns recorded in `docs/plans/V6_READ_ONLY_REUSE_INVENTORY_V1.md`.
- Runtime imports from Vegas are forbidden. Vegas outcomes, generated case/proposal artifacts, votes, replay, accounting, settlement, and strategy authority remain forbidden inputs.
- Any future access to Vegas market data, replay, or accounting requires a separately approved versioned read-only adapter.
- Existing contacted development windows are development evidence, not an out-of-sample holdout.
- Private Brooks materials must not be committed or redistributed. Store only authorized metadata, hashes, derived indexes, and permitted excerpts.

## Corpus workflow

- The official Brooks public area is the primary corpus. Public Ask Al Q&A transcripts are the first text-oriented extraction source and may be stored locally as source text when lawfully available; keep source URL, type, volume, copyright status, extraction priority, and content/version hash in `SOURCE_INVENTORY_V1`.
- Before formal Phase 4 ingestion, the public source area is frozen as a URL-level metadata snapshot and may produce source-mapped draft DoctrineUnits. ADR-0017 permits exact deployment-authorized public proposals to be approved explicitly by Calvin or the authorized Direct Pi/agent operator; proposal creation never implies approval.
- Use the V6 rulebook layer model only as a coverage checklist and the V6 50-case stale-trend review only as a prioritization/failure-mode signal. Neither is Brooks doctrine authority, and V6 outcomes or artifacts remain forbidden inputs.
- Keep a proposed DoctrineUnit `draft` until an authenticated ADR-0017 approval record binds its exact proposal hash, source content hash, and locator. This approval does not authorize embeddings, vector retrieval, a running RAG service, provider calls, training, or a complete corpus promotion; formal ingestion and retrieval remain Phase 4 work.
- The current nine approved public pilot DoctrineUnits and Phase 4A activation prove the lifecycle and retrieval platform only. ADR-0023 requires a finite V1 Brooks semantic coverage baseline in Phase 3C and a separately accepted expanded Phase 4A2 activation before any V2 preparation or provider progression.

## Delivery roles

- Calvin owns product intent, strategy authority, real-world risk decisions, scope expansion, and final merge or deployment approval.
- Claude is the default Architecture Manager. Claude reads the repository, explains the design in plain language, freezes goals and non-goals, defines module boundaries and acceptance evidence, decomposes work, and manages the delivery loop. Architecture work must be time-boxed and should normally fit in a short design brief with no more than three unresolved decisions.
- Pi running through Orca with Sudocode `sudocode/gpt-5.6-luna` at max effort is the default Implementation Worker. It writes only within the manager-stated scope in an isolated worktree, adds focused tests, reports exact commands and residual risks, and does not approve its own work.
- Codex is the default Independent Auditor. It uses fresh context, remains read-only during review, reports findings by severity with file and line evidence, and runs tests and typechecks independently. It does not silently redesign the accepted scope or become a second writer.
- Keep one writer per worktree. The Architecture Manager and Independent Auditor do not edit an active implementation worktree. Corrections return to the same Implementation Worker unless Calvin approves a writer change.
- Once Calvin approves an objective and its authority boundary, the Architecture Manager may decompose and dispatch implementation tasks inside that boundary without asking Calvin to reapprove each subtask. New authority, protected data access, provider/model calls, replay, Paper/Live, exchange, wallet, order, or trading-runtime scope still requires separate explicit approval.
- Prefer an early runnable vertical slice over prolonged contract elaboration. Define contracts first only where cross-module behavior, persistence, causal semantics, privacy, or authority boundaries require them; use focused tests for ordinary internal mechanics.
- Historical ADR and acceptance statements that name Direct Pi describe the accepted execution facts at that time. They remain unchanged and do not assign ongoing delivery roles after this section was approved.

## Engineering model

- Before dispatch, the Architecture Manager states the concrete reason, exact write scope, acceptance checks, and retained merge responsibility. Keep the brief concise and use plain language.
- Define domain contracts and API schemas before building model orchestration.
- ADR-0008 fixes `evaluation_sampled` and `continuous_every_close` as the only V1 scheduling modes; a future frequency-reduction filter is a separately evaluated research candidate.
- ADR-0009 fixes the first V1 Brooks policy duration to five-minute closed bars (`barDurationSeconds = 300`); any later timeframe is a separately versioned generalization candidate.
- ADR-0010 fixes V1 BrooksDecision semantics: no numeric probability/confidence, Scalp has no fixed minimum R:R, Swing requires deterministic `>= 2.0R`, and the model receives no active-position outcomes.
- ADR-0011 separates local raw-price Case records from exact-whitelist anonymous model payloads and binds ModelRun, provider attempts, and validation audits without authorizing provider calls.
- ADR-0012 fixes deterministic anonymous 120/40 PNG artifacts and authorizes only unmodified `@resvg/resvg-js@2.6.2` for rasterization; chart artifacts contain no source identity, real time, labels, volume, indicators, or network resources.
- ADR-0013 fixes strict persisted JSON, generated OpenAPI 3.1 components, chart metadata binding, and append-only PostgreSQL uniqueness/relationship constraints without authorizing a database or API service.
- ADR-0014 fixes exact immutable replay dataset-slice authorization, strictly post-cutoff provenance, one frozen decision path per request, fail-closed terminal states, and replay audit hashes without authorizing an engine or execution mechanics.
- ADR-0015 authorizes only the local, loopback-bound, synthetic-only Phase 2 Case Store/API: complete CaseBundle transactions, separate BrooksDecision/CalvinReview persistence, on-demand conflict/audit views, content-hashed migrations, restricted PostgreSQL roles, and per-launch local-token authentication. It does not authorize real data ingestion, public deployment, providers, replay, or trading.
- ADR-0016 authorizes only the synthetic-only Phase 3A Research Console and backend-enforced two-stage whole-decision Calvin review. The fixed local reviewer sees only anonymous causal inputs before immutable assessment freeze; a reveal receipt precedes BrooksDecision content; final review and workflow binding are atomic. ADR-0018 additionally authorizes the repository-owned local single-user trusted-loopback Docker deployment: only its credential-free gateway may publish `127.0.0.1`, while the Console/database remain internal and operator routes retain bearer authentication. Real ingestion, market discovery, providers, replay, Paper/Live, public deployment, and trading remain unauthorized.
- ADR-0017 authorizes one minimal local Doctrine proposal/approval/retirement path over exact public Source hashes. Calvin or the authenticated Direct Pi/agent operator may explicitly approve; no proposal is auto-promoted. It authorizes no private corpus, RAG, embeddings, model calls, real data, replay, or execution.
- ADR-0019 authorizes the implemented Phase 4A complete approved/unretired corpus snapshots, fixed PostgreSQL lexical profile, passed quality gate, explicit activation, operator-only query/evidence, and retirement fail-closed behavior. It does not authorize embeddings, `pgvector`, provider calls, Case-aware retrieval, or Phase 4B.
- ADR-0020 authorizes the implemented operator-controlled explicit corpus rollback and synthetic-only full-current-corpus Policy Assembly. Direct Pi remains the sole implementation writer unless Calvin separately approves an exact worker scope. Phase 5A stops before outbound payloads, ModelRuns, providers, Case-derived queries, real data, replay, or trading.
- ADR-0021 and `PHASE5B1_IMPLEMENTATION_AUTHORIZATION_V1.json` authorize only immutable Prompt Package governance, explicit activation/rollback capabilities, synthetic prepared payloads, and invented-response strict offline validation. The exact-content approval artifact remains immutable and separate. The bounded authorization records separately approved one exact local standard package activation, the exact nine public pilot Doctrine prerequisites, and one synthetic prepared payload. Activation sequence 1 and preparation `sha256:98128380faee158597deb8d6f097165b45b7a501711dd6a1b0bcac1644bbf961` were performed and recorded by the corresponding immutable execution records. Any additional activation or rollback, Doctrine expansion, provider/model call, ModelRun/ProviderAttempt creation, production BrooksDecision creation, real data, replay, and trading remain unauthorized.
- ADR-0022 and `PHASE5B2A_DESIGN_AUTHORIZATION_V1.json` accept the Phase 5B2A controlled CLI provider-adapter design: `agy` with exact model ID `gemini-3.6-flash-high`, Codex CLI with exact model ID `gpt-5.6`, high reasoning effort, verified privacy/isolation, one visible attempt, 300-second timeout, serial execution, minimal local retention, observable cost evidence only, and an exact Prompt Package V2 stop/limit geometry direction. Only model IDs are pinned; CLI versions and binary hashes are not. `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json` separately authorized only pure contracts, offline isolated-workspace/process code, one repository fake executable and tests, exact unapproved Prompt Package V2 proposal files, exports, and governance synchronization. `PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json`, record hash `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`, accepts only exact implementation commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` as a fake-only offline foundation. It does not accept the injected Codex profile as installed-CLI capability/privacy proof or accept production cleanup, supervision, persistence, or terminal-source authority. `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_AUTHORIZATION_V1.json`, record hash `sha256:3ae8d0ace9dc610a78db6fcabb300ffecbfd24b7f62f8c54ff743a3b3de28aef`, separately authorized only the four adjudicated offline V2 geometry relation checks and their tests. `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json`, record hash `sha256:d5358718426069376660ee7d381ca7062f7141926105edd0237d4b5197054d76`, accepts only exact correction commit `7e44a44b34fc4b5695af6f00d7366b989a42e716`. `BROOKS_PROMPT_PACKAGE_V2.approval.json`, record hash `sha256:429c5d53086a77c9bf826a20c23e11d08d53ef4d36bdda591ceefe18931affce`, separately approves only exact package content hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`; the approval is outside the package preimage and does not change manifest bytes. No V2 package activation or preparation, migration, persistence, API/CLI, deployment, credentials, real `agy`/Codex invocation, provider call, runtime record, real data, replay, or trading authority is granted.
- ADR-0023 preserves all accepted Phase 5 plumbing but separates engineering progress from Brooks semantic coverage and external-evaluation progress. The exact Phase 3C design baseline is accepted by `PHASE3C_SEMANTIC_COVERAGE_CONTRACT_APPROVAL_V1.json`, record hash `sha256:9f1da60ba4ef32113616b1c9d0a17305001816bcbff0f608c10352c69cbfb63c`, binding contract content hash `sha256:5aedc6ad98c74b09f2703e3b6e1d58042ea513d409c62815449f075fd933f0a6`; this is contract approval only, not semantic coverage completion acceptance or Source-access authority. ADR-0024 requires a versioned multi-timeframe core capability before formal provider evaluation and preserves scaling, active-position management, and intrabar spike/event handling as separate required design tracks. `PHASE3D_MULTI_TIMEFRAME_CAPABILITY_CONTRACT_APPROVAL_V1.json`, record hash `sha256:0107f512023f2e0e33bd892ba262e3ba3db24e0224d0dadea50c65b67b6eaf3c`, accepts exact contract hash `sha256:989eb4a9717aff887fd5c970abf6bd14e53e97f4e37216779e4d287774a50b90` as the Phase 3D design baseline: five minutes is the required primary decision timeframe; native same-source sixty-minute/daily references are optional; provisional bars are cutoff-frozen; one common normalization and one Brooks decision apply; timeframe voting is forbidden. The external approval record controls acceptance status while the exact contract preimage remains unchanged. `PHASE3D1_IMPLEMENTATION_AUTHORIZATION_V1.json`, record hash `sha256:85b4102a24874ff46fee7be7b07856c6ff0cb7f05f5448feb17f77b85c35f1fb`, separately authorizes only the zero-new-dependency, isolated-worktree, offline synthetic Phase 3D1 contract/rendering/schema-validation foundation and one fresh-context read-only review. `PHASE3D1_IMPLEMENTATION_ACCEPTANCE_V1.json`, record hash `sha256:10ebe854fb8daf0ef9e7a033601610f01a6e908bda44a4414e7f807691c9e108`, accepts only exact implementation commit `e1757c4916811260f9e853ccbfcbccb6c06839d3` and tree `21fa792ba769c5410010e097c026f150ff2948a4` as the reviewed offline synthetic foundation. Direct Pi remained sole writer and final verifier. Any Doctrine proposal batch remains separately authorized, and claims requiring unresolved scaling, management, or intrabar tracks remain paused. Current V1/V2 bytes remain immutable. V2 activation/preparation and provider calls remain paused until the revised semantic/capability route, Phase 4A2 expanded corpus activation, post-corpus assembly path, installed-CLI proof, and Phase 6 evaluation prerequisites are separately accepted.
- Before implementing a new agent capability, search skills.sh, ClawHub, MCP registries, search engines, and maintained open-source tools. Record why a candidate is reused or rejected against causal, privacy, determinism, audit, and authority boundaries.
- The official Brooks public area is the primary corpus. `BROOKS_PUBLIC_URL_INVENTORY_V1.json` freezes all public URLs discoverable from the accepted sitemap/channel/legacy surfaces at its snapshot date and keeps doctrine candidates separate from inventory-only material. Public Ask Al Q&A transcripts remain the first text-oriented extraction source.
- The V6 rulebook layer model may provide a coverage checklist, and the V6 50-case stale-trend review may prioritize extraction and counterexamples; neither may become Brooks doctrine authority or replace Brooks source provenance.
- RAG uses only approved simplified DoctrineUnits containing core trading semantics; source metadata remains local and outside the RAG record.
- A logical decision call is distinct from provider retry attempts, and peer evaluation must preserve identical decision-point coverage.
- Keep PA judgment separate from deterministic validation, execution simulation, risk, and accounting.
- Replay consumes frozen, content-hashed decisions and must not call or mutate a model mid-run.
- Any Phase 8 replay sidecar remains subordinate to TypeScript authorization, causal ambiguity, normalization, invariant-validation, and immutable-audit contracts.
- Authoritative replay must fail closed on unresolved same-bar order, run offline without credentials, and expose no Paper, Live, exchange, or wallet connectivity.
- Persist model ID, prompt hash, input hash, retrieval evidence, schema version, and validation result for every evaluated decision.
- Treat ordinary chat history as non-authoritative. It enters long-term doctrine or case memory only through an explicit structured approval path.

## Editing and verification

- Distinguish accepted decisions from drafts and recommendations in every document.
- Change only files required by the current task.
- Do not add dependencies, services, model providers, private corpora, or training code before their corresponding decision is approved.
- Tests prove causal, authority, privacy, and contract behavior; they do not prove profitability.
- Report fresh verification, remaining gaps, next discussion or implementation step, and whether Calvin must decide anything.
