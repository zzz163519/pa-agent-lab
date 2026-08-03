import {
  persistAnonymousChartArtifacts,
  renderAnonymousPolicyCharts,
  toAnonymousChartManifest,
  type PersistedAnonymousChartBundleV1,
} from "@pa-agent-lab/chart-renderer";
import {
  BROOKS_CONTEXT_BAR_COUNT,
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  createBrooksDecision,
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  createCalvinReview,
  createDoctrineUnit,
  toDoctrineRagRecord,
} from "@pa-agent-lab/contracts";
import {
  createAnonymousChartArtifactMetadata,
  createSyntheticCaseBundle,
} from "@pa-agent-lab/persistence-contracts";

export function createPhase2SyntheticFixtureV1() {
  const doctrine = [
    createDoctrineUnit({
      doctrineId: "D-synthetic-context",
      sourceId: "source:synthetic-fixture",
      concept: "synthetic_context",
      rule: "Synthetic fixture context never supplies trade authority.",
      appliesWhen: ["Testing deterministic contract behavior."],
      avoidWhen: ["Making a real market judgment."],
      decisionEffect: ["Keep the fixture outcome-blind."],
      status: "approved",
    }),
    createDoctrineUnit({
      doctrineId: "D-synthetic-no-setup",
      sourceId: "source:synthetic-fixture",
      concept: "synthetic_no_setup",
      rule: "The synthetic fixture defines no actionable setup.",
      appliesWhen: ["Testing the no-trade contract path."],
      avoidWhen: ["Inferring a setup from fixture prices."],
      decisionEffect: ["Use no_trade with no_setup."],
      status: "approved",
    }),
  ] as const;
  const bars = Array.from({ length: BROOKS_CONTEXT_BAR_COUNT }, (_, index) => ({
    barId: `synthetic:${index}`,
    sequence: index,
    open: 100 + (index % 5) * 0.1,
    high: 100.6 + (index % 5) * 0.1,
    low: 99.6 + (index % 5) * 0.1,
    close: 100.1 + (index % 5) * 0.1,
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
  const policyCase = createBrooksPolicyCase({
    caseId: "case:phase2-cli-synthetic-v1",
    policyStreamId: "stream:phase2-cli-synthetic-v1",
    barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
    bars,
    lastVisibleBarId: bars.at(-1)!.barId,
    isLeftCensored: false,
  });
  const charts = renderAnonymousPolicyCharts(policyCase);
  const policyInput = createBrooksPolicyInput({
    policyCase,
    charts: {
      context: toAnonymousChartManifest(charts.context),
      detail: toAnonymousChartManifest(charts.detail),
    },
    doctrine: doctrine.map(toDoctrineRagRecord),
  });
  const chartMetadata = {
    context: createAnonymousChartArtifactMetadata(charts, "context"),
    detail: createAnonymousChartArtifactMetadata(charts, "detail"),
  } as const;
  const caseBundle = createSyntheticCaseBundle({
    sourceScope: "synthetic_fixture_only",
    policyCase,
    policyInput,
    chartMetadata,
    binding: {
      caseHash: policyCase.caseHash,
      inputHash: policyInput.inputHash,
      contextMetadataId: chartMetadata.context.metadataId,
      detailMetadataId: chartMetadata.detail.metadataId,
    },
  });
  const lastBarId = policyInput.market.lastVisibleBarId;
  const priorBarId = policyInput.market.bars.at(-2)!.barId;
  const decision = createBrooksDecision(
    {
      decisionId: "decision:phase2-cli-synthetic-v1",
      caseId: policyCase.caseId,
      inputHash: policyInput.inputHash,
      lastVisibleBarId: lastBarId,
      barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
      verdict: "no_trade",
      evidenceBalance: "balanced",
      broadContext: {
        marketState: "trading_range",
        trendDirection: "none",
        claimIds: ["claim:context"],
      },
      currentLeg: { direction: "sideways", claimIds: ["claim:context"] },
      alwaysIn: { state: "not_established", claimIds: ["claim:context"] },
      pressure: {
        buying: { state: "absent", claimIds: ["claim:long"] },
        selling: { state: "absent", claimIds: ["claim:short"] },
        balance: "balanced",
      },
      breakoutLifecycle: {
        state: "none",
        direction: "none",
        structureId: null,
        claimIds: ["claim:context"],
      },
      reversalLifecycle: {
        state: "none",
        fromDirection: "none",
        toDirection: "none",
        claimIds: ["claim:context"],
      },
      structures: [],
      magnets: [],
      marketEvidence: [
        {
          evidenceId: "evidence:context",
          barIds: [priorBarId, lastBarId],
          observedFields: ["relationship"],
          observationCode: "synthetic_context_only",
        },
        {
          evidenceId: "evidence:no-setup",
          barIds: [lastBarId],
          observedFields: ["relationship"],
          observationCode: "synthetic_no_setup",
        },
      ],
      claims: [
        {
          claimId: "claim:context",
          statementCode: "synthetic_context",
          marketEvidenceIds: ["evidence:context"],
          doctrineIds: ["D-synthetic-context"],
        },
        {
          claimId: "claim:long",
          statementCode: "synthetic_long_absent",
          marketEvidenceIds: ["evidence:no-setup"],
          doctrineIds: ["D-synthetic-no-setup"],
        },
        {
          claimId: "claim:short",
          statementCode: "synthetic_short_absent",
          marketEvidenceIds: ["evidence:no-setup"],
          doctrineIds: ["D-synthetic-no-setup"],
        },
        {
          claimId: "claim:verdict",
          statementCode: "synthetic_no_trade",
          marketEvidenceIds: ["evidence:no-setup"],
          doctrineIds: ["D-synthetic-no-setup"],
        },
      ],
      longCase: {
        direction: "long",
        state: "absent",
        evidenceBalance: "balanced",
        setupCandidates: [],
        signalBasis: {
          kind: "discrete_bar",
          state: "absent",
          signalBarIds: [],
          doctrineIds: [],
          claimIds: ["claim:long"],
        },
        triggerState: "not_applicable",
        claimIds: ["claim:long"],
      },
      shortCase: {
        direction: "short",
        state: "absent",
        evidenceBalance: "balanced",
        setupCandidates: [],
        signalBasis: {
          kind: "discrete_bar",
          state: "absent",
          signalBarIds: [],
          doctrineIds: [],
          claimIds: ["claim:short"],
        },
        triggerState: "not_applicable",
        claimIds: ["claim:short"],
      },
      tradePlan: null,
      noTrade: {
        reasonCodes: ["no_setup"],
        claimIds: ["claim:verdict"],
        nextObservableCondition: "synthetic_fixture_has_no_follow_up",
      },
      uncertainty: null,
      humanSummary: "This synthetic fixture has no actionable setup.",
    },
    {
      visibleBars: policyInput.market.bars.map(
        ({ barId, open, high, low, close }) => ({
          barId,
          open,
          high,
          low,
          close,
        }),
      ),
      retrievedDoctrine: doctrine,
      plannedGeometry: null,
    },
  ).decision;
  const review = createCalvinReview(
    {
      reviewId: "review:phase2-cli-synthetic-v1",
      brooksDecisionId: decision.decisionId,
      reviewedDecisionHash: decision.decisionHash,
      scope: "whole_decision",
      disposition: "agree",
      independentVerdict: "no_trade",
      summary: "The whole synthetic no-trade decision is accepted as a fixture.",
      outcomeBlind: true,
    },
    decision,
  );
  return { caseBundle, charts, decision, review } as const;
}

export async function persistPhase2SyntheticFixtureChartsV1(
  rootDirectory: string,
): Promise<PersistedAnonymousChartBundleV1> {
  return persistAnonymousChartArtifacts(
    createPhase2SyntheticFixtureV1().charts,
    rootDirectory,
  );
}
