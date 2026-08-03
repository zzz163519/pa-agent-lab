import { resolve } from "node:path";

import {
  BROOKS_CONTEXT_BAR_COUNT,
  BROOKS_DETAIL_BAR_COUNT,
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
} from "@pa-agent-lab/contracts";
import {
  CASE_API_BODY_LIMIT_BYTES,
  CASE_API_ROUTE_MANIFEST_V1,
} from "../src/case-store-transport-v1.ts";
import { DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1 } from "../src/doctrine-approval-transport-v1.ts";
import { DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1 } from "../src/doctrine-retrieval-transport-v1.ts";
import { PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1 } from "../src/policy-assembly-transport-v1.ts";
import { REVIEW_WORKFLOW_ROUTE_MANIFEST_V1 } from "../src/review-workflow-transport-v1.ts";
import { createGenerator } from "ts-json-schema-generator";

const TRUSTED_LOOPBACK_REVIEWER_EXTENSION = {
  defaultMode: "bearer",
  localDeploymentMode: "trusted_loopback",
  principal: "local:calvin-reviewer",
  authority:
    "repository_owned_loopback_gateway_only_not_public_authentication",
} as const;

const PERSISTED_TARGETS = [
  {
    kind: "policy_case",
    component: "BrooksPolicyCaseV1",
    source: "../contracts/src/policy-input-v1.ts",
  },
  {
    kind: "policy_input",
    component: "BrooksPolicyInputV1",
    source: "../contracts/src/policy-input-v1.ts",
  },
  {
    kind: "chart_artifact_metadata",
    component: "AnonymousChartArtifactMetadataV1",
    source: "src/chart-artifact-metadata-v1.ts",
  },
  {
    kind: "model_run",
    component: "ModelRunRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
  {
    kind: "provider_attempt",
    component: "ProviderAttemptRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
  {
    kind: "model_run_audit",
    component: "ModelRunAuditRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
] as const;

const REPLAY_TARGETS = [
  {
    component: "ReplayRequestV1",
    source: "../contracts/src/replay-boundary-v1.ts",
  },
  {
    component: "ReplayResultV1",
    source: "../contracts/src/replay-boundary-v1.ts",
  },
] as const;

const CASE_STORE_TARGETS = [
  {
    component: "SyntheticCaseBundleV1",
    source: "src/case-store-transport-v1.ts",
  },
  {
    component: "CaseAuditViewV1",
    source: "src/case-store-transport-v1.ts",
  },
  {
    component: "CaseApiMutationResultV1",
    source: "src/case-store-transport-v1.ts",
  },
  {
    component: "CaseApiErrorV1",
    source: "src/case-store-transport-v1.ts",
  },
  {
    component: "BrooksDecisionV1",
    source: "../contracts/src/brooks-decision-v1.ts",
  },
  {
    component: "CalvinReviewV1",
    source: "../contracts/src/calvin-review-v1.ts",
  },
] as const;

const REVIEW_WORKFLOW_TARGETS = [
  {
    component: "CalvinIndependentAssessmentV1",
    source: "../contracts/src/calvin-review-workflow-v1.ts",
  },
  {
    component: "DecisionRevealReceiptV1",
    source: "../contracts/src/calvin-review-workflow-v1.ts",
  },
  {
    component: "CalvinReviewWorkflowBindingV1",
    source: "../contracts/src/calvin-review-workflow-v1.ts",
  },
  {
    component: "ReviewWorkQueueV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "ReviewWorkItemDetailV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "SubmitIndependentAssessmentCommandV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "RevealDecisionCommandV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "SubmitFinalReviewCommandV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "ReviewWorkflowMutationResultV1",
    source: "src/review-workflow-transport-v1.ts",
  },
  {
    component: "CaseApiErrorV1",
    source: "src/case-store-transport-v1.ts",
  },
] as const;

const DOCTRINE_RETRIEVAL_TARGETS = [
  { component: "DoctrineCorpusEntryV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineCorpusSnapshotV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineRetrievalProfileV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineIngestionRunV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineRetrievalQualitySuiteV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineRetrievalQualityReportV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineCorpusActivationV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineActivationAuthorityV1", source: "../contracts/src/doctrine-corpus-rollback-v1.ts" },
  { component: "DoctrineRetrievalQueryV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineRetrievalEvidenceV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineRetrievalResponseV1", source: "../contracts/src/doctrine-retrieval-v1.ts" },
  { component: "DoctrineIngestionCommandV1", source: "src/doctrine-retrieval-transport-v1.ts" },
  { component: "DoctrineActivationCommandV1", source: "src/doctrine-retrieval-transport-v1.ts" },
  { component: "DoctrineRetrievalQueryCommandV1", source: "src/doctrine-retrieval-transport-v1.ts" },
  { component: "DoctrineRetrievalMutationResultV1", source: "src/doctrine-retrieval-transport-v1.ts" },
  { component: "CaseApiErrorV1", source: "src/case-store-transport-v1.ts" },
] as const;
const PHASE5A_POLICY_ASSEMBLY_TARGETS = [
  {
    component: "DoctrineCorpusRollbackCommandV1",
    source: "src/policy-assembly-transport-v1.ts",
  },
  {
    component: "CreatePolicyAssemblyCommandV1",
    source: "src/policy-assembly-transport-v1.ts",
  },
  {
    component: "PolicyAssemblyV1",
    source: "../contracts/src/policy-assembly-v1.ts",
  },
  {
    component: "PolicyAssemblyFailureV1",
    source: "../contracts/src/policy-assembly-v1.ts",
  },
  {
    component: "PolicyAssemblyTerminalV1",
    source: "src/policy-assembly-transport-v1.ts",
  },
  {
    component: "DoctrineCorpusActivationV1",
    source: "../contracts/src/doctrine-retrieval-v1.ts",
  },
  {
    component: "DoctrineCorpusRollbackActivationV1",
    source: "../contracts/src/doctrine-corpus-rollback-v1.ts",
  },
  {
    component: "DoctrineActivationAuthorityV1",
    source: "../contracts/src/doctrine-corpus-rollback-v1.ts",
  },
  {
    component: "CaseApiErrorV1",
    source: "src/case-store-transport-v1.ts",
  },
] as const;

const DOCTRINE_APPROVAL_TARGETS = [
  {
    component: "DoctrineProposalBundleV1",
    source: "../contracts/src/doctrine-approval-v1.ts",
  },
  {
    component: "DoctrineApprovalV1",
    source: "../contracts/src/doctrine-approval-v1.ts",
  },
  {
    component: "DoctrineRetirementV1",
    source: "../contracts/src/doctrine-approval-v1.ts",
  },
  {
    component: "DoctrineWorkQueueV1",
    source: "src/doctrine-approval-transport-v1.ts",
  },
  {
    component: "DoctrineWorkItemV1",
    source: "src/doctrine-approval-transport-v1.ts",
  },
  {
    component: "ApproveDoctrineCommandV1",
    source: "src/doctrine-approval-transport-v1.ts",
  },
  {
    component: "RetireDoctrineCommandV1",
    source: "src/doctrine-approval-transport-v1.ts",
  },
  {
    component: "DoctrineApprovalMutationResultV1",
    source: "src/doctrine-approval-transport-v1.ts",
  },
  {
    component: "CaseApiErrorV1",
    source: "src/case-store-transport-v1.ts",
  },
] as const;

interface SchemaTargetV1 {
  readonly component: string;
  readonly source: string;
}

interface SchemaDocumentMetadataV1 {
  readonly schemaId: string;
  readonly title: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

export interface GeneratedTransportDocumentsV1 {
  readonly schemaBundle: Readonly<Record<string, unknown>>;
  readonly openapi: Readonly<Record<string, unknown>>;
}

export function buildTransportSchemaDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const recordKinds = Object.fromEntries(
    PERSISTED_TARGETS.map((target) => [target.kind, target.component]),
  );
  return buildSchemaDocuments(packageRoot, PERSISTED_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/phase1-persisted-records-v1",
    title: "PA Agent Lab Phase 1 Persisted Record Schemas",
    extensions: {
      "x-pa-record-kinds": recordKinds,
      "x-pa-runtime-authority":
        "research_only_no_provider_or_trading_authority",
    },
  });
}

export function buildReplayBoundaryTransportDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  return buildSchemaDocuments(packageRoot, REPLAY_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/replay-boundary-v1",
    title: "PA Agent Lab Replay Boundary V1 Schemas",
    extensions: {
      "x-pa-replay-components": REPLAY_TARGETS.map(
        (target) => target.component,
      ),
      "x-pa-runtime-authority":
        "research_only_no_replay_engine_or_trading_authority",
    },
  });
}

export function buildCaseStoreTransportDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const documents = buildSchemaDocuments(packageRoot, CASE_STORE_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/phase2-case-store-v1",
    title: "PA Agent Lab Phase 2 Case Store V1",
    extensions: {
      "x-pa-phase2-record-kinds": {
        brooks_decision: "BrooksDecisionV1",
        calvin_review: "CalvinReviewV1",
      },
      "x-pa-body-limit-bytes": CASE_API_BODY_LIMIT_BYTES,
      "x-pa-synthetic-authorization": "exact_bundle_hash_allowlist",
      "x-pa-reviewer-authentication": TRUSTED_LOOPBACK_REVIEWER_EXTENSION,
      "x-pa-runtime-authority":
        "synthetic_only_local_case_store_no_model_or_trading_authority",
    },
  });
  const openapi = asRecord(documents.openapi);
  const components = asRecord(openapi.components);
  return {
    schemaBundle: documents.schemaBundle,
    openapi: {
      ...openapi,
      paths: buildCaseStoreOpenApiPaths(),
      components: {
        ...components,
        securitySchemes: {
          operatorToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Operator-Token",
          },
          reviewerToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Reviewer-Token",
          },
        },
      },
      "x-pa-route-manifest": CASE_API_ROUTE_MANIFEST_V1,
    },
  };
}

export function buildDoctrineApprovalTransportDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const documents = buildSchemaDocuments(packageRoot, DOCTRINE_APPROVAL_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/phase3b-doctrine-approval-v1",
    title: "PA Agent Lab Phase 3B Doctrine Approval V1",
    extensions: {
      "x-pa-phase3b-record-kinds": {
        doctrine_proposal: "DoctrineProposalBundleV1",
        doctrine_approval: "DoctrineApprovalV1",
        doctrine_retirement: "DoctrineRetirementV1",
      },
      "x-pa-reviewer-authentication": TRUSTED_LOOPBACK_REVIEWER_EXTENSION,
      "x-pa-runtime-authority":
        "local_public_source_approval_no_rag_model_replay_or_trading_authority",
    },
  }, refineDoctrineApprovalComponents);
  const openapi = asRecord(documents.openapi);
  const components = asRecord(openapi.components);
  return {
    schemaBundle: documents.schemaBundle,
    openapi: {
      ...openapi,
      paths: buildDoctrineApprovalOpenApiPaths(),
      components: {
        ...components,
        securitySchemes: {
          operatorToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Operator-Token",
          },
          reviewerToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Reviewer-Token",
          },
        },
      },
      "x-pa-route-manifest": DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1,
    },
  };
}

function buildDoctrineApprovalOpenApiPaths(): Record<string, unknown> {
  const entries: Record<string, Record<string, unknown>> = {};
  for (const route of DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1) {
    const path = entries[route.openapiPath] ?? {};
    path[route.method.toLowerCase()] = {
      operationId: route.operationId,
      security:
        route.authentication === "operator_token"
          ? [{ operatorToken: [] }]
          : [{ operatorToken: [] }, { reviewerToken: [] }],
      ...buildDoctrineApprovalOperation(route.operationId),
    };
    entries[route.openapiPath] = path;
  }
  return entries;
}

function buildDoctrineApprovalOperation(operationId: string): Record<string, unknown> {
  const errorResponse = {
    description: "Rejected by the local Phase 3B Doctrine approval contract",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CaseApiErrorV1" },
      },
    },
  };
  const errors = Object.fromEntries(
    ["400", "401", "403", "404", "409", "413", "422", "503"].map(
      (status) => [status, errorResponse],
    ),
  );
  if (operationId === "appendDoctrineProposal") {
    return doctrineMutationOperation("DoctrineProposalBundleV1", errors);
  }
  if (operationId === "listDoctrineProposals") {
    return { responses: { "200": jsonResponse("DoctrineWorkQueueV1", "Doctrine proposal queue"), ...errors } };
  }
  if (operationId === "getDoctrineProposal") {
    return {
      parameters: [doctrineIdParameter()],
      responses: { "200": jsonResponse("DoctrineWorkItemV1", "Doctrine proposal detail"), ...errors },
    };
  }
  const command =
    operationId === "approveDoctrineProposal"
      ? "ApproveDoctrineCommandV1"
      : "RetireDoctrineCommandV1";
  return {
    parameters: [doctrineIdParameter()],
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${command}` } },
      },
    },
    responses: {
      "200": jsonResponse("DoctrineApprovalMutationResultV1", "Immutable lifecycle record already exists"),
      "201": jsonResponse("DoctrineApprovalMutationResultV1", "Immutable lifecycle record inserted"),
      ...errors,
    },
  };
}

function doctrineMutationOperation(
  component: string,
  errors: Record<string, unknown>,
): Record<string, unknown> {
  return {
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${component}` } },
      },
    },
    responses: {
      "200": jsonResponse("DoctrineApprovalMutationResultV1", "Exact proposal already exists"),
      "201": jsonResponse("DoctrineApprovalMutationResultV1", "Proposal inserted"),
      ...errors,
    },
  };
}

function doctrineIdParameter(): Record<string, unknown> {
  return {
    name: "doctrineId",
    in: "path",
    required: true,
    schema: { type: "string", minLength: 1, maxLength: 200 },
  };
}

export function buildDoctrineRetrievalTransportDocumentsV1(packageRoot: string): GeneratedTransportDocumentsV1 {
  const documents = buildSchemaDocuments(packageRoot, DOCTRINE_RETRIEVAL_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/phase4a-doctrine-retrieval-v1",
    title: "PA Agent Lab Phase 4A Doctrine Retrieval V1",
    extensions: {
      "x-pa-phase4a-record-kinds": {
        doctrine_corpus_entry: "DoctrineCorpusEntryV1",
        doctrine_corpus_snapshot: "DoctrineCorpusSnapshotV1",
        doctrine_retrieval_profile: "DoctrineRetrievalProfileV1",
        doctrine_ingestion_run: "DoctrineIngestionRunV1",
        doctrine_retrieval_quality_suite: "DoctrineRetrievalQualitySuiteV1",
        doctrine_retrieval_quality_report: "DoctrineRetrievalQualityReportV1",
        doctrine_corpus_activation: "DoctrineCorpusActivationV1",
        doctrine_retrieval_query: "DoctrineRetrievalQueryV1",
        doctrine_retrieval_evidence: "DoctrineRetrievalEvidenceV1",
      },
      "x-pa-route-manifest": DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1,
      "x-pa-runtime-authority": "local_operator_lexical_retrieval_no_model_vector_or_trading_authority",
    },
  });
  const openapi = asRecord(documents.openapi);
  const components = asRecord(openapi.components);
  return { schemaBundle: documents.schemaBundle, openapi: { ...openapi, paths: buildDoctrineRetrievalOpenApiPaths(), components: { ...components, securitySchemes: { operatorToken: { type: "http", scheme: "bearer", bearerFormat: "PA-Local-Operator-Token" } } } } };
}
function buildDoctrineRetrievalOpenApiPaths(): Record<string, unknown> {
  return Object.fromEntries(
    DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1.map((route) => {
      const errors = Object.fromEntries(
        ["400", "401", "403", "404", "409", "422", "503"].map((status) => [status, { description: "Rejected by the Phase 4A contract", content: { "application/json": { schema: { $ref: "#/components/schemas/CaseApiErrorV1" } } } }]),
      );
      const responseComponent =
        route.operationId === "createDoctrineIngestionRun" || route.operationId === "getDoctrineIngestionRun"
          ? "DoctrineIngestionRunV1"
          : route.operationId === "getDoctrineCorpusSnapshot"
            ? "DoctrineCorpusSnapshotV1"
            : route.operationId === "createDoctrineCorpusActivation"
              ? "DoctrineCorpusActivationV1"
              : route.operationId === "getCurrentDoctrineActivation"
                ? "DoctrineActivationAuthorityV1"
                : route.operationId === "createDoctrineRetrievalQuery"
                ? "DoctrineRetrievalResponseV1"
                : "DoctrineRetrievalEvidenceV1";
      const requestComponent =
        route.operationId === "createDoctrineIngestionRun"
          ? "DoctrineIngestionCommandV1"
          : route.operationId === "createDoctrineCorpusActivation"
            ? "DoctrineActivationCommandV1"
            : route.operationId === "createDoctrineRetrievalQuery"
              ? "DoctrineRetrievalQueryCommandV1"
              : null;
      const parameterName = route.openapiPath.includes("{snapshotId}")
        ? "snapshotId"
        : route.openapiPath.includes("{runId}")
          ? "runId"
          : route.openapiPath.includes("{evidenceId}")
            ? "evidenceId"
            : null;
      const mutationOperation =
        route.operationId === "createDoctrineIngestionRun" ||
        route.operationId === "createDoctrineCorpusActivation";
      const successResponses = mutationOperation
        ? {
            "200": jsonResponse(responseComponent, "Existing Phase 4A Doctrine retrieval resource"),
            "201": jsonResponse(responseComponent, "Inserted Phase 4A Doctrine retrieval resource"),
          }
        : {
            "200": jsonResponse(responseComponent, "Phase 4A Doctrine retrieval response"),
          };
      const operation = {
        operationId: route.operationId,
        security: [{ operatorToken: [] }],
        ...(parameterName === null ? {} : { parameters: [pathHashParameter(parameterName)] }),
        ...(requestComponent === null ? {} : { requestBody: { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${requestComponent}` } } } } }),
        responses: {
          ...successResponses,
          ...errors,
        },
      };
      return [route.openapiPath, { [route.method.toLowerCase()]: operation }];
    }),
  );
}
export function buildPhase5APolicyAssemblyTransportDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const documents = buildSchemaDocuments(
    packageRoot,
    PHASE5A_POLICY_ASSEMBLY_TARGETS,
    {
      schemaId:
        "https://pa-agent-lab.local/schemas/phase5a-synthetic-policy-assembly-v1",
      title: "PA Agent Lab Phase 5A Synthetic Policy Assembly V1",
      extensions: {
        "x-pa-phase5a-record-kinds": {
          doctrine_corpus_rollback_activation:
            "DoctrineCorpusRollbackActivationV1",
          policy_assembly: "PolicyAssemblyV1",
          policy_assembly_failure: "PolicyAssemblyFailureV1",
        },
        "x-pa-route-manifest": PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1,
        "x-pa-runtime-authority":
          "synthetic_only_local_policy_assembly_no_remote_calls_replay_or_trading_authority",
      },
    },
    refinePhase5APolicyAssemblyComponents,
  );
  const openapi = asRecord(documents.openapi);
  const components = asRecord(openapi.components);
  return {
    schemaBundle: documents.schemaBundle,
    openapi: {
      ...openapi,
      paths: buildPhase5APolicyAssemblyOpenApiPaths(),
      components: {
        ...components,
        securitySchemes: {
          operatorToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Operator-Token",
          },
        },
      },
    },
  };
}

function refinePhase5APolicyAssemblyComponents(
  components: Record<string, unknown>,
): void {
  const command = asRecord(components.DoctrineCorpusRollbackCommandV1);
  const commandProperties = asRecord(command.properties);
  Object.assign(asRecord(commandProperties.reason), {
    minLength: 1,
    maxLength: 500,
    pattern: "^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$",
  });
  for (const componentName of [
    "DoctrineCorpusActivationV1",
    "DoctrineCorpusRollbackActivationV1",
  ]) {
    const component = asRecord(components[componentName]);
    const properties = asRecord(component.properties);
    Object.assign(asRecord(properties.activationSequence), {
      type: "integer",
      minimum: 1,
    });
  }
  const rollback = asRecord(components.DoctrineCorpusRollbackActivationV1);
  const rollbackProperties = asRecord(rollback.properties);
  Object.assign(asRecord(rollbackProperties.reason), {
    minLength: 1,
    maxLength: 500,
  });
  const assembly = asRecord(components.PolicyAssemblyV1);
  const assemblyProperties = asRecord(assembly.properties);
  Object.assign(asRecord(assemblyProperties.activationSequence), {
    type: "integer",
    minimum: 1,
  });
  Object.assign(asRecord(assemblyProperties.doctrineContextByteLength), {
    type: "integer",
    minimum: 1,
    maximum: 524288,
  });
  Object.assign(asRecord(assemblyProperties.doctrineManifest), {
    minItems: 1,
    maxItems: 32,
  });
}

function buildPhase5APolicyAssemblyOpenApiPaths(): Record<string, unknown> {
  return Object.fromEntries(
    PHASE5A_POLICY_ASSEMBLY_ROUTE_MANIFEST_V1.map((route) => {
      const errors = Object.fromEntries(
        ["400", "401", "403", "404", "409", "422", "503"].map(
          (status) => [
            status,
            {
              description: "Rejected by the Phase 5A contract",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CaseApiErrorV1" },
                },
              },
            },
          ],
        ),
      );
      const requestComponent =
        route.operationId === "createDoctrineCorpusRollbackActivation"
          ? "DoctrineCorpusRollbackCommandV1"
          : route.operationId === "createPolicyAssembly"
            ? "CreatePolicyAssemblyCommandV1"
            : null;
      const responseComponent =
        route.operationId === "createDoctrineCorpusRollbackActivation" ||
        route.operationId === "getDoctrineActivation"
          ? "DoctrineActivationAuthorityV1"
          : route.operationId === "createPolicyAssembly"
            ? "PolicyAssemblyTerminalV1"
            : route.operationId === "getPolicyAssembly"
              ? "PolicyAssemblyV1"
              : "PolicyAssemblyFailureV1";
      const parameterName = route.openapiPath.includes("{activationId}")
        ? "activationId"
        : route.openapiPath.includes("{assemblyId}")
          ? "assemblyId"
          : route.openapiPath.includes("{failureId}")
            ? "failureId"
            : null;
      const mutation = route.method === "POST";
      return [
        route.openapiPath,
        {
          [route.method.toLowerCase()]: {
            operationId: route.operationId,
            security: [{ operatorToken: [] }],
            ...(requestComponent === null
              ? {}
              : {
                  requestBody: {
                    required: true,
                    content: {
                      "application/json": {
                        schema: {
                          $ref: `#/components/schemas/${requestComponent}`,
                        },
                      },
                    },
                  },
                }),
            ...(parameterName === null
              ? {}
              : { parameters: [pathHashParameter(parameterName)] }),
            responses: {
              "200": jsonResponse(
                responseComponent,
                mutation ? "Exact Phase 5A resource already exists" : "Phase 5A resource",
              ),
              ...(mutation
                ? {
                    "201": jsonResponse(
                      responseComponent,
                      "Phase 5A resource inserted",
                    ),
                  }
                : {}),
              ...errors,
            },
          },
        },
      ];
    }),
  );
}

export function buildReviewWorkflowTransportDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const documents = buildSchemaDocuments(packageRoot, REVIEW_WORKFLOW_TARGETS, {
    schemaId: "https://pa-agent-lab.local/schemas/phase3a-review-workflow-v1",
    title: "PA Agent Lab Phase 3A Blind Review Workflow V1",
    extensions: {
      "x-pa-phase3a-record-kinds": {
        calvin_independent_assessment: "CalvinIndependentAssessmentV1",
        decision_reveal_receipt: "DecisionRevealReceiptV1",
        calvin_review_workflow_binding: "CalvinReviewWorkflowBindingV1",
      },
      "x-pa-reviewer-authentication": TRUSTED_LOOPBACK_REVIEWER_EXTENSION,
      "x-pa-runtime-authority":
        "synthetic_only_local_blind_review_no_model_replay_or_trading_authority",
    },
  });
  const openapi = asRecord(documents.openapi);
  const components = asRecord(openapi.components);
  return {
    schemaBundle: documents.schemaBundle,
    openapi: {
      ...openapi,
      paths: buildReviewWorkflowOpenApiPaths(),
      components: {
        ...components,
        securitySchemes: {
          reviewerToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "PA-Local-Reviewer-Token",
          },
        },
      },
      "x-pa-route-manifest": REVIEW_WORKFLOW_ROUTE_MANIFEST_V1,
    },
  };
}

function buildReviewWorkflowOpenApiPaths(): Record<string, unknown> {
  return Object.fromEntries(
    REVIEW_WORKFLOW_ROUTE_MANIFEST_V1.map((route) => [
      route.openapiPath,
      {
        [route.method.toLowerCase()]: {
          operationId: route.operationId,
          security: [{ reviewerToken: [] }],
          ...buildReviewWorkflowOperation(route.operationId),
        },
      },
    ]),
  );
}

function buildReviewWorkflowOperation(operationId: string): Record<string, unknown> {
  const errorResponse = {
    description: "Rejected by the local Phase 3A blind-review contract",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CaseApiErrorV1" },
      },
    },
  };
  const errors = Object.fromEntries(
    ["400", "401", "403", "404", "409", "413", "422", "503"].map(
      (status) => [status, errorResponse],
    ),
  );
  if (operationId === "listReviewerWorkItems") {
    return { responses: { "200": jsonResponse("ReviewWorkQueueV1", "Blind review queue"), ...errors } };
  }
  if (operationId === "getReviewerWorkItem") {
    return {
      parameters: [pathHashParameter("caseHash")],
      responses: { "200": jsonResponse("ReviewWorkItemDetailV1", "Derived blind review work item"), ...errors },
    };
  }
  const command =
    operationId === "submitIndependentAssessment"
      ? "SubmitIndependentAssessmentCommandV1"
      : operationId === "revealBrooksDecision"
        ? "RevealDecisionCommandV1"
        : "SubmitFinalReviewCommandV1";
  return {
    ...(operationId === "revealBrooksDecision"
      ? { parameters: [pathHashParameter("caseHash")] }
      : {}),
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: `#/components/schemas/${command}` } },
      },
    },
    responses: {
      "200": jsonResponse("ReviewWorkflowMutationResultV1", "Exact immutable workflow record already exists"),
      "201": jsonResponse("ReviewWorkflowMutationResultV1", "Immutable workflow record inserted"),
      ...errors,
    },
  };
}

function buildCaseStoreOpenApiPaths(): Record<string, unknown> {
  const entries = CASE_API_ROUTE_MANIFEST_V1.map((route) => {
    const operation = buildCaseStoreOperation(route.operationId);
    return [
      route.openapiPath,
      {
        [route.method.toLowerCase()]: {
          operationId: route.operationId,
          ...(route.authentication === "operator_token"
            ? { security: [{ operatorToken: [] }] }
            : route.authentication === "operator_or_reviewer_token"
              ? { security: [{ operatorToken: [] }, { reviewerToken: [] }] }
              : { security: [] }),
          ...operation,
        },
      },
    ] as const;
  });
  return Object.fromEntries(entries);
}

function buildCaseStoreOperation(
  operationId: string,
): Record<string, unknown> {
  const errorResponse = {
    description: "Rejected by the local Phase 2 contract",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CaseApiErrorV1" },
      },
    },
  };
  const errors = Object.fromEntries(
    ["400", "401", "403", "404", "409", "413", "422", "503"].map(
      (status) => [status, errorResponse],
    ),
  );
  if (operationId === "createSyntheticCaseBundle") {
    return mutationOperation("SyntheticCaseBundleV1", errors);
  }
  if (operationId === "appendBrooksDecision") {
    return mutationOperation("BrooksDecisionV1", errors);
  }
  if (operationId === "appendCalvinReview") {
    return mutationOperation("CalvinReviewV1", errors);
  }
  if (operationId === "getCase") {
    return {
      parameters: [pathHashParameter("caseHash")],
      responses: {
        "200": jsonResponse("BrooksPolicyCaseV1", "Synthetic Case record"),
        ...errors,
      },
    };
  }
  if (operationId === "getCaseAudit") {
    return {
      parameters: [pathHashParameter("caseHash")],
      responses: {
        "200": jsonResponse("CaseAuditViewV1", "Deterministic Case audit view"),
        ...errors,
      },
    };
  }
  if (operationId === "getChartArtifactContent") {
    return {
      parameters: [pathHashParameter("artifactId")],
      responses: {
        "200": {
          description: "Validated anonymous PNG bytes",
          content: {
            "image/png": { schema: { type: "string", format: "binary" } },
          },
        },
        ...errors,
      },
    };
  }
  return {
    responses: {
      "200": {
        description: operationId === "getHealth" ? "Process is alive" : "Dependencies are ready",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["status"],
              properties: {
                status: {
                  type: "string",
                  const: operationId === "getHealth" ? "ok" : "ready",
                },
              },
            },
          },
        },
      },
      ...errors,
    },
  };
}

function mutationOperation(
  component: string,
  errors: Record<string, unknown>,
): Record<string, unknown> {
  return {
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${component}` },
        },
      },
    },
    responses: {
      "200": jsonResponse("CaseApiMutationResultV1", "Exact immutable record already exists"),
      "201": jsonResponse("CaseApiMutationResultV1", "Immutable record inserted"),
      ...errors,
    },
  };
}

function jsonResponse(component: string, description: string): Record<string, unknown> {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${component}` },
      },
    },
  };
}

function pathHashParameter(name: string): Record<string, unknown> {
  return {
    name,
    in: "path",
    required: true,
    schema: { $ref: "#/components/schemas/ContractSha256" },
  };
}

function buildSchemaDocuments(
  packageRoot: string,
  targets: readonly SchemaTargetV1[],
  metadata: SchemaDocumentMetadataV1,
  refineComponents?: (components: Record<string, unknown>) => void,
): GeneratedTransportDocumentsV1 {
  const components: Record<string, unknown> = {};

  for (const target of targets) {
    const generator = createGenerator({
      path: resolve(packageRoot, target.source),
      type: target.component,
      tsconfig: resolve(packageRoot, "tsconfig.json"),
      expose: "export",
      topRef: false,
      jsDoc: "none",
      sortProps: true,
      strictTuples: true,
      skipTypeCheck: true,
      encodeRefs: false,
      additionalProperties: false,
      functions: "fail",
    });
    const generated = generator.createSchema(target.component) as Record<
      string,
      unknown
    >;
    const definitions = asRecord(generated.definitions);
    const root = { ...generated };
    delete root.$schema;
    delete root.definitions;
    addComponent(components, target.component, root);
    for (const [name, definition] of Object.entries(definitions)) {
      addComponent(components, name, definition);
    }
  }

  refineGeneratedComponents(components);
  refineComponents?.(components);

  const openapiComponents = Object.fromEntries(
    Object.entries(components).map(([name, schema]) => [
      name,
      rewriteRefs(schema, "components"),
    ]),
  );
  const schemaDefinitions = Object.fromEntries(
    Object.entries(components).map(([name, schema]) => [
      name,
      rewriteRefs(schema, "schema"),
    ]),
  );

  return {
    schemaBundle: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: metadata.schemaId,
      $defs: schemaDefinitions,
    },
    openapi: {
      openapi: "3.1.1",
      info: {
        title: metadata.title,
        version: "1.0.0",
      },
      jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
      paths: {},
      components: { schemas: openapiComponents },
      ...metadata.extensions,
    },
  };
}

function refineDoctrineApprovalComponents(
  components: Record<string, unknown>,
): void {
  const source = asRecord(components.SourceV1);
  const sourceProperties = asRecord(source.properties);
  boundedString(sourceProperties, "sourceId", 1);
  boundedString(sourceProperties, "title", 1);
  boundedString(sourceProperties, "urlOrLocalRef", 1);
  Object.assign(asRecord(sourceProperties.urlOrLocalRef), {
    pattern: "^https://[^\\s]+$",
  });
  Object.assign(asRecord(sourceProperties.private), { const: false });
  Object.assign(asRecord(sourceProperties.sourceType), {
    enum: ["brooks_website", "official_youtube", "reviewed_transcript"],
  });

  const unit = asRecord(components.DoctrineUnitV1);
  const unitProperties = asRecord(unit.properties);
  for (const name of ["doctrineId", "sourceId", "concept", "rule"] as const) {
    boundedString(unitProperties, name, 1);
  }
  Object.assign(asRecord(unitProperties.status), { const: "draft" });
  for (const name of ["appliesWhen", "avoidWhen", "decisionEffect"] as const) {
    const list = asRecord(unitProperties[name]);
    list.minItems = 1;
    list.maxItems = 12;
    Object.assign(asRecord(list.items), {
      minLength: 1,
      pattern: ".*\\S.*",
    });
  }

  const proposal = asRecord(components.DoctrineProposalBundleV1);
  boundedString(asRecord(proposal.properties), "sourceLocator", 1, 600);

  const approval = asRecord(components.DoctrineApprovalV1);
  const approvalProperties = asRecord(approval.properties);
  boundedString(approvalProperties, "doctrineId", 1);
  boundedString(approvalProperties, "sourceId", 1);

  const retirement = asRecord(components.DoctrineRetirementV1);
  const retirementProperties = asRecord(retirement.properties);
  boundedString(retirementProperties, "doctrineId", 1);
  boundedString(retirementProperties, "reason", 1, 400);

  const retireCommand = asRecord(components.RetireDoctrineCommandV1);
  boundedString(asRecord(retireCommand.properties), "reason", 1, 400);
}

function boundedString(
  properties: Record<string, unknown>,
  name: string,
  minimum: number,
  maximum?: number,
): void {
  const property = asRecord(properties[name]);
  property.minLength = minimum;
  property.pattern = ".*\\S.*";
  if (maximum !== undefined) property.maxLength = maximum;
}

function refineGeneratedComponents(components: Record<string, unknown>): void {
  const sha256 = asRecord(components.ContractSha256);
  sha256.pattern = "^sha256:[0-9a-f]{64}$";

  for (const schema of Object.values(components)) refineSchemaNode(schema);
}

function refineSchemaNode(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(refineSchemaNode);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const properties = asOptionalRecord(record.properties);
  for (const [name, nested] of Object.entries(properties)) {
    const property = asRecord(nested);
    const integerMinimum = integerMinimumFor(name);
    if (integerMinimum !== undefined && property.type === "number") {
      property.type = "integer";
      property.minimum = integerMinimum;
    } else if (
      integerMinimum !== undefined &&
      Array.isArray(property.type) &&
      property.type.includes("number")
    ) {
      property.type = property.type.map((type) =>
        type === "number" ? "integer" : type,
      );
      property.minimum = integerMinimum;
    }
    if (name === "barDurationSeconds") {
      property.const = FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS;
    }
    if (name === "visibleBarCount") {
      property.maximum = BROOKS_CONTEXT_BAR_COUNT;
    }
    if (name === "leftCensoredBarsMissing") {
      property.maximum = BROOKS_CONTEXT_BAR_COUNT - BROOKS_DETAIL_BAR_COUNT;
    }
    if (
      (name === "bars" ||
        (name === "barIds" &&
          Object.hasOwn(properties, "panel") &&
          Object.hasOwn(properties, "mediaType") &&
          Object.hasOwn(properties, "lastVisibleBarId"))) &&
      property.type === "array"
    ) {
      property.minItems = BROOKS_DETAIL_BAR_COUNT;
      property.maxItems = BROOKS_CONTEXT_BAR_COUNT;
    }
    refineSchemaNode(nested);
  }
  for (const [name, nested] of Object.entries(record)) {
    if (name !== "properties") refineSchemaNode(nested);
  }
}

function integerMinimumFor(name: string): number | undefined {
  if (["widthPx", "heightPx", "byteLength"].includes(name)) return 1;
  if (
    [
      "barDurationSeconds",
      "sequence",
      "visibleBarCount",
      "leftCensoredBarsMissing",
      "decisionPointSequence",
      "firstEventSequence",
      "lastEventSequence",
      "terminalEventSequence",
      "detectedAtEventSequence",
      "lastObservedEventSequence",
      "parentPolicyBarSequence",
      "repeatIndex",
      "attemptIndex",
    ].includes(name)
  ) {
    return 0;
  }
  return undefined;
}

function asOptionalRecord(value: unknown): Record<string, unknown> {
  return value === undefined ? {} : asRecord(value);
}

function addComponent(
  components: Record<string, unknown>,
  name: string,
  schema: unknown,
): void {
  const existing = components[name];
  if (existing !== undefined && stableJson(existing) !== stableJson(schema)) {
    throw new Error(`generated schema component collision: ${name}`);
  }
  components[name] = schema;
}

function rewriteRefs(
  value: unknown,
  target: "components" | "schema",
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRefs(item, target));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => {
      if (
        key === "$ref" &&
        typeof nested === "string" &&
        nested.startsWith("#/definitions/")
      ) {
        const name = nested.slice("#/definitions/".length);
        return [
          key,
          target === "components"
            ? `#/components/schemas/${name}`
            : `#/$defs/${name}`,
        ];
      }
      return [key, rewriteRefs(nested, target)];
    }),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("generated schema definitions must be an object");
  }
  return value as Record<string, unknown>;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
