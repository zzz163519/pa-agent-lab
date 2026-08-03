import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "../src/contract-utils-v1.ts";
import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_PROFILE_V1,
  createDoctrineCorpusActivation,
} from "../src/doctrine-retrieval-v1.ts";
import {
  DOCTRINE_CORPUS_ROLLBACK_REASON_SCHEMA_VERSION,
  assertDoctrineActivationAuthorityIntegrity,
  assertDoctrineCorpusRollbackActivationIntegrity,
  createDoctrineCorpusRollbackActivation,
  doctrineActivationKind,
  normalizeDoctrineRollbackReason,
} from "../src/doctrine-corpus-rollback-v1.ts";

const hash = (character: string) =>
  `sha256:${character.repeat(64)}` as `sha256:${string}`;

function ordinaryActivation(sequence = 1) {
  return createDoctrineCorpusActivation({
    schemaVersion: DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
    activationSequence: sequence,
    runId: hash("a"),
    snapshotId: hash("b"),
    profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
    qualityReportHash: hash("c"),
    operatorPrincipal: "local:phase2-operator",
  });
}

describe("Phase 5A explicit Doctrine corpus rollback contract", () => {
  it("creates one immutable rollback activation over an earlier ordinary activation", () => {
    const target = ordinaryActivation();
    const rollback = createDoctrineCorpusRollbackActivation({
      activationSequence: 3,
      replacesActivationId: hash("d"),
      targetActivation: target,
      reason: "  e\u0301\t corpus   regression  ",
      operatorPrincipal: "local:phase2-operator",
    });

    assert.equal(rollback.schemaVersion, "doctrine-corpus-rollback-activation.v1");
    assert.equal(rollback.activationKind, "rollback");
    assert.equal(rollback.targetActivationId, target.activationId);
    assert.equal(rollback.runId, target.runId);
    assert.equal(rollback.snapshotId, target.snapshotId);
    assert.equal(rollback.profileHash, target.profileHash);
    assert.equal(rollback.qualityReportHash, target.qualityReportHash);
    assert.equal(rollback.reason, "é corpus regression");
    assert.equal(
      rollback.reasonHash,
      canonicalHash({
        schemaVersion: DOCTRINE_CORPUS_ROLLBACK_REASON_SCHEMA_VERSION,
        reason: "é corpus regression",
      }),
    );
    assert.equal(doctrineActivationKind(target), "standard");
    assert.equal(doctrineActivationKind(rollback), "rollback");
    assert.equal(Object.isFrozen(rollback), true);
    assert.equal(Object.isFrozen(target), true);
    assert.doesNotThrow(() => assertDoctrineActivationAuthorityIntegrity(target));
    assert.doesNotThrow(() => assertDoctrineActivationAuthorityIntegrity(rollback));
  });

  it("rejects ambiguous reasons, invalid causation, extra keys, and tampered identity", () => {
    const target = ordinaryActivation(2);
    const validInput = {
      activationSequence: 4,
      replacesActivationId: hash("d"),
      targetActivation: target,
      reason: "Restore the prior complete corpus.",
      operatorPrincipal: "local:phase2-operator" as const,
    };

    assert.equal(normalizeDoctrineRollbackReason("  prior\n corpus  "), "prior corpus");
    assert.throws(() => normalizeDoctrineRollbackReason("\u0000"), /control/);
    assert.throws(() => normalizeDoctrineRollbackReason("x".repeat(501)), /1 through 500/);
    assert.throws(() => normalizeDoctrineRollbackReason("   "), /1 through 500/);
    assert.throws(
      () => createDoctrineCorpusRollbackActivation({ ...validInput, activationSequence: 2 }),
      /later than the target/,
    );
    assert.throws(
      () => createDoctrineCorpusRollbackActivation({
        ...validInput,
        replacesActivationId: target.activationId,
      }),
      /must differ from targetActivationId/,
    );
    assert.throws(
      () => createDoctrineCorpusRollbackActivation({
        ...validInput,
        operatorPrincipal: "local:phase3-reviewer" as never,
      }),
      /operatorPrincipal/,
    );
    assert.throws(
      () => createDoctrineCorpusRollbackActivation({ ...validInput, extra: true } as never),
      /exact keys/,
    );

    const rollback = createDoctrineCorpusRollbackActivation(validInput);
    assert.throws(
      () => assertDoctrineCorpusRollbackActivationIntegrity({
        ...rollback,
        reason: "Changed after hashing.",
      }),
      /identity mismatch/,
    );
    assert.throws(
      () => assertDoctrineCorpusRollbackActivationIntegrity({
        ...rollback,
        unauthorized: true,
        activationId: canonicalHash({ ...rollback, unauthorized: true }),
      }),
      /exact keys/,
    );
  });
});
