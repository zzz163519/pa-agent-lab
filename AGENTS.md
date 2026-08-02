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
- Missing data, same-bar ambiguity, source uncertainty, and right-censoring must remain explicit and fail closed.

## Semantic authority

Keep these tracks separate even when they agree:

1. `brooksAssessment`: a source-traceable reading of Brooks doctrine;
2. `calvinPolicy`: Calvin's outcome-blind application and trade judgment;
3. `researchCandidate`: an agent-proposed hypothesis with no automatic strategy authority.

- Brooks source material defines doctrine; Calvin's labels do not silently rewrite it.
- Calvin's first-stage policy labels define the application target; they do not silently become Brooks doctrine.
- Model-generated summaries, embeddings, rationales, and research candidates are never promoted to authority automatically.
- A conflict must be stored explicitly with provenance, scope, and adjudication status.

## Repository relationship

- `/home/calvin/vegas-ema-cta-lab` is an independent repository and must not be modified from this project.
- Future access to Vegas data, replay, or accounting must use an approved versioned read-only adapter.
- Existing contacted development windows are development evidence, not an out-of-sample holdout.
- Private Brooks materials must not be committed or redistributed. Store only authorized metadata, hashes, derived indexes, and permitted excerpts.

## Engineering model

- Direct Pi is the primary coordinator and final writer unless Calvin approves another workflow.
- Define domain contracts and API schemas before building model orchestration.
- Keep PA judgment separate from deterministic validation, execution simulation, risk, and accounting.
- Persist model ID, prompt hash, input hash, retrieval evidence, schema version, and validation result for every evaluated decision.
- Treat ordinary chat history as non-authoritative. It enters long-term doctrine or case memory only through an explicit structured approval path.

## Editing and verification

- Distinguish accepted decisions from drafts and recommendations in every document.
- Change only files required by the current task.
- Do not add dependencies, services, model providers, private corpora, or training code before their corresponding decision is approved.
- Tests prove causal, authority, privacy, and contract behavior; they do not prove profitability.
- Report fresh verification, remaining gaps, next discussion or implementation step, and whether Calvin must decide anything.
