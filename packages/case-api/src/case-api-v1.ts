import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import fastifyHelmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

import {
  CaseStoreError,
  type CaseStoreV1,
} from "@pa-agent-lab/case-store";
import {
  assertNonEmpty,
  type BrooksDecisionV1,
  type BrooksPolicyCaseV1,
  type CalvinReviewV1,
  type ContractSha256,
  type DoctrineApproverPrincipalV1,
  type DoctrineProposalBundleV1,
} from "@pa-agent-lab/contracts";
import {
  CASE_API_BODY_LIMIT_BYTES,
  CASE_API_ROUTE_MANIFEST_V1,
  DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1,
  DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1,
  REVIEW_WORKFLOW_ROUTE_MANIFEST_V1,
  PersistenceContractError,
  assertApproveDoctrineCommand,
  assertDoctrineActivationCommand,
  assertDoctrineIngestionCommand,
  assertDoctrineRetrievalQueryCommand,
  assertRetireDoctrineCommand,
  createCaseApiError,
  createCaseApiMutationResult,
  createDoctrineApprovalMutationResult,
  createReviewWorkflowMutationResult,
  parseStrictJsonText,
  type CaseApiErrorCodeV1,
  type CaseAuditViewV1,
  type ApproveDoctrineCommandV1,
  type DoctrineActivationCommandV1,
  type DoctrineIngestionCommandV1,
  type DoctrineRetrievalQueryCommandV1,
  type DoctrineApprovalMutationResultV1,
  type DoctrineWorkItemV1,
  type DoctrineWorkQueueV1,
  type RetireDoctrineCommandV1,
  type RevealDecisionCommandV1,
  type ReviewWorkItemDetailV1,
  type SubmitFinalReviewCommandV1,
  type SubmitIndependentAssessmentCommandV1,
  type SyntheticCaseBundleV1,
} from "@pa-agent-lab/persistence-contracts";

const CASE_STORE_SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase2-case-store-v1";
const REVIEW_WORKFLOW_SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase3a-review-workflow-v1";
const DOCTRINE_APPROVAL_SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase3b-doctrine-approval-v1";
const DOCTRINE_RETRIEVAL_SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase4a-doctrine-retrieval-v1";
const SHA256_PATTERN = "^sha256:[0-9a-f]{64}$";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const schemaBundle = JSON.parse(
  readFileSync(
    new URL(
      "../../persistence-contracts/schemas/phase2-case-store-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const fastifySchemaBundle = structuredClone(schemaBundle);
delete fastifySchemaBundle.$schema;
const reviewSchemaBundle = JSON.parse(
  readFileSync(
    new URL(
      "../../persistence-contracts/schemas/phase3a-review-workflow-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const fastifyReviewSchemaBundle = structuredClone(reviewSchemaBundle);
delete fastifyReviewSchemaBundle.$schema;
const doctrineSchemaBundle = JSON.parse(
  readFileSync(
    new URL(
      "../../persistence-contracts/schemas/phase3b-doctrine-approval-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const fastifyDoctrineSchemaBundle = structuredClone(doctrineSchemaBundle);
delete fastifyDoctrineSchemaBundle.$schema;
const doctrineRetrievalSchemaBundle = JSON.parse(
  readFileSync(
    new URL(
      "../../persistence-contracts/schemas/phase4a-doctrine-retrieval-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const fastifyDoctrineRetrievalSchemaBundle = structuredClone(doctrineRetrievalSchemaBundle);
delete fastifyDoctrineRetrievalSchemaBundle.$schema;

export interface OperatorPrincipalV1 {
  readonly principalId: "local:phase2-operator";
  readonly authenticationMethod: "local_token";
}

export type ReviewerAuthModeV1 = "bearer" | "trusted_loopback";

export interface ReviewerPrincipalV1 {
  readonly principalId: "local:calvin-reviewer";
  readonly authenticationMethod: "local_reviewer_token" | "trusted_loopback";
}

export type RequestPrincipalV1 = OperatorPrincipalV1 | ReviewerPrincipalV1;

export interface CaseApiOptionsV1 {
  readonly store: CaseStoreV1;
  readonly artifactRoot: string;
  readonly localToken: string;
  readonly reviewerToken: string;
  readonly reviewerAuthMode?: ReviewerAuthModeV1;
  readonly authorizedSyntheticBundleHashes: readonly ContractSha256[];
  readonly authorizedDoctrineProposalHashes?: readonly ContractSha256[];
  readonly allowedHosts: readonly string[];
  readonly allowedOrigins: readonly string[];
  readonly consoleRoot?: string;
}

class CaseApiHttpError extends Error {
  override readonly name = "CaseApiHttpError";
  readonly statusCode: number;
  readonly code: CaseApiErrorCodeV1;

  constructor(statusCode: number, code: CaseApiErrorCodeV1, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function createCaseApiV1(
  options: CaseApiOptionsV1,
): Promise<FastifyInstance> {
  validateOptions(options);
  const artifactRoot = resolve(options.artifactRoot);
  const principals = new WeakMap<object, RequestPrincipalV1>();
  const app = Fastify({
    logger: false,
    bodyLimit: CASE_API_BODY_LIMIT_BYTES,
    ajv: {
      customOptions: {
        allErrors: true,
        allowUnionTypes: true,
        removeAdditional: false,
        strict: true,
      },
    },
  });

  app.addSchema(fastifySchemaBundle);
  app.addSchema(fastifyReviewSchemaBundle);
  app.addSchema(fastifyDoctrineSchemaBundle);
  app.addSchema(fastifyDoctrineRetrievalSchemaBundle);
  await app.register(fastifyHelmet, {
    global: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    hsts: false,
    referrerPolicy: { policy: "no-referrer" },
  });
  if (options.consoleRoot !== undefined) {
    const consoleRoot = resolve(options.consoleRoot);
    await app.register(fastifyStatic, {
      root: consoleRoot,
      prefix: "/console/",
      wildcard: false,
      maxAge: "30d",
      immutable: true,
      setHeaders: (reply, path) => {
        if (path.endsWith("index.html")) {
          void reply.header("Cache-Control", "no-store");
        }
      },
    });
    const sendConsoleIndex = (_request: FastifyRequest, reply: FastifyReply) =>
      reply
        .header("Cache-Control", "no-store")
        .sendFile("index.html", { cacheControl: false, immutable: false });
    app.get("/console", sendConsoleIndex);
    app.get("/console/*", sendConsoleIndex);
  }
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => done(null, body),
  );

  app.addHook("onRequest", async (request) => {
    enforceLocalOrigin(request, options.allowedHosts, options.allowedOrigins);
    const doctrineRoute = DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1.find(
      (entry) =>
        entry.path === request.routeOptions.url && entry.method === request.method,
    );
    const retrievalRoute = DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1.find(
      (entry) =>
        entry.path === request.routeOptions.url && entry.method === request.method,
    );
    const workflowRoute = REVIEW_WORKFLOW_ROUTE_MANIFEST_V1.find(
      (entry) => entry.path === request.routeOptions.url,
    );
    const caseRoute = CASE_API_ROUTE_MANIFEST_V1.find(
      (entry) => entry.path === request.routeOptions.url,
    );
    const authentication =
      doctrineRoute?.authentication ??
      retrievalRoute?.authentication ??
      workflowRoute?.authentication ??
      caseRoute?.authentication;
    if (authentication === undefined || authentication === "none") return;
    const authorization = request.headers.authorization;
    const prefix = "Bearer ";
    const token =
      typeof authorization === "string" && authorization.startsWith(prefix)
        ? authorization.slice(prefix.length)
        : null;
    const operatorAccepted =
      token !== null &&
      authentication !== "reviewer_token" &&
      sameSecret(token, options.localToken);
    const reviewerAccepted =
      token !== null &&
      authentication !== "operator_token" &&
      sameSecret(token, options.reviewerToken);
    const trustedLoopbackAccepted =
      (options.reviewerAuthMode ?? "bearer") === "trusted_loopback" &&
      authorization === undefined &&
      authentication !== "operator_token";
    if (!operatorAccepted && !reviewerAccepted && !trustedLoopbackAccepted) {
      throw new CaseApiHttpError(
        401,
        "UNAUTHORIZED",
        "A valid token for this local route is required.",
      );
    }
    principals.set(
      request,
      operatorAccepted
        ? {
            principalId: "local:phase2-operator",
            authenticationMethod: "local_token",
          }
        : {
            principalId: "local:calvin-reviewer",
            authenticationMethod: trustedLoopbackAccepted
              ? "trusted_loopback"
              : "local_reviewer_token",
          },
    );
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (
      request.routeOptions.url?.startsWith("/v1/reviewer/") === true ||
      request.routeOptions.url?.startsWith("/v1/doctrine/") === true ||
      principals.get(request)?.principalId === "local:calvin-reviewer"
    ) {
      void reply.header("Cache-Control", "no-store");
    }
    return payload;
  });

  app.addHook("preValidation", async (request) => {
    if (
      request.method === "POST" &&
      request.headers["content-type"]?.startsWith("application/json") === true &&
      typeof request.body === "string"
    ) {
      request.body = parseStrictJsonText(request.body);
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const mapped = mapError(error);
    void sendError(reply, request.id, mapped.statusCode, mapped.code, mapped.message);
  });
  app.setNotFoundHandler((request, reply) =>
    sendError(reply, request.id, 404, "NOT_FOUND", "The local API route does not exist."),
  );

  app.post<{ Body: SyntheticCaseBundleV1 }>(
    "/v1/synthetic-case-bundles",
    { schema: { body: schemaRef("SyntheticCaseBundleV1") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      if (!options.authorizedSyntheticBundleHashes.includes(request.body.bundleHash)) {
        throw new CaseApiHttpError(
          403,
          "FORBIDDEN",
          "Synthetic CaseBundle hash is not authorized for this deployment.",
        );
      }
      await validateBundleArtifacts(request.body, artifactRoot);
      const result = await options.store.appendSyntheticCaseBundle(request.body);
      return sendMutation(reply, request.id, result.status, "synthetic_case_bundle", result.resourceHash);
    },
  );
  app.post<{ Body: BrooksDecisionV1 }>(
    "/v1/brooks-decisions",
    { schema: { body: schemaRef("BrooksDecisionV1") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const result = await options.store.appendBrooksDecision(request.body);
      return sendMutation(reply, request.id, result.status, "brooks_decision", result.resourceHash);
    },
  );
  app.post<{ Body: CalvinReviewV1 }>(
    "/v1/calvin-reviews",
    { schema: { body: schemaRef("CalvinReviewV1") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const result = await options.store.appendCalvinReview(request.body);
      return sendMutation(reply, request.id, result.status, "calvin_review", result.resourceHash);
    },
  );
  app.get<{ Params: { readonly caseHash: ContractSha256 }; Reply: BrooksPolicyCaseV1 }>(
    "/v1/cases/:caseHash",
    { schema: { params: hashParamsSchema("caseHash") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const record = await options.store.getCase(request.params.caseHash);
      if (record === null) throw notFound("Case");
      return reply.send(record);
    },
  );
  app.get<{ Params: { readonly caseHash: ContractSha256 }; Reply: CaseAuditViewV1 }>(
    "/v1/cases/:caseHash/audit",
    { schema: { params: hashParamsSchema("caseHash") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const audit = await options.store.getCaseAudit(request.params.caseHash);
      if (audit === null) throw notFound("Case audit");
      return reply.send(audit);
    },
  );
  app.get<{ Params: { readonly artifactId: ContractSha256 } }>(
    "/v1/chart-artifacts/:artifactId/content",
    { schema: { params: hashParamsSchema("artifactId") } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const metadata = await options.store.getChartArtifact(request.params.artifactId);
      if (metadata === null) throw notFound("Chart artifact");
      const filename = `${metadata.contentHash.slice("sha256:".length)}.png`;
      let bytes: Buffer;
      try {
        bytes = await readFile(resolve(artifactRoot, filename));
      } catch (error) {
        throw new CaseApiHttpError(
          503,
          "DEPENDENCY_UNAVAILABLE",
          error instanceof Error ? error.message : "Chart artifact read failed.",
        );
      }
      validatePngBytes(bytes, metadata);
      return reply.type("image/png").send(bytes);
    },
  );
  app.get(
    "/v1/reviewer/work-items",
    {
      schema: {
        response: { 200: reviewSchemaRef("ReviewWorkQueueV1") },
      },
    },
    async (request, reply) => {
      requireReviewerPrincipal(principals, request);
      return reply.send(await options.store.listReviewWorkItems());
    },
  );
  app.get<{ Params: { readonly caseHash: ContractSha256 } }>(
    "/v1/reviewer/work-items/:caseHash",
    {
      schema: {
        params: hashParamsSchema("caseHash"),
        response: { 200: reviewSchemaRef("ReviewWorkItemDetailV1") },
      },
    },
    async (request, reply) => {
      requireReviewerPrincipal(principals, request);
      const workItem = await options.store.getReviewWorkItem(
        request.params.caseHash,
      );
      if (workItem === null) throw notFound("Review work item");
      assertReviewWorkItemResponseBoundary(workItem);
      return reply.send(workItem);
    },
  );
  app.post<{ Body: SubmitIndependentAssessmentCommandV1 }>(
    "/v1/reviewer/independent-assessments",
    {
      schema: {
        body: reviewSchemaRef("SubmitIndependentAssessmentCommandV1"),
        response: reviewMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      requireReviewerPrincipal(principals, request);
      const result = await options.store.appendIndependentAssessment(request.body);
      const workItem = await requireReviewWorkItem(options.store, request.body.caseHash);
      return sendReviewMutation(
        reply,
        request.id,
        result,
        "calvin_independent_assessment",
        workItem,
      );
    },
  );
  app.post<{
    Params: { readonly caseHash: ContractSha256 };
    Body: RevealDecisionCommandV1;
  }>(
    "/v1/reviewer/work-items/:caseHash/reveal",
    {
      schema: {
        params: hashParamsSchema("caseHash"),
        body: reviewSchemaRef("RevealDecisionCommandV1"),
        response: reviewMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      requireReviewerPrincipal(principals, request);
      const result = await options.store.appendDecisionRevealReceipt(
        request.params.caseHash,
        request.body,
      );
      const workItem = await requireReviewWorkItem(options.store, request.params.caseHash);
      return sendReviewMutation(
        reply,
        request.id,
        result,
        "decision_reveal_receipt",
        workItem,
      );
    },
  );
  app.post<{ Body: SubmitFinalReviewCommandV1 }>(
    "/v1/reviewer/final-reviews",
    {
      schema: {
        body: reviewSchemaRef("SubmitFinalReviewCommandV1"),
        response: reviewMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      requireReviewerPrincipal(principals, request);
      const result = await options.store.appendFinalReview(request.body);
      const workItem = await requireReviewWorkItem(options.store, request.body.caseHash);
      return sendReviewMutation(
        reply,
        request.id,
        result,
        "calvin_review_workflow",
        workItem,
      );
    },
  );
  app.post<{ Body: DoctrineProposalBundleV1 }>(
    "/v1/doctrine/proposals",
    {
      schema: {
        body: doctrineSchemaRef("DoctrineProposalBundleV1"),
        response: doctrineMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      requirePrincipal(principals, request);
      if (
        !(options.authorizedDoctrineProposalHashes ?? []).includes(
          request.body.proposalHash,
        )
      ) {
        throw new CaseApiHttpError(
          403,
          "FORBIDDEN",
          "Doctrine proposal hash is not authorized for this deployment.",
        );
      }
      const result = await options.store.appendDoctrineProposal(request.body);
      const workItem = await requireDoctrineWorkItem(
        options.store,
        request.body.doctrineUnit.doctrineId,
      );
      return sendDoctrineMutation(
        reply,
        request.id,
        result,
        "doctrine_proposal",
        workItem,
      );
    },
  );
  app.get<{ Reply: DoctrineWorkQueueV1 }>(
    "/v1/doctrine/proposals",
    { schema: { response: { 200: doctrineSchemaRef("DoctrineWorkQueueV1") } } },
    async (request, reply) => {
      requirePrincipal(principals, request);
      return reply.send(await options.store.listDoctrineWorkItems());
    },
  );
  app.get<{
    Params: { readonly doctrineId: string };
    Reply: DoctrineWorkItemV1;
  }>(
    "/v1/doctrine/proposals/:doctrineId",
    {
      schema: {
        params: doctrineIdParamsSchema(),
        response: { 200: doctrineSchemaRef("DoctrineWorkItemV1") },
      },
    },
    async (request, reply) => {
      requirePrincipal(principals, request);
      const workItem = await options.store.getDoctrineWorkItem(
        request.params.doctrineId,
      );
      if (workItem === null) throw notFound("Doctrine proposal");
      return reply.send(workItem);
    },
  );
  app.post<{
    Params: { readonly doctrineId: string };
    Body: ApproveDoctrineCommandV1;
  }>(
    "/v1/doctrine/proposals/:doctrineId/approve",
    {
      schema: {
        params: doctrineIdParamsSchema(),
        body: doctrineSchemaRef("ApproveDoctrineCommandV1"),
        response: doctrineMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      assertApproveDoctrineCommand(request.body);
      const principal = requireDoctrineApproverPrincipal(principals, request);
      const result = await options.store.approveDoctrine(
        request.params.doctrineId,
        request.body,
        principal,
      );
      const workItem = await requireDoctrineWorkItem(
        options.store,
        request.params.doctrineId,
      );
      return sendDoctrineMutation(
        reply,
        request.id,
        result,
        "doctrine_approval",
        workItem,
      );
    },
  );
  app.post<{
    Params: { readonly doctrineId: string };
    Body: RetireDoctrineCommandV1;
  }>(
    "/v1/doctrine/proposals/:doctrineId/retire",
    {
      schema: {
        params: doctrineIdParamsSchema(),
        body: doctrineSchemaRef("RetireDoctrineCommandV1"),
        response: doctrineMutationResponseSchemas(),
      },
    },
    async (request, reply) => {
      assertRetireDoctrineCommand(request.body);
      const principal = requireDoctrineApproverPrincipal(principals, request);
      const result = await options.store.retireDoctrine(
        request.params.doctrineId,
        request.body,
        principal,
      );
      const workItem = await requireDoctrineWorkItem(
        options.store,
        request.params.doctrineId,
      );
      return sendDoctrineMutation(
        reply,
        request.id,
        result,
        "doctrine_retirement",
        workItem,
      );
    },
  );
  app.post<{ Body: DoctrineIngestionCommandV1 }>(
    "/v1/doctrine/ingestion-runs",
    { schema: { body: doctrineRetrievalSchemaRef("DoctrineIngestionCommandV1") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      assertDoctrineIngestionCommand(request.body);
      const created = await options.store.createDoctrineIngestionRun(request.body);
      return reply.code(created.status === "inserted" ? 201 : 200).send(created.run);
    },
  );
  app.get<{ Params: { readonly snapshotId: ContractSha256 } }>(
    "/v1/doctrine/corpus-snapshots/:snapshotId",
    { schema: { params: hashParamsSchema("snapshotId") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      const snapshot = await options.store.getDoctrineCorpusSnapshot(request.params.snapshotId);
      if (snapshot === null) throw notFound("Doctrine corpus snapshot");
      return reply.send(snapshot);
    },
  );
  app.get<{ Params: { readonly runId: ContractSha256 } }>(
    "/v1/doctrine/ingestion-runs/:runId",
    { schema: { params: hashParamsSchema("runId") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      const run = await options.store.getDoctrineIngestionRun(request.params.runId);
      if (run === null) throw notFound("Doctrine ingestion run");
      return reply.send(run);
    },
  );
  app.post<{ Body: DoctrineActivationCommandV1 }>(
    "/v1/doctrine/activations",
    { schema: { body: doctrineRetrievalSchemaRef("DoctrineActivationCommandV1") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      assertDoctrineActivationCommand(request.body);
      const created = await options.store.createDoctrineCorpusActivation(request.body);
      return reply
        .code(created.status === "inserted" ? 201 : 200)
        .send(created.activation);
    },
  );
  app.get(
    "/v1/doctrine/activations/current",
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      const activation = await options.store.getCurrentDoctrineActivation();
      if (activation === null) throw notFound("Doctrine corpus activation");
      return reply.send(activation);
    },
  );
  app.post<{ Body: DoctrineRetrievalQueryCommandV1 }>(
    "/v1/doctrine/retrieval-queries",
    { schema: { body: doctrineRetrievalSchemaRef("DoctrineRetrievalQueryCommandV1") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      assertDoctrineRetrievalQueryCommand(request.body);
      return reply.send(await options.store.queryDoctrine(request.body));
    },
  );
  app.get<{ Params: { readonly evidenceId: ContractSha256 } }>(
    "/v1/doctrine/retrieval-evidence/:evidenceId",
    { schema: { params: hashParamsSchema("evidenceId") } },
    async (request, reply) => {
      requireOperatorPrincipal(principals, request);
      const evidence = await options.store.getDoctrineRetrievalEvidence(request.params.evidenceId);
      if (evidence === null) throw notFound("Doctrine retrieval evidence");
      return reply.send(evidence);
    },
  );
  app.get("/healthz", async () => ({ status: "ok" as const }));
  app.get("/readyz", async (_request, reply) => {
    if (!(await options.store.checkReadiness())) {
      return sendError(
        reply,
        "readiness",
        503,
        "DEPENDENCY_UNAVAILABLE",
        "The Case Store is not ready.",
      );
    }
    return { status: "ready" as const };
  });

  await app.ready();
  return app;
}

function validateOptions(options: CaseApiOptionsV1): void {
  assertNonEmpty("artifactRoot", options.artifactRoot);
  if (options.consoleRoot !== undefined) {
    assertNonEmpty("consoleRoot", options.consoleRoot);
  }
  if (options.localToken.length < 32) {
    throw new Error("Phase 2 local token must contain at least 32 characters");
  }
  if (options.reviewerToken.length < 32) {
    throw new Error("Phase 3A reviewer token must contain at least 32 characters");
  }
  if (sameSecret(options.localToken, options.reviewerToken)) {
    throw new Error("operator and reviewer tokens must be distinct");
  }
  const reviewerAuthMode = options.reviewerAuthMode ?? "bearer";
  if (!(["bearer", "trusted_loopback"] as const).includes(reviewerAuthMode)) {
    throw new Error("Phase 3A reviewer auth mode is unsupported");
  }
  if (
    reviewerAuthMode === "trusted_loopback" &&
    (options.allowedHosts.some(
      (host) => host !== "127.0.0.1" && host !== "localhost",
    ) ||
      options.allowedOrigins.some((origin) => !isLoopbackOrigin(origin)))
  ) {
    throw new Error(
      "trusted-loopback reviewer auth requires exact loopback Host and Origin allowlists",
    );
  }
  if (options.allowedHosts.length === 0 || options.allowedOrigins.length === 0) {
    throw new Error("Phase 2 API requires explicit Host and Origin allowlists");
  }
  if (
    options.authorizedSyntheticBundleHashes.length === 0 ||
    options.authorizedSyntheticBundleHashes.some(
      (hash) => !/^sha256:[0-9a-f]{64}$/.test(hash),
    )
  ) {
    throw new Error("Phase 2 API requires exact authorized synthetic bundle hashes");
  }
  const doctrineHashes = options.authorizedDoctrineProposalHashes ?? [];
  if (
    doctrineHashes.some((hash) => !/^sha256:[0-9a-f]{64}$/.test(hash)) ||
    new Set(doctrineHashes).size !== doctrineHashes.length
  ) {
    throw new Error("Phase 3B API requires unique exact Doctrine proposal hashes");
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      parsed.pathname === "/" &&
      parsed.search.length === 0 &&
      parsed.hash.length === 0
    );
  } catch {
    return false;
  }
}

function enforceLocalOrigin(
  request: FastifyRequest,
  allowedHosts: readonly string[],
  allowedOrigins: readonly string[],
): void {
  const hostHeader = request.headers.host ?? "";
  const host = hostHeader.replace(/:\d+$/, "");
  if (!allowedHosts.includes(host)) {
    throw new CaseApiHttpError(403, "FORBIDDEN", "The HTTP Host is not allowed.");
  }
  const origin = request.headers.origin;
  if (origin !== undefined && !allowedOrigins.includes(origin)) {
    throw new CaseApiHttpError(403, "FORBIDDEN", "The HTTP Origin is not allowed.");
  }
}

function requirePrincipal(
  principals: WeakMap<object, RequestPrincipalV1>,
  request: FastifyRequest,
): RequestPrincipalV1 {
  const principal = principals.get(request);
  if (principal === undefined) {
    throw new CaseApiHttpError(401, "UNAUTHORIZED", "Request principal is missing.");
  }
  return principal;
}

function requireOperatorPrincipal(
  principals: WeakMap<object, RequestPrincipalV1>,
  request: FastifyRequest,
): OperatorPrincipalV1 {
  const principal = requirePrincipal(principals, request);
  if (principal.principalId !== "local:phase2-operator") {
    throw new CaseApiHttpError(403, "FORBIDDEN", "Operator principal is required.");
  }
  return principal;
}

function requireReviewerPrincipal(
  principals: WeakMap<object, RequestPrincipalV1>,
  request: FastifyRequest,
): ReviewerPrincipalV1 {
  const principal = requirePrincipal(principals, request);
  if (principal.principalId !== "local:calvin-reviewer") {
    throw new CaseApiHttpError(403, "FORBIDDEN", "Reviewer principal is required.");
  }
  return principal;
}

function requireDoctrineApproverPrincipal(
  principals: WeakMap<object, RequestPrincipalV1>,
  request: FastifyRequest,
): DoctrineApproverPrincipalV1 {
  return requirePrincipal(principals, request).principalId;
}

async function requireDoctrineWorkItem(
  store: CaseStoreV1,
  doctrineId: string,
): Promise<Readonly<DoctrineWorkItemV1>> {
  const workItem = await store.getDoctrineWorkItem(doctrineId);
  if (workItem === null) throw notFound("Doctrine proposal");
  return workItem;
}

async function requireReviewWorkItem(
  store: CaseStoreV1,
  caseHash: ContractSha256,
) {
  const workItem = await store.getReviewWorkItem(caseHash);
  if (workItem === null) throw notFound("Review work item");
  return workItem;
}

function sameSecret(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function schemaRef(component: string): { readonly $ref: string } {
  return { $ref: `${CASE_STORE_SCHEMA_ID}#/$defs/${component}` };
}

function doctrineSchemaRef(component: string): { readonly $ref: string } {
  return { $ref: `${DOCTRINE_APPROVAL_SCHEMA_ID}#/$defs/${component}` };
}

function doctrineRetrievalSchemaRef(component: string): { readonly $ref: string } {
  return { $ref: `${DOCTRINE_RETRIEVAL_SCHEMA_ID}#/$defs/${component}` };
}

function doctrineMutationResponseSchemas(): Record<number, unknown> {
  const result = doctrineSchemaRef("DoctrineApprovalMutationResultV1");
  return { 200: result, 201: result };
}

function reviewSchemaRef(component: string): { readonly $ref: string } {
  return { $ref: `${REVIEW_WORKFLOW_SCHEMA_ID}#/$defs/${component}` };
}

function reviewMutationResponseSchemas(): Record<number, unknown> {
  const result = reviewSchemaRef("ReviewWorkflowMutationResultV1");
  return { 200: result, 201: result };
}

function assertReviewWorkItemResponseBoundary(
  workItem: ReviewWorkItemDetailV1,
): void {
  const hasAssessment = workItem.assessment !== null;
  const hasReveal = workItem.revealReceipt !== null;
  const hasDecision = workItem.decision !== null;
  const hasReview = workItem.review !== null;
  const hasBinding = workItem.workflowBinding !== null;
  const hasConflict = workItem.decisionConflict !== null;
  const valid =
    (workItem.state === "awaiting_assessment" &&
      !hasAssessment &&
      !hasReveal &&
      !hasDecision &&
      !hasReview &&
      !hasBinding &&
      !hasConflict) ||
    (workItem.state === "awaiting_reveal" &&
      hasAssessment &&
      !hasReveal &&
      !hasDecision &&
      !hasReview &&
      !hasBinding &&
      !hasConflict) ||
    (workItem.state === "awaiting_final_review" &&
      hasAssessment &&
      hasReveal &&
      hasDecision &&
      !hasReview &&
      !hasBinding &&
      !hasConflict) ||
    (workItem.state === "completed" &&
      hasAssessment &&
      hasReveal &&
      hasDecision &&
      hasReview &&
      hasBinding &&
      hasConflict);
  if (!valid) {
    throw new CaseApiHttpError(
      500,
      "INTERNAL_ERROR",
      "Reviewer response violated the backend blind-review state boundary.",
    );
  }
}

function doctrineIdParamsSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["doctrineId"],
    properties: {
      doctrineId: { type: "string", minLength: 1, maxLength: 200 },
    },
  };
}

function hashParamsSchema(name: string): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [name],
    properties: {
      [name]: { type: "string", pattern: SHA256_PATTERN },
    },
  };
}

function sendMutation(
  reply: FastifyReply,
  requestId: string,
  status: "inserted" | "existing",
  resourceKind: "synthetic_case_bundle" | "brooks_decision" | "calvin_review",
  resourceHash: ContractSha256,
) {
  const body = createCaseApiMutationResult({
    requestId,
    status,
    resourceKind,
    resourceHash,
  });
  return reply.code(status === "inserted" ? 201 : 200).send(body);
}

function sendDoctrineMutation(
  reply: FastifyReply,
  requestId: string,
  result: {
    readonly status: "inserted" | "existing";
    readonly resourceHash: ContractSha256;
  },
  resourceKind: DoctrineApprovalMutationResultV1["resourceKind"],
  workItem: DoctrineWorkItemV1,
) {
  return reply.code(result.status === "inserted" ? 201 : 200).send(
    createDoctrineApprovalMutationResult({
      requestId,
      status: result.status,
      resourceKind,
      resourceHash: result.resourceHash,
      workItem,
    }),
  );
}

function sendReviewMutation(
  reply: FastifyReply,
  requestId: string,
  result: {
    readonly status: "inserted" | "existing";
    readonly resourceHash: ContractSha256;
  },
  resourceKind:
    | "calvin_independent_assessment"
    | "decision_reveal_receipt"
    | "calvin_review_workflow",
  workItem: ReviewWorkItemDetailV1,
) {
  assertReviewWorkItemResponseBoundary(workItem);
  return reply.code(result.status === "inserted" ? 201 : 200).send(
    createReviewWorkflowMutationResult({
      requestId,
      status: result.status,
      resourceKind,
      resourceHash: result.resourceHash,
      workItem,
    }),
  );
}

function sendError(
  reply: FastifyReply,
  requestId: string,
  statusCode: number,
  code: CaseApiErrorCodeV1,
  message: string,
) {
  return reply.code(statusCode).send(
    createCaseApiError({
      requestId,
      code,
      message: Array.from(message).slice(0, 300).join(""),
    }),
  );
}

function mapError(error: unknown): {
  readonly statusCode: number;
  readonly code: CaseApiErrorCodeV1;
  readonly message: string;
} {
  if (error instanceof CaseApiHttpError) return error;
  if (error instanceof PersistenceContractError) {
    return { statusCode: 400, code: "INVALID_JSON", message: error.message };
  }
  if (error instanceof CaseStoreError) {
    if (error.code === "IDENTITY_CONFLICT") {
      return { statusCode: 409, code: "IDENTITY_CONFLICT", message: error.message };
    }
    if (error.code === "INTEGRITY_VIOLATION") {
      return { statusCode: 422, code: "INVALID_RECORD", message: error.message };
    }
    return { statusCode: 503, code: "DEPENDENCY_UNAVAILABLE", message: error.message };
  }
  const fastifyError = error as Error & {
    readonly code?: string;
    readonly validation?: unknown;
  };
  if (fastifyError.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return { statusCode: 413, code: "BODY_TOO_LARGE", message: "Request body exceeds the Phase 2 limit." };
  }
  if (fastifyError.validation !== undefined) {
    return { statusCode: 422, code: "INVALID_RECORD", message: "Request does not match the closed Phase 2 schema." };
  }
  return { statusCode: 500, code: "INTERNAL_ERROR", message: "The local API request failed." };
}

function notFound(subject: string): CaseApiHttpError {
  return new CaseApiHttpError(404, "NOT_FOUND", `${subject} was not found.`);
}

async function validateBundleArtifacts(
  bundle: SyntheticCaseBundleV1,
  artifactRoot: string,
): Promise<void> {
  for (const metadata of [
    bundle.chartMetadata.context,
    bundle.chartMetadata.detail,
  ]) {
    const filename = `${metadata.contentHash.slice("sha256:".length)}.png`;
    let bytes: Buffer;
    try {
      bytes = await readFile(resolve(artifactRoot, filename));
    } catch {
      throw new CaseApiHttpError(
        503,
        "DEPENDENCY_UNAVAILABLE",
        "A required content-addressed chart artifact is missing.",
      );
    }
    validatePngBytes(bytes, metadata);
  }
}

function validatePngBytes(
  bytes: Buffer,
  metadata: {
    readonly contentHash: ContractSha256;
    readonly byteLength: number;
    readonly widthPx: number;
    readonly heightPx: number;
  },
): void {
  const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (
    bytes.length !== metadata.byteLength ||
    contentHash !== metadata.contentHash ||
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE) ||
    bytes.readUInt32BE(16) !== metadata.widthPx ||
    bytes.readUInt32BE(20) !== metadata.heightPx
  ) {
    throw new CaseApiHttpError(
      503,
      "DEPENDENCY_UNAVAILABLE",
      "Content-addressed chart bytes failed integrity validation.",
    );
  }
}
