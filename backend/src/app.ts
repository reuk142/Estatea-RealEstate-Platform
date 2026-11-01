import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { databaseConnected, isDatabaseUnavailableError, pool } from "./db.js";
import { protectMutations, requestId } from "./middleware/security.js";
import { apiRouter } from "./routes/api.js";
import { HttpError } from "./utils/errors.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Booking-Token"] }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(requestId);
app.use(protectMutations);
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api/contact", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/auth/csrf" || req.path === "/auth/logout" || req.path === "/contact") return next();
  if (!pool) {
    return res.status(503).json({ error: "Database unavailable. Configure DATABASE_URL in backend/.env." });
  }
  next();
});
app.use("/api", apiRouter);
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return res.status(409).json({ error: "A record with those details already exists." });
  }
  if (isDatabaseUnavailableError(error)) {
    return res.status(503).json({ error: "Database unavailable. Check PostgreSQL connectivity and schema setup." });
  }
  if (typeof error === "object" && error !== null && "name" in error && error.name === "MulterError") {
    return res.status(400).json({ error: "Upload rejected. Use up to four images, each no larger than 5 MB." });
  }
  console.error("Unhandled API error.");
  return res.status(500).json({ error: "An unexpected server error occurred." });
};
app.use(errorHandler); 
