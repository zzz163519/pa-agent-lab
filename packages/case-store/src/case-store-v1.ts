import pg, { type Pool, type PoolClient } from "pg";

import {
  CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
  CALVIN_REVIEWER_PRINCIPAL,
  DOCTRINE_RETRIEVAL_RUNTIME,
  DoctrineApprovalContractError,
  DoctrineContractError,
  assertBrooksDecisionIntegrity,
  assertCalvinIndependentAssessmentIntegrity,
  assertCalvinReviewIntegrity,
  assertCalvinReviewWorkflowBindingIntegrity,
  assertDecisionRevealReceiptIntegrity,
  assertDoctrineApprovalIntegrity,
  assertDoctrineProposalBundleIntegrity,
  assertDoctrineRetirementIntegrity,
  canonicalHash,
  canonicalStringify,
  createCalvinIndependentAssessment,
  createCalvinReview,
  createCalvinReviewWorkflowBinding,
  createDecisionRevealReceipt,
  createDoctrineApproval,
  createDoctrineRetirement,
  deepFreeze,
  deriveDecisionConflict,
  deriveDoctrineStatus,
  toApprovedDoctrineUnit,
  type BrooksDecisionV1,
  type BrooksPolicyCaseV1,
  type CalvinIndependentAssessmentV1,
  type CalvinReviewV1,
  type CalvinReviewWorkflowBindingV1,
  type ContractSha256,
  type DecisionRevealReceiptV1,
  type DoctrineApprovalV1,
  type DoctrineApproverPrincipalV1,
  type DoctrineProposalBundleV1,
  type DoctrineRetirementV1,
  type DoctrineUnitV1,
} from "@pa-agent-lab/contracts";
import {
  REVIEW_WORK_ITEM_DETAIL_SCHEMA_VERSION,
  REVIEW_WORK_QUEUE_SCHEMA_VERSION,
  DOCTRINE_WORK_ITEM_SCHEMA_VERSION,
  DOCTRINE_WORK_QUEUE_SCHEMA_VERSION,
  assertAnonymousChartArtifactMetadataIntegrity,
  assertApproveDoctrineCommand,
  assertRetireDoctrineCommand,
  assertRevealDecisionCommand,
  assertSubmitFinalReviewCommand,
  assertSubmitIndependentAssessmentCommand,
  assertSyntheticCaseBundleIntegrity,
  createCaseAuditView,
  createSyntheticCaseBundle,
  parsePersistedRecordJson,
  serializePersistedRecord,
  toBlindReviewChart,
  toFrozenAssessmentView,
  type AnonymousChartArtifactMetadataV1,
  type CaseAuditViewV1,
  type ApproveDoctrineCommandV1,
  type DoctrineWorkItemV1,
  type DoctrineWorkQueueV1,
  type RetireDoctrineCommandV1,
  type RevealDecisionCommandV1,
  type ReviewWorkItemDetailV1,
  type ReviewWorkQueueV1,
  type SubmitFinalReviewCommandV1,
  type SubmitIndependentAssessmentCommandV1,
  type SyntheticCaseBundleV1,
} from "@pa-agent-lab/persistence-contracts";

import {
  createPolicyAssemblyStoreV1,
  createLocalPngArtifactValidatorV1,
  type PolicyAssemblyArtifactValidatorV1,
  type PolicyAssemblyStoreV1,
} from "./policy-assembly-store-v1.ts";
import {
  CaseStoreError,
  type CaseStoreErrorCodeV1,
} from "./case-store-error-v1.ts";
import {
  createDoctrineRetrievalStoreV1,
  type DoctrineRetrievalStoreV1,
} from "./doctrine-retrieval-store-v1.ts";

export interface CaseStoreDatabaseClientV1 {
  query<T>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[] }>;
}

export interface CaseStoreDatabaseV1 extends CaseStoreDatabaseClientV1 {
  transaction<T>(
    work: (client: CaseStoreDatabaseClientV1) => Promise<T>,
  ): Promise<T>;
}

export interface CaseStoreMutationResultV1 {
  readonly status: "inserted" | "existing";
  readonly resourceHash: ContractSha256;
}

export interface CaseStoreV1
  extends DoctrineRetrievalStoreV1,
    PolicyAssemblyStoreV1 {
  appendSyntheticCaseBundle(
    bundle: SyntheticCaseBundleV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendBrooksDecision(
    decision: BrooksDecisionV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendCalvinReview(
    review: CalvinReviewV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendDoctrineProposal(
    proposal: DoctrineProposalBundleV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  listDoctrineWorkItems(): Promise<Readonly<DoctrineWorkQueueV1>>;
  getDoctrineWorkItem(
    doctrineId: string,
  ): Promise<Readonly<DoctrineWorkItemV1> | null>;
  approveDoctrine(
    doctrineId: string,
    command: ApproveDoctrineCommandV1,
    principal: DoctrineApproverPrincipalV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  retireDoctrine(
    doctrineId: string,
    command: RetireDoctrineCommandV1,
    principal: DoctrineApproverPrincipalV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  listApprovedDoctrineUnits(): Promise<readonly Readonly<DoctrineUnitV1>[]>;
  listReviewWorkItems(): Promise<Readonly<ReviewWorkQueueV1>>;
  getReviewWorkItem(
    caseHash: ContractSha256,
  ): Promise<Readonly<ReviewWorkItemDetailV1> | null>;
  appendIndependentAssessment(
    command: SubmitIndependentAssessmentCommandV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendDecisionRevealReceipt(
    caseHash: ContractSha256,
    command: RevealDecisionCommandV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  appendFinalReview(
    command: SubmitFinalReviewCommandV1,
  ): Promise<Readonly<CaseStoreMutationResultV1>>;
  getCase(caseHash: ContractSha256): Promise<Readonly<BrooksPolicyCaseV1> | null>;
  getCaseAudit(caseHash: ContractSha256): Promise<Readonly<CaseAuditViewV1> | null>;
  getChartArtifact(
    artifactId: ContractSha256,
  ): Promise<Readonly<AnonymousChartArtifactMetadataV1> | null>;
  checkReadiness(): Promise<boolean>;
}

export type { CaseStoreErrorCodeV1 } from "./case-store-error-v1.ts";
export { CaseStoreError } from "./case-store-error-v1.ts";

export interface PostgresCaseStoreHandleV1 {
  readonly store: CaseStoreV1;
  close(): Promise<void>;
}

export function createPostgresCaseStoreV1(options: {
  readonly connectionString: string;
  readonly maxConnections?: number;
  readonly doctrineRetrievalRuntime: typeof DOCTRINE_RETRIEVAL_RUNTIME;
  readonly authorizedSyntheticBundleHashes?: readonly ContractSha256[];
  readonly artifactRoot?: string;
}): PostgresCaseStoreHandleV1 {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 4,
  });
  return {
    store: createCaseStore(createPgCaseStoreDatabase(pool), {
      doctrineRetrievalRuntime: options.doctrineRetrievalRuntime,
      authorizedSyntheticBundleHashes:
        options.authorizedSyntheticBundleHashes ?? [],
      validateChartArtifact:
        options.artifactRoot === undefined
          ? null
          : createLocalPngArtifactValidatorV1(options.artifactRoot),
    }),
    close: () => pool.end(),
  };
}

export function createCaseStore(
  database: CaseStoreDatabaseV1,
  options: {
    readonly doctrineRetrievalRuntime?: typeof DOCTRINE_RETRIEVAL_RUNTIME;
    readonly authorizedSyntheticBundleHashes?: readonly ContractSha256[];
    readonly validateChartArtifact?: PolicyAssemblyArtifactValidatorV1 | null;
  } = {},
): CaseStoreV1 {
  const doctrineRetrieval = createDoctrineRetrievalStoreV1(database, {
    runtimeAttestation:
      options.doctrineRetrievalRuntime === undefined
        ? null
        : { runtime: options.doctrineRetrievalRuntime },
  });
  const policyAssembly = createPolicyAssemblyStoreV1(database, {
    authorizedSyntheticBundleHashes:
      options.authorizedSyntheticBundleHashes ?? [],
    validateChartArtifact: options.validateChartArtifact ?? null,
  });
  return {
    ...doctrineRetrieval,
    ...policyAssembly,
    appendSyntheticCaseBundle: (bundle) => appendBundle(database, bundle),
    appendBrooksDecision: (decision) => appendDecision(database, decision),
    appendCalvinReview: (review) => appendReview(database, review),
    appendDoctrineProposal: (proposal) => appendDoctrineProposal(database, proposal),
    listDoctrineWorkItems: () => listDoctrineWorkItems(database),
    getDoctrineWorkItem: (doctrineId) => getDoctrineWorkItem(database, doctrineId),
    approveDoctrine: (doctrineId, command, principal) =>
      approveDoctrine(database, doctrineId, command, principal),
    retireDoctrine: (doctrineId, command, principal) =>
      retireDoctrine(database, doctrineId, command, principal),
    listApprovedDoctrineUnits: () => listApprovedDoctrineUnits(database),
    listReviewWorkItems: () => listReviewWorkItems(database),
    getReviewWorkItem: (caseHash) => getReviewWorkItem(database, caseHash),
    appendIndependentAssessment: (command) =>
      appendIndependentAssessment(database, command),
    appendDecisionRevealReceipt: (caseHash, command) =>
      appendDecisionRevealReceipt(database, caseHash, command),
    appendFinalReview: (command) => appendFinalReview(database, command),
    getCase: (caseHash) => getCase(database, caseHash),
    getCaseAudit: (caseHash) => getAudit(database, caseHash),
    getChartArtifact: (artifactId) => getChartArtifact(database, artifactId),
    checkReadiness: async () => {
      const result = await database.query<{ readonly ready: number }>(
        "SELECT 1::int AS ready",
      );
      return result.rows[0]?.ready === 1;
    },
  };
}

export function createPgCaseStoreDatabase(pool: Pool): CaseStoreDatabaseV1 {
  return {
    query: (sql, params) => queryPg(pool, sql, params),
    transaction: (work) => runPgTransaction(pool, work),
  };
}

async function runPgTransaction<T>(
  pool: Pool,
  work: (client: CaseStoreDatabaseClientV1) => Promise<T>,
): Promise<T> {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await work({
        query: (sql, params) => queryPg(client, sql, params),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original transaction failure.
      }
      if (attempt < maximumAttempts && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
  throw new Error("PostgreSQL transaction retry limit was exhausted");
}

function isRetryableTransactionError(error: unknown): boolean {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  if (error.code === "40001" || error.code === "40P01") {
    return true;
  }
  return (
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "pa_policy_assembly_natural_identity_uq"
  );
}

async function appendBundle(
  database: CaseStoreDatabaseV1,
  bundle: SyntheticCaseBundleV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertSyntheticCaseBundleIntegrity(bundle);
    const statuses = await database.transaction(async (client) => {
      const policyCase = bundle.policyCase;
      const input = bundle.policyInput;
      const context = bundle.chartMetadata.context;
      const detail = bundle.chartMetadata.detail;
      return [
        await insertImmutableRecord(client, {
          insertSql: `INSERT INTO pa_policy_cases
            (case_hash, case_id, policy_stream_id, last_visible_bar_id,
             decision_point_sequence, bar_duration_seconds, record)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           ON CONFLICT DO NOTHING RETURNING case_hash AS identity`,
          insertParams: [
            policyCase.caseHash,
            policyCase.caseId,
            policyCase.policyStreamId,
            policyCase.lastVisibleBarId,
            policyCase.bars.at(-1)!.sequence,
            policyCase.barDurationSeconds,
            serializePersistedRecord("policy_case", policyCase),
          ],
          existingSql: `SELECT case_hash AS identity, record
            FROM pa_policy_cases
            WHERE case_hash = $1 OR case_id = $2
               OR (policy_stream_id = $3 AND last_visible_bar_id = $4)
               OR (policy_stream_id = $3 AND decision_point_sequence = $5)`,
          existingParams: [
            policyCase.caseHash,
            policyCase.caseId,
            policyCase.policyStreamId,
            policyCase.lastVisibleBarId,
            policyCase.bars.at(-1)!.sequence,
          ],
          expectedIdentity: policyCase.caseHash,
          expectedCanonical: serializePersistedRecord("policy_case", policyCase),
          parseExisting: (value) => parseRecord("policy_case", value),
        }),
        await insertImmutableRecord(client, {
          insertSql: `INSERT INTO pa_policy_inputs
            (input_hash, context_content_hash, detail_content_hash, record)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT DO NOTHING RETURNING input_hash AS identity`,
          insertParams: [
            input.inputHash,
            input.charts.context.contentHash,
            input.charts.detail.contentHash,
            serializePersistedRecord("policy_input", input),
          ],
          existingSql: `SELECT input_hash AS identity, record
            FROM pa_policy_inputs WHERE input_hash = $1`,
          existingParams: [input.inputHash],
          expectedIdentity: input.inputHash,
          expectedCanonical: serializePersistedRecord("policy_input", input),
          parseExisting: (value) => parseRecord("policy_input", value),
        }),
        await insertChartMetadata(client, context),
        await insertChartMetadata(client, detail),
        await insertCaseInputBinding(client, bundle),
      ];
    });
    return mutationResult(
      statuses.every((status) => status === "existing")
        ? "existing"
        : "inserted",
      bundle.bundleHash,
    );
  } catch (error) {
    rethrow(error);
  }
}

async function appendDecision(
  database: CaseStoreDatabaseV1,
  decision: BrooksDecisionV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    return await database.transaction(async (client) => {
      const bundle = await loadBundleByCaseIdAndInput(
        client,
        decision.caseId,
        decision.inputHash,
      );
      if (bundle === null) fail("INTEGRITY_VIOLATION", "BrooksDecision parent CaseBundle is missing");
      assertBrooksDecisionIntegrity(decision, decisionBinding(bundle));
      const expectedCanonical = canonicalStringify(decision);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_brooks_decisions
          (decision_hash, decision_id, case_hash, case_id, input_hash, record)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING RETURNING decision_hash AS identity`,
        insertParams: [
          decision.decisionHash,
          decision.decisionId,
          bundle.policyCase.caseHash,
          decision.caseId,
          decision.inputHash,
          expectedCanonical,
        ],
        existingSql: `SELECT decision_hash AS identity, record
          FROM pa_brooks_decisions
          WHERE decision_hash = $1 OR decision_id = $2
             OR (case_hash = $3 AND input_hash = $4)`,
        existingParams: [
          decision.decisionHash,
          decision.decisionId,
          bundle.policyCase.caseHash,
          decision.inputHash,
        ],
        expectedIdentity: decision.decisionHash,
        expectedCanonical,
        parseExisting: (value) => parseDecision(value, bundle),
      });
      return mutationResult(status, decision.decisionHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function appendReview(
  database: CaseStoreDatabaseV1,
  review: CalvinReviewV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    return await database.transaction(async (client) => {
      const loaded = await loadDecisionByIdentity(
        client,
        review.reviewedDecisionHash,
        review.brooksDecisionId,
      );
      if (loaded === null) fail("INTEGRITY_VIOLATION", "CalvinReview parent BrooksDecision is missing");
      assertCalvinReviewIntegrity(review, loaded.decision);
      const expectedCanonical = canonicalStringify(review);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_calvin_reviews
          (review_hash, review_id, decision_hash, decision_id, record)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT DO NOTHING RETURNING review_hash AS identity`,
        insertParams: [
          review.reviewHash,
          review.reviewId,
          review.reviewedDecisionHash,
          review.brooksDecisionId,
          expectedCanonical,
        ],
        existingSql: `SELECT review_hash AS identity, record
          FROM pa_calvin_reviews
          WHERE review_hash = $1 OR review_id = $2 OR decision_hash = $3`,
        existingParams: [
          review.reviewHash,
          review.reviewId,
          review.reviewedDecisionHash,
        ],
        expectedIdentity: review.reviewHash,
        expectedCanonical,
        parseExisting: (value) => parseReview(value, loaded.decision),
      });
      return mutationResult(status, review.reviewHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function listReviewWorkItems(
  database: CaseStoreDatabaseV1,
): Promise<Readonly<ReviewWorkQueueV1>> {
  try {
    return await database.transaction(async (client) => {
      const rows = await client.query<{ readonly case_hash: ContractSha256 }>(
        "SELECT case_hash FROM pa_brooks_decisions ORDER BY case_hash",
      );
      const items = [];
      for (const row of rows.rows) {
        const aggregate = await loadReviewAggregate(client, row.case_hash);
        if (aggregate === null) {
          fail("INTEGRITY_VIOLATION", "review queue decision parent is incomplete");
        }
        const state = deriveReviewState(aggregate);
        const market = aggregate.bundle.policyInput.market;
        items.push({
          caseHash: aggregate.bundle.policyCase.caseHash,
          anonymousId: anonymousCaseId(aggregate.bundle.policyCase.caseHash),
          draftIdentityHash: reviewDraftIdentity(aggregate),
          visibleBarCount: market.visibleBarCount,
          barDurationSeconds: market.barDurationSeconds,
          lastVisibleBarId: market.lastVisibleBarId,
          isLeftCensored: market.isLeftCensored,
          hasMissingData: market.bars.some(
            (bar) => bar.continuityFromPrevious === "missing_data",
          ),
          state,
        });
      }
      return deepFreeze({
        schemaVersion: REVIEW_WORK_QUEUE_SCHEMA_VERSION,
        items,
      });
    });
  } catch (error) {
    rethrow(error);
  }
}

async function getReviewWorkItem(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
): Promise<Readonly<ReviewWorkItemDetailV1> | null> {
  try {
    return await database.transaction(async (client) => {
      const aggregate = await loadReviewAggregate(client, caseHash);
      return aggregate === null ? null : buildReviewWorkItem(aggregate);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function appendIndependentAssessment(
  database: CaseStoreDatabaseV1,
  command: SubmitIndependentAssessmentCommandV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertSubmitIndependentAssessmentCommand(command);
    return await database.transaction(async (client) => {
      const aggregate = await requireReviewAggregate(client, command.caseHash);
      if (command.draftIdentityHash !== reviewDraftIdentity(aggregate)) {
        fail("IDENTITY_CONFLICT", "blind draft identity does not match the exact work item");
      }
      if (aggregate.review !== null || aggregate.binding !== null) {
        fail("IDENTITY_CONFLICT", "completed review cannot accept another assessment");
      }
      const record = createCalvinIndependentAssessment({
        assessmentId: deterministicId("assessment", aggregate.decision.decisionHash),
        caseHash: aggregate.bundle.policyCase.caseHash,
        caseId: aggregate.bundle.policyCase.caseId,
        inputHash: aggregate.bundle.policyInput.inputHash,
        lastVisibleBarId: aggregate.bundle.policyInput.market.lastVisibleBarId,
        barDurationSeconds: aggregate.bundle.policyCase.barDurationSeconds,
        brooksDecisionId: aggregate.decision.decisionId,
        brooksDecisionHash: aggregate.decision.decisionHash,
        independentVerdict: command.independentVerdict,
        blindSummary: command.blindSummary,
        outcomeBlind: true,
        brooksDecisionContentSeen: false,
        reviewerPrincipal: CALVIN_REVIEWER_PRINCIPAL,
        protocolVersion: CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
      });
      const canonical = canonicalStringify(record);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_calvin_independent_assessments
          (assessment_hash, assessment_id, decision_hash, decision_id,
           case_hash, case_id, input_hash, last_visible_bar_id,
           bar_duration_seconds, independent_verdict,
           reviewer_principal, protocol_version, record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
         ON CONFLICT DO NOTHING RETURNING assessment_hash AS identity`,
        insertParams: [
          record.assessmentHash,
          record.assessmentId,
          record.brooksDecisionHash,
          record.brooksDecisionId,
          record.caseHash,
          record.caseId,
          record.inputHash,
          record.lastVisibleBarId,
          record.barDurationSeconds,
          record.independentVerdict,
          record.reviewerPrincipal,
          record.protocolVersion,
          canonical,
        ],
        existingSql: `SELECT assessment_hash AS identity, record
          FROM pa_calvin_independent_assessments
          WHERE assessment_hash = $1 OR assessment_id = $2 OR decision_hash = $3`,
        existingParams: [
          record.assessmentHash,
          record.assessmentId,
          record.brooksDecisionHash,
        ],
        expectedIdentity: record.assessmentHash,
        expectedCanonical: canonical,
        parseExisting: parseAssessment,
      });
      return mutationResult(status, record.assessmentHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function appendDecisionRevealReceipt(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
  command: RevealDecisionCommandV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertRevealDecisionCommand(command);
    return await database.transaction(async (client) => {
      const aggregate = await requireReviewAggregate(client, caseHash);
      const assessment = aggregate.assessment;
      if (assessment === null) {
        fail("INTEGRITY_VIOLATION", "frozen independent assessment is required before reveal");
      }
      if (assessment.assessmentHash !== command.assessmentHash) {
        fail("IDENTITY_CONFLICT", "reveal command names a different assessment");
      }
      const record = createDecisionRevealReceipt({
        receiptId: deterministicId("reveal", assessment.assessmentHash),
        assessmentId: assessment.assessmentId,
        assessmentHash: assessment.assessmentHash,
        brooksDecisionId: assessment.brooksDecisionId,
        brooksDecisionHash: assessment.brooksDecisionHash,
        reviewerPrincipal: assessment.reviewerPrincipal,
        protocolVersion: assessment.protocolVersion,
      });
      const canonical = canonicalStringify(record);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_decision_reveal_receipts
          (receipt_hash, receipt_id, assessment_hash, assessment_id,
           decision_hash, decision_id, reviewer_principal, protocol_version, record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT DO NOTHING RETURNING receipt_hash AS identity`,
        insertParams: [
          record.receiptHash,
          record.receiptId,
          record.assessmentHash,
          record.assessmentId,
          record.brooksDecisionHash,
          record.brooksDecisionId,
          record.reviewerPrincipal,
          record.protocolVersion,
          canonical,
        ],
        existingSql: `SELECT receipt_hash AS identity, record
          FROM pa_decision_reveal_receipts
          WHERE receipt_hash = $1 OR receipt_id = $2
             OR assessment_hash = $3 OR decision_hash = $4`,
        existingParams: [
          record.receiptHash,
          record.receiptId,
          record.assessmentHash,
          record.brooksDecisionHash,
        ],
        expectedIdentity: record.receiptHash,
        expectedCanonical: canonical,
        parseExisting: (value) => parseReceipt(value, assessment),
      });
      return mutationResult(status, record.receiptHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function appendFinalReview(
  database: CaseStoreDatabaseV1,
  command: SubmitFinalReviewCommandV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertSubmitFinalReviewCommand(command);
    return await database.transaction(async (client) => {
      const aggregate = await requireReviewAggregate(client, command.caseHash);
      const assessment = aggregate.assessment;
      const receipt = aggregate.receipt;
      if (assessment === null) {
        fail("INTEGRITY_VIOLATION", "frozen independent assessment is required before final review");
      }
      if (receipt === null) {
        fail("INTEGRITY_VIOLATION", "decision reveal receipt is required before final review");
      }
      if (
        assessment.assessmentHash !== command.assessmentHash ||
        receipt.receiptHash !== command.revealReceiptHash
      ) {
        fail("IDENTITY_CONFLICT", "final review command names a different workflow");
      }
      const review = createCalvinReview(
        {
          reviewId: deterministicId("review", aggregate.decision.decisionHash),
          brooksDecisionId: aggregate.decision.decisionId,
          reviewedDecisionHash: aggregate.decision.decisionHash,
          scope: "whole_decision",
          disposition: command.disposition,
          independentVerdict: assessment.independentVerdict,
          summary: command.summary,
          outcomeBlind: true,
        },
        aggregate.decision,
      );
      const binding = createCalvinReviewWorkflowBinding({
        bindingId: deterministicId("binding", review.reviewHash),
        assessmentId: assessment.assessmentId,
        assessmentHash: assessment.assessmentHash,
        revealReceiptId: receipt.receiptId,
        revealReceiptHash: receipt.receiptHash,
        brooksDecisionId: aggregate.decision.decisionId,
        brooksDecisionHash: aggregate.decision.decisionHash,
        calvinReviewId: review.reviewId,
        calvinReviewHash: review.reviewHash,
        reviewerPrincipal: assessment.reviewerPrincipal,
        protocolVersion: assessment.protocolVersion,
      });
      const reviewStatus = await insertReviewRecord(client, review, aggregate);
      const bindingCanonical = canonicalStringify(binding);
      const bindingStatus = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_calvin_review_workflow_bindings
          (binding_hash, binding_id, assessment_hash, assessment_id,
           receipt_hash, receipt_id, decision_hash, decision_id,
           review_hash, review_id, independent_verdict,
           reviewer_principal, protocol_version, record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
         ON CONFLICT DO NOTHING RETURNING binding_hash AS identity`,
        insertParams: [
          binding.bindingHash,
          binding.bindingId,
          binding.assessmentHash,
          binding.assessmentId,
          binding.revealReceiptHash,
          binding.revealReceiptId,
          binding.brooksDecisionHash,
          binding.brooksDecisionId,
          binding.calvinReviewHash,
          binding.calvinReviewId,
          assessment.independentVerdict,
          binding.reviewerPrincipal,
          binding.protocolVersion,
          bindingCanonical,
        ],
        existingSql: `SELECT binding_hash AS identity, record
          FROM pa_calvin_review_workflow_bindings
          WHERE binding_hash = $1 OR binding_id = $2 OR assessment_hash = $3
             OR receipt_hash = $4 OR decision_hash = $5 OR review_hash = $6`,
        existingParams: [
          binding.bindingHash,
          binding.bindingId,
          binding.assessmentHash,
          binding.revealReceiptHash,
          binding.brooksDecisionHash,
          binding.calvinReviewHash,
        ],
        expectedIdentity: binding.bindingHash,
        expectedCanonical: bindingCanonical,
        parseExisting: (value) =>
          parseWorkflowBinding(value, assessment, receipt, review),
      });
      return mutationResult(
        reviewStatus === "existing" && bindingStatus === "existing"
          ? "existing"
          : "inserted",
        binding.bindingHash,
      );
    });
  } catch (error) {
    rethrow(error);
  }
}

async function insertReviewRecord(
  client: CaseStoreDatabaseClientV1,
  review: CalvinReviewV1,
  aggregate: ReviewAggregateV1,
): Promise<"inserted" | "existing"> {
  assertCalvinReviewIntegrity(review, aggregate.decision);
  const canonical = canonicalStringify(review);
  return insertImmutableRecord(client, {
    insertSql: `INSERT INTO pa_calvin_reviews
      (review_hash, review_id, decision_hash, decision_id, record)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT DO NOTHING RETURNING review_hash AS identity`,
    insertParams: [
      review.reviewHash,
      review.reviewId,
      review.reviewedDecisionHash,
      review.brooksDecisionId,
      canonical,
    ],
    existingSql: `SELECT review_hash AS identity, record
      FROM pa_calvin_reviews
      WHERE review_hash = $1 OR review_id = $2 OR decision_hash = $3`,
    existingParams: [
      review.reviewHash,
      review.reviewId,
      review.reviewedDecisionHash,
    ],
    expectedIdentity: review.reviewHash,
    expectedCanonical: canonical,
    parseExisting: (value) => parseReview(value, aggregate.decision),
  });
}

async function getCase(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
): Promise<Readonly<BrooksPolicyCaseV1> | null> {
  try {
    const result = await database.query<{ readonly record: unknown }>(
      "SELECT record FROM pa_policy_cases WHERE case_hash = $1",
      [caseHash],
    );
    if (result.rows.length === 0) return null;
    if (result.rows.length !== 1) fail("INTEGRITY_VIOLATION", "Case identity is not unique");
    return parseRecord("policy_case", result.rows[0]!.record);
  } catch (error) {
    rethrow(error);
  }
}

async function getAudit(
  database: CaseStoreDatabaseV1,
  caseHash: ContractSha256,
): Promise<Readonly<CaseAuditViewV1> | null> {
  try {
    return await database.transaction(async (client) => {
      const bundle = await loadBundleByCaseHash(client, caseHash);
      if (bundle === null) return null;
      const decisionRows = await client.query<{ readonly record: unknown }>(
        `SELECT record FROM pa_brooks_decisions
         WHERE case_hash = $1 AND input_hash = $2`,
        [caseHash, bundle.policyInput.inputHash],
      );
      if (decisionRows.rows.length > 1) {
        fail("INTEGRITY_VIOLATION", "Phase 2 Case has multiple BrooksDecision records");
      }
      const decision =
        decisionRows.rows.length === 0
          ? null
          : parseDecision(decisionRows.rows[0]!.record, bundle);
      let review: CalvinReviewV1 | null = null;
      if (decision !== null) {
        const reviewRows = await client.query<{ readonly record: unknown }>(
          "SELECT record FROM pa_calvin_reviews WHERE decision_hash = $1",
          [decision.decisionHash],
        );
        if (reviewRows.rows.length > 1) {
          fail("INTEGRITY_VIOLATION", "Phase 2 BrooksDecision has multiple CalvinReview records");
        }
        if (reviewRows.rows.length === 1) {
          review = parseReview(reviewRows.rows[0]!.record, decision);
        }
      }
      return createCaseAuditView({ caseBundle: bundle, decision, review });
    });
  } catch (error) {
    rethrow(error);
  }
}

async function getChartArtifact(
  database: CaseStoreDatabaseV1,
  artifactId: ContractSha256,
): Promise<Readonly<AnonymousChartArtifactMetadataV1> | null> {
  try {
    const result = await database.query<{ readonly record: unknown }>(
      `SELECT record FROM pa_chart_artifact_metadata
       WHERE artifact_id = $1 ORDER BY metadata_id`,
      [artifactId],
    );
    if (result.rows.length === 0) return null;
    const metadata = result.rows.map((row) => parseChartMetadata(row.record));
    const first = metadata[0]!;
    if (metadata.some((item) => item.contentHash !== first.contentHash)) {
      fail("INTEGRITY_VIOLATION", "shared chart artifact identity has inconsistent bytes");
    }
    return first;
  } catch (error) {
    rethrow(error);
  }
}

async function insertChartMetadata(
  client: CaseStoreDatabaseClientV1,
  metadata: AnonymousChartArtifactMetadataV1,
): Promise<"inserted" | "existing"> {
  assertAnonymousChartArtifactMetadataIntegrity(metadata);
  const expectedCanonical = serializePersistedRecord(
    "chart_artifact_metadata",
    metadata,
  );
  return insertImmutableRecord(client, {
    insertSql: `INSERT INTO pa_chart_artifact_metadata
      (metadata_id, artifact_id, source_case_hash, anonymous_market_hash,
       panel, renderer_id, renderer_runtime, renderer_platform,
       render_input_hash, content_hash, record)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     ON CONFLICT DO NOTHING RETURNING metadata_id AS identity`,
    insertParams: [
      metadata.metadataId,
      metadata.artifactId,
      metadata.sourceCaseHash,
      metadata.anonymousMarketHash,
      metadata.panel,
      metadata.rendererId,
      metadata.rendererRuntime,
      metadata.rendererPlatform,
      metadata.renderInputHash,
      metadata.contentHash,
      expectedCanonical,
    ],
    existingSql: `SELECT metadata_id AS identity, record
      FROM pa_chart_artifact_metadata
      WHERE metadata_id = $1
         OR (source_case_hash = $2 AND panel = $3 AND render_input_hash = $4)`,
    existingParams: [
      metadata.metadataId,
      metadata.sourceCaseHash,
      metadata.panel,
      metadata.renderInputHash,
    ],
    expectedIdentity: metadata.metadataId,
    expectedCanonical,
    parseExisting: parseChartMetadata,
  });
}

async function insertCaseInputBinding(
  client: CaseStoreDatabaseClientV1,
  bundle: SyntheticCaseBundleV1,
): Promise<"inserted" | "existing"> {
  const result = await client.query<{ readonly case_hash: string }>(
    `INSERT INTO pa_case_policy_inputs
      (case_hash, input_hash,
       context_metadata_id, context_panel, context_content_hash,
       detail_metadata_id, detail_panel, detail_content_hash)
     VALUES ($1, $2, $3, 'context', $4, $5, 'detail', $6)
     ON CONFLICT DO NOTHING RETURNING case_hash`,
    [
      bundle.binding.caseHash,
      bundle.binding.inputHash,
      bundle.binding.contextMetadataId,
      bundle.policyInput.charts.context.contentHash,
      bundle.binding.detailMetadataId,
      bundle.policyInput.charts.detail.contentHash,
    ],
  );
  if (result.rows.length === 1) return "inserted";
  const existing = await client.query<{
    readonly context_metadata_id: string;
    readonly context_content_hash: string;
    readonly detail_metadata_id: string;
    readonly detail_content_hash: string;
  }>(
    `SELECT context_metadata_id, context_content_hash,
            detail_metadata_id, detail_content_hash
     FROM pa_case_policy_inputs WHERE case_hash = $1 AND input_hash = $2`,
    [bundle.binding.caseHash, bundle.binding.inputHash],
  );
  const row = existing.rows[0];
  if (
    existing.rows.length !== 1 ||
    row?.context_metadata_id !== bundle.binding.contextMetadataId ||
    row.context_content_hash !== bundle.policyInput.charts.context.contentHash ||
    row.detail_metadata_id !== bundle.binding.detailMetadataId ||
    row.detail_content_hash !== bundle.policyInput.charts.detail.contentHash
  ) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict for Case/input binding");
  }
  return "existing";
}

interface DoctrineAggregateRowV1 {
  readonly proposal_record: unknown;
  readonly approval_record: unknown | null;
  readonly retirement_record: unknown | null;
}

interface DoctrineAggregateV1 {
  readonly proposal: DoctrineProposalBundleV1;
  readonly approval: DoctrineApprovalV1 | null;
  readonly retirement: DoctrineRetirementV1 | null;
}

async function appendDoctrineProposal(
  database: CaseStoreDatabaseV1,
  proposal: DoctrineProposalBundleV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertDoctrineProposalBundleIntegrity(proposal);
    return await database.transaction(async (client) => {
      const expectedCanonical = canonicalStringify(proposal);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_doctrine_proposals
          (proposal_hash, doctrine_id, source_id, source_content_hash, record)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT DO NOTHING RETURNING proposal_hash AS identity`,
        insertParams: [
          proposal.proposalHash,
          proposal.doctrineUnit.doctrineId,
          proposal.source.sourceId,
          proposal.source.contentHash,
          expectedCanonical,
        ],
        existingSql: `SELECT proposal_hash AS identity, record
          FROM pa_doctrine_proposals
          WHERE proposal_hash = $1 OR doctrine_id = $2`,
        existingParams: [proposal.proposalHash, proposal.doctrineUnit.doctrineId],
        expectedIdentity: proposal.proposalHash,
        expectedCanonical,
        parseExisting: parseDoctrineProposal,
      });
      return mutationResult(status, proposal.proposalHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function listDoctrineWorkItems(
  database: CaseStoreDatabaseV1,
): Promise<Readonly<DoctrineWorkQueueV1>> {
  try {
    const rows = await loadDoctrineAggregates(database);
    return deepFreeze({
      schemaVersion: DOCTRINE_WORK_QUEUE_SCHEMA_VERSION,
      items: rows.map((aggregate) => {
        const item = buildDoctrineWorkItem(aggregate);
        return {
          proposalHash: item.proposal.proposalHash,
          doctrineId: item.proposal.doctrineUnit.doctrineId,
          sourceId: item.proposal.source.sourceId,
          concept: item.proposal.doctrineUnit.concept,
          status: item.status,
          approverPrincipal: item.approval?.approverPrincipal ?? null,
        };
      }),
    });
  } catch (error) {
    rethrow(error);
  }
}

async function getDoctrineWorkItem(
  database: CaseStoreDatabaseClientV1,
  doctrineId: string,
): Promise<Readonly<DoctrineWorkItemV1> | null> {
  try {
    const rows = await loadDoctrineAggregates(database, doctrineId);
    if (rows.length === 0) return null;
    if (rows.length !== 1) {
      fail("INTEGRITY_VIOLATION", "Doctrine proposal identity is not unique");
    }
    return buildDoctrineWorkItem(rows[0]!);
  } catch (error) {
    rethrow(error);
  }
}

async function approveDoctrine(
  database: CaseStoreDatabaseV1,
  doctrineId: string,
  command: ApproveDoctrineCommandV1,
  principal: DoctrineApproverPrincipalV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertApproveDoctrineCommand(command);
    return await database.transaction(async (client) => {
      const item = await getDoctrineWorkItem(client, doctrineId);
      if (item === null) fail("INTEGRITY_VIOLATION", "Doctrine proposal is required");
      if (item.proposal.proposalHash !== command.proposalHash) {
        fail("INTEGRITY_VIOLATION", "Doctrine proposal hash does not match the command");
      }
      const approval = createDoctrineApproval({
        proposalHash: item.proposal.proposalHash,
        doctrineId: item.proposal.doctrineUnit.doctrineId,
        sourceId: item.proposal.source.sourceId,
        sourceContentHash: item.proposal.source.contentHash,
        approverPrincipal: principal,
      });
      const expectedCanonical = canonicalStringify(approval);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_doctrine_approvals
          (approval_hash, proposal_hash, doctrine_id, source_id,
           source_content_hash, approver_principal, record)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT DO NOTHING RETURNING approval_hash AS identity`,
        insertParams: [
          approval.approvalHash,
          approval.proposalHash,
          approval.doctrineId,
          approval.sourceId,
          approval.sourceContentHash,
          approval.approverPrincipal,
          expectedCanonical,
        ],
        existingSql: `SELECT approval_hash AS identity, record
          FROM pa_doctrine_approvals
          WHERE approval_hash = $1 OR proposal_hash = $2 OR doctrine_id = $3`,
        existingParams: [approval.approvalHash, approval.proposalHash, approval.doctrineId],
        expectedIdentity: approval.approvalHash,
        expectedCanonical,
        parseExisting: (value) => parseDoctrineApproval(value, item.proposal),
      });
      return mutationResult(status, approval.approvalHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function retireDoctrine(
  database: CaseStoreDatabaseV1,
  doctrineId: string,
  command: RetireDoctrineCommandV1,
  principal: DoctrineApproverPrincipalV1,
): Promise<Readonly<CaseStoreMutationResultV1>> {
  try {
    assertRetireDoctrineCommand(command);
    return await database.transaction(async (client) => {
      const item = await getDoctrineWorkItem(client, doctrineId);
      if (item === null) fail("INTEGRITY_VIOLATION", "Doctrine proposal is required");
      if (item.approval === null) {
        fail("INTEGRITY_VIOLATION", "Doctrine approval is required before retirement");
      }
      if (item.approval.approvalHash !== command.approvalHash) {
        fail("INTEGRITY_VIOLATION", "Doctrine approval hash does not match the command");
      }
      const retirement = createDoctrineRetirement({
        proposalHash: item.proposal.proposalHash,
        approvalHash: item.approval.approvalHash,
        doctrineId: item.proposal.doctrineUnit.doctrineId,
        retiredByPrincipal: principal,
        reason: command.reason,
      });
      const expectedCanonical = canonicalStringify(retirement);
      const status = await insertImmutableRecord(client, {
        insertSql: `INSERT INTO pa_doctrine_retirements
          (retirement_hash, approval_hash, proposal_hash, doctrine_id,
           retired_by_principal, record)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING RETURNING retirement_hash AS identity`,
        insertParams: [
          retirement.retirementHash,
          retirement.approvalHash,
          retirement.proposalHash,
          retirement.doctrineId,
          retirement.retiredByPrincipal,
          expectedCanonical,
        ],
        existingSql: `SELECT retirement_hash AS identity, record
          FROM pa_doctrine_retirements
          WHERE retirement_hash = $1 OR approval_hash = $2
             OR proposal_hash = $3 OR doctrine_id = $4`,
        existingParams: [
          retirement.retirementHash,
          retirement.approvalHash,
          retirement.proposalHash,
          retirement.doctrineId,
        ],
        expectedIdentity: retirement.retirementHash,
        expectedCanonical,
        parseExisting: (value) =>
          parseDoctrineRetirement(value, item.proposal, item.approval!),
      });
      return mutationResult(status, retirement.retirementHash);
    });
  } catch (error) {
    rethrow(error);
  }
}

async function listApprovedDoctrineUnits(
  database: CaseStoreDatabaseClientV1,
): Promise<readonly Readonly<DoctrineUnitV1>[]> {
  try {
    const rows = await loadDoctrineAggregates(database);
    return deepFreeze(
      rows.flatMap((aggregate) =>
        aggregate.approval !== null && aggregate.retirement === null
          ? [toApprovedDoctrineUnit(aggregate.proposal, aggregate.approval)]
          : [],
      ),
    );
  } catch (error) {
    rethrow(error);
  }
}

async function loadDoctrineAggregates(
  database: CaseStoreDatabaseClientV1,
  doctrineId?: string,
): Promise<readonly DoctrineAggregateV1[]> {
  const result = await database.query<DoctrineAggregateRowV1>(
    `SELECT proposal.record AS proposal_record,
            approval.record AS approval_record,
            retirement.record AS retirement_record
     FROM pa_doctrine_proposals AS proposal
     LEFT JOIN pa_doctrine_approvals AS approval
       ON approval.proposal_hash = proposal.proposal_hash
     LEFT JOIN pa_doctrine_retirements AS retirement
       ON retirement.approval_hash = approval.approval_hash
     ${doctrineId === undefined ? "" : "WHERE proposal.doctrine_id = $1"}
     ORDER BY proposal.doctrine_id COLLATE "C"`,
    doctrineId === undefined ? [] : [doctrineId],
  );
  return result.rows.map((row) => {
    const proposal = parseDoctrineProposal(row.proposal_record);
    const approval =
      row.approval_record === null
        ? null
        : parseDoctrineApproval(row.approval_record, proposal);
    const retirement =
      row.retirement_record === null
        ? null
        : approval === null
          ? fail("INTEGRITY_VIOLATION", "Doctrine retirement is missing its approval")
          : parseDoctrineRetirement(row.retirement_record, proposal, approval);
    deriveDoctrineStatus(proposal, approval, retirement);
    return { proposal, approval, retirement };
  });
}

function buildDoctrineWorkItem(
  aggregate: DoctrineAggregateV1,
): Readonly<DoctrineWorkItemV1> {
  return deepFreeze({
    schemaVersion: DOCTRINE_WORK_ITEM_SCHEMA_VERSION,
    proposal: aggregate.proposal,
    status: deriveDoctrineStatus(
      aggregate.proposal,
      aggregate.approval,
      aggregate.retirement,
    ),
    approval: aggregate.approval,
    retirement: aggregate.retirement,
  });
}

function parseDoctrineProposal(value: unknown): DoctrineProposalBundleV1 {
  const proposal = materialize<DoctrineProposalBundleV1>(value);
  assertDoctrineProposalBundleIntegrity(proposal);
  return deepFreeze(proposal);
}

function parseDoctrineApproval(
  value: unknown,
  proposal: DoctrineProposalBundleV1,
): DoctrineApprovalV1 {
  const approval = materialize<DoctrineApprovalV1>(value);
  assertDoctrineApprovalIntegrity(approval, proposal);
  return deepFreeze(approval);
}

function parseDoctrineRetirement(
  value: unknown,
  proposal: DoctrineProposalBundleV1,
  approval: DoctrineApprovalV1,
): DoctrineRetirementV1 {
  const retirement = materialize<DoctrineRetirementV1>(value);
  assertDoctrineRetirementIntegrity(retirement, proposal, approval);
  return deepFreeze(retirement);
}

interface ImmutableInsertV1<T> {
  readonly insertSql: string;
  readonly insertParams: readonly unknown[];
  readonly existingSql: string;
  readonly existingParams: readonly unknown[];
  readonly expectedIdentity: string;
  readonly expectedCanonical: string;
  readonly parseExisting: (value: unknown) => T;
}

async function insertImmutableRecord<T>(
  client: CaseStoreDatabaseClientV1,
  input: ImmutableInsertV1<T>,
): Promise<"inserted" | "existing"> {
  const inserted = await client.query<{ readonly identity: string }>(
    input.insertSql,
    input.insertParams,
  );
  if (inserted.rows.length === 1) return "inserted";
  const existing = await client.query<{
    readonly identity: string;
    readonly record: unknown;
  }>(input.existingSql, input.existingParams);
  if (existing.rows.length !== 1) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict has no exact stored record");
  }
  const row = existing.rows[0]!;
  const parsed = input.parseExisting(row.record);
  if (
    row.identity !== input.expectedIdentity ||
    canonicalStringify(parsed) !== input.expectedCanonical
  ) {
    fail("IDENTITY_CONFLICT", "immutable identity conflict names different content");
  }
  return "existing";
}

interface BundleRowV1 {
  readonly case_record: unknown;
  readonly input_record: unknown;
  readonly context_record: unknown;
  readonly detail_record: unknown;
}

export async function loadBundleByCaseHash(
  client: CaseStoreDatabaseClientV1,
  caseHash: ContractSha256,
): Promise<SyntheticCaseBundleV1 | null> {
  return loadBundle(client, "c.case_hash = $1", [caseHash]);
}

async function loadBundleByCaseIdAndInput(
  client: CaseStoreDatabaseClientV1,
  caseId: string,
  inputHash: ContractSha256,
): Promise<SyntheticCaseBundleV1 | null> {
  return loadBundle(client, "c.case_id = $1 AND i.input_hash = $2", [caseId, inputHash]);
}

async function loadBundle(
  client: CaseStoreDatabaseClientV1,
  predicate: string,
  params: readonly unknown[],
): Promise<SyntheticCaseBundleV1 | null> {
  const result = await client.query<BundleRowV1>(
    `SELECT c.record AS case_record, i.record AS input_record,
            context.record AS context_record, detail.record AS detail_record
     FROM pa_policy_cases AS c
     JOIN pa_case_policy_inputs AS binding ON binding.case_hash = c.case_hash
     JOIN pa_policy_inputs AS i ON i.input_hash = binding.input_hash
     JOIN pa_chart_artifact_metadata AS context
       ON context.metadata_id = binding.context_metadata_id
     JOIN pa_chart_artifact_metadata AS detail
       ON detail.metadata_id = binding.detail_metadata_id
     WHERE ${predicate}`,
    params,
  );
  if (result.rows.length === 0) return null;
  if (result.rows.length !== 1) {
    fail("INTEGRITY_VIOLATION", "Phase 2 CaseBundle binding is not unique");
  }
  const row = result.rows[0]!;
  const policyCase = parseRecord("policy_case", row.case_record);
  const policyInput = parseRecord("policy_input", row.input_record);
  const context = parseChartMetadata(row.context_record);
  const detail = parseChartMetadata(row.detail_record);
  return createSyntheticCaseBundle({
    sourceScope: "synthetic_fixture_only",
    policyCase,
    policyInput,
    chartMetadata: { context, detail },
    binding: {
      caseHash: policyCase.caseHash,
      inputHash: policyInput.inputHash,
      contextMetadataId: context.metadataId,
      detailMetadataId: detail.metadataId,
    },
  });
}

async function loadDecisionByIdentity(
  client: CaseStoreDatabaseClientV1,
  decisionHash: ContractSha256,
  decisionId: string,
): Promise<{
  readonly decision: BrooksDecisionV1;
  readonly bundle: SyntheticCaseBundleV1;
} | null> {
  const identity = await client.query<{
    readonly case_hash: ContractSha256;
    readonly input_hash: ContractSha256;
    readonly record: unknown;
  }>(
    `SELECT case_hash, input_hash, record FROM pa_brooks_decisions
     WHERE decision_hash = $1 AND decision_id = $2`,
    [decisionHash, decisionId],
  );
  if (identity.rows.length === 0) return null;
  if (identity.rows.length !== 1) fail("INTEGRITY_VIOLATION", "BrooksDecision identity is not unique");
  const row = identity.rows[0]!;
  const bundle = await loadBundleByCaseHash(client, row.case_hash);
  if (bundle === null || bundle.policyInput.inputHash !== row.input_hash) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision parent binding is incomplete");
  }
  return { decision: parseDecision(row.record, bundle), bundle };
}

interface ReviewAggregateV1 {
  readonly bundle: SyntheticCaseBundleV1;
  readonly decision: BrooksDecisionV1;
  readonly assessment: CalvinIndependentAssessmentV1 | null;
  readonly receipt: DecisionRevealReceiptV1 | null;
  readonly review: CalvinReviewV1 | null;
  readonly binding: CalvinReviewWorkflowBindingV1 | null;
}

async function requireReviewAggregate(
  client: CaseStoreDatabaseClientV1,
  caseHash: ContractSha256,
): Promise<ReviewAggregateV1> {
  const aggregate = await loadReviewAggregate(client, caseHash);
  if (aggregate === null) {
    fail("INTEGRITY_VIOLATION", "synthetic CaseBundle and BrooksDecision are required");
  }
  deriveReviewState(aggregate);
  return aggregate;
}

async function loadReviewAggregate(
  client: CaseStoreDatabaseClientV1,
  caseHash: ContractSha256,
): Promise<ReviewAggregateV1 | null> {
  const bundle = await loadBundleByCaseHash(client, caseHash);
  if (bundle === null) return null;
  const decisionRows = await client.query<{ readonly record: unknown }>(
    `SELECT record FROM pa_brooks_decisions
     WHERE case_hash = $1 AND input_hash = $2`,
    [caseHash, bundle.policyInput.inputHash],
  );
  if (decisionRows.rows.length === 0) return null;
  if (decisionRows.rows.length !== 1) {
    fail("INTEGRITY_VIOLATION", "review Case has multiple BrooksDecision records");
  }
  const decision = parseDecision(decisionRows.rows[0]!.record, bundle);
  const assessmentRows = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_calvin_independent_assessments WHERE decision_hash = $1",
    [decision.decisionHash],
  );
  if (assessmentRows.rows.length > 1) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision has multiple independent assessments");
  }
  const assessment =
    assessmentRows.rows.length === 0
      ? null
      : parseAssessment(assessmentRows.rows[0]!.record);
  const receiptRows = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_decision_reveal_receipts WHERE decision_hash = $1",
    [decision.decisionHash],
  );
  if (receiptRows.rows.length > 1) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision has multiple reveal receipts");
  }
  const receipt =
    receiptRows.rows.length === 0
      ? null
      : assessment === null
        ? fail("INTEGRITY_VIOLATION", "reveal receipt is missing its assessment")
        : parseReceipt(receiptRows.rows[0]!.record, assessment);
  const reviewRows = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_calvin_reviews WHERE decision_hash = $1",
    [decision.decisionHash],
  );
  if (reviewRows.rows.length > 1) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision has multiple CalvinReview records");
  }
  const review =
    reviewRows.rows.length === 0
      ? null
      : parseReview(reviewRows.rows[0]!.record, decision);
  const bindingRows = await client.query<{ readonly record: unknown }>(
    "SELECT record FROM pa_calvin_review_workflow_bindings WHERE decision_hash = $1",
    [decision.decisionHash],
  );
  if (bindingRows.rows.length > 1) {
    fail("INTEGRITY_VIOLATION", "BrooksDecision has multiple workflow bindings");
  }
  const binding =
    bindingRows.rows.length === 0
      ? null
      : assessment === null || receipt === null || review === null
        ? fail("INTEGRITY_VIOLATION", "workflow binding is missing an immutable parent")
        : parseWorkflowBinding(bindingRows.rows[0]!.record, assessment, receipt, review);
  return { bundle, decision, assessment, receipt, review, binding };
}

function deriveReviewState(
  aggregate: ReviewAggregateV1,
): ReviewWorkItemDetailV1["state"] {
  if (aggregate.assessment === null) {
    if (
      aggregate.receipt !== null ||
      aggregate.review !== null ||
      aggregate.binding !== null
    ) {
      fail("INTEGRITY_VIOLATION", "review workflow evidence begins without assessment");
    }
    return "awaiting_assessment";
  }
  if (aggregate.receipt === null) {
    if (aggregate.review !== null || aggregate.binding !== null) {
      fail("INTEGRITY_VIOLATION", "review workflow evidence skips reveal receipt");
    }
    return "awaiting_reveal";
  }
  if (aggregate.review === null && aggregate.binding === null) {
    return "awaiting_final_review";
  }
  if (aggregate.review !== null && aggregate.binding !== null) {
    return "completed";
  }
  fail("INTEGRITY_VIOLATION", "final review and workflow binding must be complete");
}

function buildReviewWorkItem(
  aggregate: ReviewAggregateV1,
): Readonly<ReviewWorkItemDetailV1> {
  const state = deriveReviewState(aggregate);
  const revealed = aggregate.receipt !== null;
  const completed = state === "completed";
  return deepFreeze({
    schemaVersion: REVIEW_WORK_ITEM_DETAIL_SCHEMA_VERSION,
    sourceScope: "synthetic_fixture_only",
    caseHash: aggregate.bundle.policyCase.caseHash,
    anonymousId: anonymousCaseId(aggregate.bundle.policyCase.caseHash),
    draftIdentityHash: reviewDraftIdentity(aggregate),
    state,
    market: aggregate.bundle.policyInput.market,
    charts: {
      context: toBlindReviewChart(aggregate.bundle.chartMetadata.context),
      detail: toBlindReviewChart(aggregate.bundle.chartMetadata.detail),
    },
    assessment:
      aggregate.assessment === null
        ? null
        : toFrozenAssessmentView(aggregate.assessment),
    decision: revealed ? aggregate.decision : null,
    revealReceipt: revealed ? aggregate.receipt : null,
    review: completed ? aggregate.review : null,
    workflowBinding: completed ? aggregate.binding : null,
    decisionConflict:
      completed && aggregate.review !== null
        ? deriveDecisionConflict(aggregate.decision, aggregate.review)
        : null,
  });
}

function reviewDraftIdentity(aggregate: ReviewAggregateV1): ContractSha256 {
  return canonicalHash({
    protocolVersion: CALVIN_REVIEW_WORKFLOW_PROTOCOL_VERSION,
    caseHash: aggregate.bundle.policyCase.caseHash,
    inputHash: aggregate.bundle.policyInput.inputHash,
    brooksDecisionHash: aggregate.decision.decisionHash,
  });
}

function anonymousCaseId(caseHash: ContractSha256): string {
  return `case-${caseHash.slice("sha256:".length, "sha256:".length + 10)}`;
}

function deterministicId(prefix: string, hash: ContractSha256): string {
  return `${prefix}:${hash.slice("sha256:".length)}`;
}

function parseAssessment(value: unknown): CalvinIndependentAssessmentV1 {
  const assessment = materialize<CalvinIndependentAssessmentV1>(value);
  assertCalvinIndependentAssessmentIntegrity(assessment);
  return deepFreeze(assessment);
}

function parseReceipt(
  value: unknown,
  assessment: CalvinIndependentAssessmentV1,
): DecisionRevealReceiptV1 {
  const receipt = materialize<DecisionRevealReceiptV1>(value);
  assertDecisionRevealReceiptIntegrity(receipt, assessment);
  return deepFreeze(receipt);
}

function parseWorkflowBinding(
  value: unknown,
  assessment: CalvinIndependentAssessmentV1,
  receipt: DecisionRevealReceiptV1,
  review: CalvinReviewV1,
): CalvinReviewWorkflowBindingV1 {
  const binding = materialize<CalvinReviewWorkflowBindingV1>(value);
  assertCalvinReviewWorkflowBindingIntegrity(binding, assessment, receipt, {
    reviewId: review.reviewId,
    reviewHash: review.reviewHash,
    decisionId: review.brooksDecisionId,
    decisionHash: review.reviewedDecisionHash,
  });
  return deepFreeze(binding);
}

function parseRecord<K extends "policy_case" | "policy_input">(
  kind: K,
  value: unknown,
) {
  return parsePersistedRecordJson(kind, jsonText(value));
}

function parseChartMetadata(value: unknown): AnonymousChartArtifactMetadataV1 {
  return parsePersistedRecordJson("chart_artifact_metadata", jsonText(value));
}

function parseDecision(
  value: unknown,
  bundle: SyntheticCaseBundleV1,
): BrooksDecisionV1 {
  const decision = materialize<BrooksDecisionV1>(value);
  assertBrooksDecisionIntegrity(decision, decisionBinding(bundle));
  return deepFreeze(decision);
}

function parseReview(
  value: unknown,
  decision: BrooksDecisionV1,
): CalvinReviewV1 {
  const review = materialize<CalvinReviewV1>(value);
  assertCalvinReviewIntegrity(review, decision);
  return deepFreeze(review);
}

function materialize<T>(value: unknown): T {
  return JSON.parse(jsonText(value)) as T;
}

function jsonText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function decisionBinding(bundle: SyntheticCaseBundleV1) {
  return {
    caseId: bundle.policyCase.caseId,
    inputHash: bundle.policyInput.inputHash,
    lastVisibleBarId: bundle.policyInput.market.lastVisibleBarId,
    barDurationSeconds: bundle.policyCase.barDurationSeconds,
  } as const;
}

function mutationResult(
  status: "inserted" | "existing",
  resourceHash: ContractSha256,
): Readonly<CaseStoreMutationResultV1> {
  return deepFreeze({ status, resourceHash });
}

async function queryPg<T>(
  client: Pool | PoolClient,
  sql: string,
  params: readonly unknown[] = [],
): Promise<{ readonly rows: readonly T[] }> {
  const result = await client.query(
    sql,
    params as unknown[],
  );
  return { rows: result.rows as unknown as readonly T[] };
}

function fail(code: CaseStoreErrorCodeV1, message: string): never {
  throw new CaseStoreError(code, message);
}

function rethrow(error: unknown): never {
  if (error instanceof CaseStoreError) throw error;
  if (
    error instanceof DoctrineApprovalContractError ||
    error instanceof DoctrineContractError
  ) {
    throw new CaseStoreError("INTEGRITY_VIOLATION", error.message, {
      cause: error,
    });
  }
  if (error instanceof Error) {
    const code = /conflict|unique constraint/i.test(error.message)
      ? "IDENTITY_CONFLICT"
      : /missing|invalid|unsupported|match|binding/i.test(error.message)
        ? "INTEGRITY_VIOLATION"
        : "DEPENDENCY_UNAVAILABLE";
    throw new CaseStoreError(code, error.message, { cause: error });
  }
  throw new CaseStoreError("DEPENDENCY_UNAVAILABLE", "Case Store operation failed");
}
