import pg from "pg";
import { env } from "./config/env.js";
import { HttpError } from "./utils/errors.js";

export function withRequiredSupabaseTls(connectionString: string): string {
  const url = new URL(connectionString);
  const isSupabaseHost =
    url.hostname.endsWith(".pooler.supabase.com") ||
    url.hostname.endsWith(".supabase.co");

  if (!isSupabaseHost) return connectionString;

  const sslMode = url.searchParams.get("sslmode");
  if (sslMode !== "verify-ca" && sslMode !== "verify-full") {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

export const pool: pg.Pool | null = env.DATABASE_URL
  ? new pg.Pool({
      connectionString: withRequiredSupabaseTls(env.DATABASE_URL),
      max: 5,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
    })
  : null;

if (pool) {
  pool.on("error", (error: Error) => {
    console.error(`PostgreSQL pool error: ${databaseErrorCategory(error)} (${databaseErrorCode(error) ?? "no code"})`);
  });
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined;
}

export function databaseErrorCategory(error: unknown): string {
  const code = databaseErrorCode(error);
  if (code === "28P01" || code === "28000") return "authentication or role rejected";
  if (code === "3D000") return "database does not exist";
  if (code === "3F000" || code === "42P01") return "database schema is not installed";
  if (code === "42501") return "database role lacks required privileges";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "database hostname could not be resolved";
  if (code === "ECONNREFUSED") return "database connection was refused";
  if (code === "ETIMEDOUT") return "database connection timed out";
  if (code?.startsWith("08")) return "PostgreSQL connection protocol failed";
  if (
    code?.includes("TLS") ||
    code?.includes("SSL") ||
    code?.includes("CERT") ||
    (typeof error === "object" && error !== null && "message" in error &&
      /certificate|ssl|tls/i.test(String((error as { message?: unknown }).message)))
  ) return "TLS or certificate negotiation failed";
  return "database request failed";
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const code = databaseErrorCode(error);
  return Boolean(
    code?.startsWith("08") ||
    code === "28P01" ||
    code === "28000" ||
    code === "3D000" ||
    code === "3F000" ||
    code === "42P01" ||
    code === "42501" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ETIMEDOUT" ||
    code === "57P01" ||
    code === "53300" ||
    (typeof error === "object" && error !== null && "message" in error &&
      /certificate|ssl|tls/i.test(String((error as { message?: unknown }).message)))
  );
}

export async function databaseConnected(): Promise<boolean> {
  if (!pool) return false;

  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error(`PostgreSQL connection failed: ${databaseErrorCategory(error)} (${databaseErrorCode(error) ?? "no code"})`);
    return false;
  }
}

export async function requireDatabase(): Promise<pg.Pool> {
  if (!pool) {
    throw new HttpError(
      503,
      "Database unavailable. Check DATABASE_URL."
    );
  }

  return pool;
}
