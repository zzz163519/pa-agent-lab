import {
  canonicalHash,
  deepFreeze,
  type ContractSha256,
} from "./contract-utils-v1.ts";
import type { DoctrineRagRecordV1 } from "./doctrine-v1.ts";

export const BROOKS_MULTI_TIMEFRAME_SOURCE_PROFILE_SCHEMA_VERSION_V1 =
  "brooks-multi-timeframe-source-profile.v1" as const;
export const BROOKS_MULTI_TIMEFRAME_CASE_SCHEMA_VERSION_V1 =
  "brooks-multi-timeframe-case.v1" as const;
export const ANONYMOUS_MULTI_TIMEFRAME_MARKET_SCHEMA_VERSION_V1 =
  "anonymous-multi-timeframe-market.v1" as const;
export const BROOKS_MULTI_TIMEFRAME_POLICY_INPUT_SCHEMA_VERSION_V1 =
  "brooks-multi-timeframe-policy-input.v1" as const;
export const BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1 = 40 as const;
export const BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1 = 120 as const;
export const BROOKS_MULTI_TIMEFRAME_PRIMARY_BAR_DURATION_MS_V1 = 300_000 as const;
export const BROOKS_MULTI_TIMEFRAME_REFERENCE_MAX_BAR_COUNT_V1 = 120 as const;
export const BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1 = 100 as const;

export const BROOKS_MULTI_TIMEFRAMES_V1 = ["5m", "60m", "1d"] as const;
export type BrooksMultiTimeframeV1 =
  (typeof BROOKS_MULTI_TIMEFRAMES_V1)[number];

export type BrooksReferenceTimeframeV1 = Exclude<
  BrooksMultiTimeframeV1,
  "5m"
>;

export const MULTI_TIMEFRAME_BAR_LIFECYCLES_V1 = [
  "finalized",
  "provisional",
] as const;
export type MultiTimeframeBarLifecycleV1 =
  (typeof MULTI_TIMEFRAME_BAR_LIFECYCLES_V1)[number];

export const MULTI_TIMEFRAME_CONTINUITY_STATES_V1 = [
  "contiguous",
  "expected_session_boundary",
  "scheduled_break",
  "missing_data",
  "unknown_left_boundary",
] as const;
export type MultiTimeframeContinuityStateV1 =
  (typeof MULTI_TIMEFRAME_CONTINUITY_STATES_V1)[number];

export const MULTI_TIMEFRAME_HISTORY_START_STATES_V1 = [
  "instrument_history_start",
  "window_truncated",
  "source_history_limit",
  "unknown",
] as const;
export type MultiTimeframeHistoryStartStateV1 =
  (typeof MULTI_TIMEFRAME_HISTORY_START_STATES_V1)[number];

export interface MultiTimeframeSessionProfileInputV1 {
  readonly profileId: string;
  readonly profileVersion: string;
  readonly timezone: string;
  readonly calendarVersion: string;
  readonly fiveMinuteAlignmentId: string;
  readonly sixtyMinuteAlignmentId: string;
  readonly dailyAlignmentId: string;
}

export interface CreateBrooksMultiTimeframeSourceProfileInputV1 {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly marketSurface: string;
  readonly instrumentId: string;
  readonly priceBasis: string;
  readonly sessionProfile: MultiTimeframeSessionProfileInputV1;
}

export interface BrooksMultiTimeframeSourceProfileV1
  extends CreateBrooksMultiTimeframeSourceProfileInputV1 {
  readonly schemaVersion: typeof BROOKS_MULTI_TIMEFRAME_SOURCE_PROFILE_SCHEMA_VERSION_V1;
  readonly profileHash: ContractSha256;
  readonly sessionProfile: Readonly<MultiTimeframeSessionProfileInputV1>;
}

export interface MultiTimeframeProvisionalProgressV1 {
  readonly completedBaseIntervals: number | null;
  readonly scheduledBaseIntervals: number | null;
  readonly progressStatus: "verified" | "unverified_special_session";
}

export interface LocalMultiTimeframeBarV1 {
  readonly sourceBarId: string;
  readonly sequence: number;
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly lifecycle: MultiTimeframeBarLifecycleV1;
  readonly periodStartEpochMs: number;
  readonly periodEndEpochMs: number;
  readonly snapshotCutoffEpochMs: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly continuityFromPrevious: MultiTimeframeContinuityStateV1;
  readonly progress: Readonly<MultiTimeframeProvisionalProgressV1> | null;
  readonly sourceContentHash: ContractSha256;
  readonly sourceProfileHash: ContractSha256;
  readonly alignmentId: string;
}

export interface MissingReferenceContextV1 {
  readonly availability: "not_supplied";
}

export interface SuppliedReferenceContextV1 {
  readonly availability: "supplied";
  readonly historyStart: MultiTimeframeHistoryStartStateV1;
  readonly bars: readonly Readonly<LocalMultiTimeframeBarV1>[];
}

export type LocalReferenceContextV1 =
  | MissingReferenceContextV1
  | SuppliedReferenceContextV1;

export interface CreateBrooksMultiTimeframeCaseInputV1 {
  readonly caseId: string;
  readonly policyStreamId: string;
  readonly decisionCutoffEpochMs: number;
  readonly sourceProfile: BrooksMultiTimeframeSourceProfileV1;
  readonly primaryBars: readonly LocalMultiTimeframeBarV1[];
  readonly references: Readonly<{
    sixtyMinute: LocalReferenceContextV1;
    daily: LocalReferenceContextV1;
  }>;
}

export interface BrooksMultiTimeframeCaseV1
  extends CreateBrooksMultiTimeframeCaseInputV1 {
  readonly schemaVersion: typeof BROOKS_MULTI_TIMEFRAME_CASE_SCHEMA_VERSION_V1;
  readonly caseHash: ContractSha256;
  readonly sourceProfile: Readonly<BrooksMultiTimeframeSourceProfileV1>;
  readonly primaryBars: readonly Readonly<LocalMultiTimeframeBarV1>[];
  readonly references: Readonly<{
    sixtyMinute: Readonly<LocalReferenceContextV1>;
    daily: Readonly<LocalReferenceContextV1>;
  }>;
  readonly isPrimaryLeftCensored: boolean;
}

export interface NormalizedMultiTimeframeBarV1 {
  readonly barId: string;
  readonly sequence: number;
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly lifecycle: MultiTimeframeBarLifecycleV1;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly continuityFromPrevious: MultiTimeframeContinuityStateV1;
  readonly progress: Readonly<MultiTimeframeProvisionalProgressV1> | null;
}

export interface AnonymousPrimaryMarketContextV1 {
  readonly timeframe: "5m";
  readonly visibleBarCount: number;
  readonly isLeftCensored: boolean;
  readonly leftCensoredBarsMissing: number;
  readonly bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[];
}

export interface AnonymousSuppliedReferenceContextV1 {
  readonly availability: "supplied";
  readonly timeframe: BrooksReferenceTimeframeV1;
  readonly historyStart: MultiTimeframeHistoryStartStateV1;
  readonly visibleBarCount: number;
  readonly bars: readonly Readonly<NormalizedMultiTimeframeBarV1>[];
}

export type AnonymousReferenceContextV1 =
  | MissingReferenceContextV1
  | AnonymousSuppliedReferenceContextV1;

export interface AnonymousMultiTimeframeMarketV1 {
  readonly schemaVersion: typeof ANONYMOUS_MULTI_TIMEFRAME_MARKET_SCHEMA_VERSION_V1;
  readonly marketHash: ContractSha256;
  readonly normalization: Readonly<{
    method: "first_visible_5m_close_equals_100";
    base: typeof BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1;
    anchorBarId: string;
  }>;
  readonly primary: Readonly<AnonymousPrimaryMarketContextV1>;
  readonly references: Readonly<{
    sixtyMinute: Readonly<AnonymousReferenceContextV1>;
    daily: Readonly<AnonymousReferenceContextV1>;
  }>;
}

export interface AnonymousMultiTimeframeChartManifestV1 {
  readonly timeframe: BrooksMultiTimeframeV1;
  readonly panel: "context" | "detail";
  readonly mediaType: "image/png";
  readonly contentHash: ContractSha256;
  readonly barIds: readonly string[];
  readonly lastVisibleBarId: string | null;
}

export interface CreateBrooksMultiTimeframePolicyInputInputV1 {
  readonly policyCase: BrooksMultiTimeframeCaseV1;
  readonly charts: Readonly<{
    primary: Readonly<{
      context: AnonymousMultiTimeframeChartManifestV1;
      detail: AnonymousMultiTimeframeChartManifestV1;
    }>;
    references: Readonly<{
      sixtyMinute: AnonymousMultiTimeframeChartManifestV1 | null;
      daily: AnonymousMultiTimeframeChartManifestV1 | null;
    }>;
  }>;
  readonly doctrine: readonly DoctrineRagRecordV1[];
}

export interface BrooksMultiTimeframePolicyInputV1 {
  readonly schemaVersion: typeof BROOKS_MULTI_TIMEFRAME_POLICY_INPUT_SCHEMA_VERSION_V1;
  readonly inputHash: ContractSha256;
  readonly market: Readonly<AnonymousMultiTimeframeMarketV1>;
  readonly charts: Readonly<{
    primary: Readonly<{
      context: Readonly<AnonymousMultiTimeframeChartManifestV1>;
      detail: Readonly<AnonymousMultiTimeframeChartManifestV1>;
    }>;
    references: Readonly<{
      sixtyMinute: Readonly<AnonymousMultiTimeframeChartManifestV1> | null;
      daily: Readonly<AnonymousMultiTimeframeChartManifestV1> | null;
    }>;
  }>;
  readonly doctrine: readonly Readonly<DoctrineRagRecordV1>[];
}

export class BrooksMultiTimeframeInputContractError extends Error {
  override readonly name = "BrooksMultiTimeframeInputContractError";
}

export function createBrooksMultiTimeframeSourceProfileV1(
  input: CreateBrooksMultiTimeframeSourceProfileInputV1,
): Readonly<BrooksMultiTimeframeSourceProfileV1> {
  try {
    for (const [name, value] of Object.entries({
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      marketSurface: input.marketSurface,
      instrumentId: input.instrumentId,
      priceBasis: input.priceBasis,
      ...input.sessionProfile,
    })) {
      assertNonEmptyString(name, value);
    }
    const body = {
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      marketSurface: input.marketSurface,
      instrumentId: input.instrumentId,
      priceBasis: input.priceBasis,
      sessionProfile: { ...input.sessionProfile },
    } as const;
    return deepFreeze({
      schemaVersion: BROOKS_MULTI_TIMEFRAME_SOURCE_PROFILE_SCHEMA_VERSION_V1,
      profileHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createBrooksMultiTimeframeCaseV1(
  input: CreateBrooksMultiTimeframeCaseInputV1,
): Readonly<BrooksMultiTimeframeCaseV1> {
  try {
    assertNonEmptyString("caseId", input.caseId);
    assertNonEmptyString("policyStreamId", input.policyStreamId);
    assertSafeInteger("decisionCutoffEpochMs", input.decisionCutoffEpochMs);
    assertSourceProfileIntegrity(input.sourceProfile);
    if (
      input.primaryBars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1 ||
      input.primaryBars.length >
        BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1
    ) {
      fail("primary five-minute input requires between 40 and 120 finalized bars");
    }
    validateBars(
      input.primaryBars,
      "5m",
      input.decisionCutoffEpochMs,
      input.sourceProfile,
      false,
    );
    validateReference(
      "sixtyMinute",
      input.references.sixtyMinute,
      "60m",
      input.decisionCutoffEpochMs,
      input.sourceProfile,
    );
    validateReference(
      "daily",
      input.references.daily,
      "1d",
      input.decisionCutoffEpochMs,
      input.sourceProfile,
    );

    const body = {
      caseId: input.caseId,
      policyStreamId: input.policyStreamId,
      decisionCutoffEpochMs: input.decisionCutoffEpochMs,
      sourceProfile: structuredClone(input.sourceProfile),
      primaryBars: input.primaryBars.map((bar) => cloneBar(bar)),
      references: {
        sixtyMinute: cloneReference(input.references.sixtyMinute),
        daily: cloneReference(input.references.daily),
      },
      isPrimaryLeftCensored:
        input.primaryBars.length <
        BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1,
    } as const;
    return deepFreeze({
      schemaVersion: BROOKS_MULTI_TIMEFRAME_CASE_SCHEMA_VERSION_V1,
      caseHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createAnonymousMultiTimeframeMarketInputV1(
  policyCase: BrooksMultiTimeframeCaseV1,
): Readonly<AnonymousMultiTimeframeMarketV1> {
  try {
    assertBrooksMultiTimeframeCaseIntegrityV1(policyCase);
    const firstClose = policyCase.primaryBars[0]?.close;
    if (firstClose === undefined || firstClose <= 0) {
      fail("first visible five-minute close must be positive");
    }
    const primaryBars = normalizeBars(policyCase.primaryBars, firstClose);
    const body = {
      normalization: {
        method: "first_visible_5m_close_equals_100" as const,
        base: BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1,
        anchorBarId: primaryBars[0]!.barId,
      },
      primary: {
        timeframe: "5m" as const,
        visibleBarCount: primaryBars.length,
        isLeftCensored: policyCase.isPrimaryLeftCensored,
        leftCensoredBarsMissing:
          BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1 -
          primaryBars.length,
        bars: primaryBars,
      },
      references: {
        sixtyMinute: normalizeReference(
          policyCase.references.sixtyMinute,
          "60m",
          firstClose,
        ),
        daily: normalizeReference(
          policyCase.references.daily,
          "1d",
          firstClose,
        ),
      },
    } as const;
    return deepFreeze({
      schemaVersion: ANONYMOUS_MULTI_TIMEFRAME_MARKET_SCHEMA_VERSION_V1,
      marketHash: canonicalHash(body),
      ...body,
    });
  } catch (error) {
    rethrow(error);
  }
}

export function createBrooksMultiTimeframePolicyInputV1(
  input: CreateBrooksMultiTimeframePolicyInputInputV1,
): Readonly<BrooksMultiTimeframePolicyInputV1> {
  try {
    const market = createAnonymousMultiTimeframeMarketInputV1(input.policyCase);
    const primaryIds = market.primary.bars.map((bar) => bar.barId);
    validateChartManifest(
      input.charts.primary.context,
      "5m",
      "context",
      primaryIds,
    );
    validateChartManifest(
      input.charts.primary.detail,
      "5m",
      "detail",
      primaryIds.slice(-BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1),
    );
    validateReferenceChart(
      input.charts.references.sixtyMinute,
      market.references.sixtyMinute,
      "60m",
    );
    validateReferenceChart(
      input.charts.references.daily,
      market.references.daily,
      "1d",
    );
    validateDoctrine(input.doctrine);
    const body = {
      market,
      charts: {
        primary: {
          context: cloneChartManifest(input.charts.primary.context),
          detail: cloneChartManifest(input.charts.primary.detail),
        },
        references: {
          sixtyMinute:
            input.charts.references.sixtyMinute === null
              ? null
              : cloneChartManifest(input.charts.references.sixtyMinute),
          daily:
            input.charts.references.daily === null
              ? null
              : cloneChartManifest(input.charts.references.daily),
        },
      },
      doctrine: input.doctrine.map((record) => ({
        doctrineId: record.doctrineId,
        concept: record.concept,
        rule: record.rule,
        appliesWhen: [...record.appliesWhen],
        avoidWhen: [...record.avoidWhen],
        decisionEffect: [...record.decisionEffect],
      })),
    } as const;
    const policyInput = deepFreeze({
      schemaVersion: BROOKS_MULTI_TIMEFRAME_POLICY_INPUT_SCHEMA_VERSION_V1,
      inputHash: canonicalHash(body),
      ...body,
    });
    assertBrooksMultiTimeframePolicyInputPrivacyV1(policyInput);
    return policyInput;
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksMultiTimeframeCaseIntegrityV1(
  value: unknown,
): asserts value is BrooksMultiTimeframeCaseV1 {
  try {
    const record = exactRecord("multi-timeframe Case", value, [
      "schemaVersion",
      "caseHash",
      "caseId",
      "policyStreamId",
      "decisionCutoffEpochMs",
      "sourceProfile",
      "primaryBars",
      "references",
      "isPrimaryLeftCensored",
    ]);
    if (record.schemaVersion !== BROOKS_MULTI_TIMEFRAME_CASE_SCHEMA_VERSION_V1) {
      fail("multi-timeframe Case schemaVersion is unsupported");
    }
    assertSha256("caseHash", record.caseHash);
    assertNonEmptyString("caseId", record.caseId);
    assertNonEmptyString("policyStreamId", record.policyStreamId);
    assertSafeInteger("decisionCutoffEpochMs", record.decisionCutoffEpochMs);
    assertSourceProfileIntegrity(record.sourceProfile);
    if (!Array.isArray(record.primaryBars)) fail("primaryBars must be an array");
    const primaryBars = record.primaryBars.map((bar) => validateUnknownLocalBar(bar));
    if (
      primaryBars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1 ||
      primaryBars.length > BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1
    ) {
      fail("primary five-minute input requires between 40 and 120 finalized bars");
    }
    const references = exactRecord("Case references", record.references, [
      "sixtyMinute",
      "daily",
    ]);
    const sixtyMinute = validateUnknownLocalReference(
      references.sixtyMinute,
      "60m",
    );
    const daily = validateUnknownLocalReference(references.daily, "1d");
    if (typeof record.isPrimaryLeftCensored !== "boolean") {
      fail("isPrimaryLeftCensored must be boolean");
    }
    const expectedLeftCensored =
      primaryBars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1;
    if (record.isPrimaryLeftCensored !== expectedLeftCensored) {
      fail("primary left-censoring does not match the visible count");
    }
    validateBars(
      primaryBars,
      "5m",
      record.decisionCutoffEpochMs,
      record.sourceProfile as BrooksMultiTimeframeSourceProfileV1,
      false,
    );
    validateReference(
      "sixtyMinute",
      sixtyMinute,
      "60m",
      record.decisionCutoffEpochMs,
      record.sourceProfile as BrooksMultiTimeframeSourceProfileV1,
    );
    validateReference(
      "daily",
      daily,
      "1d",
      record.decisionCutoffEpochMs,
      record.sourceProfile as BrooksMultiTimeframeSourceProfileV1,
    );
    const { schemaVersion: _schemaVersion, caseHash, ...body } = record;
    if (caseHash !== canonicalHash(body)) {
      fail("multi-timeframe Case hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

export function assertAnonymousMultiTimeframeMarketIntegrityV1(
  value: unknown,
): asserts value is AnonymousMultiTimeframeMarketV1 {
  try {
    validateUnknownAnonymousMarket(value);
  } catch (error) {
    rethrow(error);
  }
}

export function assertBrooksMultiTimeframePolicyInputPrivacyV1(
  value: unknown,
): asserts value is BrooksMultiTimeframePolicyInputV1 {
  try {
    const record = exactRecord("multi-timeframe policy input", value, [
      "schemaVersion",
      "inputHash",
      "market",
      "charts",
      "doctrine",
    ]);
    if (
      record.schemaVersion !==
      BROOKS_MULTI_TIMEFRAME_POLICY_INPUT_SCHEMA_VERSION_V1
    ) {
      fail("multi-timeframe policy input schemaVersion is unsupported");
    }
    assertSha256("inputHash", record.inputHash);
    validateUnknownAnonymousMarket(record.market);
    validateUnknownCharts(record.charts, record.market as AnonymousMultiTimeframeMarketV1);
    validateUnknownDoctrine(record.doctrine);
    const expectedHash = canonicalHash({
      market: record.market,
      charts: record.charts,
      doctrine: record.doctrine,
    });
    if (record.inputHash !== expectedHash) {
      fail("multi-timeframe policy input hash does not match its content");
    }
  } catch (error) {
    rethrow(error);
  }
}

function assertSourceProfileIntegrity(
  value: unknown,
): asserts value is BrooksMultiTimeframeSourceProfileV1 {
  const profile = exactRecord("source profile", value, [
    "schemaVersion",
    "profileHash",
    "sourceId",
    "sourceVersion",
    "marketSurface",
    "instrumentId",
    "priceBasis",
    "sessionProfile",
  ]);
  if (
    profile.schemaVersion !==
    BROOKS_MULTI_TIMEFRAME_SOURCE_PROFILE_SCHEMA_VERSION_V1
  ) {
    fail("source profile schemaVersion is unsupported");
  }
  assertSha256("profileHash", profile.profileHash);
  for (const field of [
    "sourceId",
    "sourceVersion",
    "marketSurface",
    "instrumentId",
    "priceBasis",
  ] as const) {
    assertNonEmptyString(field, profile[field]);
  }
  const sessionProfile = exactRecord("session profile", profile.sessionProfile, [
    "profileId",
    "profileVersion",
    "timezone",
    "calendarVersion",
    "fiveMinuteAlignmentId",
    "sixtyMinuteAlignmentId",
    "dailyAlignmentId",
  ]);
  for (const [field, fieldValue] of Object.entries(sessionProfile)) {
    assertNonEmptyString(field, fieldValue);
  }
  const { schemaVersion: _schemaVersion, profileHash, ...body } = profile;
  if (profileHash !== canonicalHash(body)) {
    fail("source profile hash does not match its content");
  }
}

function validateChartManifest(
  manifest: AnonymousMultiTimeframeChartManifestV1,
  timeframe: BrooksMultiTimeframeV1,
  panel: "context" | "detail",
  expectedBarIds: readonly string[],
): void {
  const record = exactRecord("chart manifest", manifest, [
    "timeframe",
    "panel",
    "mediaType",
    "contentHash",
    "barIds",
    "lastVisibleBarId",
  ]);
  if (record.timeframe !== timeframe || record.panel !== panel) {
    fail("chart manifest timeframe or panel does not match its context");
  }
  if (record.mediaType !== "image/png") fail("chart manifest must be image/png");
  assertSha256("contentHash", record.contentHash);
  const barIds = stringArray("chart barIds", record.barIds);
  if (!sameStrings(barIds, expectedBarIds)) {
    fail("chart manifest bars do not match the anonymous market context");
  }
  const expectedLast = expectedBarIds.at(-1) ?? null;
  if (record.lastVisibleBarId !== expectedLast) {
    fail("chart manifest lastVisibleBarId does not match its bars");
  }
}

function validateReferenceChart(
  manifest: AnonymousMultiTimeframeChartManifestV1 | null,
  reference: AnonymousReferenceContextV1,
  timeframe: BrooksReferenceTimeframeV1,
): void {
  if (reference.availability === "not_supplied") {
    if (manifest !== null) fail(`absent ${timeframe} reference forbids a chart`);
    return;
  }
  if (manifest === null) {
    fail(`supplied ${timeframe} reference requires a context chart`);
  }
  validateChartManifest(
    manifest,
    timeframe,
    "context",
    reference.bars.map((bar) => bar.barId),
  );
}

function validateDoctrine(doctrine: readonly DoctrineRagRecordV1[]): void {
  validateUnknownDoctrine(doctrine);
}

function validateUnknownDoctrine(value: unknown): void {
  if (!Array.isArray(value)) fail("doctrine must be an array");
  const ids = new Set<string>();
  for (const item of value) {
    const record = exactRecord("Doctrine RAG record", item, [
      "doctrineId",
      "concept",
      "rule",
      "appliesWhen",
      "avoidWhen",
      "decisionEffect",
    ]);
    for (const field of ["doctrineId", "concept", "rule"] as const) {
      assertNonEmptyString(field, record[field]);
    }
    if (ids.has(record.doctrineId as string)) fail("Doctrine IDs must be unique");
    ids.add(record.doctrineId as string);
    for (const field of ["appliesWhen", "avoidWhen", "decisionEffect"] as const) {
      const values = stringArray(field, record[field]);
      if (values.length === 0 || values.some((entry) => entry.trim().length === 0)) {
        fail(`${field} must contain non-empty semantics`);
      }
    }
  }
}

function validateUnknownAnonymousMarket(value: unknown): void {
  const market = exactRecord("anonymous market", value, [
    "schemaVersion",
    "marketHash",
    "normalization",
    "primary",
    "references",
  ]);
  if (market.schemaVersion !== ANONYMOUS_MULTI_TIMEFRAME_MARKET_SCHEMA_VERSION_V1) {
    fail("anonymous market schemaVersion is unsupported");
  }
  assertSha256("marketHash", market.marketHash);
  const normalization = exactRecord("normalization", market.normalization, [
    "method",
    "base",
    "anchorBarId",
  ]);
  if (
    normalization.method !== "first_visible_5m_close_equals_100" ||
    normalization.base !== BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1
  ) {
    fail("anonymous normalization profile is unsupported");
  }
  assertNonEmptyString("anchorBarId", normalization.anchorBarId);
  const primary = exactRecord("anonymous primary context", market.primary, [
    "timeframe",
    "visibleBarCount",
    "isLeftCensored",
    "leftCensoredBarsMissing",
    "bars",
  ]);
  if (primary.timeframe !== "5m") fail("anonymous primary timeframe must be 5m");
  const primaryBars = validateUnknownAnonymousBars(primary.bars, "5m");
  if (
    primaryBars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1 ||
    primaryBars.length > BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1
  ) {
    fail("anonymous primary requires between 40 and 120 bars");
  }
  if (primaryBars.some((bar) => bar.lifecycle !== "finalized")) {
    fail("anonymous primary bars must be finalized");
  }
  if (primary.visibleBarCount !== primaryBars.length) {
    fail("anonymous primary visibleBarCount is inconsistent");
  }
  if (typeof primary.isLeftCensored !== "boolean") {
    fail("anonymous primary isLeftCensored must be boolean");
  }
  if (
    primary.isLeftCensored !==
    (primaryBars.length < BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1)
  ) {
    fail("anonymous primary left-censor state is inconsistent");
  }
  if (
    primary.leftCensoredBarsMissing !==
    BROOKS_MULTI_TIMEFRAME_PRIMARY_COMPLETE_BAR_COUNT_V1 - primaryBars.length
  ) {
    fail("anonymous primary left-censor count is inconsistent");
  }
  if (normalization.anchorBarId !== primaryBars[0]?.barId) {
    fail("normalization anchor must be the first five-minute bar");
  }
  if (primaryBars[0]?.close !== BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1) {
    fail("first visible five-minute close must normalize to 100");
  }
  const references = exactRecord("anonymous references", market.references, [
    "sixtyMinute",
    "daily",
  ]);
  validateUnknownAnonymousReference(references.sixtyMinute, "60m");
  validateUnknownAnonymousReference(references.daily, "1d");
  const { schemaVersion: _schemaVersion, marketHash, ...body } = market;
  if (marketHash !== canonicalHash(body)) {
    fail("anonymous market hash does not match its content");
  }
}

function validateUnknownAnonymousReference(
  value: unknown,
  timeframe: BrooksReferenceTimeframeV1,
): void {
  const availability =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>).availability
      : undefined;
  if (availability === "not_supplied") {
    exactRecord(`${timeframe} reference`, value, ["availability"]);
    return;
  }
  const reference = exactRecord(`${timeframe} reference`, value, [
    "availability",
    "timeframe",
    "historyStart",
    "visibleBarCount",
    "bars",
  ]);
  if (reference.availability !== "supplied" || reference.timeframe !== timeframe) {
    fail(`${timeframe} reference identity is invalid`);
  }
  if (
    typeof reference.historyStart !== "string" ||
    !MULTI_TIMEFRAME_HISTORY_START_STATES_V1.includes(
      reference.historyStart as MultiTimeframeHistoryStartStateV1,
    )
  ) {
    fail(`${timeframe} history-start state is unsupported`);
  }
  const bars = validateUnknownAnonymousBars(reference.bars, timeframe);
  if (bars.length > BROOKS_MULTI_TIMEFRAME_REFERENCE_MAX_BAR_COUNT_V1) {
    fail("anonymous reference accepts at most 120 bars");
  }
  const provisionalIndexes = bars.flatMap((bar, index) =>
    bar.lifecycle === "provisional" ? [index] : [],
  );
  if (provisionalIndexes.length > 1) {
    fail("reference accepts at most one provisional anonymous reference bar");
  }
  if (
    provisionalIndexes.length === 1 &&
    provisionalIndexes[0] !== bars.length - 1
  ) {
    fail("provisional anonymous reference bar must be final");
  }
  if (reference.visibleBarCount !== bars.length) {
    fail(`${timeframe} visibleBarCount is inconsistent`);
  }
}

function validateUnknownAnonymousBars(
  value: unknown,
  timeframe: BrooksMultiTimeframeV1,
): NormalizedMultiTimeframeBarV1[] {
  if (!Array.isArray(value)) fail(`${timeframe} bars must be an array`);
  return value.map((item, index) => {
    const bar = exactRecord("anonymous bar", item, [
      "barId",
      "sequence",
      "timeframe",
      "lifecycle",
      "open",
      "high",
      "low",
      "close",
      "continuityFromPrevious",
      "progress",
    ]);
    const lifecycle = bar.lifecycle as MultiTimeframeBarLifecycleV1;
    if (
      bar.timeframe !== timeframe ||
      !MULTI_TIMEFRAME_BAR_LIFECYCLES_V1.includes(lifecycle)
    ) {
      fail("anonymous bar timeframe or lifecycle is invalid");
    }
    const expectedId = anonymousBarId(timeframe, lifecycle, index);
    if (bar.barId !== expectedId || bar.sequence !== index) {
      fail("anonymous bar identity or sequence is invalid");
    }
    for (const field of ["open", "high", "low", "close"] as const) {
      if (typeof bar[field] !== "number" || !Number.isFinite(bar[field])) {
        fail(`anonymous bar ${field} must be finite`);
      }
    }
    if (
      typeof bar.continuityFromPrevious !== "string" ||
      !MULTI_TIMEFRAME_CONTINUITY_STATES_V1.includes(
        bar.continuityFromPrevious as MultiTimeframeContinuityStateV1,
      )
    ) {
      fail("anonymous bar continuity state is invalid");
    }
    if (
      index === 0
        ? bar.continuityFromPrevious !== "unknown_left_boundary"
        : bar.continuityFromPrevious === "unknown_left_boundary"
    ) {
      fail("anonymous bar left-boundary continuity is invalid");
    }
    if (
      (bar.high as number) < Math.max(bar.open as number, bar.close as number) ||
      (bar.low as number) > Math.min(bar.open as number, bar.close as number) ||
      (bar.high as number) < (bar.low as number)
    ) {
      fail("anonymous bar has invalid OHLC geometry");
    }
    if (lifecycle === "finalized") {
      if (bar.progress !== null) fail("finalized anonymous bar requires null progress");
    } else {
      validateProvisionalProgress(
        bar.progress as Readonly<MultiTimeframeProvisionalProgressV1> | null,
      );
    }
    return bar as unknown as NormalizedMultiTimeframeBarV1;
  });
}

function validateUnknownCharts(
  value: unknown,
  market: AnonymousMultiTimeframeMarketV1,
): void {
  const charts = exactRecord("multi-timeframe charts", value, [
    "primary",
    "references",
  ]);
  const primary = exactRecord("primary charts", charts.primary, [
    "context",
    "detail",
  ]);
  const primaryIds = market.primary.bars.map((bar) => bar.barId);
  validateChartManifest(
    primary.context as AnonymousMultiTimeframeChartManifestV1,
    "5m",
    "context",
    primaryIds,
  );
  validateChartManifest(
    primary.detail as AnonymousMultiTimeframeChartManifestV1,
    "5m",
    "detail",
    primaryIds.slice(-BROOKS_MULTI_TIMEFRAME_PRIMARY_MIN_BAR_COUNT_V1),
  );
  const references = exactRecord("reference charts", charts.references, [
    "sixtyMinute",
    "daily",
  ]);
  validateReferenceChart(
    references.sixtyMinute as AnonymousMultiTimeframeChartManifestV1 | null,
    market.references.sixtyMinute,
    "60m",
  );
  validateReferenceChart(
    references.daily as AnonymousMultiTimeframeChartManifestV1 | null,
    market.references.daily,
    "1d",
  );
}

function validateUnknownLocalBar(value: unknown): LocalMultiTimeframeBarV1 {
  const bar = exactRecord("local multi-timeframe bar", value, [
    "sourceBarId",
    "sequence",
    "timeframe",
    "lifecycle",
    "periodStartEpochMs",
    "periodEndEpochMs",
    "snapshotCutoffEpochMs",
    "open",
    "high",
    "low",
    "close",
    "continuityFromPrevious",
    "progress",
    "sourceContentHash",
    "sourceProfileHash",
    "alignmentId",
  ]);
  for (const field of [
    "sourceBarId",
    "alignmentId",
  ] as const) {
    assertNonEmptyString(field, bar[field]);
  }
  for (const field of [
    "sequence",
    "periodStartEpochMs",
    "periodEndEpochMs",
    "snapshotCutoffEpochMs",
  ] as const) {
    assertSafeInteger(field, bar[field]);
  }
  for (const field of ["open", "high", "low", "close"] as const) {
    if (typeof bar[field] !== "number" || !Number.isFinite(bar[field])) {
      fail(`${field} must be finite`);
    }
  }
  assertSha256("sourceContentHash", bar.sourceContentHash);
  assertSha256("sourceProfileHash", bar.sourceProfileHash);
  if (bar.progress !== null) {
    const progress = exactRecord("provisional progress", bar.progress, [
      "completedBaseIntervals",
      "scheduledBaseIntervals",
      "progressStatus",
    ]);
    if (
      progress.completedBaseIntervals !== null &&
      typeof progress.completedBaseIntervals !== "number"
    ) {
      fail("completedBaseIntervals must be a number or null");
    }
    if (
      progress.scheduledBaseIntervals !== null &&
      typeof progress.scheduledBaseIntervals !== "number"
    ) {
      fail("scheduledBaseIntervals must be a number or null");
    }
  }
  return bar as unknown as LocalMultiTimeframeBarV1;
}

function validateUnknownLocalReference(
  value: unknown,
  timeframe: BrooksReferenceTimeframeV1,
): LocalReferenceContextV1 {
  const availability =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>).availability
      : undefined;
  if (availability === "not_supplied") {
    exactRecord(`${timeframe} local reference`, value, ["availability"]);
    return { availability: "not_supplied" };
  }
  const reference = exactRecord(`${timeframe} local reference`, value, [
    "availability",
    "historyStart",
    "bars",
  ]);
  if (reference.availability !== "supplied" || !Array.isArray(reference.bars)) {
    fail(`${timeframe} local reference is invalid`);
  }
  return {
    availability: "supplied",
    historyStart: reference.historyStart as MultiTimeframeHistoryStartStateV1,
    bars: reference.bars.map((bar) => validateUnknownLocalBar(bar)),
  };
}

function cloneChartManifest(
  manifest: AnonymousMultiTimeframeChartManifestV1,
): AnonymousMultiTimeframeChartManifestV1 {
  return { ...manifest, barIds: [...manifest.barIds] };
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
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key)) ||
    keys.some((key) => !actual.includes(key))
  ) {
    const unknown = actual.find((key) => !keys.includes(key));
    if (unknown !== undefined) fail(`${name} contains unknown field: ${unknown}`);
    fail(`${name} must contain exact keys`);
  }
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

function stringArray(name: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    fail(`${name} must be a string array`);
  }
  return [...value] as string[];
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateReference(
  name: string,
  reference: LocalReferenceContextV1,
  timeframe: BrooksReferenceTimeframeV1,
  decisionCutoffEpochMs: number,
  profile: BrooksMultiTimeframeSourceProfileV1,
): void {
  if (reference.availability === "not_supplied") return;
  if (!MULTI_TIMEFRAME_HISTORY_START_STATES_V1.includes(reference.historyStart)) {
    fail(`${name} history-start state is unsupported`);
  }
  if (reference.bars.length > BROOKS_MULTI_TIMEFRAME_REFERENCE_MAX_BAR_COUNT_V1) {
    fail("reference context accepts at most 120 visible bars");
  }
  const provisionalIndexes = reference.bars.flatMap((bar, index) =>
    bar.lifecycle === "provisional" ? [index] : [],
  );
  if (provisionalIndexes.length > 1) {
    fail("reference context accepts at most one provisional bar");
  }
  if (
    provisionalIndexes.length === 1 &&
    provisionalIndexes[0] !== reference.bars.length - 1
  ) {
    fail("provisional bar must be the final visible reference bar");
  }
  validateBars(
    reference.bars,
    timeframe,
    decisionCutoffEpochMs,
    profile,
    true,
  );
}

function validateBars(
  bars: readonly LocalMultiTimeframeBarV1[],
  timeframe: BrooksMultiTimeframeV1,
  decisionCutoffEpochMs: number,
  profile: BrooksMultiTimeframeSourceProfileV1,
  allowProvisional: boolean,
): void {
  let previousEnd: number | undefined;
  const sourceBarIds = new Set<string>();
  bars.forEach((bar, index) => {
    if (bar.sequence !== index) fail("bar sequences must be zero-based and ordered");
    if (bar.timeframe !== timeframe) fail("bar timeframe does not match its context");
    if (!MULTI_TIMEFRAME_BAR_LIFECYCLES_V1.includes(bar.lifecycle)) {
      fail("bar lifecycle is unsupported");
    }
    if (!allowProvisional && bar.lifecycle !== "finalized") {
      fail("primary five-minute bars must be finalized");
    }
    if (bar.snapshotCutoffEpochMs !== decisionCutoffEpochMs) {
      fail("bar snapshot cutoff does not match the Case cutoff");
    }
    if (bar.periodStartEpochMs >= bar.periodEndEpochMs) {
      fail("bar period must have a positive duration");
    }
    if (
      timeframe === "5m" &&
      bar.periodEndEpochMs - bar.periodStartEpochMs !==
        BROOKS_MULTI_TIMEFRAME_PRIMARY_BAR_DURATION_MS_V1
    ) {
      fail("five-minute bar must span exactly 300 seconds");
    }
    if (index === 0) {
      if (bar.continuityFromPrevious !== "unknown_left_boundary") {
        fail("first visible bar requires unknown-left-boundary continuity");
      }
    } else {
      if (bar.continuityFromPrevious === "unknown_left_boundary") {
        fail("unknown-left-boundary continuity is allowed only on the first bar");
      }
      if (
        bar.continuityFromPrevious === "contiguous" &&
        bar.periodStartEpochMs !== previousEnd
      ) {
        fail("contiguous bar must start at the previous bar end");
      }
      if (
        bar.continuityFromPrevious === "missing_data" &&
        (previousEnd === undefined || bar.periodStartEpochMs <= previousEnd)
      ) {
        fail("missing-data continuity requires a visible positive interval gap");
      }
    }
    if (previousEnd !== undefined && bar.periodStartEpochMs < previousEnd) {
      fail("bar periods must be ordered without overlap");
    }
    previousEnd = bar.periodEndEpochMs;
    if (bar.lifecycle === "finalized") {
      if (bar.progress !== null) fail("finalized bars require null progress");
      if (bar.periodEndEpochMs > decisionCutoffEpochMs) {
        fail("finalized bar cannot end after the decision cutoff");
      }
    } else {
      validateProvisionalProgress(bar.progress);
      if (
        bar.periodStartEpochMs >= decisionCutoffEpochMs ||
        bar.periodEndEpochMs <= decisionCutoffEpochMs
      ) {
        fail("provisional bar must contain the immutable decision cutoff");
      }
    }
    if (bar.sourceProfileHash !== profile.profileHash) {
      fail("bar source profile hash does not match the Case source profile");
    }
    const expectedAlignment =
      timeframe === "5m"
        ? profile.sessionProfile.fiveMinuteAlignmentId
        : timeframe === "60m"
          ? profile.sessionProfile.sixtyMinuteAlignmentId
          : profile.sessionProfile.dailyAlignmentId;
    if (bar.alignmentId !== expectedAlignment) {
      fail("bar alignment does not match the source/session profile");
    }
    assertNonEmptyString("sourceBarId", bar.sourceBarId);
    if (sourceBarIds.has(bar.sourceBarId)) fail("source bar IDs must be unique");
    sourceBarIds.add(bar.sourceBarId);
    assertSha256("sourceContentHash", bar.sourceContentHash);
    if (!MULTI_TIMEFRAME_CONTINUITY_STATES_V1.includes(bar.continuityFromPrevious)) {
      fail("bar continuity state is unsupported");
    }
    validateOhlc(bar);
  });
  if (
    timeframe === "5m" &&
    bars.at(-1)?.periodEndEpochMs !== decisionCutoffEpochMs
  ) {
    fail("final primary bar must end at the decision cutoff");
  }
}

function validateProvisionalProgress(
  progress: Readonly<MultiTimeframeProvisionalProgressV1> | null,
): void {
  if (progress === null) fail("provisional bar requires progress metadata");
  if (progress.progressStatus === "verified") {
    if (
      !Number.isSafeInteger(progress.completedBaseIntervals) ||
      !Number.isSafeInteger(progress.scheduledBaseIntervals) ||
      progress.completedBaseIntervals === null ||
      progress.scheduledBaseIntervals === null ||
      progress.completedBaseIntervals < 0 ||
      progress.scheduledBaseIntervals <= 0 ||
      progress.completedBaseIntervals >= progress.scheduledBaseIntervals
    ) {
      fail("verified provisional progress is invalid");
    }
    return;
  }
  if (
    progress.progressStatus !== "unverified_special_session" ||
    progress.completedBaseIntervals !== null ||
    progress.scheduledBaseIntervals !== null
  ) {
    fail("unverified provisional progress must omit interval counts");
  }
}

function normalizeReference(
  reference: LocalReferenceContextV1,
  timeframe: BrooksReferenceTimeframeV1,
  base: number,
): Readonly<AnonymousReferenceContextV1> {
  if (reference.availability === "not_supplied") {
    return { availability: "not_supplied" };
  }
  return {
    availability: "supplied",
    timeframe,
    historyStart: reference.historyStart,
    visibleBarCount: reference.bars.length,
    bars: normalizeBars(reference.bars, base),
  };
}

function normalizeBars(
  bars: readonly Readonly<LocalMultiTimeframeBarV1>[],
  base: number,
): readonly Readonly<NormalizedMultiTimeframeBarV1>[] {
  return bars.map((bar, index) => ({
    barId: anonymousBarId(bar.timeframe, bar.lifecycle, index),
    sequence: index,
    timeframe: bar.timeframe,
    lifecycle: bar.lifecycle,
    open: normalizePrice(bar.open, base),
    high: normalizePrice(bar.high, base),
    low: normalizePrice(bar.low, base),
    close: normalizePrice(bar.close, base),
    continuityFromPrevious: bar.continuityFromPrevious,
    progress: bar.progress === null ? null : { ...bar.progress },
  }));
}

function anonymousBarId(
  timeframe: BrooksMultiTimeframeV1,
  lifecycle: MultiTimeframeBarLifecycleV1,
  index: number,
): string {
  return `bar:${timeframe}:${lifecycle}:${index.toString().padStart(3, "0")}`;
}

function normalizePrice(price: number, base: number): number {
  const scale = BROOKS_MULTI_TIMEFRAME_NORMALIZED_BASE_V1 / base;
  const value = price * scale;
  if (!Number.isFinite(value)) fail("normalized price must be finite");
  return Object.is(value, -0) ? 0 : value;
}

function cloneReference(
  reference: LocalReferenceContextV1,
): Readonly<LocalReferenceContextV1> {
  if (reference.availability === "not_supplied") {
    return { availability: "not_supplied" };
  }
  return {
    availability: "supplied",
    historyStart: reference.historyStart,
    bars: reference.bars.map((bar) => cloneBar(bar)),
  };
}

function cloneBar(bar: LocalMultiTimeframeBarV1): LocalMultiTimeframeBarV1 {
  return {
    ...bar,
    progress: bar.progress === null ? null : { ...bar.progress },
  };
}

function validateOhlc(bar: LocalMultiTimeframeBarV1): void {
  for (const [field, value] of Object.entries({
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  })) {
    if (!Number.isFinite(value)) fail(`${field} must be finite`);
  }
  if (
    bar.high < Math.max(bar.open, bar.close) ||
    bar.low > Math.min(bar.open, bar.close) ||
    bar.high < bar.low
  ) {
    fail("bar has invalid OHLC geometry");
  }
}

function assertNonEmptyString(name: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${name} must be a non-empty string`);
  }
}

function assertSafeInteger(name: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    fail(`${name} must be a safe integer`);
  }
}

function assertSha256(name: string, value: unknown): asserts value is ContractSha256 {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail(`${name} must be a lowercase SHA-256 identity`);
  }
}

function fail(message: string): never {
  throw new BrooksMultiTimeframeInputContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof BrooksMultiTimeframeInputContractError) throw error;
  if (error instanceof Error) {
    throw new BrooksMultiTimeframeInputContractError(error.message);
  }
  throw new BrooksMultiTimeframeInputContractError(
    "multi-timeframe input validation failed",
  );
}
