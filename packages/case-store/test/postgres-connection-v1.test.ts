import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPostgresConnectionStringV1 } from "../src/postgres-connection-v1.ts";

describe("PostgreSQL deployment connection identity", () => {
  it("percent-encodes reserved password characters without changing credentials", () => {
    const connection = createPostgresConnectionStringV1({
      host: "postgres",
      port: 5432,
      database: "pa_agent_lab",
      user: "pa_console_app",
      password: "reserved-/#?%-password-0123456789abcdef",
    });
    const parsed = new URL(connection);
    assert.equal(parsed.protocol, "postgresql:");
    assert.equal(parsed.hostname, "postgres");
    assert.equal(parsed.port, "5432");
    assert.equal(parsed.pathname, "/pa_agent_lab");
    assert.equal(decodeURIComponent(parsed.username), "pa_console_app");
    assert.equal(
      decodeURIComponent(parsed.password),
      "reserved-/#?%-password-0123456789abcdef",
    );
  });

  it("rejects an ambiguous host or PostgreSQL identity", () => {
    assert.throws(
      () =>
        createPostgresConnectionStringV1({
          host: "postgres/other",
          port: 5432,
          database: "pa_agent_lab",
          user: "pa_console_app",
          password: "password-0123456789abcdef",
        }),
      /host/,
    );
  });
});
