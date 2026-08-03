import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

import {
  applyContentHashedMigrations,
  loadContentHashedMigrations,
  type AppliedMigrationResultV1,
} from "./migration-runner-v1.ts";

const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export interface BootstrapPhase2DatabaseOptionsV1 {
  readonly adminConnectionString: string;
  readonly applicationLoginRole: string;
  readonly applicationPassword: string;
  readonly migrationsDirectory: string;
  readonly infrastructureDirectory: string;
}

export async function bootstrapPhase2DatabaseV1(
  options: BootstrapPhase2DatabaseOptionsV1,
): Promise<readonly Readonly<AppliedMigrationResultV1>[]> {
  validateBootstrapOptions(options);
  const pool = new pg.Pool({ connectionString: options.adminConnectionString, max: 1 });
  const client = await pool.connect();
  try {
    const bootstrapSql = await readFile(
      resolve(options.infrastructureDirectory, "bootstrap-roles-v1.sql"),
      "utf8",
    );
    await client.query(bootstrapSql);
    const role = options.applicationLoginRole;
    const password = sqlLiteral(options.applicationPassword);
    const roleExists = await client.query<{ readonly exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
      [role],
    );
    if (roleExists.rows[0]?.exists !== true) {
      await client.query(
        `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT PASSWORD '${password}'`,
      );
    } else {
      await client.query(
        `ALTER ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT PASSWORD '${password}'`,
      );
    }
    await client.query(`GRANT pa_app TO ${role}`);

    const migrations = await loadContentHashedMigrations(
      options.migrationsDirectory,
    );
    await client.query("SET ROLE pa_migrator");
    let applied: readonly Readonly<AppliedMigrationResultV1>[];
    try {
      applied = await applyContentHashedMigrations(
        {
          query: async <T>(sql: string, values: readonly unknown[] = []) => {
            const result = await client.query(sql, values as unknown[]);
            return { rows: result.rows as readonly T[] };
          },
          exec: (sql) => client.query(sql),
        },
        migrations,
      );
    } finally {
      await client.query("RESET ROLE");
    }
    const grantsSql = await readFile(
      resolve(options.infrastructureDirectory, "application-grants-v1.sql"),
      "utf8",
    );
    await client.query(grantsSql);
    return applied;
  } finally {
    client.release();
    await pool.end();
  }
}

function validateBootstrapOptions(
  options: BootstrapPhase2DatabaseOptionsV1,
): void {
  if (!ROLE_NAME_PATTERN.test(options.applicationLoginRole)) {
    throw new Error("applicationLoginRole must be a lowercase PostgreSQL identifier");
  }
  if (options.applicationPassword.length < 32) {
    throw new Error("applicationPassword must contain at least 32 characters");
  }
  for (const [name, value] of [
    ["adminConnectionString", options.adminConnectionString],
    ["migrationsDirectory", options.migrationsDirectory],
    ["infrastructureDirectory", options.infrastructureDirectory],
  ] as const) {
    if (value.trim().length === 0) throw new Error(`${name} must not be empty`);
  }
}

function sqlLiteral(value: string): string {
  if (/\u0000/.test(value)) throw new Error("applicationPassword cannot contain NUL");
  return value.replaceAll("'", "''");
}
