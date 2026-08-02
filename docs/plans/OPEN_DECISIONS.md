# PA Agent Lab Open Decisions

Status: LIVE DISCUSSION INDEX. ITEMS ARE NOT APPROVED BY BEING LISTED HERE.

This file prevents unresolved architecture questions from being lost or accidentally treated as accepted decisions.

## Doctrine corpus

- Which legally held Brooks materials are available: complete course videos, books, transcripts, manuals, or public website only?
- May private materials be transcribed and indexed locally?
- What excerpt and citation policy is permitted without redistributing copyrighted content?
- Which sources are primary authority, commentary, examples, or question-only evidence?

## Calvin alignment data

- What exact fields will Calvin label on the first causal case?
- Which fields may be `uncertain` or abstained?
- How will repeated blind labels measure Calvin's own judgment stability?
- How are later corrections stored without overwriting the original label?

## Model and privacy

- Are external model APIs allowed to receive anonymous normalized charts and OHLC?
- Is a local model required for private Brooks material?
- Which model capabilities are required: text only, image input, tool use, or structured output?
- What model/provider versioning and retirement policy is acceptable?

## RAG and memory

- Approve or revise the proposed doctrine/case RAG separation.
- Approve PostgreSQL plus `pgvector` as the first storage/retrieval platform.
- Define exact retrieval permissions for training, evaluation, and research roles.
- Define the approval workflow that can promote a candidate interpretation into reviewed doctrine memory.

## API and user interface

- Freeze the first case, label, policy-decision, citation, and audit schemas.
- Select chart rendering and annotation interactions.
- Decide local-only deployment versus authenticated network access.
- Decide whether the first API is REST/OpenAPI only or also needs event streaming for model runs.

## Evaluation

- Define training, validation, contacted development, and untouched evaluation partitions.
- Define semantic acceptance criteria before any outcome replay.
- Define consistency and prefix-invariance thresholds.
- Define what evidence falsifies the agent approach or requires reverting to a deterministic baseline.

## Autonomous research

- Define when the aligned Policy Agent is stable enough to freeze.
- Define what evidence the Research Agent may inspect.
- Define promotion, rejection, and retirement gates for `researchCandidate` versions.
- Decide whether any future outcome optimization is permitted and under what bounded contract.

## Deployment authority

Paper, Live, exchange submission, order placement, wallet access, and real-money use remain forbidden and are not implied by any architecture decision above.
