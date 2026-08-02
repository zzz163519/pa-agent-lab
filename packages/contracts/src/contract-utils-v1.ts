import { createHash } from "node:crypto";

export type ContractSha256 = `sha256:${string}`;

export function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty`);
  }
}

export function assertStringList(
  name: string,
  values: readonly string[],
  options: { readonly min?: number; readonly max?: number } = {},
): void {
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  if (values.length < min || values.length > max) {
    throw new Error(`${name} must contain between ${min} and ${max} items`);
  }
  for (const value of values) {
    assertNonEmpty(name, value);
  }
}

export function assertUnique(name: string, values: readonly string[]): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${name} values must be unique`);
  }
}

export function assertSha256(
  name: string,
  value: string,
): asserts value is ContractSha256 {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${name} must be a lowercase SHA-256`);
  }
}

export function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

export function assertOneOf<T extends string>(
  name: string,
  value: string,
  allowed: readonly T[],
): asserts value is T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${name} is unsupported: ${value}`);
  }
}

export function canonicalHash(value: unknown): ContractSha256 {
  const canonical = canonicalize(value);
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonical), "utf8")
    .digest("hex")}`;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        )
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}
