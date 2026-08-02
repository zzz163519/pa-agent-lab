# V6 Read-Only Reuse Inventory V1

Status: APPROVED READ-ONLY INSPECTION AND CLASSIFICATION. NO V6 CODE IMPORT OR ADAPTATION IS AUTHORIZED.

## Source identity

- Repository: `/home/calvin/vegas-ema-cta-lab`
- Observed branch: `main`
- Observed HEAD: `b50092682da9986645ba79c198bdbf3b4eea83d8`
- Source state: dirty; V2/V3 semantic files and provenance updates are present outside HEAD
- Inspection boundary: source, synthetic tests, and pre-outcome semantic/governance documents only

The dirty state is material. Files present in HEAD are identified by commit and SHA-256. Untracked or modified files are identified only by working-tree SHA-256 and must not be described as members of the observed commit.

## Classification

### Candidate local adaptations after required gates

The rows below are classification results, not import authorization. Every row requires Phase 1 subset approval; each untracked row also requires an immutable source pin.

| Source | Source state | SHA-256 | Candidate adaptation boundary |
|---|---|---|---|
| `src/marketCandle.ts` | HEAD | `c4b93ae87d9a296171779828d18fcbc091b3321fd1241aad75f4684c5e29df4a` | Minimal closed-candle shape only; redesign timestamps, interval, normalization, and optional volume for the PA contract. |
| `src/v6CausalTimeframesV1.ts` | HEAD | `925e9536bbf8eafd8c9e866d68aee3076a6526ed8507f3761c341ae8f0e3463a` | Validation, segmentation, completed-parent visibility, gap reset, immutability, and prefix-invariance patterns. Do not inherit fixed 5m/60m or positive-volume policy without a new decision. |
| `src/v6DeterministicPaProxyV3.ts` | untracked working tree | `dd563cb7bc09e359ee77b9a57da70d199470859ac6c655ae041344284610ff02` | Schema and lifecycle seed for Context, Current Leg, Always-In, Location, Pressure, breakout/reversal, setup/signal/trigger, Permission, ambiguity, censoring, and diagnostic authority. Re-author locally; do not import the deterministic policy engine. |
| `tests/v6DeterministicPaProxyV3.test.ts` | untracked working tree | `c6855b18e453c55b0be9586e3712e3a175c3de3f02453d3261a10f9cbc987320` | Synthetic contract-test patterns for layer separation, mirror behavior, prefix invariance, gap reset, ambiguity, right-censoring, and diagnostic non-interference. |
| `docs/plans/VEGAS_EMA_CTA_V6_RULEBOOK_V3_AUTHORITY_LIFECYCLE_MATRIX_V1.md` | untracked working tree | `3242c0f351d4339acef2d2d1f9a8cf2e69a1e9e3eb5e6d2e8a2af84090017dc5` | Layer ownership and non-interference matrix, subject to Brooks provenance review and the Brooks-only runtime authority in ADR-0003. |

### Candidate adaptations requiring substantial redesign

| Source | Source state | SHA-256 | Required redesign |
|---|---|---|---|
| `docs/plans/VEGAS_EMA_CTA_V6_DETERMINISTIC_PA_PROXY_RULEBOOK_V3.md` | untracked working tree | `a642e2f11976fc36c1e660e5d9255421a66e98f0da2c7ddd3b1cb2e424df62af` | Use as a doctrine-card and schema checklist, not as Brooks primary authority. Map each semantic claim to approved Brooks provenance. |
| `docs/plans/VEGAS_EMA_CTA_V6_RULEBOOK_V3_READ_ONLY_BOUNDARY_V1.md` | untracked working tree | `2cb7c0c5ee14aa670800b35641bc42ab3a216c7153692e48806e3a23db0053e8` | Adapt privacy and non-interference boundaries to the independent repository and approved 120/40 normalized payload. |
| `docs/plans/VEGAS_EMA_CTA_V6_RULEBOOK_V3_PUBLIC_SEAM_FREEZE_V1.md` | untracked working tree | `d6c45b08db970df3ffd4cbc71a1be506a4ca0db03c31e77373bfc7c674756f35` | Reuse public-contract freeze and test-gate pattern only; V6's 241-bar proposal seam is not the PA Agent input. |
| `src/v6PublicSvgCandlesV3.ts` | untracked working tree | `be46334354910dec8620678dbd4b5804a1ebd80a48d232b01b5edc3892ee34a0` | Reference deterministic parsing, title binding, normalization, and immutability. Replace V6 case IDs, 241-bar requirement, R-close normalization, synthetic timestamps/volume, and artifact dependency. |

### Reference only

| Source | Source state | SHA-256 | Reason |
|---|---|---|---|
| `src/v6DeterministicPaProxyV1.ts` | HEAD | `b482ef0fc98c797b09729b022f0945678986b7a5294da7c262f15bb38d449fa2` | Contains useful setup-family vocabulary but is coupled to Vegas tick/structure modules and hard-coded targets, reward/risk, and trade candidates. It is not a direct Brooks Agent implementation source. |
| `src/v6DeterministicPaProxyV2.ts` | untracked working tree | `5787616261bb2b5d4f033741332af529a2e1bfef2696f0ce23e85772f702deb1` | V3 observer dependency and historical layer design. Do not copy its deterministic semantic decisions into the model policy. |
| `docs/plans/VEGAS_EMA_CTA_V6_RULEBOOK_V3_PROVENANCE_AUDIT_V1.md` | untracked working tree | `aaeca2315820082d4041696f8da6c69469fbc53da2aa31551359e9ec1a5ce963` | Evidence about V6's own isolation. It informs the new import manifest but is not transferred authority. |

### Prohibited from this reuse path

Do not inspect or import:

- `artifacts/`, `var/`, V6 casebooks, machine proposals, binary votes, source mappings, or generated review artifacts;
- replay, development backtest, portfolio accounting, settlement, order, fill, position, risk, or PnL modules;
- CITA strategy modules or CITA-derived strategy behavior;
- protected `2025-02`, `2025-05`, or `2025-08` windows or derivatives;
- Vegas/EMA diagnostics as PA decision authority;
- `tests/v6PublicSvgCandlesV3.test.ts`, because it reads the V6 blind-casebook artifact namespace.

## Definitions worth preserving

The strongest reusable semantic structure is the separation of:

```text
Candle/continuity
Broad Context
Current Leg
Always-In
Location/Magnet
Pressure
Local Pattern
Breakout lifecycle
Reversal transition
Setup
Signal
Trigger
Trade Permission
Trade Intent
Ambiguity and right-censoring
Diagnostics
```

The following invariants are strong Phase 1 contract candidates:

- `no_trade` is not neutral;
- direction is not tradability;
- local consolidation does not automatically reset broad context;
- pullback, shock, climax, or failed breakout does not by itself confirm reversal;
- signal is not trigger, and trigger is not execution;
- gaps and session boundaries reset pending causal state;
- same-bar ambiguity is not repaired by guessed intrabar order or later bars;
- right-censored events remain unresolved at R;
- diagnostics cannot mutate PA authority;
- long and short contracts should be explicit mirrors where doctrine is symmetric.

These are definition candidates until mapped to Brooks sources. Their V6 synthetic tests prove contract behavior, not Brooks provenance or profitability.

## Fresh verification

Executed in the V6 repository without reading protected windows or casebook artifacts:

```text
node --test --import tsx \
  tests/v6CausalTimeframesV1.test.ts \
  tests/v6DeterministicPaProxyV3.test.ts
```

Result: 30 tests passed, 0 failed.

Executed:

```text
npm run typecheck
```

Result: passed.

The public SVG parser test was deliberately not executed because it reads `artifacts/v6-blind-casebook-v1/cases/`.

## Import gate

Before any local code adaptation:

1. freeze the PA Agent domain schemas from the semantic layers above;
2. obtain explicit approval for the exact Phase 1 V6 subset;
3. immutably pin every modified or untracked source candidate independently of the V6 HEAD commit;
4. create a PA-local import manifest with source path/hash and exact adaptation boundary;
5. re-author the minimum required code locally with no runtime Vegas import;
6. add synthetic tests for causality, authority, privacy, ambiguity, and censoring;
7. verify that no model policy field is deterministically overwritten by a V6 proxy rule;
8. keep all outcome, generated-artifact, replay, accounting, and protected-window paths inaccessible.
