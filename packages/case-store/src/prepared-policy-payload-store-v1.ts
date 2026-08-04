import {
  BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
  assertBrooksPromptPackageActivationAuthorityIntegrity,
  assertPolicyAssemblyIntegrity,
  assertPreparedPolicyPayloadIntegrity,
  canonicalStringify,
  createPreparedPolicyPayload,
  deepFreeze,
  type BrooksPromptPackageActivationAuthorityV1,
  type ContractSha256,
  type PolicyAssemblyV1,
  type PreparedPolicyPayloadV1,
  type VerifiedBrooksPromptPackageV1,
} from "@pa-agent-lab/contracts";
import {
  assertPreparePolicyPayloadCommand,
  type PreparePolicyPayloadCommandV1,
} from "@pa-agent-lab/persistence-contracts";

import {
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
} from "./case-store-v1.ts";
import { CaseStoreError } from "./case-store-error-v1.ts";
import {
  assertPackageBindsActivation,
  currentPromptPackageActivation,
  type PromptPackageArtifactLoaderV1,
} from "./prompt-package-store-v1.ts";

export interface PreparedPolicyPayloadMutationV1 {
  readonly status: "inserted" | "existing";
  readonly preparedPayload: Readonly<PreparedPolicyPayloadV1>;
}

export interface PreparedPolicyPayloadStoreV1 {
  preparePolicyPayload(
    command: PreparePolicyPayloadCommandV1,
  ): Promise<Readonly<PreparedPolicyPayloadMutationV1>>;
  getPreparedPolicyPayload(
    preparationId: ContractSha256,
  ): Promise<Readonly<PreparedPolicyPayloadV1> | null>;
}

export function createPreparedPolicyPayloadStoreV1(
  database: CaseStoreDatabaseV1,
  options: {
    readonly authorizedSyntheticBundleHashes: readonly ContractSha256[];
    readonly loadPromptPackageArtifacts: PromptPackageArtifactLoaderV1 | null;
  },
): PreparedPolicyPayloadStoreV1 {
  const authorized = new Set(options.authorizedSyntheticBundleHashes);
  return {
    preparePolicyPayload: async (command) =>
      prepare(
        database,
        authorized,
        requireLoader(options.loadPromptPackageArtifacts),
        command,
      ),
    getPreparedPolicyPayload: async (preparationId) =>
      getPrepared(
        database,
        options.loadPromptPackageArtifacts,
        preparationId,
      ),
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

async function prepare(
  database: CaseStoreDatabaseV1,
  authorized: ReadonlySet<ContractSha256>,
  loadArtifacts: PromptPackageArtifactLoaderV1,
  command: PreparePolicyPayloadCommandV1,
): Promise<Readonly<PreparedPolicyPayloadMutationV1>> {
  assertPreparePolicyPayloadCommand(command);
  return database.transaction(async (client) => {
    await client.query("SELECT pa_serialize_prompt_package_authority()");
    await client.query("SELECT pa_serialize_policy_assembly_authority()");
    const packageActivation = await currentPromptPackageActivation(client);
    if (packageActivation === null) {
      fail("payload preparation requires current Prompt Package authority");
    }
    const promptPackage = await loadArtifacts(packageActivation.packageHash);
    assertPackageBindsActivation(promptPackage, packageActivation);
    await assertStoredPackage(client, promptPackage);

    const assembly = await getAssembly(client, command.assemblyId);
    if (assembly === null) {
      throw new CaseStoreError(
        "NOT_FOUND",
        "Successful Policy Assembly was not found for payload preparation.",
      );
    }
    if (!authorized.has(assembly.sourceBundleHash)) {
      throw new CaseStoreError(
        "FORBIDDEN",
        "Policy Assembly source bundle is not authorized for this deployment.",
      );
    }
    await assertAssemblyAuthorityCurrent(client, assembly);

    const preparedPayload = createPreparedPolicyPayload({
      assembly,
      packageActivation,
      promptPackage,
      operatorPrincipal: BROOKS_PROMPT_PACKAGE_OPERATOR_PRINCIPAL,
    });
    const existing = await client.query<{ readonly record: unknown }>(
      `SELECT record FROM pa_prepared_policy_payloads
       WHERE assembly_id=$1 AND package_activation_id=$2
         AND preparation_rules_version=$3`,
      [
        preparedPayload.assemblyId,
        preparedPayload.packageActivationId,
        preparedPayload.preparationRulesVersion,
      ],
    );
    if (existing.rows.length > 1) {
      fail("prepared payload natural identity is ambiguous");
    }
    if (existing.rows.length === 1) {
      const stored = materializePrepared(
        existing.rows[0]!.record,
        assembly,
        packageActivation,
        promptPackage,
      );
      if (canonicalStringify(stored) !== canonicalStringify(preparedPayload)) {
        throw new CaseStoreError(
          "IDENTITY_CONFLICT",
          "Prepared payload natural identity names different immutable content.",
        );
      }
      return deepFreeze({ status: "existing", preparedPayload: stored });
    }
    await insertPrepared(
      client,
      preparedPayload,
      packageActivation,
      promptPackage,
    );
    return deepFreeze({ status: "inserted", preparedPayload });
  });
}

async function getPrepared(
  database: CaseStoreDatabaseV1,
  loadArtifacts: PromptPackageArtifactLoaderV1 | null,
  preparationId: ContractSha256,
): Promise<Readonly<PreparedPolicyPayloadV1> | null> {
  const loader = requireLoader(loadArtifacts);
  const result = await database.query<{
    readonly prepared_record: unknown;
    readonly assembly_record: unknown;
    readonly activation_record: unknown;
    readonly package_hash: ContractSha256;
  }>(
    `SELECT prepared.record AS prepared_record,
            assembly.record AS assembly_record,
            activation.record AS activation_record,
            prepared.package_hash
     FROM pa_prepared_policy_payloads AS prepared
     JOIN pa_policy_assemblies AS assembly
       ON assembly.assembly_id=prepared.assembly_id
     JOIN pa_prompt_package_activations AS activation
       ON activation.activation_id=prepared.package_activation_id
     WHERE prepared.preparation_id=$1`,
    [preparationId],
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) fail("prepared payload identity is ambiguous");
  const row = result.rows[0]!;
  const assembly = materializeAssembly(row.assembly_record);
  const activation = materializeActivation(row.activation_record);
  const promptPackage = await loader(row.package_hash);
  assertPackageBindsActivation(promptPackage, activation);
  return materializePrepared(
    row.prepared_record,
    assembly,
    activation,
    promptPackage,
  );
}

async function assertStoredPackage(
  client: CaseStoreDatabaseClientV1,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Promise<void> {
  const result = await client.query<{
    readonly manifest_record: unknown;
    readonly approval_record: unknown;
  }>(
    `SELECT manifest.record AS manifest_record,approval.record AS approval_record
     FROM pa_prompt_package_manifests AS manifest
     JOIN pa_prompt_package_approvals AS approval
       ON approval.package_hash=manifest.package_hash
     WHERE manifest.package_hash=$1 AND approval.approval_record_hash=$2`,
    [
      promptPackage.manifest.packageHash,
      promptPackage.approval.approvalRecordHash,
    ],
  );
  if (
    result.rows.length !== 1 ||
    canonicalStringify(result.rows[0]!.manifest_record) !==
      canonicalStringify(promptPackage.manifest) ||
    canonicalStringify(result.rows[0]!.approval_record) !==
      canonicalStringify(promptPackage.approval)
  ) {
    fail("stored Prompt Package does not match repository artifacts");
  }
}

async function getAssembly(
  client: CaseStoreDatabaseClientV1,
  assemblyId: ContractSha256,
): Promise<Readonly<PolicyAssemblyV1> | null> {
  const result = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_policy_assemblies WHERE assembly_id=$1",
    [assemblyId],
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) fail("Policy Assembly identity is ambiguous");
  return materializeAssembly(result.rows[0]!.record);
}

async function assertAssemblyAuthorityCurrent(
  client: CaseStoreDatabaseClientV1,
  assembly: PolicyAssemblyV1,
): Promise<void> {
  const current = await client.query<{
    readonly activation_id: ContractSha256;
  }>(
    `SELECT activation_id FROM pa_doctrine_corpus_activations
     ORDER BY activation_sequence DESC LIMIT 1`,
  );
  if (current.rows[0]?.activation_id !== assembly.activationId) {
    fail("Policy Assembly is not current Doctrine authority");
  }
  const eligibility = await client.query<{ readonly eligible: boolean }>(
    `SELECT (
       EXISTS (
         SELECT 1
         FROM pa_doctrine_ingestion_runs AS run
         JOIN pa_doctrine_quality_reports AS report
           ON report.run_id=run.run_id
          AND report.snapshot_id=run.snapshot_id
          AND report.profile_hash=run.profile_hash
         WHERE run.run_id=$1 AND run.snapshot_id=$2 AND run.profile_hash=$3
           AND run.status='succeeded'
           AND report.quality_report_hash=$4 AND report.status='passed'
       )
       AND NOT EXISTS (
         SELECT 1 FROM pa_doctrine_corpus_entries AS entry
         WHERE entry.snapshot_id=$2
           AND NOT pa_doctrine_source_is_phase4a_allowed(
             entry.source_id,entry.source_content_hash
           )
       )
       AND NOT EXISTS (
         SELECT 1
         FROM pa_doctrine_corpus_entries AS entry
         JOIN pa_doctrine_retirements AS retirement
           ON retirement.doctrine_id=entry.doctrine_id
         WHERE entry.snapshot_id=$2
       )
     ) AS eligible`,
    [
      assembly.runId,
      assembly.snapshotId,
      assembly.profileHash,
      assembly.qualityReportHash,
    ],
  );
  if (eligibility.rows[0]?.eligible !== true) {
    fail("Policy Assembly current Doctrine authority is ineligible");
  }
}

async function insertPrepared(
  client: CaseStoreDatabaseClientV1,
  prepared: PreparedPolicyPayloadV1,
  activation: BrooksPromptPackageActivationAuthorityV1,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Promise<void> {
  await client.query(
    `INSERT INTO pa_prepared_policy_payloads
      (preparation_id,preparation_rules_version,source_scope,assembly_id,input_hash,
       package_activation_id,package_activation_kind,package_activation_sequence,
       package_hash,approval_record_hash,prompt_hash,response_schema_hash,
       output_schema_version,validator_version,payload_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)`,
    [
      prepared.preparationId,
      prepared.preparationRulesVersion,
      prepared.sourceScope,
      prepared.assemblyId,
      prepared.payload.policyInput.inputHash,
      prepared.packageActivationId,
      activation.activationKind,
      activation.activationSequence,
      prepared.packageHash,
      promptPackage.approval.approvalRecordHash,
      prepared.promptHash,
      prepared.responseSchemaHash,
      prepared.outputSchemaVersion,
      prepared.validatorVersion,
      prepared.payloadHash,
      prepared.operatorPrincipal,
      canonicalStringify(prepared),
    ],
  );
}

function materializeAssembly(value: unknown): Readonly<PolicyAssemblyV1> {
  try {
    assertPolicyAssemblyIntegrity(value);
    return deepFreeze(structuredClone(value));
  } catch (error) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Stored Policy Assembly failed integrity validation.",
      { cause: error },
    );
  }
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

function materializePrepared(
  value: unknown,
  assembly: PolicyAssemblyV1,
  packageActivation: BrooksPromptPackageActivationAuthorityV1,
  promptPackage: VerifiedBrooksPromptPackageV1,
): Readonly<PreparedPolicyPayloadV1> {
  try {
    assertPreparedPolicyPayloadIntegrity(value, {
      assembly,
      packageActivation,
      promptPackage,
    });
    return deepFreeze(structuredClone(value));
  } catch (error) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Stored prepared payload failed integrity validation.",
      { cause: error },
    );
  }
}

function fail(message: string): never {
  throw new CaseStoreError("INTEGRITY_VIOLATION", message);
}
