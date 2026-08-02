import {
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  assertStringList,
  assertUnique,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";

export const SOURCE_TYPES = [
  "brooks_website",
  "official_youtube",
  "reviewed_transcript",
  "private_material",
] as const;

export const DOCTRINE_STATUSES = ["draft", "approved", "retired"] as const;

export type SourceTypeV1 = (typeof SOURCE_TYPES)[number];
export type DoctrineStatusV1 = (typeof DOCTRINE_STATUSES)[number];

export interface SourceV1 {
  readonly sourceId: string;
  readonly sourceType: SourceTypeV1;
  readonly title: string;
  readonly urlOrLocalRef: string;
  readonly contentHash: ContractSha256;
  readonly private: boolean;
}

export interface DoctrineUnitV1 {
  readonly doctrineId: string;
  readonly sourceId: string;
  readonly concept: string;
  readonly rule: string;
  readonly appliesWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly decisionEffect: readonly string[];
  readonly status: DoctrineStatusV1;
}

export interface DoctrineRagRecordV1 {
  readonly doctrineId: string;
  readonly concept: string;
  readonly rule: string;
  readonly appliesWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly decisionEffect: readonly string[];
}

export class DoctrineContractError extends Error {
  override readonly name = "DoctrineContractError";
}

export function createSource(input: SourceV1): Readonly<SourceV1> {
  try {
    assertNonEmpty("sourceId", input.sourceId);
    assertOneOf("sourceType", input.sourceType, SOURCE_TYPES);
    assertNonEmpty("title", input.title);
    assertNonEmpty("urlOrLocalRef", input.urlOrLocalRef);
    assertSha256("contentHash", input.contentHash);
    if (typeof input.private !== "boolean") {
      throw new Error("source private must be boolean");
    }
  } catch (error) {
    throw asDoctrineError(error);
  }

  return deepFreeze({ ...input });
}

export function createDoctrineUnit(
  input: DoctrineUnitV1,
): Readonly<DoctrineUnitV1> {
  try {
    assertNonEmpty("doctrineId", input.doctrineId);
    assertNonEmpty("sourceId", input.sourceId);
    assertNonEmpty("concept", input.concept);
    assertNonEmpty("rule", input.rule);
    assertStringList("appliesWhen", input.appliesWhen, { min: 1, max: 12 });
    assertStringList("avoidWhen", input.avoidWhen, { min: 1, max: 12 });
    assertStringList("decisionEffect", input.decisionEffect, {
      min: 1,
      max: 12,
    });
    assertOneOf("status", input.status, DOCTRINE_STATUSES);
  } catch (error) {
    throw asDoctrineError(error);
  }

  return deepFreeze({
    ...input,
    appliesWhen: [...input.appliesWhen],
    avoidWhen: [...input.avoidWhen],
    decisionEffect: [...input.decisionEffect],
  });
}

export function toDoctrineRagRecord(
  unit: DoctrineUnitV1,
): Readonly<DoctrineRagRecordV1> {
  if (unit.status !== "approved") {
    throw new DoctrineContractError("only approved doctrine can enter RAG");
  }

  return deepFreeze({
    doctrineId: unit.doctrineId,
    concept: unit.concept,
    rule: unit.rule,
    appliesWhen: [...unit.appliesWhen],
    avoidWhen: [...unit.avoidWhen],
    decisionEffect: [...unit.decisionEffect],
  });
}

export function resolveApprovedDoctrineReferences(
  doctrineIds: readonly string[],
  retrievedUnits: readonly DoctrineUnitV1[],
): readonly Readonly<DoctrineUnitV1>[] {
  try {
    assertStringList("doctrineIds", doctrineIds, { min: 1, max: 32 });
    assertUnique("doctrineId", doctrineIds);
  } catch (error) {
    throw asDoctrineError(error);
  }

  const byId = new Map(retrievedUnits.map((unit) => [unit.doctrineId, unit]));
  const resolved = doctrineIds.map((doctrineId) => {
    const unit = byId.get(doctrineId);
    if (unit === undefined) {
      throw new DoctrineContractError(
        `doctrine was not retrieved: ${doctrineId}`,
      );
    }
    if (unit.status !== "approved") {
      throw new DoctrineContractError(
        `doctrine is not approved: ${doctrineId}`,
      );
    }
    return unit;
  });

  return deepFreeze([...resolved]);
}

function asDoctrineError(error: unknown): DoctrineContractError {
  if (error instanceof DoctrineContractError) {
    return error;
  }
  return new DoctrineContractError(
    error instanceof Error ? error.message : String(error),
  );
}
