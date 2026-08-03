import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1,
  assertDoctrineActivationCommand,
  assertDoctrineIngestionCommand,
  assertDoctrineRetrievalQueryCommand,
} from "../src/doctrine-retrieval-transport-v1.ts";

const HASH = `sha256:${"a".repeat(64)}` as const;

describe("Phase 4A Doctrine retrieval transport", () => {
  it("publishes exactly seven operator-only routes", () => {
    assert.deepEqual(
      DOCTRINE_RETRIEVAL_ROUTE_MANIFEST_V1.map(({ method, path, authentication }) => ({ method, path, authentication })),
      [
        { method: "POST", path: "/v1/doctrine/ingestion-runs", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/corpus-snapshots/:snapshotId", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/ingestion-runs/:runId", authentication: "operator_token" },
        { method: "POST", path: "/v1/doctrine/activations", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/activations/current", authentication: "operator_token" },
        { method: "POST", path: "/v1/doctrine/retrieval-queries", authentication: "operator_token" },
        { method: "GET", path: "/v1/doctrine/retrieval-evidence/:evidenceId", authentication: "operator_token" },
      ],
    );
  });
  it("accepts bounded exact commands and rejects principals/profile grammar", () => {
    assert.doesNotThrow(() => assertDoctrineIngestionCommand({}));
    assert.doesNotThrow(() => assertDoctrineIngestionCommand({ attemptIndex: 0 }));
    assert.doesNotThrow(() => assertDoctrineActivationCommand({ runId: HASH, qualityReportHash: HASH }));
    assert.doesNotThrow(() => assertDoctrineRetrievalQueryCommand({ query: "breakout context", limit: 5 }));
    assert.throws(() => assertDoctrineRetrievalQueryCommand({}));
    assert.throws(() => assertDoctrineRetrievalQueryCommand({ query: "breakout", operatorPrincipal: "local:calvin-reviewer" }));
    assert.throws(() => assertDoctrineIngestionCommand({ profileHash: HASH }));
  });
});
