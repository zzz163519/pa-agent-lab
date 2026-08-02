import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildReplayBoundaryTransportDocumentsV1,
  buildTransportSchemaDocumentsV1,
} from "../scripts/schema-generator-v1.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

describe("generated Phase 1 transport schemas V1", () => {
  it("keeps committed JSON Schema and OpenAPI artifacts synchronized with TypeScript", async () => {
    const generated = buildTransportSchemaDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(
        resolve(
          packageRoot,
          "schemas/phase1-persisted-records-v1.schema.json",
        ),
      ),
      readJson(
        resolve(
          packageRoot,
          "openapi/phase1-persisted-records-v1.openapi.json",
        ),
      ),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);
  });

  it("publishes six closed record components without inventing API endpoints", async () => {
    const openapi = (await readJson(
      resolve(
        packageRoot,
        "openapi/phase1-persisted-records-v1.openapi.json",
      ),
    )) as {
      readonly openapi: string;
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-record-kinds": Readonly<Record<string, string>>;
    };

    assert.equal(openapi.openapi, "3.1.1");
    assert.deepEqual(openapi.paths, {});
    assert.deepEqual(Object.keys(openapi["x-pa-record-kinds"]), [
      "policy_case",
      "policy_input",
      "chart_artifact_metadata",
      "model_run",
      "provider_attempt",
      "model_run_audit",
    ]);
    for (const component of Object.values(openapi["x-pa-record-kinds"])) {
      const schema = openapi.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false);
    }
    const sha256Schema = openapi.components.schemas.ContractSha256 as {
      readonly pattern?: string;
    };
    assert.equal(sha256Schema.pattern, "^sha256:[0-9a-f]{64}$");
    const caseSchema = openapi.components.schemas.BrooksPolicyCaseV1 as {
      readonly properties: {
        readonly bars: {
          readonly minItems?: number;
          readonly maxItems?: number;
          readonly items: {
            readonly properties: {
              readonly sequence: {
                readonly type?: string;
                readonly minimum?: number;
              };
            };
          };
        };
      };
    };
    assert.equal(caseSchema.properties.bars.minItems, 40);
    assert.equal(caseSchema.properties.bars.maxItems, 120);
    assert.deepEqual(caseSchema.properties.bars.items.properties.sequence, {
      type: "integer",
      minimum: 0,
    });

    for (const reference of collectReferences(openapi)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(openapi.components.schemas[name], `unresolved schema: ${name}`);
    }
  });
  it("publishes replay request and result schemas without persisted-record or API authority", async () => {
    const generated = buildReplayBoundaryTransportDocumentsV1(packageRoot);
    const [schemaBundle, openapi] = await Promise.all([
      readJson(resolve(packageRoot, "schemas/replay-boundary-v1.schema.json")),
      readJson(resolve(packageRoot, "openapi/replay-boundary-v1.openapi.json")),
    ]);
    assert.deepEqual(schemaBundle, generated.schemaBundle);
    assert.deepEqual(openapi, generated.openapi);

    const document = openapi as {
      readonly paths: Readonly<Record<string, unknown>>;
      readonly components: {
        readonly schemas: Readonly<Record<string, unknown>>;
      };
      readonly "x-pa-replay-components": readonly string[];
      readonly "x-pa-record-kinds"?: unknown;
      readonly "x-pa-runtime-authority": string;
    };
    assert.deepEqual(document.paths, {});
    assert.deepEqual(document["x-pa-replay-components"], [
      "ReplayRequestV1",
      "ReplayResultV1",
    ]);
    assert.equal(document["x-pa-record-kinds"], undefined);
    assert.equal(
      document["x-pa-runtime-authority"],
      "research_only_no_replay_engine_or_trading_authority",
    );
    for (const component of document["x-pa-replay-components"]) {
      const schema = document.components.schemas[component] as {
        readonly additionalProperties?: unknown;
      };
      assert.equal(schema.additionalProperties, false);
    }
    const unresolvedTerminal = document.components.schemas
      .UnresolvedReplayTerminalV1 as {
      readonly properties: {
        readonly detectedAtEventSequence: {
          readonly type?: unknown;
          readonly minimum?: number;
        };
      };
    };
    assert.deepEqual(
      unresolvedTerminal.properties.detectedAtEventSequence,
      { type: ["integer", "null"], minimum: 0 },
    );
    const decisionBinding = document.components.schemas
      .ReplayDecisionBindingV1 as {
      readonly properties: {
        readonly barDurationSeconds: {
          readonly type?: string;
          readonly minimum?: number;
          readonly const?: number;
        };
      };
    };
    assert.deepEqual(decisionBinding.properties.barDurationSeconds, {
      type: "integer",
      minimum: 0,
      const: 300,
    });
    for (const reference of collectReferences(document)) {
      assert.match(reference, /^#\/components\/schemas\/[A-Za-z0-9_]+$/);
      const name = reference.slice("#/components/schemas/".length);
      assert.ok(document.components.schemas[name], `unresolved schema: ${name}`);
    }
  });
});

function collectReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectReferences);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "$ref" && typeof nested === "string"
      ? [nested]
      : collectReferences(nested),
  );
}
