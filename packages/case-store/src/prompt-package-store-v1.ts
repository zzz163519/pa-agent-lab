import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
  assertBrooksPromptPackageActivationAuthorityIntegrity,
  assertBrooksPromptPackageActivationIntegrity,
  canonicalStringify,
  createBrooksPromptPackageActivation,
  createBrooksPromptPackageRollbackActivation,
  deepFreeze,
  normalizeBrooksPromptPackageRollbackReason,
  verifyBrooksPromptPackageArtifacts,
  type BrooksPromptPackageActivationAuthorityV1,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
  type ContractSha256,
  type VerifiedBrooksPromptPackageV1,
} from "@pa-agent-lab/contracts";
import {
  assertRollbackBrooksPromptPackageCommand,
  parseStrictJsonText,
  type RollbackBrooksPromptPackageCommandV1,
} from "@pa-agent-lab/persistence-contracts";

import {
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "./case-store-v1.ts";
import { CaseStoreError } from "./case-store-error-v1.ts";

const PROMPT_FILENAME = "BROOKS_V1_PROMPT.txt";
const RESPONSE_SCHEMA_FILENAME =
  "BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json";
const MANIFEST_FILENAME = "BROOKS_PROMPT_PACKAGE_V1.json";
const APPROVAL_FILENAME = "BROOKS_PROMPT_PACKAGE_V1.approval.json";

export interface PromptPackageArtifactLoaderV1 {
  (
    packageHash: ContractSha256 | null,
  ): Promise<Readonly<VerifiedBrooksPromptPackageV1>>;
}

export interface PromptPackageActivationMutationV1 {
  readonly status: "inserted" | "existing";
  readonly activation: Readonly<BrooksPromptPackageActivationAuthorityV1>;
}

export interface PromptPackageStoreV1 {
  activateBrooksPromptPackage(): Promise<
    Readonly<PromptPackageActivationMutationV1>
  >;
  rollbackBrooksPromptPackage(
    command: RollbackBrooksPromptPackageCommandV1,
  ): Promise<Readonly<PromptPackageActivationMutationV1>>;
  getCurrentBrooksPromptPackageActivation(): Promise<
    Readonly<BrooksPromptPackageActivationAuthorityV1> | null
  >;
}

export function createRepositoryPromptPackageArtifactLoaderV1(
  promptPackageRoot: string,
): PromptPackageArtifactLoaderV1 {
  const root = resolve(promptPackageRoot);
  return async (requestedPackageHash) => {
    let promptBytes: Buffer;
    let responseSchemaBytes: Buffer;
    let manifestText: string;
    let approvalText: string;
    try {
      [promptBytes, responseSchemaBytes, manifestText, approvalText] =
        await Promise.all([
          readFile(resolve(root, PROMPT_FILENAME)),
          readFile(resolve(root, RESPONSE_SCHEMA_FILENAME)),
          readFile(resolve(root, MANIFEST_FILENAME), "utf8"),
          readFile(resolve(root, APPROVAL_FILENAME), "utf8"),
        ]);
    } catch (error) {
      throw new CaseStoreError(
        "DEPENDENCY_UNAVAILABLE",
        "Approved Prompt Package artifacts could not be read.",
        { cause: error },
      );
    }
    try {
      const verified = verifyBrooksPromptPackageArtifacts({
        promptBytes,
        responseSchemaBytes,
        manifest: parseStrictJsonText(
          manifestText,
        ) as BrooksPromptPackageManifestV1,
        approval: parseStrictJsonText(
          approvalText,
        ) as BrooksPromptPackageApprovalV1,
      });
      if (
        requestedPackageHash !== null &&
        verified.manifest.packageHash !== requestedPackageHash
      ) {
        throw new Error("requested package hash is not available in the repository");
      }
      return verified;
    } catch (error) {
      throw new CaseStoreError(
        "INTEGRITY_VIOLATION",
        error instanceof Error
          ? `Approved Prompt Package artifact validation failed: ${error.message}`
          : "Approved Prompt Package artifact validation failed.",
        { cause: error },
      );
    }
  };
}

export function createPromptPackageStoreV1(
  database: CaseStoreDatabaseV1,
  loadPromptPackageArtifacts: PromptPackageArtifactLoaderV1 | null,
): PromptPackageStoreV1 {
  return {
    activateBrooksPromptPackage: async () =>
      activate(database, requireLoader(loadPromptPackageArtifacts)),
    rollbackBrooksPromptPackage: async (command) =>
      rollback(database, requireLoader(loadPromptPackageArtifacts), command),
    getCurrentBrooksPromptPackageActivation: () => currentActivation(database),
  };
}

function requireLoader(
  loader: PromptPackageArtifactLoaderV1 | null,
): PromptPackageArtifactLoaderV1 {
  if (loader === null) {
    throw new CaseStoreError(
      "DEPENDENCY_UNAVAILABLE",
      "Prompt Package artifact validation is not configured.",
    );
  }
  return loader;
}

async function activate(
  database: CaseStoreDatabaseV1,
  loadArtifacts: PromptPackageArtifactLoaderV1,
): Promise<Readonly<PromptPackageActivationMutationV1>> {
  const promptPackage = await loadArtifacts(null);
  return database.transaction(async (client) => {
    await serializeAuthority(client);
    await persistVerifiedPackage(client, promptPackage);
    const existing = await client.query<{ readonly record: unknown }>(
      `SELECT record
       FROM pa_prompt_package_activations
       WHERE activation_kind='standard'
         AND package_hash=$1 AND approval_record_hash=$2
       ORDER BY activation_sequence`,
      [
        promptPackage.manifest.packageHash,
        promptPackage.approval.approvalRecordHash,
      ],
    );
    if (existing.rows.length > 1) {
      fail("Prompt Package ordinary activation identity is ambiguous");
    }
    if (existing.rows.length === 1) {
      const activation = materializeActivation(existing.rows[0]!.record);
      assertBrooksPromptPackageActivationIntegrity(activation);
      const current = await currentActivation(client);
      if (current?.activationId !== activation.activationId) {
        throw new CaseStoreError(
          "IDENTITY_CONFLICT",
          "A historical package must be restored by explicit rollback.",
        );
      }
      return deepFreeze({ status: "existing", activation });
    }
    const activationSequence = await allocateSequence(client);
    const activation = createBrooksPromptPackageActivation({
      activationSequence,
      promptPackage,
      operatorPrincipal: BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
    });
    await insertActivation(client, activation);
    return deepFreeze({ status: "inserted", activation });
  });
}

async function rollback(
  database: CaseStoreDatabaseV1,
  loadArtifacts: PromptPackageArtifactLoaderV1,
  command: RollbackBrooksPromptPackageCommandV1,
): Promise<Readonly<PromptPackageActivationMutationV1>> {
  assertRollbackBrooksPromptPackageCommand(command);
  const reason = normalizeBrooksPromptPackageRollbackReason(command.reason);
  return database.transaction(async (client) => {
    await serializeAuthority(client);
    const current = await currentActivation(client);
    if (current === null) fail("rollback requires current Prompt Package authority");
    const targetResult = await client.query<{ readonly record: unknown }>(
      `SELECT record FROM pa_prompt_package_activations
       WHERE activation_id=$1`,
      [command.targetActivationId],
    );
    if (targetResult.rows.length !== 1) {
      fail("rollback target must be one exact standard activation");
    }
    const target = materializeActivation(targetResult.rows[0]!.record);
    if (target.activationKind !== "standard") {
      fail("rollback target must be a standard activation");
    }
    if (target.activationSequence >= current.activationSequence) {
      fail("rollback target must be earlier than the current activation");
    }
    const promptPackage = await loadArtifacts(target.packageHash);
    assertPackageBindsActivation(promptPackage, target);
    await persistVerifiedPackage(client, promptPackage);
    if (
      current.activationKind === "rollback" &&
      current.targetActivationId === target.activationId &&
      current.reason === reason
    ) {
      return deepFreeze({ status: "existing", activation: current });
    }
    const activation = createBrooksPromptPackageRollbackActivation({
      activationSequence: await allocateSequence(client),
      replacesActivationId: current.activationId,
      targetActivation: target,
      reason,
      operatorPrincipal: BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
    });
    await insertActivation(client, activation);
    return deepFreeze({ status: "inserted", activation });
  });
}

export async function persistVerifiedPackage(
  client: CaseStoreDatabaseClientV1,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Promise<void> {
  const manifest = promptPackage.manifest;
  const approval = promptPackage.approval;
  await client.query(
    `INSERT INTO pa_prompt_package_manifests
      (package_hash,package_version,prompt_hash,prompt_byte_length,
       response_schema_hash,response_schema_byte_length,output_schema_version,
       validator_version,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT (package_hash) DO NOTHING`,
    [
      manifest.packageHash,
      manifest.packageVersion,
      manifest.prompt.contentHash,
      manifest.prompt.byteLength,
      manifest.responseSchema.contentHash,
      manifest.responseSchema.byteLength,
      manifest.responseSchema.schemaVersion,
      manifest.validatorVersion,
      canonicalStringify(manifest),
    ],
  );
  await client.query(
    `INSERT INTO pa_prompt_package_approvals
      (approval_record_hash,approval_id,package_hash,approved_at,approved_by,record)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)
     ON CONFLICT (approval_record_hash) DO NOTHING`,
    [
      approval.approvalRecordHash,
      approval.approvalId,
      approval.packageHash,
      approval.approvedAt,
      approval.approvedBy,
      canonicalStringify(approval),
    ],
  );
  const stored = await client.query<{
    readonly manifest_record: unknown;
    readonly approval_record: unknown;
  }>(
    `SELECT manifest.record AS manifest_record,approval.record AS approval_record
     FROM pa_prompt_package_manifests AS manifest
     JOIN pa_prompt_package_approvals AS approval
       ON approval.package_hash=manifest.package_hash
     WHERE manifest.package_hash=$1 AND approval.approval_record_hash=$2`,
    [manifest.packageHash, approval.approvalRecordHash],
  );
  if (
    stored.rows.length !== 1 ||
    canonicalStringify(stored.rows[0]!.manifest_record) !==
      canonicalStringify(manifest) ||
    canonicalStringify(stored.rows[0]!.approval_record) !==
      canonicalStringify(approval)
  ) {
    throw new CaseStoreError(
      "IDENTITY_CONFLICT",
      "Stored Prompt Package or approval conflicts with repository artifacts.",
    );
  }
}

export function assertPackageBindsActivation(
  promptPackage: VerifiedBrooksPromptPackageV1,
  activation: BrooksPromptPackageActivationAuthorityV1,
): void {
  if (
    activation.packageHash !== promptPackage.manifest.packageHash ||
    activation.approvalRecordHash !==
      promptPackage.approval.approvalRecordHash
  ) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Prompt Package activation does not bind the verified artifacts.",
    );
  }
}

export async function currentPromptPackageActivation(
  client: CaseStoreDatabaseClientV1,
): Promise<Readonly<BrooksPromptPackageActivationAuthorityV1> | null> {
  return currentActivation(client);
}

async function currentActivation(
  client: CaseStoreDatabaseClientV1,
): Promise<Readonly<BrooksPromptPackageActivationAuthorityV1> | null> {
  const result = await client.query<{ readonly record: unknown }>(
    `SELECT record FROM pa_prompt_package_activations
     ORDER BY activation_sequence DESC LIMIT 1`,
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) fail("current Prompt Package authority is ambiguous");
  return materializeActivation(result.rows[0]!.record);
}

async function serializeAuthority(
  client: CaseStoreDatabaseClientV1,
): Promise<void> {
  await client.query("SELECT pa_serialize_prompt_package_authority()");
}

async function allocateSequence(
  client: CaseStoreDatabaseClientV1,
): Promise<number> {
  const result = await client.query<{ readonly activation_sequence: number }>(
    `SELECT nextval('pa_prompt_package_activation_sequence_seq')::integer
       AS activation_sequence`,
  );
  const sequence = result.rows[0]?.activation_sequence;
  if (sequence === undefined) fail("database did not assign an activation sequence");
  return sequence;
}

async function insertActivation(
  client: CaseStoreDatabaseClientV1,
  activation: BrooksPromptPackageActivationAuthorityV1,
): Promise<void> {
  const rollbackActivation =
    activation.activationKind === "rollback" ? activation : null;
  await client.query(
    `INSERT INTO pa_prompt_package_activations
      (activation_sequence,activation_id,activation_kind,package_hash,
       approval_record_hash,target_activation_id,replaces_activation_id,
       reason_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      activation.activationSequence,
      activation.activationId,
      activation.activationKind,
      activation.packageHash,
      activation.approvalRecordHash,
      rollbackActivation?.targetActivationId ?? null,
      rollbackActivation?.replacesActivationId ?? null,
      rollbackActivation?.reasonHash ?? null,
      activation.operatorPrincipal,
      canonicalStringify(activation),
    ],
  );
}

function materializeActivation(
  value: unknown,
): Readonly<BrooksPromptPackageActivationAuthorityV1> {
  try {
    assertBrooksPromptPackageActivationAuthorityIntegrity(value);
    return deepFreeze(structuredClone(value));
  } catch (error) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Stored Prompt Package activation failed integrity validation.",
      { cause: error },
    );
  }
}

function fail(message: string): never {
  throw new CaseStoreError("INTEGRITY_VIOLATION", message);
}
