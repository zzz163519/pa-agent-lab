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
  return `sha256:${createHash("sha256")
    .update(canonicalStringify(value), "utf8")
    .digest("hex")}`;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
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

function canonicalize(
  value: unknown,
  ancestors: WeakSet<object> = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("non-finite number is not canonical JSON");
    }
    if (Object.is(value, -0)) {
      throw new Error("negative zero is not canonical JSON");
    }
    return value;
  }
  if (value === undefined) {
    throw new Error("undefined is not canonical JSON");
  }
  if (
    typeof value === "bigint" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`${typeof value} is not canonical JSON`);
  }

  if (ancestors.has(value)) {
    throw new Error("cyclic value is not canonical JSON");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      assertCanonicalArray(value);
      return value.map((item) => canonicalize(item, ancestors));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("only plain objects can be canonicalized");
    }
    if (Object.getOwnPropertySymbols(value).length !== 0) {
      throw new Error("symbol fields are not canonical JSON");
    }
    const entries = Object.getOwnPropertyNames(value).map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new Error("canonical object fields must be enumerable data properties");
      }
      return [key, canonicalize(descriptor.value, ancestors)] as const;
    });
    entries.sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

function assertCanonicalArray(value: unknown[]): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new Error("only plain arrays can be canonicalized");
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new Error("symbol fields are not canonical JSON");
  }
  const names = Object.getOwnPropertyNames(value);
  if (
    names.some(
      (name) =>
        name !== "length" &&
        (!/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length),
    )
  ) {
    throw new Error("array fields are not canonical JSON");
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new Error("sparse or accessor arrays are not canonical JSON");
    }
  }
}
