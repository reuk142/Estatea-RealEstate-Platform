import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";
import { HttpError } from "../utils/errors.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export function isValidUserId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!env.JWT_SECRET) return next(new HttpError(503, "Authentication is not configured. Set JWT_SECRET in backend/.env."));
  const token = req.cookies?.estatea_session as string | undefined;
  if (!token) return next(new HttpError(401, "Please sign in to continue."));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    if (!isValidUserId(payload.sub)) throw new Error("Invalid subject");
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Please sign in again."));
  }
}

export function issueSession(userId: string): string {
  if (!env.JWT_SECRET) throw new HttpError(503, "Authentication is not configured. Set JWT_SECRET in backend/.env.");
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: 7 * 24 * 60 * 60 });
}

function baseSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" as const : "strict" as const,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function sessionCookieOptions() {
  return { ...baseSessionCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 };
}

export function sessionCookieClearOptions() {
  return baseSessionCookieOptions();
} 
