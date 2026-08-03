import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES,
  POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT,
  POLICY_ASSEMBLY_OPERATOR_PRINCIPAL,
  assertDoctrineActivationAuthorityIntegrity,
  assertDoctrineCorpusSnapshotIntegrity,
  assertPolicyAssemblyFailureIntegrity,
  assertPolicyAssemblyIntegrity,
  canonicalStringify,
  createPolicyAssembly,
  createPolicyAssemblyFailure,
  deepFreeze,
  type ContractSha256,
  type DoctrineActivationAuthorityV1,
  type DoctrineCorpusSnapshotV1,
  type PolicyAssemblyFailureCodeV1,
  type PolicyAssemblyFailureV1,
  type PolicyAssemblyV1,
} from "@pa-agent-lab/contracts";
import {
  assertAnonymousChartArtifactMetadataIntegrity,
  assertCreatePolicyAssemblyCommand,
  type AnonymousChartArtifactMetadataV1,
  type CreatePolicyAssemblyCommandV1,
  type SyntheticCaseBundleV1,
} from "@pa-agent-lab/persistence-contracts";

import {
  type CaseStoreDatabaseClientV1,
  type CaseStoreDatabaseV1,
  loadBundleByCaseHash,
} from "./case-store-v1.ts";
import { CaseStoreError } from "./case-store-error-v1.ts";

export interface PolicyAssemblyArtifactValidatorV1 {
  (metadata: AnonymousChartArtifactMetadataV1): Promise<void>;
}

export interface PolicyAssemblyStoreOptionsV1 {
  readonly authorizedSyntheticBundleHashes: readonly ContractSha256[];
  readonly validateChartArtifact: PolicyAssemblyArtifactValidatorV1 | null;
}

export interface PolicyAssemblyMutationV1 {
  readonly status: "inserted" | "existing";
  readonly terminal: Readonly<PolicyAssemblyV1 | PolicyAssemblyFailureV1>;
}

export interface PolicyAssemblyStoreV1 {
  createPolicyAssembly(
    command: CreatePolicyAssemblyCommandV1,
  ): Promise<Readonly<PolicyAssemblyMutationV1>>;
  getPolicyAssembly(
    assemblyId: ContractSha256,
  ): Promise<Readonly<PolicyAssemblyV1> | null>;
  getPolicyAssemblyFailure(
    failureId: ContractSha256,
  ): Promise<Readonly<PolicyAssemblyFailureV1> | null>;
}

interface CurrentActivationRowV1 {
  readonly record: unknown;
}

interface EligibilityRowV1 {
  readonly eligible: boolean;
  readonly entry_count: number;
  readonly snapshot_record: unknown;
}

export function createPolicyAssemblyStoreV1(
  database: CaseStoreDatabaseV1,
  options: PolicyAssemblyStoreOptionsV1,
): PolicyAssemblyStoreV1 {
  const authorized = new Set(options.authorizedSyntheticBundleHashes);
  return {
    createPolicyAssembly: (command) =>
      assemble(database, options.validateChartArtifact, authorized, command),
    getPolicyAssembly: (assemblyId) => getAssembly(database, assemblyId),
    getPolicyAssemblyFailure: (failureId) => getFailure(database, failureId),
  };
}

export function createLocalPngArtifactValidatorV1(
  artifactRoot: string,
): PolicyAssemblyArtifactValidatorV1 {
  const root = resolve(artifactRoot);
  return async (metadata) => {
    assertAnonymousChartArtifactMetadataIntegrity(metadata);
    const filename = `${metadata.contentHash.slice("sha256:".length)}.png`;
    let bytes: Buffer;
    try {
      bytes = await readFile(resolve(root, filename));
    } catch (error) {
      throw new CaseStoreError(
        "DEPENDENCY_UNAVAILABLE",
        "A required content-addressed chart artifact is missing.",
        { cause: error },
      );
    }
    const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (
      bytes.length !== metadata.byteLength ||
      contentHash !== metadata.contentHash ||
      bytes.length < 24 ||
      !bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ) ||
      bytes.readUInt32BE(16) !== metadata.widthPx ||
      bytes.readUInt32BE(20) !== metadata.heightPx
    ) {
      throw new CaseStoreError(
        "DEPENDENCY_UNAVAILABLE",
        "Content-addressed chart bytes failed integrity validation.",
      );
    }
  };
}

async function assemble(
  database: CaseStoreDatabaseV1,
  validateChartArtifact: PolicyAssemblyArtifactValidatorV1 | null,
  authorized: ReadonlySet<ContractSha256>,
  command: CreatePolicyAssemblyCommandV1,
): Promise<Readonly<PolicyAssemblyMutationV1>> {
  assertCreatePolicyAssemblyCommand(command);
  return database.transaction(async (client) => {
    const bundle = await loadBundleByCaseHash(client, command.caseHash);
    if (bundle === null) {
      throw new CaseStoreError(
        "NOT_FOUND",
        "Synthetic CaseBundle was not found for Policy Assembly.",
      );
    }
    if (!authorized.has(bundle.bundleHash)) {
      throw new CaseStoreError(
        "FORBIDDEN",
        "Synthetic CaseBundle hash is not authorized for this deployment.",
      );
    }
    await client.query("SELECT pa_serialize_policy_assembly_authority()");

    const activationResult = await client.query<CurrentActivationRowV1>(
      `SELECT record
       FROM pa_doctrine_corpus_activations
       ORDER BY activation_sequence DESC
       LIMIT 1`,
    );
    if (activationResult.rows.length === 0) {
      return persistFailure(
        client,
        createFailure(bundle, null, "ACTIVATION_UNAVAILABLE", null, null),
      );
    }
    if (activationResult.rows.length !== 1) {
      throw new CaseStoreError(
        "INTEGRITY_VIOLATION",
        "Current Doctrine activation lookup is ambiguous.",
      );
    }
    const activation = materializeActivation(activationResult.rows[0]!.record);
    const eligibility = await loadEligibility(client, activation);
    if (!eligibility.eligible) {
      return persistFailure(
        client,
        createFailure(bundle, activation, "ACTIVE_CORPUS_INELIGIBLE", null, null),
      );
    }
    const snapshot = materializeSnapshot(eligibility.snapshot_record);
    if (
      snapshot.snapshotId !== activation.snapshotId ||
      snapshot.entries.length !== eligibility.entry_count
    ) {
      throw new CaseStoreError(
        "INTEGRITY_VIOLATION",
        "Current Doctrine snapshot record does not match its stored entries.",
      );
    }
    if (snapshot.entries.length > POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT) {
      return persistFailure(
        client,
        createFailure(
          bundle,
          activation,
          "DOCTRINE_COUNT_EXCEEDED",
          snapshot.entries.length,
          null,
        ),
      );
    }
    const doctrineContextBytes = Buffer.byteLength(
      canonicalStringify({
        schemaVersion: "policy-doctrine-context.v1",
        doctrine: snapshot.entries.map((entry) => entry.ragRecord),
      }),
      "utf8",
    );
    if (doctrineContextBytes > POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES) {
      return persistFailure(
        client,
        createFailure(
          bundle,
          activation,
          "DOCTRINE_CONTEXT_BYTES_EXCEEDED",
          snapshot.entries.length,
          doctrineContextBytes,
        ),
      );
    }
    if (validateChartArtifact === null) {
      throw new CaseStoreError(
        "DEPENDENCY_UNAVAILABLE",
        "Policy Assembly chart artifact validation is not configured.",
      );
    }
    await validateChartArtifact(bundle.chartMetadata.context);
    await validateChartArtifact(bundle.chartMetadata.detail);

    const assembly = createPolicyAssembly({
      sourceBundleHash: bundle.bundleHash,
      activation,
      snapshot,
      policyCase: bundle.policyCase,
      charts: {
        context: {
          metadataId: bundle.chartMetadata.context.metadataId,
          artifactId: bundle.chartMetadata.context.artifactId,
          contentHash: bundle.chartMetadata.context.contentHash,
          manifest: bundle.policyInput.charts.context,
        },
        detail: {
          metadataId: bundle.chartMetadata.detail.metadataId,
          artifactId: bundle.chartMetadata.detail.artifactId,
          contentHash: bundle.chartMetadata.detail.contentHash,
          manifest: bundle.policyInput.charts.detail,
        },
      },
      operatorPrincipal: POLICY_ASSEMBLY_OPERATOR_PRINCIPAL,
    });
    const existing = await findAssemblyByNaturalIdentity(client, assembly);
    if (existing !== null) {
      return deepFreeze({ status: "existing", terminal: existing });
    }
    await insertPolicyInput(client, assembly);
    await insertAssembly(client, assembly);
    return deepFreeze({ status: "inserted", terminal: assembly });
  });
}

async function loadEligibility(
  client: CaseStoreDatabaseClientV1,
  activation: DoctrineActivationAuthorityV1,
): Promise<EligibilityRowV1> {
  const result = await client.query<EligibilityRowV1>(
    `SELECT
       (
         run.status='succeeded'
         AND report.status='passed'
         AND run.snapshot_id=$2
         AND run.profile_hash=$3
         AND report.snapshot_id=$2
         AND report.profile_hash=$3
         AND NOT EXISTS (
           SELECT 1
           FROM pa_doctrine_corpus_entries AS entry
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
         AND NOT EXISTS (
           SELECT 1
           FROM pa_doctrine_corpus_entries AS entry
           LEFT JOIN pa_doctrine_proposals AS proposal
             ON proposal.proposal_hash=entry.proposal_hash
            AND proposal.doctrine_id=entry.doctrine_id
            AND proposal.source_id=entry.source_id
            AND proposal.source_content_hash=entry.source_content_hash
           LEFT JOIN pa_doctrine_approvals AS approval
             ON approval.approval_hash=entry.approval_hash
            AND approval.proposal_hash=entry.proposal_hash
            AND approval.doctrine_id=entry.doctrine_id
            AND approval.source_id=entry.source_id
            AND approval.source_content_hash=entry.source_content_hash
           WHERE entry.snapshot_id=$2
             AND (proposal.proposal_hash IS NULL OR approval.approval_hash IS NULL)
         )
       ) AS eligible,
       (SELECT count(*)::int FROM pa_doctrine_corpus_entries WHERE snapshot_id=$2)
         AS entry_count,
       snapshot.record AS snapshot_record
     FROM pa_doctrine_ingestion_runs AS run
     JOIN pa_doctrine_quality_reports AS report
       ON report.run_id=run.run_id
      AND report.quality_report_hash=$4
     JOIN pa_doctrine_corpus_snapshots AS snapshot
       ON snapshot.snapshot_id=$2
     WHERE run.run_id=$1`,
    [
      activation.runId,
      activation.snapshotId,
      activation.profileHash,
      activation.qualityReportHash,
    ],
  );
  const row = result.rows[0];
  if (row === undefined) {
    return { eligible: false, entry_count: 0, snapshot_record: null };
  }
  return row;
}

function createFailure(
  bundle: SyntheticCaseBundleV1,
  activation: DoctrineActivationAuthorityV1 | null,
  code: PolicyAssemblyFailureCodeV1,
  observedDoctrineCount: number | null,
  observedDoctrineContextByteLength: number | null,
): Readonly<PolicyAssemblyFailureV1> {
  return createPolicyAssemblyFailure({
    caseHash: bundle.policyCase.caseHash,
    sourceBundleHash: bundle.bundleHash,
    activation,
    observedDoctrineCount,
    observedDoctrineContextByteLength,
    errorCodes: [code],
    operatorPrincipal: POLICY_ASSEMBLY_OPERATOR_PRINCIPAL,
  });
}

async function persistFailure(
  client: CaseStoreDatabaseClientV1,
  failure: PolicyAssemblyFailureV1,
): Promise<Readonly<PolicyAssemblyMutationV1>> {
  const existing = await getFailure(client, failure.failureId);
  if (existing !== null) {
    return deepFreeze({ status: "existing", terminal: existing });
  }
  await client.query(
    `INSERT INTO pa_policy_assembly_failures
      (failure_id,assembly_rules_version,case_hash,source_bundle_hash,
       activation_kind,activation_id,activation_sequence,snapshot_id,
       observed_doctrine_count,observed_doctrine_context_byte_length,
       error_codes,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb)`,
    [
      failure.failureId,
      failure.assemblyRulesVersion,
      failure.caseHash,
      failure.sourceBundleHash,
      failure.activationKind,
      failure.activationId,
      failure.activationSequence,
      failure.snapshotId,
      failure.observedDoctrineCount,
      failure.observedDoctrineContextByteLength,
      JSON.stringify(failure.errorCodes),
      failure.operatorPrincipal,
      canonicalStringify(failure),
    ],
  );
  return deepFreeze({ status: "inserted", terminal: failure });
}

async function findAssemblyByNaturalIdentity(
  client: CaseStoreDatabaseClientV1,
  expected: PolicyAssemblyV1,
): Promise<Readonly<PolicyAssemblyV1> | null> {
  const result = await client.query<{ readonly record: unknown }>(
    `SELECT record FROM pa_policy_assemblies
     WHERE case_hash=$1 AND activation_id=$2 AND assembly_rules_version=$3`,
    [expected.caseHash, expected.activationId, expected.assemblyRulesVersion],
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Policy Assembly natural identity is not unique.",
    );
  }
  const existing = materializeAssembly(result.rows[0]!.record);
  if (canonicalStringify(existing) !== canonicalStringify(expected)) {
    throw new CaseStoreError(
      "IDENTITY_CONFLICT",
      "Policy Assembly natural identity names different immutable content.",
    );
  }
  return existing;
}

async function insertPolicyInput(
  client: CaseStoreDatabaseClientV1,
  assembly: PolicyAssemblyV1,
): Promise<void> {
  await client.query(
    `INSERT INTO pa_policy_inputs
      (input_hash,context_content_hash,detail_content_hash,record)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT DO NOTHING`,
    [
      assembly.inputHash,
      assembly.policyInput.charts.context.contentHash,
      assembly.policyInput.charts.detail.contentHash,
      canonicalStringify(assembly.policyInput),
    ],
  );
  const stored = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_policy_inputs WHERE input_hash=$1",
    [assembly.inputHash],
  );
  if (
    stored.rows.length !== 1 ||
    canonicalStringify(stored.rows[0]!.record) !==
      canonicalStringify(assembly.policyInput)
  ) {
    throw new CaseStoreError(
      "IDENTITY_CONFLICT",
      "Policy input identity names different immutable content.",
    );
  }
}

async function insertAssembly(
  client: CaseStoreDatabaseClientV1,
  assembly: PolicyAssemblyV1,
): Promise<void> {
  await client.query(
    `INSERT INTO pa_policy_assemblies
      (assembly_id,assembly_rules_version,case_hash,source_bundle_hash,
       activation_id,activation_kind,activation_sequence,run_id,snapshot_id,
       profile_hash,quality_report_hash,doctrine_context_hash,
       doctrine_context_byte_length,input_hash,operator_principal,record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
    [
      assembly.assemblyId,
      assembly.assemblyRulesVersion,
      assembly.caseHash,
      assembly.sourceBundleHash,
      assembly.activationId,
      assembly.activationKind,
      assembly.activationSequence,
      assembly.runId,
      assembly.snapshotId,
      assembly.profileHash,
      assembly.qualityReportHash,
      assembly.doctrineContextHash,
      assembly.doctrineContextByteLength,
      assembly.inputHash,
      assembly.operatorPrincipal,
      canonicalStringify(assembly),
    ],
  );
  await client.query(
    `INSERT INTO pa_policy_assembly_bindings
      (assembly_id,case_hash,input_hash,context_metadata_id,context_panel,
       context_artifact_id,context_content_hash,detail_metadata_id,detail_panel,
       detail_artifact_id,detail_content_hash)
     VALUES ($1,$2,$3,$4,'context',$5,$6,$7,'detail',$8,$9)`,
    [
      assembly.assemblyId,
      assembly.caseHash,
      assembly.inputHash,
      assembly.charts.context.metadataId,
      assembly.charts.context.artifactId,
      assembly.charts.context.contentHash,
      assembly.charts.detail.metadataId,
      assembly.charts.detail.artifactId,
      assembly.charts.detail.contentHash,
    ],
  );
  for (const [index, binding] of assembly.doctrineManifest.entries()) {
    await client.query(
      `INSERT INTO pa_policy_assembly_doctrine_bindings
        (assembly_id,doctrine_index,snapshot_id,doctrine_id,rag_record_hash)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        assembly.assemblyId,
        index,
        assembly.snapshotId,
        binding.doctrineId,
        binding.ragRecordHash,
      ],
    );
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
  if (result.rows.length !== 1) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Policy Assembly identity is not unique.",
    );
  }
  return materializeAssembly(result.rows[0]!.record);
}

async function getFailure(
  client: CaseStoreDatabaseClientV1,
  failureId: ContractSha256,
): Promise<Readonly<PolicyAssemblyFailureV1> | null> {
  const result = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_policy_assembly_failures WHERE failure_id=$1",
    [failureId],
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) {
    throw new CaseStoreError(
      "INTEGRITY_VIOLATION",
      "Policy Assembly failure identity is not unique.",
    );
  }
  const failure = structuredClone(result.rows[0]!.record) as PolicyAssemblyFailureV1;
  assertPolicyAssemblyFailureIntegrity(failure);
  return deepFreeze(failure);
}

function materializeActivation(
  value: unknown,
): Readonly<DoctrineActivationAuthorityV1> {
  const activation = structuredClone(value) as DoctrineActivationAuthorityV1;
  assertDoctrineActivationAuthorityIntegrity(activation);
  return deepFreeze(activation);
}

function materializeSnapshot(value: unknown): Readonly<DoctrineCorpusSnapshotV1> {
  const snapshot = structuredClone(value) as DoctrineCorpusSnapshotV1;
  assertDoctrineCorpusSnapshotIntegrity(snapshot);
  return deepFreeze(snapshot);
}

function materializeAssembly(value: unknown): Readonly<PolicyAssemblyV1> {
  const assembly = structuredClone(value) as PolicyAssemblyV1;
  assertPolicyAssemblyIntegrity(assembly);
  return deepFreeze(assembly);
}
