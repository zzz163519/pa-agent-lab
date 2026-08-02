import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDoctrineUnit,
  createSource,
  resolveApprovedDoctrineReferences,
  toDoctrineRagRecord,
} from "../src/doctrine-v1.ts";

const source = createSource({
  sourceId: "source:brooks-website-1",
  sourceType: "brooks_website",
  title: "Brooks public article",
  urlOrLocalRef: "https://example.invalid/brooks-source",
  contentHash:
    "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  private: false,
});

function doctrine(status: "draft" | "approved" | "retired") {
  return createDoctrineUnit({
    doctrineId: `D-${status}`,
    sourceId: source.sourceId,
    concept: "second_entry_buy",
    rule: "A second attempt can provide a stronger long setup basis.",
    appliesWhen: ["A first attempt is identifiable."],
    avoidWhen: ["Strong opposing pressure remains dominant."],
    decisionEffect: ["May support a long setup but cannot bypass signal."],
    status,
  });
}

describe("simplified doctrine records", () => {
  it("exposes only core trading semantics to RAG", () => {
    const approved = doctrine("approved");

    assert.deepEqual(toDoctrineRagRecord(approved), {
      doctrineId: "D-approved",
      concept: "second_entry_buy",
      rule: "A second attempt can provide a stronger long setup basis.",
      appliesWhen: ["A first attempt is identifiable."],
      avoidWhen: ["Strong opposing pressure remains dominant."],
      decisionEffect: ["May support a long setup but cannot bypass signal."],
    });
  });

  it("resolves only approved doctrine IDs from the retrieved set", () => {
    const approved = doctrine("approved");
    const resolved = resolveApprovedDoctrineReferences(
      [approved.doctrineId],
      [approved],
    );

    assert.deepEqual(resolved, [approved]);
    assert.throws(
      () =>
        resolveApprovedDoctrineReferences(
          ["D-draft"],
          [doctrine("draft")],
        ),
      {
        name: "DoctrineContractError",
        message: /doctrine is not approved/,
      },
    );
  });

  it("keeps complete source metadata outside the RAG record", () => {
    const ragRecord = toDoctrineRagRecord(doctrine("approved"));

    assert.equal("sourceId" in ragRecord, false);
    assert.equal("contentHash" in ragRecord, false);
    assert.equal("urlOrLocalRef" in ragRecord, false);
  });
});
