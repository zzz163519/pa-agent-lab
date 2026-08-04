import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildCaseStoreTransportDocumentsV1,
  buildDoctrineApprovalTransportDocumentsV1,
  buildDoctrineRetrievalTransportDocumentsV1,
  buildPhase5APolicyAssemblyTransportDocumentsV1,
  buildPhase5B1PromptPackageTransportDocumentsV1,
  buildReplayBoundaryTransportDocumentsV1,
  buildReviewWorkflowTransportDocumentsV1,
  buildTransportSchemaDocumentsV1,
} from "../scripts/schema-generator-v1.ts";
import {
  CASE_API_BODY_LIMIT_BYTES,
  CASE_API_ROUTE_MANIFEST_V1,
} from "../src/case-store-transport-v1.ts";
import { DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1 } from "../src/doctrine-approval-transport-v1.ts";
import { REVIEW_WORKFLOW_ROUTE_MANIFEST_V1 } from "../src/review-workflow-transport-v1.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

describe("generated Phase 1 transport schemas V1", () => {
  it("keeps committed JSON Schema and OpenAPI artifacts synchronized with TypeScript", async () => {
    const generated = buildTransportSchemaDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(
        resolve(
          packageRoot,
          "schemas/phase1-persisted-records-v1.schema.json",
        ),
      ),
      readJson(
        resolve(
          packageRoot,
          "openapi/phase1-persisted-records-v1.openapi.json",
        ),
      ),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
  });

  it("publishes six closed record components without inventing API endpoints", async () => {
    const openapi = (await readJson(
      resolve(
        packageRoot,
        "openapi/phase1-persisted-records-v1.openapi.json",
      ),
    )) as {
      readonly openapi: string;
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-record-kinds": Readonly<Record<string, string>>;
    };

    assert.equal(openapi.openapi, "3.1.1");
    assert.deepEqual(openapi.paths, {});
    assert.deepEqual(Object.keys(openapi["x-pa-record-kinds"]), [
      "policy_case",
      "policy_input",
      "chart_artifact_metadata",
      "model_run",
      "provider_attempt",
      "model_run_audit",
    ]);
    for (const component of Object.values(openapi["x-pa-record-kinds"])) {
      const schema = openapi.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false);
    }
    const sha256Schema = openapi.components.schemas.ContractSha256 as {
      readonly pattern?: string;
    };
    assert.equal(sha256Schema.pattern, "^sha256:[0-9a-f]{64}$");
    const caseSchema = openapi.components.schemas.BrooksPolicyCaseV1 as {
      readonly properties: {
        readonly bars: {
          readonly minItems?: number;
          readonly maxItems?: number;
          readonly items: {
            readonly properties: {
              readonly sequence: {
                readonly type?: string;
                readonly minimum?: number;
              };
            };
          };
        };
      };
    };
    assert.equal(caseSchema.properties.bars.minItems, 40);
    assert.equal(caseSchema.properties.bars.maxItems, 120);
    assert.deepEqual(caseSchema.properties.bars.items.properties.sequence, {
      type: "integer",
      minimum: 0,
    });

    for (const reference of collectReferences(openapi)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(openapi.components.schemas[name], `unresolved schema: ${name}`);
    }
  });
  it("publishes Phase 4A operator-only lexical retrieval schemas without vector authority", async () => {
    const generated = buildDoctrineRetrievalTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase4a-doctrine-retrieval-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase4a-doctrine-retrieval-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
    const document = openapi as { readonly paths: Record<string, unknown>; readonly components: { readonly securitySchemes: Record<string, unknown> }; readonly "x-pa-runtime-authority": string };
    assert.equal(Object.keys(document.paths).length, 7);
    assert.deepEqual(Object.keys(document.components.securitySchemes), ["operatorToken"]);
    for (const path of [
      "/v1/doctrine/ingestion-runs",
      "/v1/doctrine/activations",
    ]) {
      const operation = document.paths[path] as {
        readonly post: { readonly responses: Readonly<Record<string, unknown>> };
      };
      assert.deepEqual(
        Object.keys(operation.post.responses).filter((status) => status.startsWith("2")),
        ["200", "201"],
      );
    }
    assert.doesNotMatch(JSON.stringify(document), /reviewerToken|embedding|provider|console/i);
    assert.doesNotMatch(JSON.stringify(document), /CREATE EXTENSION|"vector"/i);
  });

  it("publishes Phase 5A rollback transport separately with a closed activation union", async () => {
    const generated = buildPhase5APolicyAssemblyTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase5a-synthetic-policy-assembly-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase5a-synthetic-policy-assembly-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
    const document = openapi as {
      readonly paths: Record<string, unknown>;
      readonly components: {
        readonly schemas: Record<string, unknown>;
        readonly securitySchemes: Record<string, unknown>;
      };
    };
    assert.deepEqual(Object.keys(document.paths), [
      "/v1/doctrine/rollback-activations",
      "/v1/doctrine/activations/{activationId}",
      "/v1/policy-assemblies",
      "/v1/policy-assemblies/{assemblyId}",
      "/v1/policy-assembly-failures/{failureId}",
    ]);
    assert.deepEqual(Object.keys(document.components.securitySchemes), ["operatorToken"]);
    assert.match(
      JSON.stringify(document.components.schemas.DoctrineActivationAuthorityV1),
      /DoctrineCorpusActivationV1.*DoctrineCorpusRollbackActivationV1/,
    );
    assert.match(
      JSON.stringify(document.components.schemas.PolicyAssemblyTerminalV1),
      /PolicyAssemblyV1.*PolicyAssemblyFailureV1/,
    );
    assert.doesNotMatch(
      JSON.stringify(document),
      /reviewerToken|embedding|provider|modelRun|console|CREATE EXTENSION|"vector"/i,
    );
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });

  it("publishes Phase 5B1 operator-only offline package and preparation schemas", async () => {
    const generated = buildPhase5B1PromptPackageTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase5b1-prompt-package-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase5b1-prompt-package-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
    const document = openapi as {
      readonly paths: Record<string, unknown>;
      readonly components: {
        readonly schemas: Record<string, unknown>;
        readonly securitySchemes: Record<string, unknown>;
      };
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(Object.keys(document.paths), [
      "/v1/prompt-package-activations",
      "/v1/prompt-package-rollback-activations",
      "/v1/prompt-package-activations/current",
      "/v1/prepared-policy-payloads",
      "/v1/prepared-policy-payloads/{preparationId}",
    ]);
    assert.deepEqual(Object.keys(document.components.securitySchemes), ["operatorToken"]);
    assert.equal(
      document.components.schemas.ActivateBrooksPromptPackageCommandV1 !== undefined,
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(document),
      /reviewerToken|providerId|modelId|modelRunId|attemptId|real data|replay|trading|CREATE EXTENSION|"vector"/i,
    );
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });

  it("publishes replay request and result schemas without persisted-record or API authority", async () => {
    const generated = buildReplayBoundaryTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/replay-boundary-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/replay-boundary-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);

    const document = openapi as {
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-replay-components": readonly string[];
      readonly "x-pa-record-kinds"?: unknown;
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(document.paths, {});
    assert.deepEqual(document["x-pa-replay-components"], [
      "ReplayRequestV1",
      "ReplayResultV1",
    ]);
    assert.equal(document["x-pa-record-kinds"], undefined);
    assert.equal(
      document["x-pa-runtime-authority"],
      "research_only_no_replay_engine_or_trading_authority",
    );
    for (const component of document["x-pa-replay-components"]) {
      const schema = document.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false);
    }
    const unresolvedTerminal = document.components.schemas
      .UnresolvedReplayTerminalV1 as {
      readonly properties: {
        readonly detectedAtEventSequence: {
          readonly type?: unknown;
          readonly minimum?: number;
        };
      };
    };
    assert.deepEqual(
      unresolvedTerminal.properties.detectedAtEventSequence,
      { type: ["integer", "null"], minimum: 0 },
    );
    const decisionBinding = document.components.schemas
      .ReplayDecisionBindingV1 as {
      readonly properties: {
        readonly barDurationSeconds: {
          readonly type?: string;
          readonly minimum?: number;
          readonly const?: number;
        };
      };
    };
    assert.deepEqual(decisionBinding.properties.barDurationSeconds, {
      type: "integer",
      minimum: 0,
      const: 300,
    });
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });

  it("publishes Phase 2 Case Store paths separately without widening Phase 1 record authority", async () => {
    const generated = buildCaseStoreTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase2-case-store-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase2-case-store-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);

    const document = openapi as {
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
        readonly securitySchemes: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-phase2-record-kinds": Readonly<Record<string, string>>;
      readonly "x-pa-body-limit-bytes": number;
      readonly "x-pa-synthetic-authorization": string;
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(
      Object.keys(document.paths),
      CASE_API_ROUTE_MANIFEST_V1.map((route) => route.openapiPath),
    );
    assert.deepEqual(document["x-pa-phase2-record-kinds"], {
      brooks_decision: "BrooksDecisionV1",
      calvin_review: "CalvinReviewV1",
    });
    assert.equal(document["x-pa-body-limit-bytes"], CASE_API_BODY_LIMIT_BYTES);
    assert.equal(
      document["x-pa-synthetic-authorization"],
      "exact_bundle_hash_allowlist",
    );
    assert.equal(
      document["x-pa-runtime-authority"],
      "synthetic_only_local_case_store_no_model_or_trading_authority",
    );
    assert.deepEqual(document.components.securitySchemes.operatorToken, {
      type: "http",
      scheme: "bearer",
      bearerFormat: "PA-Local-Operator-Token",
    });
    for (const component of [
      "SyntheticCaseBundleV1",
      "CaseAuditViewV1",
      "BrooksDecisionV1",
      "CalvinReviewV1",
      "CaseApiMutationResultV1",
      "CaseApiErrorV1",
    ]) {
      const schema = document.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false, component);
    }
    assert.equal(document.components.schemas.CaseLabelV1, undefined);
    assert.equal(document.components.schemas.CaseCommitmentV1, undefined);
    assert.equal(document.components.schemas.DecisionConflictV1 !== undefined, true);
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });
  it("publishes Phase 3A blind review schemas and reviewer-only routes separately", async () => {
    const generated = buildReviewWorkflowTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase3a-review-workflow-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase3a-review-workflow-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);

    const document = openapi as {
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
        readonly securitySchemes: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-phase3a-record-kinds": Readonly<Record<string, string>>;
      readonly "x-pa-reviewer-authentication": {
        readonly defaultMode: string;
        readonly localDeploymentMode: string;
        readonly principal: string;
        readonly authority: string;
      };
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(
      Object.keys(document.paths),
      REVIEW_WORKFLOW_ROUTE_MANIFEST_V1.map((route) => route.openapiPath),
    );
    assert.deepEqual(document["x-pa-phase3a-record-kinds"], {
      calvin_independent_assessment: "CalvinIndependentAssessmentV1",
      decision_reveal_receipt: "DecisionRevealReceiptV1",
      calvin_review_workflow_binding: "CalvinReviewWorkflowBindingV1",
    });
    assert.deepEqual(document["x-pa-reviewer-authentication"], {
      defaultMode: "bearer",
      localDeploymentMode: "trusted_loopback",
      principal: "local:calvin-reviewer",
      authority:
        "repository_owned_loopback_gateway_only_not_public_authentication",
    });
    assert.equal(
      document["x-pa-runtime-authority"],
      "synthetic_only_local_blind_review_no_model_replay_or_trading_authority",
    );
    assert.deepEqual(document.components.securitySchemes.reviewerToken, {
      type: "http",
      scheme: "bearer",
      bearerFormat: "PA-Local-Reviewer-Token",
    });
    for (const component of [
      "CalvinIndependentAssessmentV1",
      "DecisionRevealReceiptV1",
      "CalvinReviewWorkflowBindingV1",
      "ReviewWorkQueueV1",
      "ReviewWorkItemDetailV1",
      "SubmitIndependentAssessmentCommandV1",
      "RevealDecisionCommandV1",
      "SubmitFinalReviewCommandV1",
      "ReviewWorkflowMutationResultV1",
    ]) {
      const schema = document.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false, component);
    }
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });

  it("publishes Phase 3B minimal Doctrine approval schemas and dual-principal routes", async () => {
    const generated = buildDoctrineApprovalTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/phase3b-doctrine-approval-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/phase3b-doctrine-approval-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
    const document = openapi as {
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
        readonly securitySchemes: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-phase3b-record-kinds": Readonly<Record<string, string>>;
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(
      Object.keys(document.paths),
      [...new Set(DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1.map((route) => route.openapiPath))],
    );
    assert.deepEqual(document["x-pa-phase3b-record-kinds"], {
      doctrine_proposal: "DoctrineProposalBundleV1",
      doctrine_approval: "DoctrineApprovalV1",
      doctrine_retirement: "DoctrineRetirementV1",
    });
    assert.equal(
      document["x-pa-runtime-authority"],
      "local_public_source_approval_no_rag_model_replay_or_trading_authority",
    );
    assert.ok(document.components.securitySchemes.operatorToken);
    assert.ok(document.components.securitySchemes.reviewerToken);
    for (const component of [
      "DoctrineProposalBundleV1",
      "DoctrineApprovalV1",
      "DoctrineRetirementV1",
      "DoctrineWorkQueueV1",
      "DoctrineWorkItemV1",
      "ApproveDoctrineCommandV1",
      "RetireDoctrineCommandV1",
      "DoctrineApprovalMutationResultV1",
    ]) {
      const schema = document.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false, component);
    }
    const sourceSchema = document.components.schemas.SourceV1 as {
      readonly properties: {
        readonly urlOrLocalRef: { readonly pattern?: string; readonly minLength?: number };
        readonly private: { readonly const?: boolean };
        readonly sourceType: { readonly enum?: readonly string[] };
      };
    };
    assert.equal(sourceSchema.properties.urlOrLocalRef.pattern, "^https://[^\\s]+$");
    assert.equal(sourceSchema.properties.urlOrLocalRef.minLength, 1);
    assert.equal(sourceSchema.properties.private.const, false);
    assert.deepEqual(sourceSchema.properties.sourceType.enum, [
      "brooks_website",
      "official_youtube",
      "reviewed_transcript",
    ]);
    const unitSchema = document.components.schemas.DoctrineUnitV1 as {
      readonly properties: {
        readonly status: { readonly const?: string };
        readonly appliesWhen: {
          readonly type?: string;
          readonly minItems?: number;
          readonly maxItems?: number;
          readonly items: { readonly type?: string; readonly minLength?: number; readonly pattern?: string };
        };
      };
    };
    assert.equal(unitSchema.properties.status.const, "draft");
    assert.deepEqual(unitSchema.properties.appliesWhen, {
      type: "array",
      items: { type: "string", minLength: 1, pattern: ".*\\S.*" },
      maxItems: 12,
      minItems: 1,
    });
    const proposalSchema = document.components.schemas.DoctrineProposalBundleV1 as {
      readonly properties: {
        readonly sourceLocator: { readonly minLength?: number; readonly maxLength?: number; readonly pattern?: string };
      };
    };
    assert.equal(proposalSchema.properties.sourceLocator.minLength, 1);
    assert.equal(proposalSchema.properties.sourceLocator.maxLength, 600);
    assert.equal(proposalSchema.properties.sourceLocator.pattern, ".*\\S.*");
    const retirementSchema = document.components.schemas.DoctrineRetirementV1 as {
      readonly properties: {
        readonly reason: { readonly minLength?: number; readonly maxLength?: number; readonly pattern?: string };
      };
    };
    assert.equal(retirementSchema.properties.reason.minLength, 1);
    assert.equal(retirementSchema.properties.reason.maxLength, 400);
    assert.equal(retirementSchema.properties.reason.pattern, ".*\\S.*");
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });
});

function collectReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectReferences);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "$ref" && typeof nested === "string"
      ? [nested]
      : collectReferences(nested),
  );
}
