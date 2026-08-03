import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCaseStoreTransportDocumentsV1,
  buildDoctrineApprovalTransportDocumentsV1,
  buildDoctrineRetrievalTransportDocumentsV1,
  buildReplayBoundaryTransportDocumentsV1,
  buildReviewWorkflowTransportDocumentsV1,
  buildTransportSchemaDocumentsV1,
} from "./schema-generator-v1.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemasDirectory = resolve(packageRoot, "schemas");
const openapiDirectory = resolve(packageRoot, "openapi");
const documents = buildTransportSchemaDocumentsV1(packageRoot);
const replayDocuments = buildReplayBoundaryTransportDocumentsV1(packageRoot);
const caseStoreDocuments = buildCaseStoreTransportDocumentsV1(packageRoot);
const reviewWorkflowDocuments = buildReviewWorkflowTransportDocumentsV1(packageRoot);
const doctrineApprovalDocuments = buildDoctrineApprovalTransportDocumentsV1(packageRoot);
const doctrineRetrievalDocuments = buildDoctrineRetrievalTransportDocumentsV1(packageRoot);

await mkdir(schemasDirectory, { recursive: true });
await mkdir(openapiDirectory, { recursive: true });
await Promise.all([
  writeJson(
    resolve(schemasDirectory, "phase1-persisted-records-v1.schema.json"),
    documents.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "phase1-persisted-records-v1.openapi.json"),
    documents.openapi,
  ),
  writeJson(
    resolve(schemasDirectory, "replay-boundary-v1.schema.json"),
    replayDocuments.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "replay-boundary-v1.openapi.json"),
    replayDocuments.openapi,
  ),
  writeJson(
    resolve(schemasDirectory, "phase2-case-store-v1.schema.json"),
    caseStoreDocuments.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "phase2-case-store-v1.openapi.json"),
    caseStoreDocuments.openapi,
  ),
  writeJson(
    resolve(schemasDirectory, "phase3a-review-workflow-v1.schema.json"),
    reviewWorkflowDocuments.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "phase3a-review-workflow-v1.openapi.json"),
    reviewWorkflowDocuments.openapi,
  ),
  writeJson(
    resolve(schemasDirectory, "phase3b-doctrine-approval-v1.schema.json"),
    doctrineApprovalDocuments.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "phase3b-doctrine-approval-v1.openapi.json"),
    doctrineApprovalDocuments.openapi,
  ),
  writeJson(
    resolve(schemasDirectory, "phase4a-doctrine-retrieval-v1.schema.json"),
    doctrineRetrievalDocuments.schemaBundle,
  ),
  writeJson(
    resolve(openapiDirectory, "phase4a-doctrine-retrieval-v1.openapi.json"),
    doctrineRetrievalDocuments.openapi,
  ),
]);

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
