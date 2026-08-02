# ADR-0001: Independent Repository Boundary

Status: ACCEPTED

## Decision

Build PA Agent Lab as the independent sibling repository:

`/home/calvin/pa-agent-lab`

It is not implemented inside `/home/calvin/vegas-ema-cta-lab` and is not named or governed as a Vegas V7.

## Reasons

- The agent system has a different identity, knowledge authority, memory model, evaluation lifecycle, and future training surface.
- Separating repositories prevents new model behavior from silently changing immutable Vegas V1-V6 evidence.
- Private doctrine corpora and model indexes need different storage and access controls from trading-research artifacts.
- A failed agent approach can be retired without modifying the existing Vegas repository.

## Integration boundary

Any future integration with Vegas must be:

- explicitly approved;
- read-only from PA Agent Lab;
- schema-versioned and content-hashed;
- limited to authorized causal inputs, replay, execution simulation, or accounting;
- unable to read protected windows, settlement data, or unapproved outcome artifacts;
- unable to modify Vegas source, contracts, labels, or artifacts.

## Consequences

PA Agent Lab maintains its own Git history, decisions, tests, model registry, knowledge indexes, evaluation artifacts, and release identities. Similar type names or architecture patterns do not transfer strategy authority.
