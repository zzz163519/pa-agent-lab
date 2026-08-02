import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildTransportSchemaDocumentsV1 } from "../scripts/schema-generator-v1.ts";

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
