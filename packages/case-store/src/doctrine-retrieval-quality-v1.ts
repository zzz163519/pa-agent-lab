import {
  canonicalHash,
  createDoctrineRetrievalQualitySuite,
  deepFreeze,
  type ContractSha256,
  type DoctrineCorpusSnapshotV1,
  type DoctrineQualityFixtureV1,
  type DoctrineRetrievalQualitySuiteV1,
} from "@pa-agent-lab/contracts";

const POSITIVE_QUERY_BY_DOCTRINE_ID = Object.freeze({
  "du:pilot:context-over-candle-pattern": "context market state candle pattern isolation",
  "du:pilot:magnets-are-location": "support resistance magnets location objective",
  "du:pilot:trend-and-range-have-different-defaults": "trend trading range context persistence",
  "du:pilot:breakout-needs-context-and-follow-through": "breakout context follow through durable trend",
  "du:pilot:signal-is-not-setup": "setup signal trigger entry separation",
  "du:pilot:pullback-depth-follows-market-character": "pullback depth strong trend market character",
  "du:pilot:range-breakouts-can-fail": "trading range breakout failure follow through",
  "du:pilot:small-pullback-trend-is-not-low-risk-permission": "small pullback countertrend risk strong trend",
  "du:pilot:premise-invalidation-is-not-always-in-flip": "premise invalidation Always-In direction separation",
} as const);

export function createPhase4aQualitySuiteV1(
  snapshot: DoctrineCorpusSnapshotV1,
  profileHash: ContractSha256,
): Readonly<DoctrineRetrievalQualitySuiteV1> {
  const snapshotIds = snapshot.entries.map((entry) => entry.doctrineId).sort();
  const authoredIds = Object.keys(POSITIVE_QUERY_BY_DOCTRINE_ID).sort();
  if (
    snapshotIds.length !== authoredIds.length ||
    snapshotIds.some((id, index) => id !== authoredIds[index])
  ) {
    throw new Error(
      "Phase 4A quality fixtures must exactly cover the approved nine-unit pilot snapshot",
    );
  }

  const fixtures: DoctrineQualityFixtureV1[] = snapshot.entries.map((entry) => ({
    fixtureId: `positive:${entry.doctrineId}`,
    kind: "positive",
    query: POSITIVE_QUERY_BY_DOCTRINE_ID[
      entry.doctrineId as keyof typeof POSITIVE_QUERY_BY_DOCTRINE_ID
    ],
    requiredDoctrineIds: [entry.doctrineId],
    expectedDoctrineIdOrder: [],
    expectedStatus: "matched",
  }));
  fixtures.push(
    {
      fixtureId: "cross:breakout-context-follow-through",
      kind: "cross_concept",
      query: "breakout context follow through",
      requiredDoctrineIds: [
        "du:pilot:breakout-needs-context-and-follow-through",
        "du:pilot:range-breakouts-can-fail",
      ],
      expectedDoctrineIdOrder: [
        "du:pilot:breakout-needs-context-and-follow-through",
        "du:pilot:range-breakouts-can-fail",
      ],
      expectedStatus: "matched",
    },
    {
      fixtureId: "no-match:invented-lexical-marker",
      kind: "no_match",
      query: "zqxv invented lexical absence marker",
      requiredDoctrineIds: [],
      expectedDoctrineIdOrder: [],
      expectedStatus: "no_match",
    },
    {
      fixtureId: "no-match:stop-word-only",
      kind: "no_match",
      query: "the and or",
      requiredDoctrineIds: [],
      expectedDoctrineIdOrder: [],
      expectedStatus: "no_match",
    },
    {
      fixtureId: "isolation:forbidden-tracks",
      kind: "isolation",
      query: "invented calvin memory model private unauthorized checklist marker",
      requiredDoctrineIds: [],
      expectedDoctrineIdOrder: [],
      expectedStatus: "no_match",
    },
  );
  return createDoctrineRetrievalQualitySuite({ profileHash, fixtures });
}

export interface Phase4aQualityFixtureResultV1 {
  readonly fixtureId: string;
  readonly status: "passed" | "failed";
  readonly actualStatus: "matched" | "no_match";
  readonly doctrineIds: readonly string[];
  readonly repeatedDoctrineIds: readonly string[];
  readonly scoreHexes: readonly string[];
  readonly repeatedScoreHexes: readonly string[];
  readonly resultHash: ContractSha256;
}

export function createPhase4aQualityFixtureResultV1(input: {
  readonly fixture: DoctrineQualityFixtureV1;
  readonly actualStatus: "matched" | "no_match";
  readonly doctrineIds: readonly string[];
  readonly repeatedDoctrineIds: readonly string[];
  readonly scoreHexes: readonly string[];
  readonly repeatedScoreHexes: readonly string[];
}): Readonly<Phase4aQualityFixtureResultV1> {
  if (
    input.doctrineIds.length !== input.scoreHexes.length ||
    input.repeatedDoctrineIds.length !== input.repeatedScoreHexes.length ||
    [...input.scoreHexes, ...input.repeatedScoreHexes].some(
      (score) => !/^[0-9a-f]{8}$/.test(score),
    )
  ) {
    throw new Error("quality fixture results must bind exact float4 scores");
  }
  const requiredPresent = input.fixture.requiredDoctrineIds.every(
    (id) => input.doctrineIds.slice(0, 5).includes(id),
  );
  const observedRequiredOrder = input.doctrineIds.filter((id) =>
    input.fixture.expectedDoctrineIdOrder.includes(id),
  );
  const expectedOrderPresent =
    input.fixture.expectedDoctrineIdOrder.length === 0 ||
    canonicalHash(observedRequiredOrder) ===
      canonicalHash(input.fixture.expectedDoctrineIdOrder);
  const exactRepeat =
    canonicalHash({ ids: input.doctrineIds, scores: input.scoreHexes }) ===
    canonicalHash({ ids: input.repeatedDoctrineIds, scores: input.repeatedScoreHexes });
  const passed =
    input.actualStatus === input.fixture.expectedStatus &&
    requiredPresent &&
    expectedOrderPresent &&
    exactRepeat;
  const body = structuredClone({
    fixtureId: input.fixture.fixtureId,
    status: passed ? "passed" : "failed",
    actualStatus: input.actualStatus,
    doctrineIds: input.doctrineIds,
    repeatedDoctrineIds: input.repeatedDoctrineIds,
    scoreHexes: input.scoreHexes,
    repeatedScoreHexes: input.repeatedScoreHexes,
  }) as Omit<Phase4aQualityFixtureResultV1, "resultHash">;
  return deepFreeze({ ...body, resultHash: canonicalHash(body) });
}
