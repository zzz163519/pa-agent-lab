import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
import {
  CASE_API_BODY_LIMIT_BYTES,
  CASE_API_ROUTE_MANIFEST_V1,
  assertCaseAuditViewIntegrity,
  assertSyntheticCaseBundleIntegrity,
  createCaseApiError,
  createCaseApiMutationResult,
  createCaseAuditView,
  createSyntheticCaseBundle,
} from "../src/case-store-transport-v1.ts";
import { createAnonymousChartArtifactMetadata } from "../src/chart-artifact-metadata-v1.ts";
import {
  makeValidLongDecision,
  makeValidationContext,
} from "../../contracts/test/fixtures/brooks-decision-v1.fixture.ts";

const sha = (digit: string) => `sha256:${digit.repeat(64)}` as const;

function makeSyntheticBundleInput() {
  const bars = Array.from({ length: BROOKS_CONTEXT_BAR_COUNT }, (_, index) => ({
    barId: `local:${index}`,
    sequence: index,
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100.25 + index,
    isClosed: true,
    continuityFromPrevious:
      index === 0 ? ("unknown" as const) : ("contiguous" as const),
  }));
  const policyCase = createBrooksPolicyCase({
    caseId: "case:phase2-synthetic",
    policyStreamId: "stream:phase2-synthetic",
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
  return {
    sourceScope: "synthetic_fixture_only" as const,
    policyCase,
    policyInput,
    chartMetadata,
    binding: {
      caseHash: policyCase.caseHash,
      inputHash: policyInput.inputHash,
      contextMetadataId: chartMetadata.context.metadataId,
      detailMetadataId: chartMetadata.detail.metadataId,
    },
  } as const;
}

describe("SyntheticCaseBundleV1", () => {
  it("binds one complete synthetic Case/input/chart aggregate and rejects authority widening", () => {
    const input = makeSyntheticBundleInput();
    const first = createSyntheticCaseBundle(input);
    const second = createSyntheticCaseBundle(makeSyntheticBundleInput());
    assert.equal(first.bundleHash, second.bundleHash);
    assert.equal(Object.isFrozen(first), true);
    assert.doesNotThrow(() => assertSyntheticCaseBundleIntegrity(first));

    assert.throws(
      () =>
        createSyntheticCaseBundle({
          ...input,
          sourceScope: "historical_market_data" as never,
        }),
      { message: /synthetic_fixture_only/ },
    );
    assert.throws(
      () =>
        assertSyntheticCaseBundleIntegrity({
          ...first,
          protectedWindow: "2025-02",
        }),
      { message: /fields must match the exact V1 contract/ },
    );
    assert.throws(
      () =>
        createSyntheticCaseBundle({
          ...input,
          binding: { ...input.binding, inputHash: sha("f") },
        }),
      { message: /binding does not match/ },
    );
  });
});

describe("CaseAuditViewV1", () => {
  it("derives conflict from immutable BrooksDecision and CalvinReview records", () => {
    const caseBundle = createSyntheticCaseBundle(makeSyntheticBundleInput());
    const decision = createBrooksDecision(
      {
        ...makeValidLongDecision(),
        decisionId: "decision:phase2-synthetic",
        caseId: caseBundle.policyCase.caseId,
        inputHash: caseBundle.policyInput.inputHash,
      },
      makeValidationContext(),
    ).decision;
    const review = createCalvinReview(
      {
        reviewId: "review:phase2-synthetic",
        brooksDecisionId: decision.decisionId,
        reviewedDecisionHash: decision.decisionHash,
        scope: "whole_decision",
        disposition: "disagree",
        independentVerdict: "no_trade",
        summary: "The complete synthetic decision is not accepted.",
        outcomeBlind: true,
      },
      decision,
    );
    const audit = createCaseAuditView({ caseBundle, decision, review });

    assert.deepEqual(audit.decisionConflict?.kinds, [
      "whole_decision_disagreement",
      "verdict_disagreement",
    ]);
    assert.equal(Object.isFrozen(audit), true);
    assert.doesNotThrow(() => assertCaseAuditViewIntegrity(audit));
    assert.throws(
      () =>
        assertCaseAuditViewIntegrity({
          ...audit,
          decisionConflict: { ...audit.decisionConflict!, status: "closed" },
        }),
      { message: /audit hash|derived conflict/ },
    );
    assert.throws(
      () =>
        createCaseAuditView({ caseBundle, decision: null, review }),
      { message: /requires its BrooksDecision/ },
    );
  });
});

describe("Phase 2 API transport constants", () => {
  it("fixes bounded envelopes and a REST-only route manifest", () => {
    assert.equal(CASE_API_BODY_LIMIT_BYTES, 512 * 1024);
    assert.deepEqual(
      CASE_API_ROUTE_MANIFEST_V1.map(({ method, path }) => [method, path]),
      [
        ["POST", "/v1/synthetic-case-bundles"],
        ["POST", "/v1/brooks-decisions"],
        ["POST", "/v1/calvin-reviews"],
        ["GET", "/v1/cases/:caseHash"],
        ["GET", "/v1/cases/:caseHash/audit"],
        ["GET", "/v1/chart-artifacts/:artifactId/content"],
        ["GET", "/healthz"],
        ["GET", "/readyz"],
      ],
    );
    assert.ok(
      CASE_API_ROUTE_MANIFEST_V1.every(
        ({ transport }) => transport === "request_response",
      ),
    );

    const success = createCaseApiMutationResult({
      requestId: "request:synthetic",
      status: "inserted",
      resourceKind: "synthetic_case_bundle",
      resourceHash: sha("a"),
    });
    const error = createCaseApiError({
      requestId: "request:synthetic",
      code: "IDENTITY_CONFLICT",
      message: "The immutable identity already names different content.",
    });
    assert.equal(success.schemaVersion, "case-api-mutation-result.v1");
    assert.equal(error.schemaVersion, "case-api-error.v1");
    assert.equal(Object.isFrozen(success), true);
    assert.equal(Object.isFrozen(error), true);
  });
});
