import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
} from "../src/migration-runner-v1.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as {
  readonly PGlite: new () => PGliteDatabase;
};

interface PGliteDatabase {
  query<T>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let db: PGliteDatabase;

before(() => {
  db = new PGlite();
});

after(async () => {
  await db.close();
});

describe("content-hashed Phase 3A migration runner", () => {
  it("applies ordered migrations once and records exact content hashes atomically", async () => {
    const migrations = await loadContentHashedMigrations(
      resolve(root, "persistence-contracts/sql"),
    );
    assert.deepEqual(migrations.map(({ order, name }) => [order, name]), [
      [1, "0001_phase1_immutable_records_v1.sql"],
      [2, "0002_phase2_decision_review_records_v1.sql"],
      [3, "0003_phase3a_blind_review_workflow_v1.sql"],
    ]);
    const first = await applyContentHashedMigrations(db, migrations);
    const second = await applyContentHashedMigrations(db, migrations);
    assert.deepEqual(first.map(({ status }) => status), ["applied", "applied", "applied"]);
    assert.deepEqual(second.map(({ status }) => status), ["existing", "existing", "existing"]);

    const ledger = await db.query<{
      migration_order: number;
      migration_name: string;
      content_hash: string;
    }>(`
      SELECT migration_order, migration_name, content_hash
      FROM pa_schema_migrations
      ORDER BY migration_order
    `);
    assert.deepEqual(
      ledger.rows,
      migrations.map((migration) => ({
        migration_order: migration.order,
        migration_name: migration.name,
        content_hash: migration.contentHash,
      })),
    );
  });

  it("fails closed on changed content and a migration sequence gap", async () => {
    const migrations = await loadContentHashedMigrations(
      resolve(root, "persistence-contracts/sql"),
    );
    const changedContent = migrations[1]!.content.replace(
      /\nCOMMIT;\n$/,
      "\n-- changed after acceptance\nCOMMIT;\n",
    );
    await assert.rejects(
      () =>
        applyContentHashedMigrations(db, [
          migrations[0]!,
          {
            ...migrations[1]!,
            content: changedContent,
            contentHash: sha256(changedContent),
          },
          migrations[2]!,
        ]),
      { message: /migration content hash drift/ },
    );

    const empty = new PGlite() as unknown as PGliteDatabase;
    try {
      await assert.rejects(
        () => applyContentHashedMigrations(empty, [migrations[1]!]),
        { message: /migration sequence must begin at 0001/ },
      );
    } finally {
      await empty.close();
    }
  });
});

function sha256(content: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}
