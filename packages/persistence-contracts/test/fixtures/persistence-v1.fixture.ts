import {
  renderAnonymousPolicyCharts,
  toAnonymousChartManifest,
} from "@pa-agent-lab/chart-renderer";
import {
  BROOKS_DETAIL_BAR_COUNT,
  FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
  createBrooksPolicyCase,
  createBrooksPolicyInput,
  createModelCallRecord,
  createModelRunAuditRecord,
  createModelRunRecord,
  createOutboundModelPayload,
  createProviderAttemptRecord,
} from "@pa-agent-lab/contracts";

import { createAnonymousChartArtifactMetadata } from "../../src/chart-artifact-metadata-v1.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function buildPersistedFixtureState(
  caseId = "case:persistence-fixture",
  policyStreamId = "stream:persistence-fixture",
) {
  const bars = Array.from(
    { length: BROOKS_DETAIL_BAR_COUNT },
    (_, index) => ({
      barId: `local:${index}`,
      sequence: index,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100.25 + index,
      isClosed: true,
      continuityFromPrevious:
        index === 0 ? ("unknown" as const) : ("contiguous" as const),
    }),
  );
  const finalLocalBarId = `local:${BROOKS_DETAIL_BAR_COUNT - 1}`;
  const policyCase = createBrooksPolicyCase({
    caseId,
    policyStreamId,
    barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
    bars,
    lastVisibleBarId: finalLocalBarId,
    isLeftCensored: true,
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
  const payload = createOutboundModelPayload({
    policyInput,
    promptHash: sha("1"),
    outputSchemaVersion: "brooks-decision.v1",
  });
  const call = createModelCallRecord({
    mode: "evaluation_sampled",
    decisionPoint: {
      policyStreamId: policyCase.policyStreamId,
      decisionPointBarId: policyCase.lastVisibleBarId,
      decisionPointSequence: policyCase.bars.at(-1)!.sequence,
      barDurationSeconds: FIRST_BROOKS_POLICY_BAR_DURATION_SECONDS,
      selectionPolicyId: "selection:persistence-fixture",
      inputHash: policyInput.inputHash,
      isClosed: true,
    },
    candidate: {
      candidateId: "candidate:persistence-fixture",
      modelId: "model:persistence-fixture",
    },
    protocol: {
      promptHash: payload.promptHash,
      outputSchemaVersion: payload.outputSchemaVersion,
      reasoningBudgetId: "budget:persistence-fixture",
    },
    repeatIndex: 0,
  });
  const modelRun = createModelRunRecord({ call, policyCase, payload });
  const providerAttempt = createProviderAttemptRecord({
    run: modelRun,
    attemptIndex: 0,
    providerId: "provider:persistence-fixture",
    requestHash: payload.payloadHash,
    status: "response_received",
    responseHash: sha("2"),
    errorCode: null,
    latencyMs: 250,
  });
  const modelRunAudit = createModelRunAuditRecord({
    run: modelRun,
    attempt: providerAttempt,
    rawOutputHash: sha("2"),
    decisionHash: sha("3"),
    validationResultHash: sha("4"),
    validationStatus: "accepted",
    rejectionCodes: [],
  });
  const records = {
    policy_case: policyCase,
    policy_input: policyInput,
    chart_artifact_metadata: createAnonymousChartArtifactMetadata(
      charts,
      "context",
    ),
    model_run: modelRun,
    provider_attempt: providerAttempt,
    model_run_audit: modelRunAudit,
  } as const;
  return { charts, records } as const;
}

export function makePersistedRecordFixtures() {
  return buildPersistedFixtureState().records;
}

export function makePersistedChartMetadataFixtures() {
  const { charts } = buildPersistedFixtureState();
  return {
    context: createAnonymousChartArtifactMetadata(charts, "context"),
    detail: createAnonymousChartArtifactMetadata(charts, "detail"),
  } as const;
}

export function makeCaseInputChartFixtures(
  caseId: string,
  policyStreamId: string,
) {
  const { charts, records } = buildPersistedFixtureState(
    caseId,
    policyStreamId,
  );
  return {
    policyCase: records.policy_case,
    policyInput: records.policy_input,
    chartMetadata: {
      context: createAnonymousChartArtifactMetadata(charts, "context"),
      detail: createAnonymousChartArtifactMetadata(charts, "detail"),
    },
  } as const;
}
