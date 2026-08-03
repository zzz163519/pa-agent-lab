import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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
} from "@pa-agent-lab/contracts";
import {
  CASE_API_BODY_LIMIT_BYTES,
  CASE_API_ROUTE_MANIFEST_V1,
  PersistenceContractError,
  createCaseApiError,
  createCaseApiMutationResult,
  parseStrictJsonText,
  type CaseApiErrorCodeV1,
  type CaseAuditViewV1,
  type SyntheticCaseBundleV1,
} from "@pa-agent-lab/persistence-contracts";

const CASE_STORE_SCHEMA_ID =
  "https://pa-agent-lab.local/schemas/phase2-case-store-v1";
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

export interface RequestPrincipalV1 {
  readonly principalId: "local:phase2-operator";
  readonly authenticationMethod: "local_token";
}

export interface CaseApiOptionsV1 {
  readonly store: CaseStoreV1;
  readonly artifactRoot: string;
  readonly localToken: string;
  readonly authorizedSyntheticBundleHashes: readonly ContractSha256[];
  readonly allowedHosts: readonly string[];
  readonly allowedOrigins: readonly string[];
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
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => done(null, body),
  );

  app.addHook("onRequest", async (request) => {
    enforceLocalOrigin(request, options.allowedHosts, options.allowedOrigins);
    const route = CASE_API_ROUTE_MANIFEST_V1.find(
      (entry) => entry.path === request.routeOptions.url,
    );
    if (route?.authentication !== "local_token") return;
    const authorization = request.headers.authorization;
    const prefix = "Bearer ";
    if (
      typeof authorization !== "string" ||
      !authorization.startsWith(prefix) ||
      !sameSecret(authorization.slice(prefix.length), options.localToken)
    ) {
      throw new CaseApiHttpError(
        401,
        "UNAUTHORIZED",
        "A valid local Phase 2 token is required.",
      );
    }
    principals.set(request, {
      principalId: "local:phase2-operator",
      authenticationMethod: "local_token",
    });
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
  if (options.localToken.length < 32) {
    throw new Error("Phase 2 local token must contain at least 32 characters");
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
