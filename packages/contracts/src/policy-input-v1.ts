import {
  assertFiniteNumber,
  assertNonEmpty,
  assertOneOf,
  assertSha256,
  assertStringList,
  assertUnique,
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import type { DoctrineRagRecordV1 } from "./doctrine-v1.ts";
import { FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS } from "./model-call-schedule-v1.ts";

export const BROOKS_POLICY_CASE_SCHEMA_VERSION = "brooks-policy-case.v1" as const;
export const BROOKS_POLICY_INPUT_SCHEMA_VERSION = "brooks-policy-input.v1" as const;
export const OUTBOUND_MODEL_PAYLOAD_SCHEMA_VERSION =
  "outbound-model-payload.v1" as const;
export const BROOKS_CONTEXT_BAR_COUNT = 120 as const;
export const BROOKS_DETAIL_BAR_COUNT = 40 as const;
export const NORMALIZED_FIRST_VISIBLE_CLOSE = 100 as const;

export const BAR_CONTINUITY_STATES = [
  "contiguous",
  "session_boundary",
  "missing_data",
  "unknown",
] as const;

export type BarContinuityStateV1 = (typeof BAR_CONTINUITY_STATES)[number];

export interface LocalClosedBarV1 {
  readonly barId: string;
  readonly sequence: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly isClosed: boolean;
  readonly continuityFromPrevious: BarContinuityStateV1;
}

export interface CreateBrooksPolicyCaseInputV1 {
  readonly caseId: string;
  readonly policyStreamId: string;
  readonly barDurationSeconds: number;
  readonly bars: readonly LocalClosedBarV1[];
  readonly lastVisibleBarId: string;
  readonly isLeftCensored: boolean;
}

export interface BrooksPolicyCaseV1 {
  readonly schemaVersion: typeof BROOKS_POLICY_CASE_SCHEMA_VERSION;
  readonly caseHash: ContractSha256;
  readonly caseId: string;
  readonly policyStreamId: string;
  readonly barDurationSeconds: typeof FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS;
  readonly bars: readonly Readonly<LocalClosedBarV1>[];
  readonly lastVisibleBarId: string;
  readonly isLeftCensored: boolean;
}

export interface AnonymousChartManifestV1 {
  readonly panel: "context" | "detail";
  readonly mediaType: "image/png";
  readonly contentHash: ContractSha256;
  readonly barIds: readonly string[];
  readonly lastVisibleBarId: string;
}

export interface CreateBrooksPolicyInputInputV1 {
  readonly policyCase: BrooksPolicyCaseV1;
  readonly charts: Readonly<{
    context: AnonymousChartManifestV1;
    detail: AnonymousChartManifestV1;
  }>;
  readonly doctrine: readonly DoctrineRagRecordV1[];
}

export interface NormalizedClosedBarV1 {
  readonly barId: string;
  readonly sequence: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly continuityFromPrevious: BarContinuityStateV1;
}

export interface BrooksPolicyInputV1 {
  readonly schemaVersion: typeof BROOKS_POLICY_INPUT_SCHEMA_VERSION;
  readonly inputHash: ContractSha256;
  readonly market: Readonly<{
    barDurationSeconds: typeof FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS;
    lastVisibleBarId: string;
    visibleBarCount: number;
    isLeftCensored: boolean;
    leftCensoredBarsMissing: number;
    normalization: Readonly<{
      method: "first_visible_close_equals_100";
      base: typeof NORMALIZED_FIRST_VISIBLE_CLOSE;
      anchorBarId: string;
    }>;
    bars: readonly Readonly<NormalizedClosedBarV1>[];
  }>;
  readonly charts: Readonly<{
    context: Readonly<AnonymousChartManifestV1>;
    detail: Readonly<AnonymousChartManifestV1>;
  }>;
  readonly doctrine: readonly Readonly<DoctrineRagRecordV1>[];
}

export interface CreateOutboundModelPayloadInputV1 {
  readonly policyInput: BrooksPolicyInputV1;
  readonly promptHash: ContractSha256;
  readonly outputSchemaVersion: string;
}

export interface OutboundModelPayloadV1 {
  readonly schemaVersion: typeof OUTBOUND_MODEL_PAYLOAD_SCHEMA_VERSION;
  readonly payloadHash: ContractSha256;
  readonly policyInput: BrooksPolicyInputV1;
  readonly promptHash: ContractSha256;
  readonly outputSchemaVersion: string;
}

export class PolicyInputContractError extends Error {
  override readonly name = "PolicyInputContractError";
}

export function createBrooksPolicyCase(
  input: CreateBrooksPolicyCaseInputV1,
): BrooksPolicyCaseV1 {
  try {
    assertNonEmpty("caseId", input.caseId);
    assertNonEmpty("policyStreamId", input.policyStreamId);
    if (
      input.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS
    ) {
      fail("V1 Brooks policy requires 300-second bars");
    }
    validateLocalBars(input.bars, input.isLeftCensored);
    const finalBar = input.bars.at(-1);
    if (finalBar?.barId !== input.lastVisibleBarId) {
      fail("lastVisibleBarId must identify the final closed bar");
    }

    const body = {
      caseId: input.caseId,
      policyStreamId: input.policyStreamId,
      barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
      bars: input.bars.map((bar) => ({ ...bar })),
      lastVisibleBarId: input.lastVisibleBarId,
      isLeftCensored: input.isLeftCensored,
    } as const;
    return deepFreeze({
      schemaVersion: BROOKS_POLICY_CASE_SCHEMA_VERSION,
      caseHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksPolicyCaseIntegrity(
  policyCase: BrooksPolicyCaseV1,
): void {
  try {
    validatePolicyCaseRecord(policyCase);
  } catch (error) {
    rethrow(error);
  }
}

export function createBrooksPolicyInput(
  input: CreateBrooksPolicyInputInputV1,
): BrooksPolicyInputV1 {
  try {
    assertBrooksPolicyCaseIntegrity(input.policyCase);
    const firstClose = input.policyCase.bars[0]?.close;
    if (firstClose === undefined || firstClose <= 0) {
      fail("first visible close must be positive");
    }

    const bars = input.policyCase.bars.map((bar, index) => ({
      barId: anonymousBarId(index),
      sequence: index,
      open: normalizePrice(bar.open, firstClose),
      high: normalizePrice(bar.high, firstClose),
      low: normalizePrice(bar.low, firstClose),
      close: normalizePrice(bar.close, firstClose),
      continuityFromPrevious: bar.continuityFromPrevious,
    }));
    const expectedContextIds = bars.map((bar) => bar.barId);
    const expectedDetailIds = expectedContextIds.slice(-BROOKS_DETAIL_BAR_COUNT);
    const lastVisibleBarId = expectedContextIds.at(-1);
    if (lastVisibleBarId === undefined) {
      fail("policy input requires visible bars");
    }

    validateChart(
      "context",
      input.charts.context,
      expectedContextIds,
      lastVisibleBarId,
    );
    validateChart(
      "detail",
      input.charts.detail,
      expectedDetailIds,
      lastVisibleBarId,
    );
    validateDoctrine(input.doctrine);

    const body = {
      market: {
        barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
        lastVisibleBarId,
        visibleBarCount: bars.length,
        isLeftCensored: input.policyCase.isLeftCensored,
        leftCensoredBarsMissing: BROOKS_CONTEXT_BAR_COUNT - bars.length,
        normalization: {
          method: "first_visible_close_equals_100" as const,
          base: NORMALIZED_FIRST_VISIBLE_CLOSE,
          anchorBarId: bars[0]!.barId,
        },
        bars,
      },
      charts: {
        context: cloneChart(input.charts.context),
        detail: cloneChart(input.charts.detail),
      },
      doctrine: input.doctrine.map((record) => ({
        doctrineId: record.doctrineId,
        concept: record.concept,
        rule: record.rule,
        appliesWhen: [...record.appliesWhen],
        avoidWhen: [...record.avoidWhen],
        decisionEffect: [...record.decisionEffect],
      })),
    };
    return deepFreeze({
      schemaVersion: BROOKS_POLICY_INPUT_SCHEMA_VERSION,
      inputHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createOutboundModelPayload(
  input: CreateOutboundModelPayloadInputV1,
): OutboundModelPayloadV1 {
  try {
    assertSha256("promptHash", input.promptHash);
    assertNonEmpty("outputSchemaVersion", input.outputSchemaVersion);
    assertPolicyInputIntegrity(input.policyInput);
    const body = {
      policyInput: input.policyInput,
      promptHash: input.promptHash,
      outputSchemaVersion: input.outputSchemaVersion,
    } as const;
    const payload = deepFreeze({
      schemaVersion: OUTBOUND_MODEL_PAYLOAD_SCHEMA_VERSION,
      payloadHash: canonicalHash(body),
      ...body,
    });
    assertOutboundModelPayloadPrivacy(payload);
    return payload;
  } catch (error) {
    rethrow(error);
  }
}

export function assertOutboundModelPayloadPrivacy(
  value: unknown,
): asserts value is OutboundModelPayloadV1 {
  try {
    const root = exactRecord("outbound payload", value, [
      "schemaVersion",
      "payloadHash",
      "policyInput",
      "promptHash",
      "outputSchemaVersion",
    ]);
    if (root.schemaVersion !== OUTBOUND_MODEL_PAYLOAD_SCHEMA_VERSION) {
      fail("outbound payload schemaVersion is unsupported");
    }
    assertSha256Value("payloadHash", root.payloadHash);
    assertSha256Value("promptHash", root.promptHash);
    assertStringValue("outputSchemaVersion", root.outputSchemaVersion);
    validateUnknownPolicyInput(root.policyInput);

    const expectedPayloadHash = canonicalHash({
      policyInput: root.policyInput,
      promptHash: root.promptHash,
      outputSchemaVersion: root.outputSchemaVersion,
    });
    if (root.payloadHash !== expectedPayloadHash) {
      fail("outbound payload hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

function validateLocalBars(
  bars: readonly LocalClosedBarV1[],
  isLeftCensored: boolean,
): void {
  if (isLeftCensored) {
    if (
      bars.length < BROOKS_DETAIL_BAR_COUNT ||
      bars.length >= BROOKS_CONTEXT_BAR_COUNT
    ) {
      fail("left-censored input requires between 40 and 119 closed bars");
    }
  } else if (bars.length !== BROOKS_CONTEXT_BAR_COUNT) {
    fail("non-censored input requires exactly 120 closed bars");
  }

  assertUnique(
    "barId",
    bars.map((bar) => bar.barId),
  );
  bars.forEach((bar, index) => {
    assertNonEmpty(`bars[${index}].barId`, bar.barId);
    if (!Number.isSafeInteger(bar.sequence) || bar.sequence < 0) {
      fail(`bars[${index}].sequence must be a non-negative safe integer`);
    }
    if (index > 0 && bar.sequence !== bars[index - 1]!.sequence + 1) {
      fail("bar sequences must increase by exactly one");
    }
    if (bar.isClosed !== true) {
      fail("policy cases may contain only closed bars");
    }
    assertOneOf(
      `bars[${index}].continuityFromPrevious`,
      bar.continuityFromPrevious,
      BAR_CONTINUITY_STATES,
    );
    validateOhlc(bar, index);
  });
  if (bars[0]?.continuityFromPrevious !== "unknown") {
    fail("the first visible bar continuity must be unknown");
  }
}

function validateOhlc(bar: LocalClosedBarV1, index: number): void {
  for (const field of ["open", "high", "low", "close"] as const) {
    assertFiniteNumber(`bars[${index}].${field}`, bar[field]);
    if (bar[field] <= 0) {
      fail(`bars[${index}].${field} must be positive`);
    }
  }
  if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
    fail(`bars[${index}] has invalid OHLC geometry`);
  }
}

function validatePolicyCaseRecord(policyCase: BrooksPolicyCaseV1): void {
  if (policyCase.schemaVersion !== BROOKS_POLICY_CASE_SCHEMA_VERSION) {
    fail("policy case schemaVersion is unsupported");
  }
  assertNonEmpty("policy caseId", policyCase.caseId);
  assertNonEmpty("policy streamId", policyCase.policyStreamId);
  if (
    policyCase.barDurationSeconds !==
    FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS
  ) {
    fail("policy case requires 300-second bars");
  }
  if (typeof policyCase.isLeftCensored !== "boolean") {
    fail("policy case isLeftCensored must be boolean");
  }
  assertSha256("caseHash", policyCase.caseHash);
  validateLocalBars(policyCase.bars, policyCase.isLeftCensored);
  if (policyCase.bars.at(-1)?.barId !== policyCase.lastVisibleBarId) {
    fail("policy case lastVisibleBarId is inconsistent");
  }
  const expectedHash = canonicalHash({
    caseId: policyCase.caseId,
    policyStreamId: policyCase.policyStreamId,
    barDurationSeconds: policyCase.barDurationSeconds,
    bars: policyCase.bars,
    lastVisibleBarId: policyCase.lastVisibleBarId,
    isLeftCensored: policyCase.isLeftCensored,
  });
  if (policyCase.caseHash !== expectedHash) {
    fail("policy case hash does not match its content");
  }
}

function validateChart(
  panel: "context" | "detail",
  chart: AnonymousChartManifestV1,
  expectedBarIds: readonly string[],
  lastVisibleBarId: string,
): void {
  if (chart.panel !== panel) fail(`${panel} chart panel is inconsistent`);
  if (chart.mediaType !== "image/png") fail(`${panel} chart must be image/png`);
  assertSha256(`${panel} chart contentHash`, chart.contentHash);
  assertStringList(`${panel} chart barIds`, chart.barIds, {
    min: expectedBarIds.length,
    max: expectedBarIds.length,
  });
  if (!sameStrings(chart.barIds, expectedBarIds)) {
    fail(`${panel} chart bars must match the causal market prefix`);
  }
  if (chart.lastVisibleBarId !== lastVisibleBarId) {
    fail(`${panel} chart must share the market lastVisibleBarId`);
  }
}

function validateDoctrine(doctrine: readonly DoctrineRagRecordV1[]): void {
  assertUnique(
    "doctrineId",
    doctrine.map((record) => record.doctrineId),
  );
  doctrine.forEach((record, index) => {
    assertNonEmpty(`doctrine[${index}].doctrineId`, record.doctrineId);
    assertNonEmpty(`doctrine[${index}].concept`, record.concept);
    assertNonEmpty(`doctrine[${index}].rule`, record.rule);
    assertStringList(`doctrine[${index}].appliesWhen`, record.appliesWhen, {
      min: 1,
      max: 12,
    });
    assertStringList(`doctrine[${index}].avoidWhen`, record.avoidWhen, {
      min: 1,
      max: 12,
    });
    assertStringList(
      `doctrine[${index}].decisionEffect`,
      record.decisionEffect,
      { min: 1, max: 12 },
    );
  });
}

function assertPolicyInputIntegrity(input: BrooksPolicyInputV1): void {
  validateUnknownPolicyInput(input);
}

function validateUnknownPolicyInput(value: unknown): void {
  const input = exactRecord("policyInput", value, [
    "schemaVersion",
    "inputHash",
    "market",
    "charts",
    "doctrine",
  ]);
  if (input.schemaVersion !== BROOKS_POLICY_INPUT_SCHEMA_VERSION) {
    fail("policyInput schemaVersion is unsupported");
  }
  assertSha256Value("policyInput.inputHash", input.inputHash);

  const market = exactRecord("policyInput.market", input.market, [
    "barDurationSeconds",
    "lastVisibleBarId",
    "visibleBarCount",
    "isLeftCensored",
    "leftCensoredBarsMissing",
    "normalization",
    "bars",
  ]);
  if (market.barDurationSeconds !== FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS) {
    fail("policyInput market requires 300-second bars");
  }
  assertStringValue("policyInput.market.lastVisibleBarId", market.lastVisibleBarId);
  assertIntegerValue("policyInput.market.visibleBarCount", market.visibleBarCount);
  assertBooleanValue("policyInput.market.isLeftCensored", market.isLeftCensored);
  assertIntegerValue(
    "policyInput.market.leftCensoredBarsMissing",
    market.leftCensoredBarsMissing,
  );
  const normalization = exactRecord(
    "policyInput.market.normalization",
    market.normalization,
    ["method", "base", "anchorBarId"],
  );
  if (
    normalization.method !== "first_visible_close_equals_100" ||
    normalization.base !== NORMALIZED_FIRST_VISIBLE_CLOSE
  ) {
    fail("policyInput normalization contract is invalid");
  }
  assertStringValue("policyInput normalization anchorBarId", normalization.anchorBarId);

  if (!isPlainArray(market.bars)) fail("policyInput.market.bars must be a plain array");
  const bars = market.bars.map((bar, index) => {
    const record = exactRecord(`policyInput.market.bars[${index}]`, bar, [
      "barId",
      "sequence",
      "open",
      "high",
      "low",
      "close",
      "continuityFromPrevious",
    ]);
    assertStringValue(`normalized bar ${index} barId`, record.barId);
    assertIntegerValue(`normalized bar ${index} sequence`, record.sequence);
    if (record.sequence !== index) {
      fail("policyInput normalized bar sequences must match relative order");
    }
    for (const field of ["open", "high", "low", "close"] as const) {
      assertNumberValue(`normalized bar ${index} ${field}`, record[field]);
      if ((record[field] as number) <= 0) {
        fail(`normalized bar ${index} ${field} must be positive`);
      }
    }
    if (
      (record.high as number) <
        Math.max(record.open as number, record.close as number) ||
      (record.low as number) >
        Math.min(record.open as number, record.close as number)
    ) {
      fail(`normalized bar ${index} has invalid OHLC geometry`);
    }
    assertStringValue(
      `normalized bar ${index} continuityFromPrevious`,
      record.continuityFromPrevious,
    );
    assertOneOf(
      `normalized bar ${index} continuityFromPrevious`,
      record.continuityFromPrevious as string,
      BAR_CONTINUITY_STATES,
    );
    return record;
  });
  if (bars[0]?.continuityFromPrevious !== "unknown") {
    fail("policyInput first visible continuity must be unknown");
  }
  if (market.visibleBarCount !== bars.length) {
    fail("policyInput visibleBarCount does not match bars");
  }
  const isLeftCensored = market.isLeftCensored as boolean;
  if (
    market.leftCensoredBarsMissing !== BROOKS_CONTEXT_BAR_COUNT - bars.length ||
    (isLeftCensored ? bars.length < 40 || bars.length >= 120 : bars.length !== 120)
  ) {
    fail("policyInput left-censoring metadata is inconsistent");
  }
  const expectedIds = bars.map((_, index) => anonymousBarId(index));
  if (!sameStrings(bars.map((bar) => bar.barId as string), expectedIds)) {
    fail("policyInput bars must use anonymous relative IDs");
  }
  if (normalization.anchorBarId !== expectedIds[0] || bars[0]?.close !== 100) {
    fail("policyInput normalization anchor is inconsistent");
  }
  if (market.lastVisibleBarId !== expectedIds.at(-1)) {
    fail("policyInput lastVisibleBarId is inconsistent");
  }

  const charts = exactRecord("policyInput.charts", input.charts, ["context", "detail"]);
  validateUnknownChart(
    "context",
    charts.context,
    expectedIds,
    market.lastVisibleBarId as string,
  );
  validateUnknownChart(
    "detail",
    charts.detail,
    expectedIds.slice(-BROOKS_DETAIL_BAR_COUNT),
    market.lastVisibleBarId as string,
  );

  if (!isPlainArray(input.doctrine)) fail("policyInput.doctrine must be a plain array");
  const doctrineIds: string[] = [];
  input.doctrine.forEach((item, index) => {
    const record = exactRecord(`policyInput.doctrine[${index}]`, item, [
      "doctrineId",
      "concept",
      "rule",
      "appliesWhen",
      "avoidWhen",
      "decisionEffect",
    ]);
    for (const field of ["doctrineId", "concept", "rule"] as const) {
      assertStringValue(`policyInput.doctrine[${index}].${field}`, record[field]);
    }
    assertStringArray(
      `policyInput.doctrine[${index}].appliesWhen`,
      record.appliesWhen,
      { min: 1, max: 12 },
    );
    assertStringArray(
      `policyInput.doctrine[${index}].avoidWhen`,
      record.avoidWhen,
      { min: 1, max: 12 },
    );
    assertStringArray(
      `policyInput.doctrine[${index}].decisionEffect`,
      record.decisionEffect,
      { min: 1, max: 12 },
    );
    doctrineIds.push(record.doctrineId as string);
  });
  assertUnique("policyInput doctrineId", doctrineIds);

  const expectedInputHash = canonicalHash({
    market: input.market,
    charts: input.charts,
    doctrine: input.doctrine,
  });
  if (input.inputHash !== expectedInputHash) {
    fail("policyInput hash does not match its content");
  }
}

function validateUnknownChart(
  panel: "context" | "detail",
  value: unknown,
  expectedIds: readonly string[],
  lastVisibleBarId: string,
): void {
  const chart = exactRecord(`policyInput.charts.${panel}`, value, [
    "panel",
    "mediaType",
    "contentHash",
    "barIds",
    "lastVisibleBarId",
  ]);
  if (chart.panel !== panel || chart.mediaType !== "image/png") {
    fail(`policyInput ${panel} chart type is invalid`);
  }
  assertSha256Value(`policyInput ${panel} contentHash`, chart.contentHash);
  assertStringArray(`policyInput ${panel} barIds`, chart.barIds);
  if (!sameStrings(chart.barIds as string[], expectedIds)) {
    fail(`policyInput ${panel} chart bars are inconsistent`);
  }
  if (chart.lastVisibleBarId !== lastVisibleBarId) {
    fail(`policyInput ${panel} lastVisibleBarId is inconsistent`);
  }
}

function exactRecord(
  name: string,
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !isPlainRecord(value)
  ) {
    fail(`${name} must be a plain object`);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.getOwnPropertyNames(record);
  if (Object.getOwnPropertySymbols(record).length !== 0) {
    fail(`${name} cannot contain symbol fields`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${name} fields must be enumerable data properties`);
    }
  }
  const unknownKey = keys.find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) {
    fail(`${name} contains forbidden or unknown field: ${unknownKey}`);
  }
  const missingKey = allowedKeys.find((key) => !Object.hasOwn(record, key));
  if (missingKey !== undefined) {
    fail(`${name} is missing field: ${missingKey}`);
  }
  return record;
}

function assertSha256Value(name: string, value: unknown): void {
  if (typeof value !== "string") fail(`${name} must be a SHA-256 string`);
  assertSha256(name, value);
}

function assertStringValue(name: string, value: unknown): void {
  if (typeof value !== "string") fail(`${name} must be a string`);
  assertNonEmpty(name, value);
}

function assertNumberValue(name: string, value: unknown): void {
  if (typeof value !== "number") fail(`${name} must be a number`);
  assertFiniteNumber(name, value);
}

function assertIntegerValue(name: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(`${name} must be a non-negative safe integer`);
  }
}

function assertBooleanValue(name: string, value: unknown): void {
  if (typeof value !== "boolean") fail(`${name} must be a boolean`);
}

function assertStringArray(
  name: string,
  value: unknown,
  options: { readonly min?: number; readonly max?: number } = {},
): void {
  if (
    !isPlainArray(value) ||
    value.some(
      (item) => typeof item !== "string" || item.trim() === "",
    )
  ) {
    fail(`${name} must be a plain array of non-empty strings`);
  }
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (value.length < min || value.length > max) {
    fail(`${name} must contain between ${min} and ${max} items`);
  }
}

function isPlainRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPlainArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return false;
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) return false;
  const names = Object.getOwnPropertyNames(value);
  if (
    names.some(
      (name) =>
        name !== "length" &&
        (!/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length),
    )
  ) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return false;
    }
  }
  return true;
}

function cloneChart(chart: AnonymousChartManifestV1): AnonymousChartManifestV1 {
  return {
    panel: chart.panel,
    mediaType: chart.mediaType,
    contentHash: chart.contentHash,
    barIds: [...chart.barIds],
    lastVisibleBarId: chart.lastVisibleBarId,
  };
}

function normalizePrice(rawPrice: number, firstClose: number): number {
  const normalized = (rawPrice / firstClose) * NORMALIZED_FIRST_VISIBLE_CLOSE;
  if (!Number.isFinite(normalized)) fail("normalized price must be finite");
  return normalized;
}

function anonymousBarId(index: number): string {
  return `bar:${index.toString().padStart(3, "0")}`;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fail(message: string): never {
  throw new PolicyInputContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PolicyInputContractError) throw error;
  if (error instanceof Error) throw new PolicyInputContractError(error.message);
  throw new PolicyInputContractError("policy input validation failed");
}
