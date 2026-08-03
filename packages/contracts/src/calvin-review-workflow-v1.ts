import {
  BROOKS_VERDICTS,
  type BrooksVerdictV1,
} from "./brooks-decision-v1.ts";
import { FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS } from "./model-call-schedule-v1.ts";
import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION =
  "calvin-review-workflow.v1" as const;
export const CALVIN_REVIEWER_PRINCIPAL = "local:calvin-reviewer" as const;
export const CALVIN_INDEPENDENT_ASSESSMENT_SCHEMA_VERSION =
  "calvin-independent-assessment.v1" as const;
export const DECISION_REVEAL_RECEIPT_SCHEMA_VERSION =
  "decision-reveal-receipt.v1" as const;
export const CALVIN_REVIEW_WORKFLOW_BINDING_SCHEMA_VERSION =
  "calvin-review-workflow-binding.v1" as const;

export type CalvinReviewerPrincipalV1 = typeof CALVIN_REVIEWER_PRINCIPAL;
export type CalvinReviewWorkflowProtocolVersionV1 =
  typeof CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION;

export interface CalvinIndependentAssessmentInputV1 {
  readonly assessmentId: string;
  readonly caseHash: ContractSha256;
  readonly caseId: string;
  readonly inputHash: ContractSha256;
  readonly lastVisibleBarId: string;
  readonly barDurationSeconds: typeof FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS;
  readonly brooksDecisionId: string;
  readonly brooksDecisionHash: ContractSha256;
  readonly independentVerdict: BrooksVerdictV1;
  readonly blindSummary: string;
  readonly outcomeBlind: true;
  readonly brooksDecisionContentSeen: false;
  readonly reviewerPrincipal: CalvinReviewerPrincipalV1;
  readonly protocolVersion: CalvinReviewWorkflowProtocolVersionV1;
}

export interface CalvinIndependentAssessmentV1
  extends CalvinIndependentAssessmentInputV1 {
  readonly schemaVersion: typeof CALVIN_INDEPENDENT_ASSESSMENT_SCHEMA_VERSION;
  readonly assessmentHash: ContractSha256;
}

export interface DecisionRevealReceiptInputV1 {
  readonly receiptId: string;
  readonly assessmentId: string;
  readonly assessmentHash: ContractSha256;
  readonly brooksDecisionId: string;
  readonly brooksDecisionHash: ContractSha256;
  readonly reviewerPrincipal: CalvinReviewerPrincipalV1;
  readonly protocolVersion: CalvinReviewWorkflowProtocolVersionV1;
}

export interface DecisionRevealReceiptV1
  extends DecisionRevealReceiptInputV1 {
  readonly schemaVersion: typeof DECISION_REVEAL_RECEIPT_SCHEMA_VERSION;
  readonly receiptHash: ContractSha256;
}

export interface CalvinReviewWorkflowBindingInputV1 {
  readonly bindingId: string;
  readonly assessmentId: string;
  readonly assessmentHash: ContractSha256;
  readonly revealReceiptId: string;
  readonly revealReceiptHash: ContractSha256;
  readonly brooksDecisionId: string;
  readonly brooksDecisionHash: ContractSha256;
  readonly calvinReviewId: string;
  readonly calvinReviewHash: ContractSha256;
  readonly reviewerPrincipal: CalvinReviewerPrincipalV1;
  readonly protocolVersion: CalvinReviewWorkflowProtocolVersionV1;
}

export interface CalvinReviewWorkflowBindingV1
  extends CalvinReviewWorkflowBindingInputV1 {
  readonly schemaVersion: typeof CALVIN_REVIEW_WORKFLOW_BINDING_SCHEMA_VERSION;
  readonly bindingHash: ContractSha256;
}

export interface CalvinReviewBindingTargetV1 {
  readonly reviewId: string;
  readonly reviewHash: ContractSha256;
  readonly decisionId: string;
  readonly decisionHash: ContractSha256;
}

export class CalvinReviewWorkflowContractError extends Error {
  override readonly name = "CalvinReviewWorkflowContractError";
}

export function createCalvinIndependentAssessment(
  input: CalvinIndependentAssessmentInputV1,
): Readonly<CalvinIndependentAssessmentV1> {
  try {
    validateAssessmentInput(input);
    const body = structuredClone({
      schemaVersion: CALVIN_INDEPENDENT_ASSESSMENT_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, assessmentHash: canonicalHash(body) });
  } catch (error) {
    throw asWorkflowError(error);
  }
}

export function assertCalvinIndependentAssessmentIntegrity(
  value: unknown,
): asserts value is CalvinIndependentAssessmentV1 {
  try {
    const assessment = exactRecord<CalvinIndependentAssessmentV1>(
      "CalvinIndependentAssessment",
      value,
      [
        "schemaVersion",
        "assessmentHash",
        "assessmentId",
        "caseHash",
        "caseId",
        "inputHash",
        "lastVisibleBarId",
        "barDurationSeconds",
        "brooksDecisionId",
        "brooksDecisionHash",
        "independentVerdict",
        "blindSummary",
        "outcomeBlind",
        "brooksDecisionContentSeen",
        "reviewerPrincipal",
        "protocolVersion",
      ],
    );
    if (
      assessment.schemaVersion !==
      CALVIN_INDEPENDENT_ASSESSMENT_SCHEMA_VERSION
    ) {
      fail("CalvinIndependentAssessment schemaVersion is unsupported");
    }
    assertSha256("assessmentHash", assessment.assessmentHash);
    const { assessmentHash, schemaVersion: _schemaVersion, ...input } = assessment;
    const rebuilt = createCalvinIndependentAssessment(input);
    if (rebuilt.assessmentHash !== assessmentHash) {
      fail("CalvinIndependentAssessment hash does not match its content");
    }
  } catch (error) {
    throw asWorkflowError(error);
  }
}

export function createDecisionRevealReceipt(
  input: DecisionRevealReceiptInputV1,
): Readonly<DecisionRevealReceiptV1> {
  try {
    validateReceiptInput(input);
    const body = structuredClone({
      schemaVersion: DECISION_REVEAL_RECEIPT_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, receiptHash: canonicalHash(body) });
  } catch (error) {
    throw asWorkflowError(error);
  }
}

export function assertDecisionRevealReceiptIntegrity(
  value: unknown,
  assessment: CalvinIndependentAssessmentV1,
): asserts value is DecisionRevealReceiptV1 {
  try {
    assertCalvinIndependentAssessmentIntegrity(assessment);
    const receipt = exactRecord<DecisionRevealReceiptV1>(
      "DecisionRevealReceipt",
      value,
      [
        "schemaVersion",
        "receiptHash",
        "receiptId",
        "assessmentId",
        "assessmentHash",
        "brooksDecisionId",
        "brooksDecisionHash",
        "reviewerPrincipal",
        "protocolVersion",
      ],
    );
    if (receipt.schemaVersion !== DECISION_REVEAL_RECEIPT_SCHEMA_VERSION) {
      fail("DecisionRevealReceipt schemaVersion is unsupported");
    }
    assertSha256("receiptHash", receipt.receiptHash);
    validateReceiptInput(receipt);
    if (
      receipt.assessmentId !== assessment.assessmentId ||
      receipt.assessmentHash !== assessment.assessmentHash ||
      receipt.brooksDecisionId !== assessment.brooksDecisionId ||
      receipt.brooksDecisionHash !== assessment.brooksDecisionHash ||
      receipt.reviewerPrincipal !== assessment.reviewerPrincipal ||
      receipt.protocolVersion !== assessment.protocolVersion
    ) {
      fail("DecisionRevealReceipt must bind the exact assessment and decision");
    }
    const { receiptHash, schemaVersion: _schemaVersion, ...input } = receipt;
    if (createDecisionRevealReceipt(input).receiptHash !== receiptHash) {
      fail("DecisionRevealReceipt hash does not match its content");
    }
  } catch (error) {
    throw asWorkflowError(error);
  }
}

export function createCalvinReviewWorkflowBinding(
  input: CalvinReviewWorkflowBindingInputV1,
): Readonly<CalvinReviewWorkflowBindingV1> {
  try {
    validateBindingInput(input);
    const body = structuredClone({
      schemaVersion: CALVIN_REVIEW_WORKFLOW_BINDING_SCHEMA_VERSION,
      ...input,
    });
    return deepFreeze({ ...body, bindingHash: canonicalHash(body) });
  } catch (error) {
    throw asWorkflowError(error);
  }
}

export function assertCalvinReviewWorkflowBindingIntegrity(
  value: unknown,
  assessment: CalvinIndependentAssessmentV1,
  receipt: DecisionRevealReceiptV1,
  target: CalvinReviewBindingTargetV1,
): asserts value is CalvinReviewWorkflowBindingV1 {
  try {
    assertCalvinIndependentAssessmentIntegrity(assessment);
    assertDecisionRevealReceiptIntegrity(receipt, assessment);
    const binding = exactRecord<CalvinReviewWorkflowBindingV1>(
      "CalvinReviewWorkflowBinding",
      value,
      [
        "schemaVersion",
        "bindingHash",
        "bindingId",
        "assessmentId",
        "assessmentHash",
        "revealReceiptId",
        "revealReceiptHash",
        "brooksDecisionId",
        "brooksDecisionHash",
        "calvinReviewId",
        "calvinReviewHash",
        "reviewerPrincipal",
        "protocolVersion",
      ],
    );
    if (
      binding.schemaVersion !== CALVIN_REVIEW_WORKFLOW_BINDING_SCHEMA_VERSION
    ) {
      fail("CalvinReviewWorkflowBinding schemaVersion is unsupported");
    }
    assertSha256("bindingHash", binding.bindingHash);
    validateBindingInput(binding);
    if (
      binding.assessmentId !== assessment.assessmentId ||
      binding.assessmentHash !== assessment.assessmentHash ||
      binding.revealReceiptId !== receipt.receiptId ||
      binding.revealReceiptHash !== receipt.receiptHash ||
      binding.brooksDecisionId !== target.decisionId ||
      binding.brooksDecisionHash !== target.decisionHash ||
      binding.calvinReviewId !== target.reviewId ||
      binding.calvinReviewHash !== target.reviewHash ||
      binding.reviewerPrincipal !== assessment.reviewerPrincipal ||
      binding.protocolVersion !== assessment.protocolVersion
    ) {
      fail("CalvinReviewWorkflowBinding must bind the exact workflow records");
    }
    const { bindingHash, schemaVersion: _schemaVersion, ...input } = binding;
    if (createCalvinReviewWorkflowBinding(input).bindingHash !== bindingHash) {
      fail("CalvinReviewWorkflowBinding hash does not match its content");
    }
  } catch (error) {
    throw asWorkflowError(error);
  }
}

function validateAssessmentInput(input: CalvinIndependentAssessmentInputV1): void {
  assertNonEmpty("assessmentId", input.assessmentId);
  assertSha256("caseHash", input.caseHash);
  assertNonEmpty("caseId", input.caseId);
  assertSha256("inputHash", input.inputHash);
  assertNonEmpty("lastVisibleBarId", input.lastVisibleBarId);
  if (input.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS) {
    fail("CalvinIndependentAssessment requires 300-second bars");
  }
  assertNonEmpty("brooksDecisionId", input.brooksDecisionId);
  assertSha256("brooksDecisionHash", input.brooksDecisionHash);
  assertOneOf("independentVerdict", input.independentVerdict, BROOKS_VERDICTS);
  assertNonEmpty("blindSummary", input.blindSummary);
  if (Array.from(input.blindSummary).length > 600) {
    fail("blindSummary must be at most 600 characters");
  }
  if (!input.outcomeBlind) {
    fail("CalvinIndependentAssessment must be outcome-blind");
  }
  if (input.brooksDecisionContentSeen) {
    fail("Calvin must not have seen BrooksDecision content before assessment");
  }
  validateWorkflowAuthority(input.reviewerPrincipal, input.protocolVersion);
}

function validateReceiptInput(input: DecisionRevealReceiptInputV1): void {
  assertNonEmpty("receiptId", input.receiptId);
  assertNonEmpty("assessmentId", input.assessmentId);
  assertSha256("assessmentHash", input.assessmentHash);
  assertNonEmpty("brooksDecisionId", input.brooksDecisionId);
  assertSha256("brooksDecisionHash", input.brooksDecisionHash);
  validateWorkflowAuthority(input.reviewerPrincipal, input.protocolVersion);
}

function validateBindingInput(input: CalvinReviewWorkflowBindingInputV1): void {
  assertNonEmpty("bindingId", input.bindingId);
  assertNonEmpty("assessmentId", input.assessmentId);
  assertSha256("assessmentHash", input.assessmentHash);
  assertNonEmpty("revealReceiptId", input.revealReceiptId);
  assertSha256("revealReceiptHash", input.revealReceiptHash);
  assertNonEmpty("brooksDecisionId", input.brooksDecisionId);
  assertSha256("brooksDecisionHash", input.brooksDecisionHash);
  assertNonEmpty("calvinReviewId", input.calvinReviewId);
  assertSha256("calvinReviewHash", input.calvinReviewHash);
  validateWorkflowAuthority(input.reviewerPrincipal, input.protocolVersion);
}

function validateWorkflowAuthority(
  principal: CalvinReviewerPrincipalV1,
  protocolVersion: CalvinReviewWorkflowProtocolVersionV1,
): void {
  if (principal !== CALVIN_REVIEWER_PRINCIPAL) {
    fail("reviewerPrincipal must be local:calvin-reviewer");
  }
  if (protocolVersion !== CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION) {
    fail("workflow protocolVersion is unsupported");
  }
}

function exactRecord<T>(
  label: string,
  value: unknown,
  allowedKeys: readonly string[],
): T {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${label} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const names = Object.getOwnPropertyNames(record);
  if (
    names.length !== allowedKeys.length ||
    names.some((name) => !allowedKeys.includes(name)) ||
    allowedKeys.some((name) => !Object.hasOwn(record, name))
  ) {
    fail(`${label} fields must match the exact V1 contract`);
  }
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(record, name);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      fail(`${label} fields must be enumerable data properties`);
    }
  }
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    fail(`${label} cannot contain symbol fields`);
  }
  return record as T;
}

function fail(message: string): never {
  throw new CalvinReviewWorkflowContractError(message);
}

function asWorkflowError(error: unknown): CalvinReviewWorkflowContractError {
  if (error instanceof CalvinReviewWorkflowContractError) return error;
  return new CalvinReviewWorkflowContractError(
    error instanceof Error ? error.message : String(error),
  );
}
