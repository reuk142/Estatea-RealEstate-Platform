import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

vi.mock("../src/db.js", () => ({
  pool: null,
  databaseConnected: async () => false,
  isDatabaseUnavailableError: () => false,
  requireDatabase: async () => {
    throw new Error("Database unavailable.");
  },
}));

import { app } from "../src/app.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("API startup and request protections", () => {
  it("returns an unhealthy status when the database is disconnected", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "error", database: "disconnected" });
  });

  it("requires a matching CSRF cookie and header for mutations", async () => {
    const blocked = await fetch(`${baseUrl}/auth/logout`, { method: "POST" });
    expect(blocked.status).toBe(403);

    const csrf = await fetch(`${baseUrl}/auth/csrf`);
    const { csrfToken } = await csrf.json() as { csrfToken: string };
    const cookie = csrf.headers.get("set-cookie");
    expect(cookie).toContain(`estatea_csrf=${csrfToken}`);

    const accepted = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, Cookie: `estatea_csrf=${csrfToken}`, "Content-Type": "application/json" },
    });
    expect(accepted.status).toBe(200);
  });

  it("returns an explicit setup error for database-backed endpoints", async () => {
    const response = await fetch(`${baseUrl}/properties`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("DATABASE_URL") });
  });
}); 
