const POSTGRES_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const POSTGRES_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export interface PostgresConnectionIdentityV1 {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
}

export function createPostgresConnectionStringV1(
  input: PostgresConnectionIdentityV1,
): string {
  if (!POSTGRES_HOST_PATTERN.test(input.host)) {
    throw new Error("PostgreSQL host must be one lowercase DNS name or IPv4 address");
  }
  if (!Number.isSafeInteger(input.port) || input.port < 1 || input.port > 65_535) {
    throw new Error("PostgreSQL port must be an integer from 1 through 65535");
  }
  for (const [name, value] of [
    ["database", input.database],
    ["user", input.user],
  ] as const) {
    if (!POSTGRES_IDENTIFIER_PATTERN.test(value)) {
      throw new Error(`PostgreSQL ${name} must be a lowercase identifier`);
    }
  }
  if (input.password.length < 32 || input.password.includes("\u0000")) {
    throw new Error(
      "PostgreSQL password must contain at least 32 non-NUL characters",
    );
  }
  return `postgresql://${encodeURIComponent(input.user)}:${encodeURIComponent(input.password)}@${input.host}:${input.port}/${input.database}`;
}
