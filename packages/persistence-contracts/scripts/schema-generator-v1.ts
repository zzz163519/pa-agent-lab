import { resolve } from "node:path";

import {
  BROOKS_CONTEXT_BAR_COUNT,
  BROOKS_DETAIL_BAR_COUNT,
} from "@pa-agent-lab/contracts";
import { createGenerator } from "ts-json-schema-generator";

const TARGETS = [
  {
    kind: "policy_case",
    component: "BrooksPolicyCaseV1",
    source: "../contracts/src/policy-input-v1.ts",
  },
  {
    kind: "policy_input",
    component: "BrooksPolicyInputV1",
    source: "../contracts/src/policy-input-v1.ts",
  },
  {
    kind: "chart_artifact_metadata",
    component: "AnonymousChartArtifactMetadataV1",
    source: "src/chart-artifact-metadata-v1.ts",
  },
  {
    kind: "model_run",
    component: "ModelRunRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
  {
    kind: "provider_attempt",
    component: "ProviderAttemptRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
  {
    kind: "model_run_audit",
    component: "ModelRunAuditRecordV1",
    source: "../contracts/src/model-run-audit-v1.ts",
  },
] as const;

export interface GeneratedTransportDocumentsV1 {
  readonly schemaBundle: Readonly<Record<string, unknown>>;
  readonly openapi: Readonly<Record<string, unknown>>;
}

export function buildTransportSchemaDocumentsV1(
  packageRoot: string,
): GeneratedTransportDocumentsV1 {
  const components: Record<string, unknown> = {};

  for (const target of TARGETS) {
    const generator = createGenerator({
      path: resolve(packageRoot, target.source),
      type: target.component,
      tsconfig: resolve(packageRoot, "tsconfig.json"),
      expose: "export",
      topRef: false,
      jsDoc: "none",
      sortProps: true,
      strictTuples: true,
      skipTypeCheck: true,
      encodeRefs: false,
      additionalProperties: false,
      functions: "fail",
    });
    const generated = generator.createSchema(target.component) as Record<
      string,
      unknown
    >;
    const definitions = asRecord(generated.definitions);
    const root = { ...generated };
    delete root.$schema;
    delete root.definitions;
    addComponent(components, target.component, root);
    for (const [name, definition] of Object.entries(definitions)) {
      addComponent(components, name, definition);
    }
  }

  refineGeneratedComponents(components);

  const recordKinds = Object.fromEntries(
    TARGETS.map((target) => [target.kind, target.component]),
  );
  const openapiComponents = Object.fromEntries(
    Object.entries(components).map(([name, schema]) => [
      name,
      rewriteRefs(schema, "components"),
    ]),
  );
  const schemaDefinitions = Object.fromEntries(
    Object.entries(components).map(([name, schema]) => [
      name,
      rewriteRefs(schema, "schema"),
    ]),
  );

  return {
    schemaBundle: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://pa-agent-lab.local/schemas/phase1-persisted-records-v1",
      $defs: schemaDefinitions,
    },
    openapi: {
      openapi: "3.1.1",
      info: {
        title: "PA Agent Lab Phase 1 Persisted Record Schemas",
        version: "1.0.0",
      },
      jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
      paths: {},
      components: { schemas: openapiComponents },
      "x-pa-record-kinds": recordKinds,
      "x-pa-runtime-authority": "research_only_no_provider_or_trading_authority",
    },
  };
}

function refineGeneratedComponents(components: Record<string, unknown>): void {
  const sha256 = asRecord(components.ContractSha256);
  sha256.pattern = "^sha256:[0-9a-f]{64}$";

  for (const schema of Object.values(components)) refineSchemaNode(schema);
}

function refineSchemaNode(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(refineSchemaNode);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const properties = asOptionalRecord(record.properties);
  for (const [name, nested] of Object.entries(properties)) {
    const property = asRecord(nested);
    const integerMinimum = integerMinimumFor(name);
    if (integerMinimum !== undefined && property.type === "number") {
      property.type = "integer";
      property.minimum = integerMinimum;
    }
    if (name === "visibleBarCount") {
      property.maximum = BROOKS_CONTEXT_BAR_COUNT;
    }
    if (name === "leftCensoredBarsMissing") {
      property.maximum = BROOKS_CONTEXT_BAR_COUNT - BROOKS_DETAIL_BAR_COUNT;
    }
    if ((name === "bars" || name === "barIds") && property.type === "array") {
      property.minItems = BROOKS_DETAIL_BAR_COUNT;
      property.maxItems = BROOKS_CONTEXT_BAR_COUNT;
    }
    refineSchemaNode(nested);
  }
  for (const [name, nested] of Object.entries(record)) {
    if (name !== "properties") refineSchemaNode(nested);
  }
}

function integerMinimumFor(name: string): number | undefined {
  if (["widthPx", "heightPx", "byteLength"].includes(name)) return 1;
  if (
    [
      "barDurationSeconds",
      "sequence",
      "visibleBarCount",
      "leftCensoredBarsMissing",
      "decisionPointSequence",
      "repeatIndex",
      "attemptIndex",
    ].includes(name)
  ) {
    return 0;
  }
  return undefined;
}

function asOptionalRecord(value: unknown): Record<string, unknown> {
  return value === undefined ? {} : asRecord(value);
}

function addComponent(
  components: Record<string, unknown>,
  name: string,
  schema: unknown,
): void {
  const existing = components[name];
  if (existing !== undefined && stableJson(existing) !== stableJson(schema)) {
    throw new Error(`generated schema component collision: ${name}`);
  }
  components[name] = schema;
}

function rewriteRefs(
  value: unknown,
  target: "components" | "schema",
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRefs(item, target));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => {
      if (
        key === "$ref" &&
        typeof nested === "string" &&
        nested.startsWith("#/definitions/")
      ) {
        const name = nested.slice("#/definitions/".length);
        return [
          key,
          target === "components"
            ? `#/components/schemas/${name}`
            : `#/$defs/${name}`,
        ];
      }
      return [key, rewriteRefs(nested, target)];
    }),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("generated schema definitions must be an object");
  }
  return value as Record<string, unknown>;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
