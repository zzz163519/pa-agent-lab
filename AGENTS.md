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

## Engineering model

- Implementation may be delegated to a worker only after Direct Pi states the concrete reason, write scope, and retained verification/merge responsibilities, and Calvin explicitly approves that delegation. Keep one writer per worktree and use a separate agent for independent review.
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
- ADR-0022 and `PHASE5B2A_DESIGN_AUTHORIZATION_V1.json` accept the Phase 5B2A controlled CLI provider-adapter design: `agy` with exact model ID `gemini-3.6-flash-high`, Codex CLI with exact model ID `gpt-5.6`, high reasoning effort, verified privacy/isolation, one visible attempt, 300-second timeout, serial execution, minimal local retention, observable cost evidence only, and an exact Prompt Package V2 stop/limit geometry direction. Only model IDs are pinned; CLI versions and binary hashes are not. `PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json` separately authorized only pure contracts, offline isolated-workspace/process code, one repository fake executable and tests, exact unapproved Prompt Package V2 proposal files, exports, and governance synchronization. `PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json`, record hash `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`, accepts only exact implementation commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` as a fake-only offline foundation. It does not accept the injected Codex profile as installed-CLI capability/privacy proof or accept production cleanup, supervision, persistence, or terminal-source authority. `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_AUTHORIZATION_V1.json`, record hash `sha256:3ae8d0ace9dc610a78db6fcabb300ffecbfd24b7f62f8c54ff743a3b3de28aef`, separately authorizes only the four adjudicated offline V2 geometry relation checks and their tests; corrected implementation acceptance remains separate. No V2 package approval/activation, migration, persistence, API/CLI, deployment, credentials, real `agy`/Codex invocation, provider call, runtime record, real data, replay, or trading authority is granted.
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
