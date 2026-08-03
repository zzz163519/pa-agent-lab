import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1,
  assertApproveDoctrineCommand,
  assertRetireDoctrineCommand,
  createDoctrineApprovalMutationResult,
} from "../src/index.ts";

const HASH = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

describe("Phase 3B Doctrine approval transport", () => {
  it("publishes only the five minimal synchronous routes", () => {
    assert.deepEqual(
      DOCTRINE_APPROVAL_ROUTE_MANIFEST_V1.map(({ method, path, authentication }) => ({ method, path, authentication })),
      [
        { method: "POST", path: "/v1/doctrine/proposals", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/proposals", authentication: "operator_or_reviewer_token" },
        { method: "GET", path: "/v1/doctrine/proposals/:doctrineId", authentication: "operator_or_reviewer_token" },
        { method: "POST", path: "/v1/doctrine/proposals/:doctrineId/approve", authentication: "operator_or_reviewer_token" },
        { method: "POST", path: "/v1/doctrine/proposals/:doctrineId/retire", authentication: "operator_or_reviewer_token" },
      ],
    );
  });

  it("accepts exact commands and rejects client-supplied principals", () => {
    assert.doesNotThrow(() => assertApproveDoctrineCommand({ proposalHash: HASH }));
    assert.doesNotThrow(() => assertRetireDoctrineCommand({ approvalHash: HASH, reason: "Superseded by a corrected source mapping." }));
    assert.throws(
      () => assertApproveDoctrineCommand({ proposalHash: HASH, approverPrincipal: "local:calvin-reviewer" }),
      /exact keys/,
    );
    assert.throws(
      () => assertRetireDoctrineCommand({ approvalHash: HASH, reason: "" }),
      /reason/,
    );
  });

  it("builds one bounded mutation envelope", () => {
    const result = createDoctrineApprovalMutationResult({
      requestId: "request:1",
      status: "inserted",
      resourceKind: "doctrine_approval",
      resourceHash: HASH,
      workItem: {
        schemaVersion: "doctrine-work-item.v1",
        proposal: {
          schemaVersion: "doctrine-proposal-bundle.v1",
          proposalHash: HASH,
          source: {
            sourceId: "source:test",
            sourceType: "brooks_website",
            title: "Source",
            urlOrLocalRef: "https://example.test/source",
            contentHash: HASH,
            private: false,
          },
          doctrineUnit: {
            doctrineId: "du:test",
            sourceId: "source:test",
            concept: "context",
            rule: "Use context.",
            appliesWhen: ["A setup is assessed"],
            avoidWhen: ["Context is missing"],
            decisionEffect: ["Require context"],
            status: "draft",
          },
          sourceLocator: "Section Context",
        },
        status: "draft",
        approval: null,
        retirement: null,
      },
    });
    assert.equal(result.schemaVersion, "doctrine-approval-mutation-result.v1");
  });
});
