# ADR-0002: Separate Semantic Authority Tracks

Status: ACCEPTED, SUPERSEDED IN PART BY ADR-0003

ADR-0003 replaces `calvinPolicy` runtime authority with offline `calvinReview` and makes the Brooks Policy Agent the complete first runtime policy. This record remains historical authority for track separation, provenance, explicit conflicts, and non-overwrite behavior.

## Decision

Persist three semantic tracks independently for every case and policy version:

```text
brooksAssessment
calvinPolicy
researchCandidate
```

Do not collapse `brooksAssessment` and `calvinPolicy` into one label, even when they agree.

## Authority

### `brooksAssessment`

Represents a source-traceable reading of Brooks Price Action doctrine. It must identify source provenance and distinguish primary material from reviewed interpretation.

### `calvinPolicy`

Represents Calvin's outcome-blind application judgment, including trade selection, no-trade, waiting, uncertainty, protection, and invalidation. It may be compatible with Brooks while applying a narrower preference. A true divergence is recorded as a Calvin variant, not silently presented as Brooks doctrine.

### `researchCandidate`

Represents a hypothesis or improvement proposed by an agent. It has no automatic trading or policy authority. It must be versioned and independently evaluated before any promotion decision.

## Alignment classification

A later schema should support at least:

- `aligned`;
- `compatible_application`;
- `calvin_variant`;
- `doctrine_uncertain`;
- `calvin_uncertain`;
- `unresolved_conflict`.

The exact enum remains a contract decision; these names are not yet an API freeze.

## Consequences

- RAG retrieval, training examples, evaluations, and UI must identify which track they display or modify.
- Model-generated content cannot overwrite source doctrine or Calvin labels.
- Agreement metrics cannot treat an uncertain or abstained field as a match.
- Later autonomous research is evaluated as a new policy version rather than an in-place mutation of the aligned policy.
