import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function issueCsrfToken(res: Response): string {
  const token = randomBytes(32).toString("hex");
  res.cookie("estatea_csrf", token, {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "strict",
    path: "/",
  });
  return token;
}

export function protectMutations(req: Request, _res: Response, next: NextFunction): void {
  if (!mutationMethods.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && origin !== env.CLIENT_ORIGIN) return next(new HttpError(403, "Request origin is not allowed."));

  const cookie = req.cookies?.estatea_csrf as string | undefined;
  const header = req.get("x-csrf-token");
  if (!cookie || !header || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new HttpError(403, "Security token missing or invalid. Refresh and try again."));
  }
  next();
}

export function requestId(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
} 
