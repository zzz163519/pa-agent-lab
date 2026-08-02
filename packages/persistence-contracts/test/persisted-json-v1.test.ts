import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "@pa-agent-lab/contracts";

import {
  parsePersistedRecordJson,
  PERSISTED_RECORD_KINDS,
  serializePersistedRecord,
  type PersistedRecordKindV1,
} from "../src/persisted-json-v1.ts";
import { makePersistedRecordFixtures } from "./fixtures/persistence-v1.fixture.ts";

describe("strict persisted JSON V1", () => {
  it("round-trips every accepted Phase 1 record canonically and freezes parsed values", () => {
    const records = makePersistedRecordFixtures();
    assert.deepEqual(PERSISTED_RECORD_KINDS, Object.keys(records));

    for (const kind of PERSISTED_RECORD_KINDS) {
      const record = records[kind];
      const json = serializePersistedRecord(kind, record);
      const parsed = parsePersistedRecordJson(kind, json);
      assert.deepEqual(parsed, record);
      assert.equal(Object.isFrozen(parsed), true);
      assert.equal(serializePersistedRecord(kind, parsed), json);
    }
  });

  it("rejects ambiguous JSON syntax before domain validation", () => {
    const record = makePersistedRecordFixtures().policy_case;
    const json = serializePersistedRecord("policy_case", record);
    const duplicate = json.replace(
      '"caseId":',
      '"caseId":"duplicate","caseId":',
    );
    const nestedDuplicate = json.replace(
      '"barId":',
      '"barId":"duplicate","barId":',
    );

    assert.throws(
      () => parsePersistedRecordJson("policy_case", duplicate),
      { message: /duplicate object key: caseId/ },
    );
    assert.throws(
      () => parsePersistedRecordJson("policy_case", nestedDuplicate),
      { message: /duplicate object key: barId/ },
    );
    assert.throws(
      () => parsePersistedRecordJson("policy_case", `/*comment*/${json}`),
      { message: /invalid JSON syntax/ },
    );
    assert.throws(
      () => parsePersistedRecordJson("policy_case", `${json.slice(0, -1)},}`),
      { message: /invalid JSON syntax/ },
    );
  });

  it("rejects structural injection and identity tampering", () => {
    const records = makePersistedRecordFixtures();
    const injected = {
      ...records.policy_case,
      bars: records.policy_case.bars.map((bar, index) =>
        index === 0 ? { ...bar, futureClose: 999 } : bar,
      ),
    };
    assert.throws(
      () =>
        parsePersistedRecordJson("policy_case", JSON.stringify(injected)),
      { message: /must NOT have additional properties/ },
    );

    const tampered = {
      ...records.model_run,
      candidateId: "candidate:tampered",
    };
    assert.throws(
      () => parsePersistedRecordJson("model_run", JSON.stringify(tampered)),
      { message: /model run hash does not match its content/ },
    );

    const tamperedAttempt = {
      ...records.provider_attempt,
      latencyMs: records.provider_attempt.latencyMs + 1,
    };
    assert.throws(
      () =>
        parsePersistedRecordJson(
          "provider_attempt",
          JSON.stringify(tamperedAttempt),
        ),
      { message: /provider attempt hash does not match its content/ },
    );

    const tamperedAudit = {
      ...records.model_run_audit,
      validationResultHash:
        "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    };
    assert.throws(
      () =>
        parsePersistedRecordJson(
          "model_run_audit",
          JSON.stringify(tamperedAudit),
        ),
      { message: /model run audit hash does not match its content/ },
    );
  });

  it("rejects a self-consistent metadata hash for an unauthorized renderer", () => {
    const metadata = makePersistedRecordFixtures().chart_artifact_metadata;
    const forgedBody = {
      rendererId: "unauthorized-renderer.v1",
      rendererRuntime: metadata.rendererRuntime,
      rendererPlatform: metadata.rendererPlatform,
      panel: metadata.panel,
      mediaType: metadata.mediaType,
      widthPx: metadata.widthPx,
      heightPx: metadata.heightPx,
      renderInputHash: metadata.renderInputHash,
      contentHash: metadata.contentHash,
      byteLength: metadata.byteLength,
      barIds: metadata.barIds,
      lastVisibleBarId: metadata.lastVisibleBarId,
    } as const;
    const artifactId = canonicalHash(forgedBody);
    const forged = {
      ...metadata,
      rendererId: forgedBody.rendererId,
      artifactId,
      metadataId: canonicalHash({
        sourceCaseHash: metadata.sourceCaseHash,
        anonymousMarketHash: metadata.anonymousMarketHash,
        artifactId,
      }),
    };
    assert.throws(
      () =>
        parsePersistedRecordJson(
          "chart_artifact_metadata",
          JSON.stringify(forged),
        ),
      { message: /rendererId (?:is unsupported|must be equal to constant)/ },
    );
  });

  it("rejects a record kind that does not match the JSON schema", () => {
    const records = makePersistedRecordFixtures();
    assert.throws(
      () => parsePersistedRecordJson("unknown" as PersistedRecordKindV1, "{}"),
      { message: /persisted record kind is unsupported: unknown/ },
    );
    assert.throws(
      () =>
        parsePersistedRecordJson(
          "provider_attempt" as PersistedRecordKindV1,
          serializePersistedRecord("model_run", records.model_run),
        ),
      { message: /provider_attempt structure is invalid/ },
    );
  });
});
