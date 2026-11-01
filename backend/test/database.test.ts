import { describe, expect, it } from "vitest";
import { databaseErrorCategory, isDatabaseUnavailableError, withRequiredSupabaseTls } from "../src/db.js";
import { isValidUserId } from "../src/middleware/auth.js";

describe("PostgreSQL diagnostics and identifiers", () => {
  it("classifies common connection and schema failures without exposing messages", () => {
    const authError = Object.assign(new Error("details are intentionally hidden"), { code: "28P01" });
    const schemaError = Object.assign(new Error("details are intentionally hidden"), { code: "42P01" });

    expect(databaseErrorCategory(authError)).toBe("authentication or role rejected");
    expect(databaseErrorCategory(schemaError)).toBe("database schema is not installed");
    expect(isDatabaseUnavailableError(authError)).toBe(true);
    expect(isDatabaseUnavailableError(schemaError)).toBe(true);
  });

  it("accepts PostgreSQL UUID record identifiers and rejects legacy 24-character IDs", () => {
    expect(isValidUserId("75e4c35d-913b-4b13-b605-7dd21e1e45d1")).toBe(true);
    expect(isValidUserId("507f1f77bcf86cd799439011")).toBe(false);
  });

  it("requires TLS for Supabase pooler URLs without changing encoded credentials", () => {
    const secured = new URL(withRequiredSupabaseTls(
      "postgresql://postgres.project:p%40ss@aws-0-us-east-1.pooler.supabase.com:5432/postgres?application_name=estatea",
    ));

    expect(secured.searchParams.get("sslmode")).toBe("require");
    expect(secured.searchParams.get("uselibpqcompat")).toBe("true");
    expect(decodeURIComponent(secured.password)).toBe("p@ss");
    expect(secured.searchParams.get("application_name")).toBe("estatea");
  });

  it("preserves explicit full certificate verification for Supabase", () => {
    const connectionString = "postgresql://user:pass@db.example.supabase.co:5432/postgres?sslmode=verify-full";

    expect(withRequiredSupabaseTls(connectionString)).toBe(connectionString);
  });
});
