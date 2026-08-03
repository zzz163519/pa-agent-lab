import {
  assertSha256,
  canonicalHash,
  canonicalStringify,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  assertDoctrineActivationAuthorityIntegrity,
  doctrineActivationKind,
  type DoctrineActivationAuthorityV1,
} from "./doctrine-corpus-rollback-v1.ts";
import {
  assertDoctrineCorpusSnapshotIntegrity,
  type DoctrineCorpusSnapshotV1,
} from "./doctrine-retrieval-v1.ts";
import type { DoctrineRagRecordV1 } from "./doctrine-v1.ts";
import {
  assertBrooksPolicyCaseIntegrity,
  assertBrooksPolicyInputIntegrity,
  createBrooksPolicyInput,
  type AnonymousChartManifestV1,
  type BrooksPolicyCaseV1,
  type BrooksPolicyInputV1,
} from "./policy-input-v1.ts";

export const POLICY_ASSEMBLY_SCHEMA_VERSION = "policy-assembly.v1" as const;
export const POLICY_ASSEMBLY_FAILURE_SCHEMA_VERSION =
  "policy-assembly-failure.v1" as const;
export const POLICY_ASSEMBLY_RULES_VERSION =
  "policy-assembly-rules.v1" as const;
export const POLICY_DOCTRINE_CONTEXT_SCHEMA_VERSION =
  "policy-doctrine-context.v1" as const;
export const POLICY_ASSEMBLY_SOURCE_SCOPE = "synthetic_fixture_only" as const;
export const POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT = 32 as const;
export const POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES = 524_288 as const;
export const POLICY_ASSEMBLY_OPERATOR_PRINCIPAL =
  "local:phase2-operator" as const;
export const POLICY_ASSEMBLY_FAILURE_CODES = [
  "ACTIVATION_UNAVAILABLE",
  "ACTIVE_CORPUS_INELIGIBLE",
  "DOCTRINE_COUNT_EXCEEDED",
  "DOCTRINE_CONTEXT_BYTES_EXCEEDED",
] as const;

export type PolicyAssemblyFailureCodeV1 =
  (typeof POLICY_ASSEMBLY_FAILURE_CODES)[number];

export interface PolicyAssemblyDoctrineBindingV1 {
  readonly doctrineId: string;
  readonly ragRecordHash: ContractSha256;
}

export interface PolicyAssemblyChartBindingV1 {
  readonly panel: "context" | "detail";
  readonly metadataId: ContractSha256;
  readonly artifactId: ContractSha256;
  readonly contentHash: ContractSha256;
}

export interface PolicyAssemblyV1 {
  readonly schemaVersion: typeof POLICY_ASSEMBLY_SCHEMA_VERSION;
  readonly assemblyRulesVersion: typeof POLICY_ASSEMBLY_RULES_VERSION;
  readonly sourceScope: typeof POLICY_ASSEMBLY_SOURCE_SCOPE;
  readonly caseHash: ContractSha256;
  readonly sourceBundleHash: ContractSha256;
  readonly activationKind: "standard" | "rollback";
  readonly activationId: ContractSha256;
  readonly activationSequence: number;
  readonly runId: ContractSha256;
  readonly snapshotId: ContractSha256;
  readonly profileHash: ContractSha256;
  readonly qualityReportHash: ContractSha256;
  readonly doctrineContextHash: ContractSha256;
  readonly doctrineContextByteLength: number;
  readonly doctrineManifest: readonly Readonly<PolicyAssemblyDoctrineBindingV1>[];
  readonly charts: Readonly<{
    readonly context: Readonly<PolicyAssemblyChartBindingV1>;
    readonly detail: Readonly<PolicyAssemblyChartBindingV1>;
  }>;
  readonly policyInput: Readonly<BrooksPolicyInputV1>;
  readonly inputHash: ContractSha256;
  readonly operatorPrincipal: typeof POLICY_ASSEMBLY_OPERATOR_PRINCIPAL;
  readonly assemblyId: ContractSha256;
}

export interface PolicyAssemblyFailureV1 {
  readonly schemaVersion: typeof POLICY_ASSEMBLY_FAILURE_SCHEMA_VERSION;
  readonly assemblyRulesVersion: typeof POLICY_ASSEMBLY_RULES_VERSION;
  readonly sourceScope: typeof POLICY_ASSEMBLY_SOURCE_SCOPE;
  readonly caseHash: ContractSha256;
  readonly sourceBundleHash: ContractSha256;
  readonly activationKind: "standard" | "rollback" | null;
  readonly activationId: ContractSha256 | null;
  readonly activationSequence: number | null;
  readonly snapshotId: ContractSha256 | null;
  readonly observedDoctrineCount: number | null;
  readonly observedDoctrineContextByteLength: number | null;
  readonly errorCodes: readonly PolicyAssemblyFailureCodeV1[];
  readonly operatorPrincipal: typeof POLICY_ASSEMBLY_OPERATOR_PRINCIPAL;
  readonly failureId: ContractSha256;
}

export interface PolicyAssemblyChartSourceV1 {
  readonly metadataId: ContractSha256;
  readonly artifactId: ContractSha256;
  readonly contentHash: ContractSha256;
  readonly manifest: AnonymousChartManifestV1;
}

export interface CreatePolicyAssemblyInputV1 {
  readonly sourceBundleHash: ContractSha256;
  readonly activation: DoctrineActivationAuthorityV1;
  readonly snapshot: DoctrineCorpusSnapshotV1;
  readonly policyCase: BrooksPolicyCaseV1;
  readonly charts: Readonly<{
    readonly context: PolicyAssemblyChartSourceV1;
    readonly detail: PolicyAssemblyChartSourceV1;
  }>;
  readonly operatorPrincipal: typeof POLICY_ASSEMBLY_OPERATOR_PRINCIPAL;
}

export interface CreatePolicyAssemblyFailureInputV1 {
  readonly caseHash: ContractSha256;
  readonly sourceBundleHash: ContractSha256;
  readonly activation: DoctrineActivationAuthorityV1 | null;
  readonly observedDoctrineCount: number | null;
  readonly observedDoctrineContextByteLength: number | null;
  readonly errorCodes: readonly PolicyAssemblyFailureCodeV1[];
  readonly operatorPrincipal: typeof POLICY_ASSEMBLY_OPERATOR_PRINCIPAL;
}

export class PolicyAssemblyContractError extends Error {
  override readonly name = "PolicyAssemblyContractError";
}

export function createPolicyAssembly(
  input: CreatePolicyAssemblyInputV1,
): Readonly<PolicyAssemblyV1> {
  try {
    exactRecord("CreatePolicyAssembly input", input, [
      "sourceBundleHash",
      "activation",
      "snapshot",
      "policyCase",
      "charts",
      "operatorPrincipal",
    ]);
    assertSha256("sourceBundleHash", input.sourceBundleHash);
    assertDoctrineActivationAuthorityIntegrity(input.activation);
    assertDoctrineCorpusSnapshotIntegrity(input.snapshot);
    assertBrooksPolicyCaseIntegrity(input.policyCase);
    assertOperator(input.operatorPrincipal);
    if (input.activation.snapshotId !== input.snapshot.snapshotId) {
      fail("activation snapshot does not match the assembly snapshot");
    }
    const count = input.snapshot.entries.length;
    if (count < 1 || count > POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT) {
      fail("Policy Assembly requires 1 through 32 Doctrine records");
    }
    const doctrine = input.snapshot.entries.map((entry) => entry.ragRecord);
    const context = createDoctrineContext(doctrine);
    if (
      context.byteLength > POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES
    ) {
      fail("Policy Assembly Doctrine context exceeds 524288 UTF-8 bytes");
    }
    const charts = exactRecord<{
      readonly context: PolicyAssemblyChartSourceV1;
      readonly detail: PolicyAssemblyChartSourceV1;
    }>("CreatePolicyAssembly charts", input.charts, ["context", "detail"]);
    const contextChart = validateChartSource("context", charts.context);
    const detailChart = validateChartSource("detail", charts.detail);
    const policyInput = createBrooksPolicyInput({
      policyCase: input.policyCase,
      charts: {
        context: contextChart.manifest,
        detail: detailChart.manifest,
      },
      doctrine,
    });
    const doctrineManifest = input.snapshot.entries.map(
      ({ doctrineId, ragRecordHash }) => ({ doctrineId, ragRecordHash }),
    );
    const body = {
      schemaVersion: POLICY_ASSEMBLY_SCHEMA_VERSION,
      assemblyRulesVersion: POLICY_ASSEMBLY_RULES_VERSION,
      sourceScope: POLICY_ASSEMBLY_SOURCE_SCOPE,
      caseHash: input.policyCase.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activationKind: doctrineActivationKind(input.activation),
      activationId: input.activation.activationId,
      activationSequence: input.activation.activationSequence,
      runId: input.activation.runId,
      snapshotId: input.activation.snapshotId,
      profileHash: input.activation.profileHash,
      qualityReportHash: input.activation.qualityReportHash,
      doctrineContextHash: context.hash,
      doctrineContextByteLength: context.byteLength,
      doctrineManifest,
      charts: {
        context: toChartBinding("context", contextChart),
        detail: toChartBinding("detail", detailChart),
      },
      policyInput,
      inputHash: policyInput.inputHash,
      operatorPrincipal: input.operatorPrincipal,
    } as const;
    const assembly = deepFreeze({ ...body, assemblyId: canonicalHash(body) });
    assertPolicyAssemblyIntegrity(assembly);
    return assembly;
  } catch (error) {
    rethrow(error);
  }
}

export function assertPolicyAssemblyIntegrity(
  value: unknown,
): asserts value is PolicyAssemblyV1 {
  try {
    const assembly = exactRecord<PolicyAssemblyV1>("PolicyAssembly", value, [
      "schemaVersion",
      "assemblyRulesVersion",
      "sourceScope",
      "caseHash",
      "sourceBundleHash",
      "activationKind",
      "activationId",
      "activationSequence",
      "runId",
      "snapshotId",
      "profileHash",
      "qualityReportHash",
      "doctrineContextHash",
      "doctrineContextByteLength",
      "doctrineManifest",
      "charts",
      "policyInput",
      "inputHash",
      "operatorPrincipal",
      "assemblyId",
    ]);
    assertFixedAssemblyFields(assembly);
    for (const [name, hash] of [
      ["caseHash", assembly.caseHash],
      ["sourceBundleHash", assembly.sourceBundleHash],
      ["activationId", assembly.activationId],
      ["runId", assembly.runId],
      ["snapshotId", assembly.snapshotId],
      ["profileHash", assembly.profileHash],
      ["qualityReportHash", assembly.qualityReportHash],
      ["doctrineContextHash", assembly.doctrineContextHash],
      ["inputHash", assembly.inputHash],
      ["assemblyId", assembly.assemblyId],
    ] as const) {
      assertSha256(name, hash);
    }
    positiveInteger("activationSequence", assembly.activationSequence);
    positiveInteger(
      "doctrineContextByteLength",
      assembly.doctrineContextByteLength,
    );
    assertBrooksPolicyInputIntegrity(assembly.policyInput);
    if (assembly.inputHash !== assembly.policyInput.inputHash) {
      fail("PolicyAssembly inputHash does not match policyInput");
    }
    const context = createDoctrineContext(assembly.policyInput.doctrine);
    if (
      context.hash !== assembly.doctrineContextHash ||
      context.byteLength !== assembly.doctrineContextByteLength ||
      context.byteLength > POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES
    ) {
      fail("PolicyAssembly Doctrine context identity mismatch");
    }
    validateManifest(assembly.doctrineManifest, assembly.policyInput.doctrine);
    const charts = exactRecord<{
      readonly context: PolicyAssemblyChartBindingV1;
      readonly detail: PolicyAssemblyChartBindingV1;
    }>("PolicyAssembly charts", assembly.charts, ["context", "detail"]);
    validateChartBinding(
      "context",
      charts.context,
      assembly.policyInput.charts.context,
    );
    validateChartBinding(
      "detail",
      charts.detail,
      assembly.policyInput.charts.detail,
    );
    const { assemblyId, ...body } = assembly;
    if (canonicalHash(body) !== assemblyId) {
      fail("PolicyAssembly identity mismatch");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createPolicyAssemblyFailure(
  input: CreatePolicyAssemblyFailureInputV1,
): Readonly<PolicyAssemblyFailureV1> {
  try {
    exactRecord("CreatePolicyAssemblyFailure input", input, [
      "caseHash",
      "sourceBundleHash",
      "activation",
      "observedDoctrineCount",
      "observedDoctrineContextByteLength",
      "errorCodes",
      "operatorPrincipal",
    ]);
    assertSha256("caseHash", input.caseHash);
    assertSha256("sourceBundleHash", input.sourceBundleHash);
    if (input.activation !== null) {
      assertDoctrineActivationAuthorityIntegrity(input.activation);
    }
    assertOperator(input.operatorPrincipal);
    const body = {
      schemaVersion: POLICY_ASSEMBLY_FAILURE_SCHEMA_VERSION,
      assemblyRulesVersion: POLICY_ASSEMBLY_RULES_VERSION,
      sourceScope: POLICY_ASSEMBLY_SOURCE_SCOPE,
      caseHash: input.caseHash,
      sourceBundleHash: input.sourceBundleHash,
      activationKind:
        input.activation === null
          ? null
          : doctrineActivationKind(input.activation),
      activationId: input.activation?.activationId ?? null,
      activationSequence: input.activation?.activationSequence ?? null,
      snapshotId: input.activation?.snapshotId ?? null,
      observedDoctrineCount: input.observedDoctrineCount,
      observedDoctrineContextByteLength:
        input.observedDoctrineContextByteLength,
      errorCodes: [...input.errorCodes],
      operatorPrincipal: input.operatorPrincipal,
    } as const;
    const failure = deepFreeze({ ...body, failureId: canonicalHash(body) });
    assertPolicyAssemblyFailureIntegrity(failure);
    return failure;
  } catch (error) {
    rethrow(error);
  }
}

export function assertPolicyAssemblyFailureIntegrity(
  value: unknown,
): asserts value is PolicyAssemblyFailureV1 {
  try {
    const failure = exactRecord<PolicyAssemblyFailureV1>(
      "PolicyAssemblyFailure",
      value,
      [
        "schemaVersion",
        "assemblyRulesVersion",
        "sourceScope",
        "caseHash",
        "sourceBundleHash",
        "activationKind",
        "activationId",
        "activationSequence",
        "snapshotId",
        "observedDoctrineCount",
        "observedDoctrineContextByteLength",
        "errorCodes",
        "operatorPrincipal",
        "failureId",
      ],
    );
    if (
      failure.schemaVersion !== POLICY_ASSEMBLY_FAILURE_SCHEMA_VERSION ||
      failure.assemblyRulesVersion !== POLICY_ASSEMBLY_RULES_VERSION ||
      failure.sourceScope !== POLICY_ASSEMBLY_SOURCE_SCOPE
    ) {
      fail("PolicyAssemblyFailure fixed contract fields are unsupported");
    }
    assertOperator(failure.operatorPrincipal);
    for (const [name, hash] of [
      ["caseHash", failure.caseHash],
      ["sourceBundleHash", failure.sourceBundleHash],
      ["failureId", failure.failureId],
    ] as const) {
      assertSha256(name, hash);
    }
    validateFailureCodes(failure);
    const { failureId, ...body } = failure;
    if (canonicalHash(body) !== failureId) {
      fail("PolicyAssemblyFailure identity mismatch");
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateFailureCodes(failure: PolicyAssemblyFailureV1): void {
  if (!Array.isArray(failure.errorCodes) || failure.errorCodes.length < 1) {
    fail("PolicyAssemblyFailure requires one or more errorCodes");
  }
  const indices = failure.errorCodes.map((code) =>
    POLICY_ASSEMBLY_FAILURE_CODES.indexOf(code),
  );
  if (
    indices.some((index) => index < 0) ||
    new Set(failure.errorCodes).size !== failure.errorCodes.length ||
    indices.some((index, position) => position > 0 && index <= indices[position - 1]!)
  ) {
    fail("PolicyAssemblyFailure errorCodes must be supported, ordered, and unique");
  }
  const has = (code: PolicyAssemblyFailureCodeV1) =>
    failure.errorCodes.includes(code);
  if (has("ACTIVATION_UNAVAILABLE")) {
    if (
      failure.errorCodes.length !== 1 ||
      failure.activationKind !== null ||
      failure.activationId !== null ||
      failure.activationSequence !== null ||
      failure.snapshotId !== null ||
      failure.observedDoctrineCount !== null ||
      failure.observedDoctrineContextByteLength !== null
    ) {
      fail("ACTIVATION_UNAVAILABLE requires null activation and observed fields");
    }
    return;
  }
  if (
    (failure.activationKind !== "standard" &&
      failure.activationKind !== "rollback") ||
    failure.activationId === null ||
    failure.activationSequence === null ||
    failure.snapshotId === null
  ) {
    fail("PolicyAssemblyFailure requires a bound activation");
  }
  assertSha256("activationId", failure.activationId);
  assertSha256("snapshotId", failure.snapshotId);
  positiveInteger("activationSequence", failure.activationSequence);

  if (has("ACTIVE_CORPUS_INELIGIBLE")) {
    if (
      failure.errorCodes.length !== 1 ||
      failure.observedDoctrineCount !== null ||
      failure.observedDoctrineContextByteLength !== null
    ) {
      fail("ACTIVE_CORPUS_INELIGIBLE requires null observed fields");
    }
    return;
  }
  if (has("DOCTRINE_COUNT_EXCEEDED")) {
    if (
      failure.errorCodes.length !== 1 ||
      failure.observedDoctrineCount === null ||
      !Number.isInteger(failure.observedDoctrineCount) ||
      failure.observedDoctrineCount <= POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT ||
      failure.observedDoctrineContextByteLength !== null
    ) {
      fail("DOCTRINE_COUNT_EXCEEDED requires a count greater than 32 and null bytes");
    }
    return;
  }
  if (
    !has("DOCTRINE_CONTEXT_BYTES_EXCEEDED") ||
    failure.errorCodes.length !== 1 ||
    failure.observedDoctrineCount === null ||
    !Number.isInteger(failure.observedDoctrineCount) ||
    failure.observedDoctrineCount < 1 ||
    failure.observedDoctrineCount > POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT ||
    failure.observedDoctrineContextByteLength === null ||
    !Number.isInteger(failure.observedDoctrineContextByteLength) ||
    failure.observedDoctrineContextByteLength <=
      POLICY_ASSEMBLY_MAX_DOCTRINE_CONTEXT_BYTES
  ) {
    fail("DOCTRINE_CONTEXT_BYTES_EXCEEDED requires exact bounded count and overflow bytes");
  }
}

function validateManifest(
  manifest: readonly PolicyAssemblyDoctrineBindingV1[],
  doctrine: readonly DoctrineRagRecordV1[],
): void {
  if (
    !Array.isArray(manifest) ||
    manifest.length < 1 ||
    manifest.length > POLICY_ASSEMBLY_MAX_DOCTRINE_COUNT ||
    manifest.length !== doctrine.length
  ) {
    fail("PolicyAssembly doctrine manifest count mismatch");
  }
  const doctrineIds: string[] = [];
  manifest.forEach((value, index) => {
    const binding = exactRecord<PolicyAssemblyDoctrineBindingV1>(
      "PolicyAssemblyDoctrineBinding",
      value,
      ["doctrineId", "ragRecordHash"],
    );
    if (
      binding.doctrineId !== doctrine[index]?.doctrineId ||
      binding.ragRecordHash !== canonicalHash(doctrine[index])
    ) {
      fail("PolicyAssembly doctrine manifest does not match policyInput");
    }
    assertSha256("ragRecordHash", binding.ragRecordHash);
    doctrineIds.push(binding.doctrineId);
  });
  if (
    new Set(doctrineIds).size !== doctrineIds.length ||
    doctrineIds.some(
      (id, index) => index > 0 && compareUtf8(doctrineIds[index - 1]!, id) >= 0,
    )
  ) {
    fail("PolicyAssembly doctrine manifest must be unique and canonically ordered");
  }
}

function validateChartSource(
  panel: "context" | "detail",
  value: unknown,
): PolicyAssemblyChartSourceV1 {
  const source = exactRecord<PolicyAssemblyChartSourceV1>(
    `CreatePolicyAssembly ${panel} chart`,
    value,
    ["metadataId", "artifactId", "contentHash", "manifest"],
  );
  for (const [name, hash] of [
    ["metadataId", source.metadataId],
    ["artifactId", source.artifactId],
    ["contentHash", source.contentHash],
  ] as const) {
    assertSha256(`${panel} ${name}`, hash);
  }
  if (
    source.manifest.panel !== panel ||
    source.manifest.contentHash !== source.contentHash
  ) {
    fail(`${panel} chart source does not match its manifest`);
  }
  return source;
}

function toChartBinding(
  panel: "context" | "detail",
  source: PolicyAssemblyChartSourceV1,
): PolicyAssemblyChartBindingV1 {
  return {
    panel,
    metadataId: source.metadataId,
    artifactId: source.artifactId,
    contentHash: source.contentHash,
  };
}

function validateChartBinding(
  panel: "context" | "detail",
  value: unknown,
  manifest: AnonymousChartManifestV1,
): void {
  const binding = exactRecord<PolicyAssemblyChartBindingV1>(
    `PolicyAssembly ${panel} chart binding`,
    value,
    ["panel", "metadataId", "artifactId", "contentHash"],
  );
  if (
    binding.panel !== panel ||
    manifest.panel !== panel ||
    binding.contentHash !== manifest.contentHash
  ) {
    fail(`PolicyAssembly ${panel} chart binding mismatch`);
  }
  for (const [name, hash] of [
    ["metadataId", binding.metadataId],
    ["artifactId", binding.artifactId],
    ["contentHash", binding.contentHash],
  ] as const) {
    assertSha256(`${panel} ${name}`, hash);
  }
}

function createDoctrineContext(doctrine: readonly DoctrineRagRecordV1[]) {
  const value = {
    schemaVersion: POLICY_DOCTRINE_CONTEXT_SCHEMA_VERSION,
    doctrine,
  } as const;
  const canonical = canonicalStringify(value);
  return {
    hash: canonicalHash(value),
    byteLength: new TextEncoder().encode(canonical).byteLength,
  } as const;
}

function assertFixedAssemblyFields(assembly: PolicyAssemblyV1): void {
  if (
    assembly.schemaVersion !== POLICY_ASSEMBLY_SCHEMA_VERSION ||
    assembly.assemblyRulesVersion !== POLICY_ASSEMBLY_RULES_VERSION ||
    assembly.sourceScope !== POLICY_ASSEMBLY_SOURCE_SCOPE ||
    (assembly.activationKind !== "standard" &&
      assembly.activationKind !== "rollback")
  ) {
    fail("PolicyAssembly fixed contract fields are unsupported");
  }
  assertOperator(assembly.operatorPrincipal);
}

function assertOperator(value: unknown): void {
  if (value !== POLICY_ASSEMBLY_OPERATOR_PRINCIPAL) {
    fail("operatorPrincipal is unsupported");
  }
}

function positiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    fail(`${name} must be a positive integer`);
  }
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.length - rightBytes.length;
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
  throw new PolicyAssemblyContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PolicyAssemblyContractError) throw error;
  throw new PolicyAssemblyContractError(
    error instanceof Error ? error.message : "Policy Assembly validation failed",
    { cause: error },
  );
}
