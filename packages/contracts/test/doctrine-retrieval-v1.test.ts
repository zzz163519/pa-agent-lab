import {
  createDoctrineCorpusEntry,
  createDoctrineCorpusSnapshot,
  createDoctrineRetrievalProfile,
  createDoctrineRetrievalQuery,
  createDoctrineRetrievalEvidence,
  normalizeDoctrineQuery,
} from "../src/doctrine-retrieval-v1.ts";
import {
  createDoctrineApproval,
  createDoctrineProposalBundle,
} from "../src/doctrine-approval-v1.ts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Phase 4A doctrine retrieval contracts", () => {
  it("accepts the exact public approved pilot source projection", () => {
    const proposal = createPhase3bPilotDoctrineProposalsV1()[0]!;
    const approval = createDoctrineApproval({ proposalHash: proposal.proposalHash, doctrineId: proposal.doctrineUnit.doctrineId, sourceId: proposal.source.sourceId, sourceContentHash: proposal.source.contentHash, approverPrincipal: "local:phase2-operator" });
    const entry = createDoctrineCorpusEntry({ proposal, approval });
    const snapshot = createDoctrineCorpusSnapshot([entry]);
    assert.equal(snapshot.entries[0]!.ragRecord.doctrineId, proposal.doctrineUnit.doctrineId);
    assert.equal(Object.isFrozen(snapshot), true);

    const unauthorizedProposal = createDoctrineProposalBundle({
      source: {
        ...proposal.source,
        title: `${proposal.source.title} altered`,
      },
      doctrineUnit: proposal.doctrineUnit,
      sourceLocator: proposal.sourceLocator,
    });
    const unauthorizedApproval = createDoctrineApproval({
      proposalHash: unauthorizedProposal.proposalHash,
      doctrineId: unauthorizedProposal.doctrineUnit.doctrineId,
      sourceId: unauthorizedProposal.source.sourceId,
      sourceContentHash: unauthorizedProposal.source.contentHash,
      approverPrincipal: "local:phase2-operator",
    });
    assert.throws(() =>
      createDoctrineCorpusEntry({
        proposal: unauthorizedProposal,
        approval: unauthorizedApproval,
      }),
    );
  });
  it("normalizes Unicode and rejects controls and bounds", () => {
    assert.equal(normalizeDoctrineQuery("  e\u0301\t  trend  "), "é trend");
    assert.throws(() => normalizeDoctrineQuery("\u0000"));
    assert.throws(() => normalizeDoctrineQuery("x".repeat(401)));
  });
  it("pins the profile and creates immutable evidence", () => {
    const profile = createDoctrineRetrievalProfile();
    assert.equal(profile.textSearchConfiguration, "pg_catalog.english");
    const hash = "sha256:" + "a".repeat(64) as `sha256:${string}`;
    const query = createDoctrineRetrievalQuery({ activationId: hash, runId: hash, snapshotId: hash, profileHash: profile.profileHash, originalQuery: "trend", repeatIndex: 0, operatorPrincipal: "local:phase2-operator" });
    const evidence = createDoctrineRetrievalEvidence({ schemaVersion: "doctrine-retrieval-evidence.v1", queryId: query.queryId, activationId: hash, runId: hash, snapshotId: hash, profileHash: profile.profileHash, normalizedQuery: query.normalizedQuery, queryHash: query.queryHash, limit: 5, status: "no_match", results: [], errorCodes: [] });
    assert.match(evidence.evidenceId, /^sha256:[0-9a-f]{64}$/);
  });
});
