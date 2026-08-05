import {
  BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2,
  type BrooksIdentityFreeResponseV2,
} from "./brooks-identity-free-response-v2.ts";
import { deepFreeze } from "./contract-utils-v1.ts";
import type {
  BrooksMultiTimeframeV1,
  BrooksReferenceTimeframeV1,
  MultiTimeframeBarLifecycleV1,
} from "./brooks-multi-timeframe-input-v1.ts";

export const BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_VERSION_V1 =
  "brooks-multi-timeframe-identity-free-response.v1" as const;

export const BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_KEYS_V1 = [
  "primaryDecision",
  "timeframeEvidence",
  "referenceAssessments",
  "gapAssessments",
  "crossTimeframeConflictAssessment",
  "geometryAnchors",
] as const;

export const BROOKS_MULTI_TIMEFRAME_REFERENCE_RELATIONSHIPS_V1 = [
  "supports",
  "limits",
  "opposes",
  "no_material_effect",
  "uncertain",
  "unavailable_for_this_decision",
] as const;
export const BROOKS_MULTI_TIMEFRAME_GAP_MATERIALITIES_V1 = [
  "material",
  "immaterial",
  "uncertain",
] as const;
export const BROOKS_MULTI_TIMEFRAME_CONFLICT_STATES_V1 = [
  "not_applicable",
  "no_material_conflict",
  "material_conflict",
  "uncertain",
] as const;
export const BROOKS_MULTI_TIMEFRAME_EVIDENCE_FIELDS_V1 = [
  "open",
  "high",
  "low",
  "close",
  "relationship",
] as const;

export type BrooksMultiTimeframeReferenceRelationshipV1 =
  (typeof BROOKS_MULTI_TIMEFRAME_REFERENCE_RELATIONSHIPS_V1)[number];
export type BrooksMultiTimeframeGapMaterialityV1 =
  (typeof BROOKS_MULTI_TIMEFRAME_GAP_MATERIALITIES_V1)[number];
export type BrooksMultiTimeframeConflictStateV1 =
  (typeof BROOKS_MULTI_TIMEFRAME_CONFLICT_STATES_V1)[number];
export type BrooksMultiTimeframeEvidenceFieldV1 =
  (typeof BROOKS_MULTI_TIMEFRAME_EVIDENCE_FIELDS_V1)[number];

export interface BrooksMultiTimeframeEvidenceReferenceV1 {
  readonly evidenceId: string;
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly barId: string;
  readonly field: BrooksMultiTimeframeEvidenceFieldV1;
  readonly normalizedValue: number | null;
  readonly lifecycle: MultiTimeframeBarLifecycleV1;
  readonly claimScope: readonly string[];
  readonly doctrineClaimReferences: readonly string[];
}

export interface BrooksMultiTimeframeReferenceAssessmentV1 {
  readonly timeframe: BrooksReferenceTimeframeV1;
  readonly relationship: BrooksMultiTimeframeReferenceRelationshipV1;
  readonly summaryCode: string;
  readonly evidenceReferences: readonly string[];
  readonly doctrineClaimReferences: readonly string[];
}

export interface BrooksMultiTimeframeGapAssessmentV1 {
  readonly gapId: string;
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly materiality: BrooksMultiTimeframeGapMaterialityV1;
  readonly affectedClaims: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly doctrineClaimReferences: readonly string[];
  readonly resolutionCondition: string;
}

export interface BrooksMultiTimeframeConflictAssessmentV1 {
  readonly state: BrooksMultiTimeframeConflictStateV1;
  readonly summaryCode: string;
  readonly evidenceReferences: readonly string[];
  readonly doctrineClaimReferences: readonly string[];
}

export interface BrooksMultiTimeframeGeometryAnchorV1 {
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly barId: string;
  readonly field: "open" | "high" | "low" | "close";
  readonly lifecycle: MultiTimeframeBarLifecycleV1;
  readonly normalizedValue: number;
}

export interface BrooksMultiTimeframeIdentityFreeResponseV1 {
  readonly primaryDecision: Readonly<BrooksIdentityFreeResponseV2>;
  readonly timeframeEvidence: readonly Readonly<BrooksMultiTimeframeEvidenceReferenceV1>[];
  readonly referenceAssessments: Readonly<{
    sixtyMinute: Readonly<BrooksMultiTimeframeReferenceAssessmentV1> | null;
    daily: Readonly<BrooksMultiTimeframeReferenceAssessmentV1> | null;
  }>;
  readonly gapAssessments: readonly Readonly<BrooksMultiTimeframeGapAssessmentV1>[];
  readonly crossTimeframeConflictAssessment: Readonly<BrooksMultiTimeframeConflictAssessmentV1>;
  readonly geometryAnchors: Readonly<{
    entry: Readonly<BrooksMultiTimeframeGeometryAnchorV1> | null;
    protection: Readonly<BrooksMultiTimeframeGeometryAnchorV1> | null;
    objective: Readonly<BrooksMultiTimeframeGeometryAnchorV1> | null;
  }>;
}

export class BrooksMultiTimeframeIdentityFreeResponseContractError extends Error {
  override readonly name =
    "BrooksMultiTimeframeIdentityFreeResponseContractError";
}

export function createBrooksMultiTimeframeIdentityFreeResponseV1(
  input: BrooksMultiTimeframeIdentityFreeResponseV1,
): Readonly<BrooksMultiTimeframeIdentityFreeResponseV1> {
  try {
    assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(input);
    return deepFreeze(structuredClone(input));
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksMultiTimeframeIdentityFreeResponseShapeV1(
  value: unknown,
): asserts value is BrooksMultiTimeframeIdentityFreeResponseV1 {
  try {
    const response = exactRecord("multi-timeframe identity-free response", value, [
      ...BROOKS_MULTI_TIMEFRAME_IDENTITY_FREE_RESPONSE_KEYS_V1,
    ]);
    exactRecord(
      "primary Brooks decision",
      response.primaryDecision,
      BROOKS_IDENTITY_FREE_RESPONSE_KEYS_V2,
    );
    const evidence = plainArray("timeframeEvidence", response.timeframeEvidence).map(
      (item, index) => validateEvidence(item, index),
    );
    assertUnique(
      "timeframe evidence IDs",
      evidence.map((item) => item.evidenceId),
    );
    const referenceAssessments = exactRecord(
      "referenceAssessments",
      response.referenceAssessments,
      ["sixtyMinute", "daily"],
    );
    validateReferenceAssessment(
      referenceAssessments.sixtyMinute,
      "60m",
      "sixtyMinute",
    );
    validateReferenceAssessment(referenceAssessments.daily, "1d", "daily");
    const gaps = plainArray("gapAssessments", response.gapAssessments).map(
      (item, index) => validateGap(item, index),
    );
    assertUnique(
      "gap assessment IDs",
      gaps.map((item) => item.gapId),
    );
    validateConflict(response.crossTimeframeConflictAssessment);
    const geometry = exactRecord("geometryAnchors", response.geometryAnchors, [
      "entry",
      "protection",
      "objective",
    ]);
    for (const field of ["entry", "protection", "objective"] as const) {
      validateGeometryAnchor(geometry[field], field);
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateEvidence(
  value: unknown,
  index: number,
): BrooksMultiTimeframeEvidenceReferenceV1 {
  const record = exactRecord(`timeframeEvidence[${index}]`, value, [
    "evidenceId",
    "timeframe",
    "barId",
    "field",
    "normalizedValue",
    "lifecycle",
    "claimScope",
    "doctrineClaimReferences",
  ]);
  assertNonEmptyString(`timeframeEvidence[${index}].evidenceId`, record.evidenceId);
  assertTimeframe(`timeframeEvidence[${index}].timeframe`, record.timeframe);
  assertAnonymousBarId(
    `timeframeEvidence[${index}].barId`,
    record.barId,
    record.timeframe as BrooksMultiTimeframeV1,
    record.lifecycle,
  );
  if (
    typeof record.field !== "string" ||
    !BROOKS_MULTI_TIMEFRAME_EVIDENCE_FIELDS_V1.includes(
      record.field as BrooksMultiTimeframeEvidenceFieldV1,
    )
  ) {
    fail(`timeframeEvidence[${index}].field is unsupported`);
  }
  if (record.field === "relationship") {
    if (record.normalizedValue !== null) {
      fail(
        `timeframeEvidence[${index}].normalizedValue must be null for relationship evidence`,
      );
    }
  } else if (
    typeof record.normalizedValue !== "number" ||
    !Number.isFinite(record.normalizedValue)
  ) {
    fail(
      `timeframeEvidence[${index}].normalizedValue must be finite for OHLC evidence`,
    );
  }
  nonEmptyStringArray(`timeframeEvidence[${index}].claimScope`, record.claimScope);
  nonEmptyStringArray(
    `timeframeEvidence[${index}].doctrineClaimReferences`,
    record.doctrineClaimReferences,
  );
  return record as unknown as BrooksMultiTimeframeEvidenceReferenceV1;
}

function validateReferenceAssessment(
  value: unknown,
  timeframe: BrooksReferenceTimeframeV1,
  name: string,
): void {
  if (value === null) return;
  const record = exactRecord(`${name} reference assessment`, value, [
    "timeframe",
    "relationship",
    "summaryCode",
    "evidenceReferences",
    "doctrineClaimReferences",
  ]);
  if (record.timeframe !== timeframe) {
    fail(`${name} reference assessment has the wrong timeframe`);
  }
  if (
    typeof record.relationship !== "string" ||
    !BROOKS_MULTI_TIMEFRAME_REFERENCE_RELATIONSHIPS_V1.includes(
      record.relationship as BrooksMultiTimeframeReferenceRelationshipV1,
    )
  ) {
    fail(`${name} reference relationship is unsupported`);
  }
  assertNonEmptyString(`${name} reference summaryCode`, record.summaryCode);
  const allowEmpty = record.relationship === "unavailable_for_this_decision";
  stringArray(`${name} evidenceReferences`, record.evidenceReferences, allowEmpty);
  stringArray(
    `${name} doctrineClaimReferences`,
    record.doctrineClaimReferences,
    allowEmpty,
  );
}

function validateGap(
  value: unknown,
  index: number,
): BrooksMultiTimeframeGapAssessmentV1 {
  const record = exactRecord(`gapAssessments[${index}]`, value, [
    "gapId",
    "timeframe",
    "materiality",
    "affectedClaims",
    "evidenceReferences",
    "doctrineClaimReferences",
    "resolutionCondition",
  ]);
  assertNonEmptyString(`gapAssessments[${index}].gapId`, record.gapId);
  assertTimeframe(`gapAssessments[${index}].timeframe`, record.timeframe);
  if (
    typeof record.materiality !== "string" ||
    !BROOKS_MULTI_TIMEFRAME_GAP_MATERIALITIES_V1.includes(
      record.materiality as BrooksMultiTimeframeGapMaterialityV1,
    )
  ) {
    fail(`gapAssessments[${index}].materiality is unsupported`);
  }
  nonEmptyStringArray(`gapAssessments[${index}].affectedClaims`, record.affectedClaims);
  nonEmptyStringArray(
    `gapAssessments[${index}].evidenceReferences`,
    record.evidenceReferences,
  );
  nonEmptyStringArray(
    `gapAssessments[${index}].doctrineClaimReferences`,
    record.doctrineClaimReferences,
  );
  assertNonEmptyString(
    `gapAssessments[${index}].resolutionCondition`,
    record.resolutionCondition,
  );
  return record as unknown as BrooksMultiTimeframeGapAssessmentV1;
}

function validateConflict(value: unknown): void {
  const record = exactRecord("crossTimeframeConflictAssessment", value, [
    "state",
    "summaryCode",
    "evidenceReferences",
    "doctrineClaimReferences",
  ]);
  if (
    typeof record.state !== "string" ||
    !BROOKS_MULTI_TIMEFRAME_CONFLICT_STATES_V1.includes(
      record.state as BrooksMultiTimeframeConflictStateV1,
    )
  ) {
    fail("cross-timeframe conflict state is unsupported");
  }
  assertNonEmptyString("cross-timeframe conflict summaryCode", record.summaryCode);
  const allowEmpty = record.state === "not_applicable";
  stringArray("cross-timeframe conflict evidenceReferences", record.evidenceReferences, allowEmpty);
  stringArray(
    "cross-timeframe conflict doctrineClaimReferences",
    record.doctrineClaimReferences,
    allowEmpty,
  );
}

function validateGeometryAnchor(value: unknown, name: string): void {
  if (value === null) return;
  const record = exactRecord(`${name} geometry anchor`, value, [
    "timeframe",
    "barId",
    "field",
    "lifecycle",
    "normalizedValue",
  ]);
  assertTimeframe(`${name} geometry anchor timeframe`, record.timeframe);
  assertAnonymousBarId(
    `${name} geometry anchor barId`,
    record.barId,
    record.timeframe as BrooksMultiTimeframeV1,
    record.lifecycle,
  );
  if (
    record.field !== "open" &&
    record.field !== "high" &&
    record.field !== "low" &&
    record.field !== "close"
  ) {
    fail(`${name} geometry anchor field is unsupported`);
  }
  if (typeof record.normalizedValue !== "number" || !Number.isFinite(record.normalizedValue)) {
    fail(`${name} geometry anchor normalizedValue must be finite`);
  }
}

function assertAnonymousBarId(
  name: string,
  value: unknown,
  timeframe: BrooksMultiTimeframeV1,
  lifecycle: unknown,
): void {
  if (lifecycle !== "finalized" && lifecycle !== "provisional") {
    fail(`${name} lifecycle is unsupported`);
  }
  if (
    typeof value !== "string" ||
    !new RegExp(`^bar:${timeframe}:${lifecycle}:[0-9]{3}$`).test(value)
  ) {
    fail(`${name} must match its timeframe and lifecycle`);
  }
}

function assertTimeframe(name: string, value: unknown): void {
  if (value !== "5m" && value !== "60m" && value !== "1d") {
    fail(`${name} is unsupported`);
  }
}

function exactRecord(
  name: string,
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${name} must be a plain object with exact keys`);
  }
  const record = value as Record<string, unknown>;
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  const actual = Object.getOwnPropertyNames(record);
  const unknown = actual.find((key) => !keys.includes(key));
  if (unknown !== undefined) fail(`${name} contains unknown field: ${unknown}`);
  const missing = keys.find((key) => !actual.includes(key));
  if (missing !== undefined) fail(`${name} is missing field: ${missing}`);
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${name} fields must be enumerable data properties`);
    }
  }
  return record;
}

function plainArray(name: string, value: unknown): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`${name} must be a plain array`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  const names = Object.getOwnPropertyNames(value);
  if (
    names.some(
      (field) =>
        field !== "length" &&
        (!/^(0|[1-9][0-9]*)$/.test(field) || Number(field) >= value.length),
    )
  ) {
    fail(`${name} contains non-index fields`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      fail(`${name} must not be sparse or contain accessors`);
    }
  }
  return value;
}

function nonEmptyStringArray(name: string, value: unknown): string[] {
  return stringArray(name, value, false);
}

function stringArray(name: string, value: unknown, allowEmpty: boolean): string[] {
  const items = plainArray(name, value);
  if (
    (!allowEmpty && items.length === 0) ||
    items.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    fail(`${name} must be ${allowEmpty ? "a" : "a non-empty"} string array`);
  }
  return [...items] as string[];
}

function assertUnique(name: string, values: readonly string[]): void {
  if (new Set(values).size !== values.length) fail(`${name} must be unique`);
}

function assertNonEmptyString(name: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${name} must be a non-empty string`);
  }
}

function fail(message: string): never {
  throw new BrooksMultiTimeframeIdentityFreeResponseContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksMultiTimeframeIdentityFreeResponseContractError) {
    throw error;
  }
  throw new BrooksMultiTimeframeIdentityFreeResponseContractError(
    error instanceof Error ? error.message : "multi-timeframe response validation failed",
  );
}
