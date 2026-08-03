import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import {
  createDoctrineUnit,
  createSource,
  type DoctrineStatusV1,
  type DoctrineUnitV1,
  type SourceV1,
} from "./doctrine-v1.ts";

export const DOCTRINE_PROPOSAL_BUNDLE_SCHEMA_VERSION =
  "doctrine-proposal-bundle.v1" as const;
export const DOCTRINE_APPROVAL_SCHEMA_VERSION = "doctrine-approval.v1" as const;
export const DOCTRINE_RETIREMENT_SCHEMA_VERSION = "doctrine-retirement.v1" as const;
export const DOCTRINE_APPROVER_PRINCIPALS = [
  "local:phase2-operator",
  "local:calvin-reviewer",
] as const;

export type DoctrineApproverPrincipalV1 =
  (typeof DOCTRINE_APPROVER_PRINCIPALS)[number];

export interface DoctrineProposalBundleInputV1 {
  readonly source: SourceV1;
  readonly doctrineUnit: DoctrineUnitV1;
  readonly sourceLocator: string;
}

export interface DoctrineProposalBundleV1
  extends DoctrineProposalBundleInputV1 {
  readonly schemaVersion: typeof DOCTRINE_PROPOSAL_BUNDLE_SCHEMA_VERSION;
  readonly proposalHash: ContractSha256;
}

export interface DoctrineApprovalInputV1 {
  readonly proposalHash: ContractSha256;
  readonly doctrineId: string;
  readonly sourceId: string;
  readonly sourceContentHash: ContractSha256;
  readonly approverPrincipal: DoctrineApproverPrincipalV1;
}

export interface DoctrineApprovalV1 extends DoctrineApprovalInputV1 {
  readonly schemaVersion: typeof DOCTRINE_APPROVAL_SCHEMA_VERSION;
  readonly approvalHash: ContractSha256;
}

export interface DoctrineRetirementInputV1 {
  readonly proposalHash: ContractSha256;
  readonly approvalHash: ContractSha256;
  readonly doctrineId: string;
  readonly retiredByPrincipal: DoctrineApproverPrincipalV1;
  readonly reason: string;
}

export interface DoctrineRetirementV1 extends DoctrineRetirementInputV1 {
  readonly schemaVersion: typeof DOCTRINE_RETIREMENT_SCHEMA_VERSION;
  readonly retirementHash: ContractSha256;
}

export class DoctrineApprovalContractError extends Error {
  override readonly name = "DoctrineApprovalContractError";
}

export function createDoctrineProposalBundle(
  input: DoctrineProposalBundleInputV1,
): Readonly<DoctrineProposalBundleV1> {
  try {
    exactKeys("DoctrineProposalBundle input", input, [
      "source",
      "doctrineUnit",
      "sourceLocator",
    ]);
    exactKeys("DoctrineProposalBundle Source", input.source, [
      "sourceId",
      "sourceType",
      "title",
      "urlOrLocalRef",
      "contentHash",
      "private",
    ]);
    exactKeys("DoctrineProposalBundle DoctrineUnit", input.doctrineUnit, [
      "doctrineId",
      "sourceId",
      "concept",
      "rule",
      "appliesWhen",
      "avoidWhen",
      "decisionEffect",
      "status",
    ]);
    const source = createSource(input.source);
    const doctrineUnit = createDoctrineUnit(input.doctrineUnit);
    if (source.private || source.sourceType === "private_material") {
      fail("Doctrine proposal requires a public Source");
    }
    let sourceUrl: URL;
    try {
      sourceUrl = new URL(source.urlOrLocalRef);
    } catch {
      fail("Doctrine proposal Source must use an absolute HTTPS URL");
    }
    if (sourceUrl.protocol !== "https:") {
      fail("Doctrine proposal Source must use an absolute HTTPS URL");
    }
    if (doctrineUnit.status !== "draft") {
      fail("Doctrine proposal must be draft");
    }
    if (doctrineUnit.sourceId !== source.sourceId) {
      fail("Doctrine proposal and Source must use the same sourceId");
    }
    boundedText("sourceLocator", input.sourceLocator, 600);
    const body = structuredClone({
      schemaVersion: DOCTRINE_PROPOSAL_BUNDLE_SCHEMA_VERSION,
      source,
      doctrineUnit,
      sourceLocator: input.sourceLocator,
    });
    return deepFreeze({ ...body, proposalHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertDoctrineProposalBundleIntegrity(
  value: unknown,
): asserts value is DoctrineProposalBundleV1 {
  try {
    const proposal = exactRecord<DoctrineProposalBundleV1>(
      "DoctrineProposalBundle",
      value,
      [
        "schemaVersion",
        "proposalHash",
        "source",
        "doctrineUnit",
        "sourceLocator",
      ],
    );
    if (proposal.schemaVersion !== DOCTRINE_PROPOSAL_BUNDLE_SCHEMA_VERSION) {
      fail("DoctrineProposalBundle schemaVersion is unsupported");
    }
    assertSha256("proposalHash", proposal.proposalHash);
    const rebuilt = createDoctrineProposalBundle({
      source: proposal.source,
      doctrineUnit: proposal.doctrineUnit,
      sourceLocator: proposal.sourceLocator,
    });
    if (rebuilt.proposalHash !== proposal.proposalHash) {
      fail("DoctrineProposalBundle hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createDoctrineApproval(
  input: DoctrineApprovalInputV1,
): Readonly<DoctrineApprovalV1> {
  try {
    exactKeys("DoctrineApproval input", input, [
      "proposalHash",
      "doctrineId",
      "sourceId",
      "sourceContentHash",
      "approverPrincipal",
    ]);
    assertSha256("proposalHash", input.proposalHash);
    assertNonEmpty("doctrineId", input.doctrineId);
    assertNonEmpty("sourceId", input.sourceId);
    assertSha256("sourceContentHash", input.sourceContentHash);
    assertOneOf(
      "approverPrincipal",
      input.approverPrincipal,
      DOCTRINE_APPROVER_PRINCIPALS,
    );
    const body = structuredClone({
      schemaVersion: DOCTRINE_APPROVAL_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, approvalHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertDoctrineApprovalIntegrity(
  value: unknown,
  proposal: DoctrineProposalBundleV1,
): asserts value is DoctrineApprovalV1 {
  try {
    assertDoctrineProposalBundleIntegrity(proposal);
    const approval = exactRecord<DoctrineApprovalV1>("DoctrineApproval", value, [
      "schemaVersion",
      "approvalHash",
      "proposalHash",
      "doctrineId",
      "sourceId",
      "sourceContentHash",
      "approverPrincipal",
    ]);
    if (approval.schemaVersion !== DOCTRINE_APPROVAL_SCHEMA_VERSION) {
      fail("DoctrineApproval schemaVersion is unsupported");
    }
    assertSha256("approvalHash", approval.approvalHash);
    assertApprovalMatchesProposal(proposal, approval);
    const { schemaVersion: _schemaVersion, approvalHash, ...input } = approval;
    if (createDoctrineApproval(input).approvalHash !== approvalHash) {
      fail("DoctrineApproval hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function createDoctrineRetirement(
  input: DoctrineRetirementInputV1,
): Readonly<DoctrineRetirementV1> {
  try {
    exactKeys("DoctrineRetirement input", input, [
      "proposalHash",
      "approvalHash",
      "doctrineId",
      "retiredByPrincipal",
      "reason",
    ]);
    assertSha256("proposalHash", input.proposalHash);
    assertSha256("approvalHash", input.approvalHash);
    assertNonEmpty("doctrineId", input.doctrineId);
    assertOneOf(
      "retiredByPrincipal",
      input.retiredByPrincipal,
      DOCTRINE_APPROVER_PRINCIPALS,
    );
    boundedText("reason", input.reason, 400);
    const body = structuredClone({
      schemaVersion: DOCTRINE_RETIREMENT_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, retirementHash: canonicalHash(body) });
  } catch (error) {
    rethrow(error);
  }
}

export function assertDoctrineRetirementIntegrity(
  value: unknown,
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1,
): asserts value is DoctrineRetirementV1 {
  try {
    assertDoctrineApprovalIntegrity(approval, proposal);
    const retirement = exactRecord<DoctrineRetirementV1>(
      "DoctrineRetirement",
      value,
      [
        "schemaVersion",
        "retirementHash",
        "proposalHash",
        "approvalHash",
        "doctrineId",
        "retiredByPrincipal",
        "reason",
      ],
    );
    if (retirement.schemaVersion !== DOCTRINE_RETIREMENT_SCHEMA_VERSION) {
      fail("DoctrineRetirement schemaVersion is unsupported");
    }
    assertSha256("retirementHash", retirement.retirementHash);
    assertRetirementMatchesApproval(proposal, approval, retirement);
    const { schemaVersion: _schemaVersion, retirementHash, ...input } = retirement;
    if (createDoctrineRetirement(input).retirementHash !== retirementHash) {
      fail("DoctrineRetirement hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function deriveDoctrineStatus(
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1 | null,
  retirement: DoctrineRetirementV1 | null,
): DoctrineStatusV1 {
  try {
    assertDoctrineProposalBundleIntegrity(proposal);
    if (approval === null) {
      if (retirement !== null) fail("Doctrine cannot be retired before approval");
      return "draft";
    }
    assertDoctrineApprovalIntegrity(approval, proposal);
    if (retirement === null) return "approved";
    assertDoctrineRetirementIntegrity(retirement, proposal, approval);
    return "retired";
  } catch (error) {
    rethrow(error);
  }
}

export function toApprovedDoctrineUnit(
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1,
  retirement: DoctrineRetirementV1 | null = null,
): Readonly<DoctrineUnitV1> {
  const status = deriveDoctrineStatus(proposal, approval, retirement);
  if (status === "retired") {
    throw new DoctrineApprovalContractError(
      "retired DoctrineUnit cannot enter the approved projection",
    );
  }
  return createDoctrineUnit({ ...proposal.doctrineUnit, status: "approved" });
}

function assertApprovalMatchesProposal(
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1,
): void {
  if (
    approval.proposalHash !== proposal.proposalHash ||
    approval.doctrineId !== proposal.doctrineUnit.doctrineId ||
    approval.sourceId !== proposal.source.sourceId ||
    approval.sourceContentHash !== proposal.source.contentHash
  ) {
    fail("DoctrineApproval must bind the exact proposal and Source");
  }
}

function assertRetirementMatchesApproval(
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1,
  retirement: DoctrineRetirementV1,
): void {
  if (
    retirement.proposalHash !== proposal.proposalHash ||
    retirement.approvalHash !== approval.approvalHash ||
    retirement.doctrineId !== proposal.doctrineUnit.doctrineId
  ) {
    fail("DoctrineRetirement must bind the exact approval and proposal");
  }
}

function boundedText(name: string, value: string, maximum: number): void {
  assertNonEmpty(name, value);
  if (value.length > maximum) fail(`${name} must contain at most ${maximum} characters`);
}

function exactRecord<T extends object>(
  name: string,
  value: unknown,
  keys: readonly string[],
): T {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  exactKeys(name, value as object, keys);
  return value as T;
}

function exactKeys(name: string, value: object, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(`${name} must contain exact keys: ${expected.join(", ")}`);
  }
}

function fail(message: string): never {
  throw new DoctrineApprovalContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof DoctrineApprovalContractError) throw error;
  throw new DoctrineApprovalContractError(
    error instanceof Error ? error.message : String(error),
  );
}
