import {
  renderAnonymousPolicyCharts,
  toAnonymousChartManifest,
} from "@pa-agent-lab/chart-renderer";
import {
  BROOKS_CONTEXT_BAR_COUNT,
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  createBrooksDecision,
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  createCalvinReview,
} from "@pa-agent-lab/contracts";

import { createAnonymousChartArtifactMetadata } from "../../src/chart-artifact-metadata-v1.ts";
import { createSyntheticCaseBundle } from "../../src/case-store-transport-v1.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
} from "../../../contracts/test/fixtures/brooks-decision-v1.fixture.ts";

export interface Phase2CaseStoreFixtureOptionsV1 {
  readonly caseId?: string;
  readonly policyStreamId?: string;
  readonly priceOffset?: number;
  readonly identitySuffix?: string;
}

export function makePhase2CaseStoreFixture(
  options: Phase2CaseStoreFixtureOptionsV1 = {},
) {
  const caseId = options.caseId ?? "case:phase2-store-fixture";
  const policyStreamId =
    options.policyStreamId ?? "stream:phase2-store-fixture";
  const priceOffset = options.priceOffset ?? 0;
  const identitySuffix = options.identitySuffix ?? "phase2-store-fixture";
  const bars = Array.from({ length: BROOKS_CONTEXT_BAR_COUNT }, (_, index) => ({
    barId: `local:${index}`,
    sequence: index,
    open: 100 + index + priceOffset,
    high: 101 + index + priceOffset,
    low: 99 + index + priceOffset,
    close: 100.25 + index + priceOffset,
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
  const policyCase = createBrooksPolicyCase({
    caseId,
    policyStreamId,
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
    doctrine: [],
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
  const decision = createBrooksDecision(
    {
      ...makeValidLongDecision(),
      decisionId: `decision:${identitySuffix}`,
      caseId: policyCase.caseId,
      inputHash: policyInput.inputHash,
    },
    makeValidationContext(),
  ).decision;
  const review = createCalvinReview(
    {
      reviewId: `review:${identitySuffix}`,
      brooksDecisionId: decision.decisionId,
      reviewedDecisionHash: decision.decisionHash,
      scope: "whole_decision",
      disposition: "disagree",
      independentVerdict: "no_trade",
      summary: "The whole synthetic decision is not accepted.",
      outcomeBlind: true,
    },
    decision,
  );
  return { caseBundle, charts, decision, review } as const;
}
