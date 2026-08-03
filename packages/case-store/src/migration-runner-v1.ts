import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { deepFreeze, type ContractSha256 } from "@pa-agent-lab/contracts";

const MIGRATION_NAME_PATTERN = /^(\d{4})_[a-z0-9_]+\.sql$/;
const TRANSACTION_PREFIX = "BEGIN;\n";
const TRANSACTION_SUFFIX = "\nCOMMIT;\n";

export interface ContentHashedMigrationV1 {
  readonly order: number;
  readonly name: string;
  readonly contentHash: ContractSha256;
  readonly content: string;
}

export interface AppliedMigrationResultV1 {
  readonly order: number;
  readonly name: string;
  readonly contentHash: ContractSha256;
  readonly status: "applied" | "existing";
}

export interface MigrationQueryClientV1 {
  query<T>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rows: readonly T[] }>;
  exec(sql: string): Promise<unknown>;
}

interface MigrationLedgerRowV1 {
  readonly migration_order: number;
  readonly migration_name: string;
  readonly content_hash: string;
}

export class MigrationContractError extends Error {
  override readonly name = "MigrationContractError";
}

export async function loadContentHashedMigrations(
  directory: string,
): Promise<readonly Readonly<ContentHashedMigrationV1>[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const names = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name)
      .sort();
    const migrations = await Promise.all(
      names.map(async (name) => {
        const match = MIGRATION_NAME_PATTERN.exec(name);
        if (match === null) fail(`migration filename is invalid: ${name}`);
        const order = Number(match[1]);
        const content = await readFile(resolve(directory, name), "utf8");
        return {
          order,
          name,
          contentHash: sha256(content),
          content,
        } as const;
      }),
    );
    validateMigrationSet(migrations);
    return deepFreeze(migrations);
  } catch (error) {
    rethrow(error);
  }
}

export async function applyContentHashedMigrations(
  client: MigrationQueryClientV1,
  migrations: readonly ContentHashedMigrationV1[],
): Promise<readonly Readonly<AppliedMigrationResultV1>[]> {
  try {
    validateMigrationSet(migrations);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pa_schema_migrations (
        migration_order integer PRIMARY KEY CHECK (migration_order > 0),
        migration_name text NOT NULL UNIQUE,
        content_hash text NOT NULL CHECK (
          content_hash ~ '^sha256:[0-9a-f]{64}$'
        ),
        UNIQUE (migration_order, migration_name, content_hash)
      )
    `);
    const stored = await client.query<MigrationLedgerRowV1>(`
      SELECT migration_order, migration_name, content_hash
      FROM pa_schema_migrations
      ORDER BY migration_order
    `);
    if (stored.rows.length > migrations.length) {
      fail("database contains an unknown applied migration");
    }

    const results: AppliedMigrationResultV1[] = [];
    for (let index = 0; index < migrations.length; index += 1) {
      const migration = migrations[index]!;
      const existing = stored.rows[index];
      if (existing !== undefined) {
        if (
          existing.migration_order !== migration.order ||
          existing.migration_name !== migration.name ||
          existing.content_hash !== migration.contentHash
        ) {
          fail(`migration content hash drift: ${migration.name}`);
        }
        results.push({ ...migrationIdentity(migration), status: "existing" });
        continue;
      }
      await applyOneMigration(client, migration);
      results.push({ ...migrationIdentity(migration), status: "applied" });
    }
    return deepFreeze(results);
  } catch (error) {
    rethrow(error);
  }
}

function validateMigrationSet(
  migrations: readonly ContentHashedMigrationV1[],
): void {
  if (migrations.length === 0 || migrations[0]?.order !== 1) {
    fail("migration sequence must begin at 0001");
  }
  migrations.forEach((migration, index) => {
    const expectedOrder = index + 1;
    const match = MIGRATION_NAME_PATTERN.exec(migration.name);
    if (
      match === null ||
      migration.order !== expectedOrder ||
      Number(match[1]) !== expectedOrder
    ) {
      fail(`migration sequence has a gap at ${migration.name}`);
    }
    if (sha256(migration.content) !== migration.contentHash) {
      fail(`migration contentHash does not match bytes: ${migration.name}`);
    }
    if (
      !migration.content.startsWith(TRANSACTION_PREFIX) ||
      !migration.content.endsWith(TRANSACTION_SUFFIX)
    ) {
      fail(`migration must use the exact transaction envelope: ${migration.name}`);
    }
  });
}

async function applyOneMigration(
  client: MigrationQueryClientV1,
  migration: ContentHashedMigrationV1,
): Promise<void> {
  const body = migration.content.slice(
    TRANSACTION_PREFIX.length,
    -TRANSACTION_SUFFIX.length,
  );
  await client.exec("BEGIN;");
  try {
    await client.exec(body);
    await client.query(
      `INSERT INTO pa_schema_migrations
        (migration_order, migration_name, content_hash)
       VALUES ($1, $2, $3)`,
      [migration.order, migration.name, migration.contentHash],
    );
    await client.exec("COMMIT;");
  } catch (error) {
    try {
      await client.exec("ROLLBACK;");
    } catch {
      // Preserve the migration failure; a broken connection cannot be recovered here.
    }
    throw error;
  }
}

function migrationIdentity(
  migration: ContentHashedMigrationV1,
): Omit<AppliedMigrationResultV1, "status"> {
  return {
    order: migration.order,
    name: migration.name,
    contentHash: migration.contentHash,
  };
}

function sha256(content: string): ContractSha256 {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}

function fail(message: string): never {
  throw new MigrationContractError(message);
}

function rethrow(error: unknown): never {
  if (error instanceof MigrationContractError) throw error;
  if (error instanceof Error) throw new MigrationContractError(error.message);
  throw new MigrationContractError("migration validation failed");
}
