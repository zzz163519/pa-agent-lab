# ADR-0004: Read-Only V6 Definition Reuse

Status: ACCEPTED

## Decision

Calvin explicitly approves read-only, versioned, content-hashed inspection and selective local adaptation of definitions, contracts, deterministic boundaries, and synthetic tests from `/home/calvin/vegas-ema-cta-lab` V6.

This approval does not make PA Agent Lab a continuation of V6 and does not transfer V6 strategy or outcome authority.

## Allowed reuse

The project may selectively adapt:

- closed-candle and causal event-ordering contracts;
- continuity, segment, missing-data, ambiguity, and right-censoring behavior;
- semantic layer definitions and lifecycle vocabulary;
- authority and non-interference boundaries;
- privacy, provenance, immutability, mirror, and prefix-invariance test patterns;
- deterministic rendering or normalization patterns after adapting them to this project's approved input contract.

Every adaptation must be repository-local and record:

- source repository and source identity;
- source path and SHA-256;
- local destination and SHA-256;
- exact copied, adapted, rejected, and newly authored behavior;
- Brooks source provenance for any semantic definition.

Runtime imports from the Vegas worktree are forbidden.

## Forbidden reuse

The approval excludes:

- protected `2025-02`, `2025-05`, and `2025-08` windows or derivatives;
- V6/CITA outcomes, votes as policy labels, PnL, settlement, ledgers, fills, positions, orders, and accounting evidence;
- generated casebook/proposal artifacts and source mappings;
- Vegas/EMA diagnostics as Price Action authority;
- outcome-derived thresholds, selectors, parameter rankings, or strategy claims;
- Paper, Live, exchange, wallet, and real-money components.

`Verified` means verified definition, contract, causal, privacy, or synthetic-test behavior. It does not mean profitable or empirically validated trading performance.

## Dirty-source handling

A tracked file is identified by commit plus content hash. An untracked or modified V6 file is only a working-tree candidate identified by its exact content hash; it cannot be represented as part of the source commit. It must be independently pinned before adaptation.

## Consequences

- The approved inventory is maintained in `docs/plans/V6_READ_ONLY_REUSE_INVENTORY_V1.md`.
- V6 deterministic PA proxy logic may seed contracts and tests but cannot replace Brooks Policy Agent judgment.
- A V6 definition without Brooks provenance remains a candidate definition until reviewed.
- The Vegas repository remains read-only from PA Agent Lab.
