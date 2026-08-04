import { readFileSync } from "node:fs";

import type { ErrorObject, ValidateFunction } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import {
  deepFreeze,
  verifyBrooksPromptPackageArtifacts,
  type BrooksIdentityFreeResponseV1,
  type BrooksPromptPackageApprovalV1,
  type BrooksPromptPackageManifestV1,
  type VerifiedBrooksPromptPackageV1,
} from "@pa-agent-lab/contracts";

import { PersistenceContractError } from "./chart-artifact-metadata-v1.ts";
import { parseStrictJsonText } from "./persisted-json-v1.ts";

const promptBytes = readFileSync(
  new URL("../../../docs/prompts/BROOKS_V1_PROMPT.txt", import.meta.url),
);
const responseSchemaBytes = readFileSync(
  new URL(
    "../../../docs/prompts/BROOKS_IDENTITY_FREE_RESPONSE_V1.schema.json",
    import.meta.url,
  ),
);
const manifest = parseStrictJsonText(
  readFileSync(
    new URL("../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.json", import.meta.url),
    "utf8",
  ),
) as BrooksPromptPackageManifestV1;
const approval = parseStrictJsonText(
  readFileSync(
    new URL(
      "../../../docs/prompts/BROOKS_PROMPT_PACKAGE_V1.approval.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as BrooksPromptPackageApprovalV1;
const verifiedPromptPackage = verifyBrooksPromptPackageArtifacts({
  promptBytes,
  responseSchemaBytes,
  manifest,
  approval,
});
const responseSchema = parseStrictJsonText(
  responseSchemaBytes.toString("utf8"),
) as Record<string, unknown>;
const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  strict: true,
});
const structuralValidator: ValidateFunction = ajv.compile(responseSchema);

export function approvedBrooksPromptPackageV1(): Readonly<VerifiedBrooksPromptPackageV1> {
  return verifiedPromptPackage;
}

export function parseIdentityFreeBrooksResponseJson(
  json: string,
): Readonly<BrooksIdentityFreeResponseV1> {
  try {
    const parsed = parseStrictJsonText(json);
    if (!structuralValidator(parsed)) {
      fail(
        `identity-free response structure is invalid: ${formatAjvErrors(
          structuralValidator.errors,
        )}`,
      );
    }
    return deepFreeze(parsed) as Readonly<BrooksIdentityFreeResponseV1>;
  } catch (error) {
    rethrow(error);
  }
}

function formatAjvErrors(
  errors: readonly ErrorObject[] | null | undefined,
): string {
  if (errors === null || errors === undefined || errors.length === 0) {
    return "unknown schema violation";
  }
  return errors
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? error.keyword}`,
    )
    .join("; ");
}

function fail(message: string): never {
  throw new PersistenceContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof PersistenceContractError) throw error;
  if (error instanceof Error) throw new PersistenceContractError(error.message);
  throw new PersistenceContractError("identity-free response validation failed");
}
