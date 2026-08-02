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

## Engineering model

- Direct Pi is the primary coordinator and final writer unless Calvin approves another workflow.
- Define domain contracts and API schemas before building model orchestration.
- ADR-0008 fixes `evaluation_sampled` and `continuous_every_close` as the only V1 scheduling modes; a future frequency-reduction filter is a separately evaluated research candidate.
- ADR-0009 fixes the first V1 Brooks policy duration to five-minute closed bars (`barDurationSeconds = 300`); any later timeframe is a separately versioned generalization candidate.
- ADR-0010 fixes V1 BrooksDecision semantics: no numeric probability/confidence, Scalp has no fixed minimum R:R, Swing requires deterministic `>= 2.0R`, and the model receives no active-position outcomes.
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
