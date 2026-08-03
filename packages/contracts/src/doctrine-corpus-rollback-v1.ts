import {
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION,
  DOCTRINE_RETRIEVAL_PROFILE_HASH,
  createDoctrineCorpusActivation,
  type DoctrineCorpusActivationV1,
} from "./doctrine-retrieval-v1.ts";

export const DOCTRINE_CORPUS_ROLLBACK_ACTIVATION_SCHEMA_VERSION =
  "doctrine-corpus-rollback-activation.v1" as const;
export const DOCTRINE_CORPUS_ROLLBACK_REASON_SCHEMA_VERSION =
  "doctrine-corpus-rollback-reason.v1" as const;
export const DOCTRINE_CORPUS_ROLLBACK_MAX_REASON_SCALARS = 500 as const;

export interface DoctrineCorpusRollbackActivationV1 {
  readonly schemaVersion: typeof DOCTRINE_CORPUS_ROLLBACK_ACTIVATION_SCHEMA_VERSION;
  readonly activationKind: "rollback";
  readonly activationSequence: number;
  readonly replacesActivationId: ContractSha256;
  readonly targetActivationId: ContractSha256;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly qualityReportHash: ContractSha256;
  readonly reason: string;
  readonly reasonHash: ContractSha256;
  readonly operatorPrincipal: "local:phase2-operator";
  readonly activationId: ContractSha256;
}

export type DoctrineActivationAuthorityV1 =
  | DoctrineCorpusActivationV1
  | DoctrineCorpusRollbackActivationV1;

export interface CreateDoctrineCorpusRollbackActivationInputV1 {
  readonly activationSequence: number;
  readonly replacesActivationId: ContractSha256;
  readonly targetActivation: DoctrineCorpusActivationV1;
  readonly reason: string;
  readonly operatorPrincipal: "local:phase2-operator";
}

export class DoctrineCorpusRollbackContractError extends Error {
  override readonly name = "DoctrineCorpusRollbackContractError";
}

export function normalizeDoctrineRollbackReason(value: string): string {
  try {
    if (
      typeof value !== "string" ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
    ) {
      fail("rollback reason contains a NUL or control character");
    }
    const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
    const scalarCount = Array.from(normalized).length;
    if (
      scalarCount < 1 ||
      scalarCount > DOCTRINE_CORPUS_ROLLBACK_MAX_REASON_SCALARS
    ) {
      fail("rollback reason must contain 1 through 500 Unicode scalar values");
    }
    return normalized;
  } catch (error) {
    rethrow(error);
  }
}

export function createDoctrineCorpusRollbackActivation(
  input: CreateDoctrineCorpusRollbackActivationInputV1,
): Readonly<DoctrineCorpusRollbackActivationV1> {
  try {
    exactRecord("DoctrineCorpusRollbackActivation input", input, [
      "activationSequence",
      "replacesActivationId",
      "targetActivation",
      "reason",
      "operatorPrincipal",
    ]);
    assertDoctrineCorpusActivationIntegrity(input.targetActivation);
    assertSha256("replacesActivationId", input.replacesActivationId);
    if (
      !Number.isInteger(input.activationSequence) ||
      input.activationSequence < 1
    ) {
      fail("activationSequence must be positive");
    }
    if (
      input.activationSequence <= input.targetActivation.activationSequence
    ) {
      fail("rollback activationSequence must be later than the target");
    }
    if (input.replacesActivationId === input.targetActivation.activationId) {
      fail("replacesActivationId must differ from targetActivationId");
    }
    if (input.operatorPrincipal !== "local:phase2-operator") {
      fail("operatorPrincipal is unsupported");
    }
    const reason = normalizeDoctrineRollbackReason(input.reason);
    const reasonHash = canonicalHash({
      schemaVersion: DOCTRINE_CORPUS_ROLLBACK_REASON_SCHEMA_VERSION,
      reason,
    });
    const body = {
      schemaVersion: DOCTRINE_CORPUS_ROLLBACK_ACTIVATION_SCHEMA_VERSION,
      activationKind: "rollback",
      activationSequence: input.activationSequence,
      replacesActivationId: input.replacesActivationId,
      targetActivationId: input.targetActivation.activationId,
      runId: input.targetActivation.runId,
      snapshotId: input.targetActivation.snapshotId,
      profileHash: input.targetActivation.profileHash,
      qualityReportHash: input.targetActivation.qualityReportHash,
      reason,
      reasonHash,
      operatorPrincipal: input.operatorPrincipal,
    } as const;
    return deepFreeze({ ...body, activationId: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertDoctrineCorpusRollbackActivationIntegrity(
  value: unknown,
): asserts value is DoctrineCorpusRollbackActivationV1 {
  try {
    const activation = exactRecord<DoctrineCorpusRollbackActivationV1>(
      "DoctrineCorpusRollbackActivation",
      value,
      [
        "schemaVersion",
        "activationKind",
        "activationSequence",
        "replacesActivationId",
        "targetActivationId",
        "runId",
        "snapshotId",
        "profileHash",
        "qualityReportHash",
        "reason",
        "reasonHash",
        "operatorPrincipal",
        "activationId",
      ],
    );
    if (
      activation.schemaVersion !==
        DOCTRINE_CORPUS_ROLLBACK_ACTIVATION_SCHEMA_VERSION ||
      activation.activationKind !== "rollback"
    ) {
      fail("DoctrineCorpusRollbackActivation schemaVersion or kind is unsupported");
    }
    if (
      !Number.isInteger(activation.activationSequence) ||
      activation.activationSequence < 1
    ) {
      fail("activationSequence must be positive");
    }
    for (const [name, hash] of [
      ["replacesActivationId", activation.replacesActivationId],
      ["targetActivationId", activation.targetActivationId],
      ["runId", activation.runId],
      ["snapshotId", activation.snapshotId],
      ["profileHash", activation.profileHash],
      ["qualityReportHash", activation.qualityReportHash],
      ["reasonHash", activation.reasonHash],
      ["activationId", activation.activationId],
    ] as const) {
      assertSha256(name, hash);
    }
    if (activation.profileHash !== DOCTRINE_RETRIEVAL_PROFILE_HASH) {
      fail("profileHash is unsupported");
    }
    if (activation.replacesActivationId === activation.targetActivationId) {
      fail("replacesActivationId must differ from targetActivationId");
    }
    if (activation.operatorPrincipal !== "local:phase2-operator") {
      fail("operatorPrincipal is unsupported");
    }
    const reason = normalizeDoctrineRollbackReason(activation.reason);
    const reasonHash = canonicalHash({
      schemaVersion: DOCTRINE_CORPUS_ROLLBACK_REASON_SCHEMA_VERSION,
      reason,
    });
    const { activationId, ...body } = activation;
    if (
      reason !== activation.reason ||
      reasonHash !== activation.reasonHash ||
      canonicalHash(body) !== activationId
    ) {
      fail("DoctrineCorpusRollbackActivation identity mismatch");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertDoctrineActivationAuthorityIntegrity(
  value: unknown,
): asserts value is DoctrineActivationAuthorityV1 {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "schemaVersion" in value &&
    value.schemaVersion === DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION
  ) {
    assertDoctrineCorpusActivationIntegrity(value);
    return;
  }
  assertDoctrineCorpusRollbackActivationIntegrity(value);
}

export function doctrineActivationKind(
  value: DoctrineActivationAuthorityV1,
): "standard" | "rollback" {
  assertDoctrineActivationAuthorityIntegrity(value);
  return value.schemaVersion === DOCTRINE_CORPUS_ACTIVATION_SCHEMA_VERSION
    ? "standard"
    : "rollback";
}

function assertDoctrineCorpusActivationIntegrity(
  value: unknown,
): asserts value is DoctrineCorpusActivationV1 {
  const activation = exactRecord<DoctrineCorpusActivationV1>(
    "DoctrineCorpusActivation",
    value,
    [
      "schemaVersion",
      "activationSequence",
      "runId",
      "snapshotId",
      "profileHash",
      "qualityReportHash",
      "operatorPrincipal",
      "activationId",
    ],
  );
  const { activationId, ...body } = activation;
  if (createDoctrineCorpusActivation(body).activationId !== activationId) {
    fail("DoctrineCorpusActivation identity mismatch");
  }
}

function exactRecord<T extends object>(
  name: string,
  value: unknown,
  keys: readonly string[],
): T {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object with exact keys`);
  }
  const actualKeys = Object.keys(value);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actualKeys.includes(key))
  ) {
    fail(`${name} must contain exact keys`);
  }
  return value as T;
}

function fail(message: string): never {
  throw new DoctrineCorpusRollbackContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof DoctrineCorpusRollbackContractError) {
    throw error;
  }
  throw new DoctrineCorpusRollbackContractError(
    error instanceof Error ? error.message : "Doctrine corpus rollback validation failed",
    { cause: error },
  );
}
