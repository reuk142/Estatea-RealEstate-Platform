import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
DATABASE_URL: z.string().trim().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "postgres:" || protocol === "postgresql:";
}, "Must be a PostgreSQL connection URL").optional(),
JWT_SECRET: z.string().min(32).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Estatea <no-reply@example.com>"),
  CONTACT_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
});

const parsedEnvironment = schema.safeParse(process.env);
if (!parsedEnvironment.success) {
  const invalidVariables = [...new Set(parsedEnvironment.error.issues.map((issue) => String(issue.path[0])))];
  throw new Error(`Invalid backend configuration for: ${invalidVariables.join(", ")}`);
}

export const env = parsedEnvironment.data;
export const isProduction = env.NODE_ENV === "production";

export function hasImageKitConfig(): boolean {
  return Boolean(env.IMAGEKIT_PRIVATE_KEY);
}

export function hasSmtpConfig(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
} 
