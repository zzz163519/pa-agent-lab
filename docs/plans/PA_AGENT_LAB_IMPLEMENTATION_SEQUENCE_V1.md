# PA Agent Lab Implementation Sequence V1

Status: DRAFT SEQUENCE. NO STEP BEYOND REPOSITORY BOOTSTRAP IS AUTHORIZED BY THIS DOCUMENT.

## Delivery model

Use contract/API-first vertical slices. Do not build the full frontend first, and do not defer all user-interface work until the backend is complete.

The first user interface exists to produce high-quality outcome-blind labels and inspect disagreements. It is not a dashboard, trading terminal, or marketing site.

## Phase 0: Governance bootstrap

Current phase.

- establish the independent repository and charter;
- record accepted architecture decisions separately from drafts;
- define private-corpus and protected-data boundaries;
- keep the repository free of model, database, and UI dependencies.

Exit condition: repository identity, authority tracks, and prohibited inputs are explicit and version-controlled.

## Phase 1: Domain contracts

- freeze causal case identity and visible-through boundary;
- freeze `brooksAssessment`, `calvinPolicy`, and disagreement schemas;
- define doctrine source, excerpt, interpretation, and citation records;
- define policy decision, evidence reference, uncertainty, and validation records;
- define dataset partitions and retrieval permissions.

Exit condition: synthetic schema tests can reject future bars, unauthorized memory, missing provenance, and track conflation.

## Phase 2: Case store and API

- implement immutable case and label persistence;
- expose versioned Case, Label, Commitment, and Audit APIs;
- create CLI fixtures before a graphical interface;
- enforce authorization and dataset-split filters server-side.

Exit condition: one synthetic causal case can be created, labeled, frozen, retrieved, and audited without model involvement.

## Phase 3: Thin annotation UI

- render only the anonymous causal prefix through R;
- collect structured Brooks and Calvin tracks separately;
- support `no_trade`, `uncertain`, abstention, and correction events;
- hide agent proposals until the human label is frozen when anchoring would bias evidence;
- display provenance and conflict after freeze.

Exit condition: Calvin can produce a complete, immutable, outcome-blind label without editing JSON manually.

## Phase 4: Doctrine ingestion and RAG

- inventory only legally available source material;
- ingest text or timestamped transcripts with source hashes;
- create reviewed semantic doctrine units;
- implement metadata, lexical, and vector retrieval;
- persist every retrieved item and citation.

Exit condition: a doctrine query returns bounded, source-located evidence and cannot retrieve unapproved/model-generated authority.

## Phase 5: Policy Agent vertical slice

- provide one causal case, bounded doctrine context, and allowed precedents;
- request one schema-constrained policy proposal;
- reject invalid citations, future references, track conflation, and invalid geometry;
- persist the complete inference audit.

Exit condition: one decision is repeatable under a fixed model/prompt identity and fails closed under adversarial causal tests.

## Phase 6: Semantic evaluation

Evaluate before PnL or full replay:

- agreement with determinate Calvin fields;
- doctrine consistency and citation correctness;
- no-trade and uncertainty calibration;
- repeated-run consistency;
- causal prefix invariance;
- long/short mirror where the doctrine requires symmetry;
- evaluation-case retrieval exclusion;
- behavior under missing data and ambiguity.

Exit condition: a pre-approved semantic gate passes. Fluent explanations alone do not pass the gate.

## Phase 7: Training decision

First determine whether prompt, RAG, examples, and schema constraints are sufficient. Fine-tuning is optional, not assumed.

If approved later, use a separate Python pipeline for supervised imitation or preference optimization. Freeze source cases, split identities, base model, training configuration, and evaluation protocol before training. Do not start with PnL reinforcement learning.

Exit condition: a new model version improves the frozen semantic gate without leakage or regression in abstention and causal behavior.

## Phase 8: Deterministic replay integration

- connect policy proposals to a versioned read-only replay interface;
- retain deterministic order, fill, risk, fee, slippage, funding, and accounting authority;
- run fixed development evidence without mid-run policy mutation;
- preserve rejected, ambiguous, and right-censored decisions.

Exit condition: replay behavior is reproducible from policy output and audit artifacts. It still has no Paper or Live authority.

## Phase 9: Independent Research Agent

- give the Research Agent access only to approved research evidence;
- require explicit hypotheses, affected policy fields, and falsification criteria;
- create a new candidate version instead of modifying the frozen policy;
- independently evaluate every candidate before promotion discussion.

Exit condition: a candidate can be accepted, rejected, or retired without changing the aligned baseline or rewriting history.

## Frontend/backend ordering summary

```text
Domain contracts
  -> Case API and audit store
  -> Thin annotation UI
  -> Doctrine RAG API
  -> Policy inference API
  -> Evaluation surfaces
  -> Training and replay integrations
```

This order makes the API contract authoritative while introducing the UI early enough to test whether the labeling workflow captures Calvin's actual judgment.
