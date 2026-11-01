import { app } from "./app.js";
import { env } from "./config/env.js";
import { databaseErrorCategory, databaseErrorCode, pool } from "./db.js";

async function startServer(): Promise<void> {
  if (!pool) {
    console.error("DATABASE_URL is missing in backend/.env");
  } else {
    try {
      await pool.query("SELECT 1");
      console.log("Connected to PostgreSQL successfully.");
    } catch (error) {
      console.error(`PostgreSQL connection failed: ${databaseErrorCategory(error)} (${databaseErrorCode(error) ?? "no code"})`);
    }
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Estatea API running at http://localhost:${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down gracefully.`);
    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed.");
        process.exitCode = 1;
      }
      try {
        await pool?.end();
      } catch {
        console.error("PostgreSQL pool shutdown failed.");
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void startServer();
