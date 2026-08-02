import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalHash } from "../src/contract-utils-v1.ts";

describe("canonical contract hashing", () => {
  it("keeps object-key ordering deterministic", () => {
    assert.equal(
      canonicalHash({ beta: 2, alpha: 1 }),
      canonicalHash({ alpha: 1, beta: 2 }),
    );
  });

  it("rejects values that JSON would drop, coerce, or erase", () => {
    assert.throws(() => canonicalHash({ value: undefined }), {
      message: /undefined is not canonical JSON/,
    });
    assert.throws(() => canonicalHash([undefined]), {
      message: /undefined is not canonical JSON/,
    });
    assert.throws(() => canonicalHash({ value: Number.NaN }), {
      message: /non-finite number is not canonical JSON/,
    });
    assert.throws(() => canonicalHash({ value: Number.POSITIVE_INFINITY }), {
      message: /non-finite number is not canonical JSON/,
    });
    assert.throws(() => canonicalHash({ value: Number.NEGATIVE_INFINITY }), {
      message: /non-finite number is not canonical JSON/,
    });
    assert.throws(() => canonicalHash(new Date(0)), {
      message: /only plain objects can be canonicalized/,
    });
  });

  it("accepts a shared acyclic reference and hashes its value at each path", () => {
    const shared = { value: 1 };
    assert.equal(
      canonicalHash({ left: shared, right: shared }),
      canonicalHash({ left: { value: 1 }, right: { value: 1 } }),
    );
  });

  it("rejects cyclic records instead of overflowing or hashing partial data", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    assert.throws(() => canonicalHash(cyclic), {
      message: /cyclic value is not canonical JSON/,
    });
  });
});
