import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { QueryResultRow } from "pg";
import { z } from "zod";
import { env } from "../config/env.js";
import { databaseConnected, requireDatabase } from "../db.js";
import { AuthRequest, authenticate, isValidUserId, issueSession, sessionCookieClearOptions, sessionCookieOptions } from "../middleware/auth.js";
import { issueCsrfToken } from "../middleware/security.js";
import { propertyImages } from "../middleware/upload.js";
import { sendContactMessage, sendPasswordResetEmail } from "../services/email.js";
import { deletePropertyImage, uploadPropertyImages } from "../services/imageStorage.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { HttpError } from "../utils/errors.js";

export const apiRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(30).optional().default(""),
});
const profileSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
const propertySchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(30).max(5000),
  price: z.coerce.number().finite().positive().max(1_000_000_000_000),
  propertyType: z.enum(["apartment", "house", "villa", "plot", "commercial"]),
  listingType: z.enum(["sale", "rent"]),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(250),
  area: z.coerce.number().finite().positive().max(10_000_000),
  bedrooms: z.coerce.number().int().min(0).max(30),
  bathrooms: z.coerce.number().int().min(0).max(30),
});
const bookingSchema = z.object({
  startsAt: z.coerce.date().refine((date) => date.getTime() > Date.now(), "Choose a future date and time."),
  guestName: z.string().trim().min(2).max(100).optional(),
  guestEmail: z.string().trim().email().max(254).optional(),
  guestPhone: z.string().trim().min(6).max(30).optional(),
  message: z.string().trim().max(1000).optional().default(""),
});
const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(120).default("A note for Estatea"),
  message: z.string().trim().min(10).max(3000),
});

interface UserRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash?: string;
  reset_token_hash?: string | null;
  reset_token_expires_at?: Date | string | null;
}

interface PropertyImage {
  url: string;
  fileId: string;
}

interface PublicUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface PropertyRow extends QueryResultRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number | string;
  property_type: string;
  listing_type: string;
  city: string;
  address: string;
  area: number | string;
  bedrooms: number;
  bathrooms: number;
  images: PropertyImage[];
  created_at: Date | string;
  updated_at: Date | string;
  owner?: PublicUser | null;
}

interface PropertySummary {
  _id: string;
  title: string;
  city: string;
  images: PropertyImage[];
  price: number;
}

interface BookingRow extends QueryResultRow {
  id: string;
  property_id: string | null;
  owner_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  starts_at: Date | string;
  message: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: Date | string;
  updated_at: Date | string;
  guest_token_hash?: string | null;
  property?: PropertySummary | null;
  owner?: PublicUser | null;
  user?: PublicUser | null;
}

type DbRow = QueryResultRow;

async function query<Row extends DbRow>(text: string, values: unknown[] = []): Promise<Row[]> {
  const database = await requireDatabase();
  const result = await database.query<Row>(text, values as never[]);
  return result.rows;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, result.error.issues.map((issue) => issue.message).join(" "));
  return result.data;
}

function safeUser(user: Pick<UserRow, "id" | "name" | "email" | "phone">) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? "" };
}

function requireRecordId(value: string): string {
  if (!isValidUserId(value)) throw new HttpError(404, "The requested record was not found.");
  return value;
}

function setSessionCookie(res: Response, userId: string): void {
  res.cookie("estatea_session", issueSession(userId), sessionCookieOptions());
}

function getOptionalUserId(req: Request): string | undefined {
  if (!env.JWT_SECRET) return undefined;
  const token = req.cookies?.estatea_session as string | undefined;
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    return isValidUserId(payload.sub) ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

const propertyColumns = `
  p.id::text AS id, p.owner_id::text AS owner_id, p.title, p.description,
  p.price::float8 AS price, p.property_type, p.listing_type, p.city, p.address,
  p.area::float8 AS area, p.bedrooms, p.bathrooms, p.images,
  p.created_at, p.updated_at`;

const ownerJson = `jsonb_build_object(
  '_id', u.id::text, 'name', u.name, 'email', u.email, 'phone', u.phone
)`;

function propertyJson(row: PropertyRow, includeVirtualId = false) {
  return {
    _id: row.id,
    ...(includeVirtualId ? { id: row.id } : {}),
    title: row.title,
    description: row.description,
    price: Number(row.price),
    propertyType: row.property_type,
    listingType: row.listing_type,
    city: row.city,
    address: row.address,
    area: Number(row.area),
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    images: Array.isArray(row.images) ? row.images : [],
    owner: row.owner ?? row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const bookingColumns = `
  b.id::text AS id, b.property_id::text AS property_id, b.owner_id::text AS owner_id,
  b.user_id::text AS user_id, b.guest_name, b.guest_email, b.guest_phone,
  b.starts_at, b.message, b.status, b.created_at, b.updated_at`;

const bookingPropertyJson = `CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
  '_id', p.id::text, 'title', p.title, 'city', p.city,
  'images', p.images, 'price', p.price::float8
) END`;

function bookingJson(row: BookingRow, includeVirtualId = false) {
  return {
    _id: row.id,
    ...(includeVirtualId ? { id: row.id } : {}),
    property: row.property !== undefined ? row.property : row.property_id,
    owner: row.owner ?? row.owner_id,
    user: row.user !== undefined ? row.user : row.user_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    startsAt: row.starts_at,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

apiRouter.get("/health", asyncRoute(async (_req, res) => {
  if (!(await databaseConnected())) {
    return res.status(503).json({ status: "error", database: "disconnected" });
  }
  return res.json({ status: "ok", database: "connected" });
}));
apiRouter.get("/auth/csrf", (_req, res) => res.json({ csrfToken: issueCsrfToken(res) }));

apiRouter.post("/auth/register", asyncRoute(async (req, res) => {
  const input = parse(registerSchema, req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [user] = await query<UserRow>(
    `INSERT INTO app_private.users (name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id::text AS id, name, email, phone`,
    [input.name, input.email.toLowerCase(), passwordHash, input.phone],
  );
  if (!user) throw new HttpError(409, "An account with this email already exists.");
  setSessionCookie(res, user.id);
  res.status(201).json({ user: safeUser(user) });
}));

apiRouter.post("/auth/login", asyncRoute(async (req, res) => {
  const input = parse(loginSchema, req.body);
  const [user] = await query<UserRow>(
    `SELECT id::text AS id, name, email, phone, password_hash
     FROM app_private.users WHERE email = $1`,
    [input.email.toLowerCase()],
  );
  if (!user || !user.password_hash || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  setSessionCookie(res, user.id);
  res.json({ user: safeUser(user) });
}));

apiRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("estatea_session", sessionCookieClearOptions());
  res.json({ message: "You have been signed out." });
});

apiRouter.get("/users/me", authenticate, asyncRoute(async (req, res) => {
  const [user] = await query<UserRow>(
    `SELECT id::text AS id, name, email, phone FROM app_private.users WHERE id = $1`,
    [(req as AuthRequest).userId],
  );
  if (!user) throw new HttpError(404, "Your account could not be found.");
  res.json({ user: safeUser(user) });
}));

apiRouter.patch("/users/me", authenticate, asyncRoute(async (req, res) => {
  const input = parse(profileSchema, req.body);
  const [user] = await query<UserRow>(
    `UPDATE app_private.users SET name = $1, phone = $2, updated_at = now()
     WHERE id = $3 RETURNING id::text AS id, name, email, phone`,
    [input.name, input.phone, (req as AuthRequest).userId],
  );
  if (!user) throw new HttpError(404, "Your account could not be found.");
  res.json({ user: safeUser(user) });
}));

apiRouter.post("/auth/forgot-password", asyncRoute(async (req, res) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new HttpError(503, "Password reset is unavailable until SMTP credentials are configured in backend/.env.");
  }
  const email = z.string().email().safeParse(req.body?.email);
  if (!email.success) throw new HttpError(400, "Enter a valid email address.");
  const [user] = await query<UserRow>(
    `SELECT id::text AS id, email FROM app_private.users WHERE email = $1`,
    [email.data.toLowerCase()],
  );
  if (user) {
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
    await query(
      `UPDATE app_private.users
       SET reset_token_hash = $1, reset_token_expires_at = now() + interval '30 minutes', updated_at = now()
       WHERE id = $2`,
      [resetTokenHash, user.id],
    );
    try {
      await sendPasswordResetEmail(user.email, `${env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`);
    } catch (error) {
      await query(
        `UPDATE app_private.users SET reset_token_hash = NULL, reset_token_expires_at = NULL, updated_at = now()
         WHERE id = $1 AND reset_token_hash = $2`,
        [user.id, resetTokenHash],
      );
      throw error;
    }
  }
  res.json({ message: "If an account exists for that email, a reset link has been sent." });
}));

apiRouter.post("/auth/reset-password", asyncRoute(async (req, res) => {
  const input = z.object({ token: z.string().min(32).max(128), password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!input.success) throw new HttpError(400, "Enter a valid reset token and a password of at least 8 characters.");
  const tokenHash = createHash("sha256").update(input.data.token).digest("hex");
  const passwordHash = await bcrypt.hash(input.data.password, 12);
  const updated = await query(
    `UPDATE app_private.users
     SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL, updated_at = now()
     WHERE reset_token_hash = $2 AND reset_token_expires_at > now()
     RETURNING id`,
    [passwordHash, tokenHash],
  );
  if (!updated.length) throw new HttpError(400, "This password reset link is invalid or has expired.");
  res.json({ message: "Your password has been updated. You can now sign in." });
}));

apiRouter.post("/contact", asyncRoute(async (req, res) => {
  const input = parse(contactSchema, req.body);
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.CONTACT_EMAIL) {
    throw new HttpError(503, "Contact messages are unavailable until SMTP and CONTACT_EMAIL are configured in backend/.env.");
  }
  await sendContactMessage(input);
  res.status(202).json({ message: "Thanks for reaching out. Your message has been sent." });
}));

apiRouter.get("/properties", asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
  const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 12));
  const values: unknown[] = [];
  const filters: string[] = [];
  const addFilter = (value: unknown, clause: (placeholder: string) => string) => {
    values.push(value);
    filters.push(clause(`$${values.length}`));
  };

  const city = String(req.query.city ?? req.query.location ?? "").trim();
  const search = String(req.query.q ?? "").trim().slice(0, 100);
  if (city) addFilter(city, (p) => `position(lower(${p}) in lower(p.city)) > 0`);
  if (search) addFilter(search, (p) => `to_tsvector('english', concat_ws(' ', p.title, p.description, p.city)) @@ plainto_tsquery('english', ${p})`);
  if (["apartment", "house", "villa", "plot", "commercial"].includes(String(req.query.propertyType))) {
    addFilter(req.query.propertyType, (p) => `p.property_type = ${p}`);
  }
  if (["sale", "rent"].includes(String(req.query.listingType))) {
    addFilter(req.query.listingType, (p) => `p.listing_type = ${p}`);
  }
  const numericFilters: Array<[string, string, string]> = [
    ["minPrice", "p.price", ">="], ["maxPrice", "p.price", "<="],
    ["minArea", "p.area", ">="], ["maxArea", "p.area", "<="],
    ["bedrooms", "p.bedrooms", ">="],
  ];
  for (const [param, field, operator] of numericFilters) {
    const raw = req.query[param];
    if (raw !== undefined && raw !== "") {
      const number = Number(raw);
      if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `The ${param} filter must be a non-negative number.`);
      addFilter(number, (p) => `${field} ${operator} ${p}`);
    }
  }

  const sortKey = String(req.query.sort ?? "newest");
  const orderBy = sortKey === "price_asc" ? "p.price ASC" : sortKey === "price_desc" ? "p.price DESC" : "p.created_at DESC";
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const database = await requireDatabase();
  const [itemsResult, totalResult] = await Promise.all([
    database.query<PropertyRow>(
      `SELECT ${propertyColumns}, ${ownerJson} AS owner
       FROM app_private.properties p
       JOIN app_private.users u ON u.id = p.owner_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit],
    ),
    database.query<{ total: number } & QueryResultRow>(
      `SELECT count(*)::int AS total FROM app_private.properties p ${where}`,
      values as never[],
    ),
  ]);
  const total = totalResult.rows[0]?.total ?? 0;
  res.json({ items: itemsResult.rows.map((row) => propertyJson(row)), page, limit, total, pages: Math.ceil(total / limit) });
}));

apiRouter.get("/properties/mine", authenticate, asyncRoute(async (req, res) => {
  const items = await query<PropertyRow>(
    `SELECT ${propertyColumns} FROM app_private.properties p
     WHERE p.owner_id = $1 ORDER BY p.created_at DESC`,
    [(req as AuthRequest).userId],
  );
  res.json({ items: items.map((row) => propertyJson(row)) });
}));

apiRouter.get("/properties/:id", asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const [property] = await query<PropertyRow>(
    `SELECT ${propertyColumns}, ${ownerJson} AS owner
     FROM app_private.properties p JOIN app_private.users u ON u.id = p.owner_id
     WHERE p.id = $1`,
    [id],
  );
  if (!property) throw new HttpError(404, "Property not found.");
  res.json({ property: propertyJson(property) });
}));

apiRouter.post("/properties", authenticate, propertyImages, asyncRoute(async (req, res) => {
  const input = parse(propertySchema, req.body);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const images = await uploadPropertyImages(files);
  try {
    const [property] = await query<PropertyRow>(
      `INSERT INTO app_private.properties
       (owner_id, title, description, price, property_type, listing_type, city, address, area, bedrooms, bathrooms, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING id::text AS id, owner_id::text AS owner_id, title, description,
       price::float8 AS price, property_type, listing_type, city, address, area::float8 AS area,
       bedrooms, bathrooms, images, created_at, updated_at`,
      [
        (req as AuthRequest).userId, input.title, input.description, input.price, input.propertyType,
        input.listingType, input.city, input.address, input.area, input.bedrooms, input.bathrooms, JSON.stringify(images),
      ],
    );
    res.status(201).json({ property: propertyJson(property, true) });
  } catch (error) {
    await Promise.all(images.map((image) => deletePropertyImage(image.fileId)));
    throw error;
  }
}));

apiRouter.patch("/properties/:id", authenticate, propertyImages, asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const userId = (req as AuthRequest).userId!;
  const [property] = await query<PropertyRow>(
    `SELECT ${propertyColumns} FROM app_private.properties p WHERE p.id = $1`,
    [id],
  );
  if (!property) throw new HttpError(404, "Property not found.");
  if (property.owner_id !== userId) throw new HttpError(403, "You can only edit your own listings.");
  const input = parse(propertySchema.partial(), req.body);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  let retainedIds: string[] | undefined;
  if (req.body.keepImageIds !== undefined) {
    try {
      retainedIds = z.array(z.string()).max(4).parse(JSON.parse(String(req.body.keepImageIds)));
    } catch {
      throw new HttpError(400, "The selected property images are invalid.");
    }
    if (retainedIds.some((fileId) => !property.images.some((image) => image.fileId === fileId))) {
      throw new HttpError(400, "You can only keep images that belong to this property.");
    }
  }
  const oldImages = Array.isArray(property.images) ? property.images : [];
  const retained = retainedIds ? oldImages.filter((image) => retainedIds?.includes(image.fileId)) : oldImages;
  if (retained.length + files.length > 4) throw new HttpError(400, "A property can have at most four images.");
  const uploaded = await uploadPropertyImages(files);
  const removed = retainedIds ? oldImages.filter((image) => !retainedIds?.includes(image.fileId)) : [];
  const columns: Record<string, string> = {
    title: "title", description: "description", price: "price", propertyType: "property_type",
    listingType: "listing_type", city: "city", address: "address", area: "area",
    bedrooms: "bedrooms", bathrooms: "bathrooms",
  };
  const values: unknown[] = [];
  const assignments: string[] = [];
  for (const [field, column] of Object.entries(columns)) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      values.push(input[field as keyof typeof input]);
      assignments.push(`${column} = $${values.length}`);
    }
  }
  values.push(JSON.stringify([...retained, ...uploaded]));
  assignments.push(`images = $${values.length}::jsonb`);
  assignments.push("updated_at = now()");
  values.push(id, userId);
  let updated: PropertyRow | undefined;
  try {
    [updated] = await query<PropertyRow>(
      `UPDATE app_private.properties SET ${assignments.join(", ")}
       WHERE id = $${values.length - 1} AND owner_id = $${values.length}
       RETURNING id::text AS id, owner_id::text AS owner_id, title, description,
       price::float8 AS price, property_type, listing_type, city, address, area::float8 AS area,
       bedrooms, bathrooms, images, created_at, updated_at`,
      values,
    );
    if (!updated) throw new HttpError(404, "Property not found.");
  } catch (error) {
    await Promise.all(uploaded.map((image) => deletePropertyImage(image.fileId)));
    throw error;
  }
  await Promise.all(removed.map((image) => deletePropertyImage(image.fileId)));
  res.json({ property: propertyJson(updated, true) });
}));

apiRouter.delete("/properties/:id", authenticate, asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const userId = (req as AuthRequest).userId!;
  const database = await requireDatabase();
  const client = await database.connect();
  let images: PropertyImage[] = [];
  try {
    await client.query("BEGIN");
    const found = await client.query<PropertyRow>(
      `SELECT ${propertyColumns} FROM app_private.properties p WHERE p.id = $1 FOR UPDATE`,
      [id],
    );
    const property = found.rows[0];
    if (!property) throw new HttpError(404, "Property not found.");
    if (property.owner_id !== userId) throw new HttpError(403, "You can only delete your own listings.");
    images = Array.isArray(property.images) ? property.images : [];
    await client.query(
      `UPDATE app_private.bookings SET status = 'cancelled', updated_at = now()
       WHERE property_id = $1 AND status <> 'cancelled'`,
      [id],
    );
    await client.query(`DELETE FROM app_private.properties WHERE id = $1`, [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await Promise.all(images.map((image) => deletePropertyImage(image.fileId)));
  res.json({ message: "Property deleted." });
}));

apiRouter.post("/properties/:id/bookings", asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const [property] = await query<PropertyRow>(
    `SELECT ${propertyColumns} FROM app_private.properties p WHERE p.id = $1`,
    [id],
  );
  if (!property) throw new HttpError(404, "Property not found.");
  const userId = getOptionalUserId(req);
  if (userId && property.owner_id === userId) throw new HttpError(400, "You cannot book a viewing for your own listing.");
  const input = parse(bookingSchema, req.body);
  let guestToken: string | undefined;
  if (!userId && (!input.guestName || !input.guestEmail || !input.guestPhone)) {
    throw new HttpError(400, "Guests must provide their name, email, and phone number.");
  }
  if (!userId) guestToken = randomBytes(32).toString("hex");
  const guestTokenHash = guestToken ? createHash("sha256").update(guestToken).digest("hex") : null;
  const [booking] = await query<BookingRow>(
    `INSERT INTO app_private.bookings
     (property_id, owner_id, user_id, guest_name, guest_email, guest_phone, starts_at, message, guest_token_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id::text AS id, property_id::text AS property_id, owner_id::text AS owner_id,
     user_id::text AS user_id, guest_name, guest_email, guest_phone, starts_at, message, status, created_at, updated_at`,
    [
      property.id, property.owner_id, userId ?? null, input.guestName ?? null,
      input.guestEmail?.toLowerCase() ?? null, input.guestPhone ?? null,
      input.startsAt, input.message, guestTokenHash,
    ],
  );
  res.status(201).json({ booking: bookingJson(booking), ...(guestToken ? { guestToken } : {}) });
}));

apiRouter.get("/bookings/mine", authenticate, asyncRoute(async (req, res) => {
  const bookings = await query<BookingRow>(
    `SELECT ${bookingColumns}, ${bookingPropertyJson} AS property,
       ${ownerJson} AS owner
     FROM app_private.bookings b
     LEFT JOIN app_private.properties p ON p.id = b.property_id
     JOIN app_private.users u ON u.id = b.owner_id
     WHERE b.user_id = $1 ORDER BY b.starts_at ASC`,
    [(req as AuthRequest).userId],
  );
  res.json({ bookings: bookings.map((booking) => bookingJson(booking)) });
}));

apiRouter.get("/bookings/incoming", authenticate, asyncRoute(async (req, res) => {
  const bookings = await query<BookingRow>(
    `SELECT ${bookingColumns}, ${bookingPropertyJson} AS property,
       CASE WHEN guest_user.id IS NULL THEN NULL ELSE jsonb_build_object(
         '_id', guest_user.id::text, 'name', guest_user.name, 'email', guest_user.email, 'phone', guest_user.phone
       ) END AS "user"
     FROM app_private.bookings b
     LEFT JOIN app_private.properties p ON p.id = b.property_id
     LEFT JOIN app_private.users guest_user ON guest_user.id = b.user_id
     WHERE b.owner_id = $1 ORDER BY b.starts_at ASC`,
    [(req as AuthRequest).userId],
  );
  res.json({ bookings: bookings.map((booking) => bookingJson(booking)) });
}));

apiRouter.get("/bookings/:id", asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const [booking] = await query<BookingRow>(
    `SELECT ${bookingColumns}, b.guest_token_hash,
       ${bookingPropertyJson} AS property,
       ${ownerJson} AS owner
     FROM app_private.bookings b
     LEFT JOIN app_private.properties p ON p.id = b.property_id
     JOIN app_private.users u ON u.id = b.owner_id
     WHERE b.id = $1`,
    [id],
  );
  if (!booking) throw new HttpError(404, "Viewing request not found.");
  const userId = getOptionalUserId(req);
  const token = req.get("x-booking-token");
  const tokenHash = token ? createHash("sha256").update(token).digest("hex") : "";
  const isGuest = Boolean(tokenHash && booking.guest_token_hash && tokenHash === booking.guest_token_hash);
  const isParticipant = Boolean(userId && (booking.user_id === userId || booking.owner_id === userId));
  if (!isGuest && !isParticipant) throw new HttpError(403, "You are not allowed to view this appointment.");
  res.json({ booking: bookingJson(booking) });
}));

apiRouter.patch("/bookings/:id", authenticate, asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const status = z.enum(["confirmed", "cancelled"]).safeParse(req.body?.status);
  if (!status.success) throw new HttpError(400, "Choose a valid appointment status.");
  const [booking] = await query<BookingRow>(
    `SELECT ${bookingColumns} FROM app_private.bookings b WHERE b.id = $1`,
    [id],
  );
  if (!booking) throw new HttpError(404, "Viewing request not found.");
  const userId = (req as AuthRequest).userId!;
  if (booking.owner_id !== userId && (status.data !== "cancelled" || booking.user_id !== userId)) {
    throw new HttpError(403, "You are not allowed to change this appointment.");
  }
  if (booking.status === "cancelled") throw new HttpError(409, "This appointment has already been cancelled.");
  const [updated] = await query<BookingRow>(
    `UPDATE app_private.bookings SET status = $1, updated_at = now()
     WHERE id = $2 RETURNING id::text AS id, property_id::text AS property_id, owner_id::text AS owner_id,
     user_id::text AS user_id, guest_name, guest_email, guest_phone, starts_at, message, status, created_at, updated_at`,
    [status.data, id],
  );
  res.json({ booking: bookingJson(updated, true) });
}));

apiRouter.post("/bookings/:id/cancel", asyncRoute(async (req, res) => {
  const id = requireRecordId(req.params.id);
  const [booking] = await query<BookingRow>(
    `SELECT ${bookingColumns}, guest_token_hash FROM app_private.bookings b WHERE b.id = $1`,
    [id],
  );
  if (!booking) throw new HttpError(404, "Viewing request not found.");
  const userId = getOptionalUserId(req);
  const token = req.get("x-booking-token");
  const tokenHash = token ? createHash("sha256").update(token).digest("hex") : "";
  const allowed = Boolean((userId && booking.user_id === userId) || (tokenHash && booking.guest_token_hash === tokenHash));
  if (!allowed) throw new HttpError(403, "You are not allowed to cancel this appointment.");
  if (booking.status === "cancelled") throw new HttpError(409, "This appointment has already been cancelled.");
  const [updated] = await query<BookingRow>(
    `UPDATE app_private.bookings SET status = 'cancelled', updated_at = now()
     WHERE id = $1
     RETURNING id::text AS id, property_id::text AS property_id, owner_id::text AS owner_id,
     user_id::text AS user_id, guest_name, guest_email, guest_phone, starts_at, message, status, created_at, updated_at`,
    [id],
  );
  res.json({ booking: bookingJson(updated, true) });
}));

apiRouter.get("/dashboard", authenticate, asyncRoute(async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const [properties, appointments, incoming, upcoming] = await Promise.all([
    query<{ count: number } & QueryResultRow>(
      `SELECT count(*)::int AS count FROM app_private.properties WHERE owner_id = $1`,
      [userId],
    ),
    query<{ count: number } & QueryResultRow>(
      `SELECT count(*)::int AS count FROM app_private.bookings WHERE user_id = $1`,
      [userId],
    ),
    query<{ count: number } & QueryResultRow>(
      `SELECT count(*)::int AS count FROM app_private.bookings WHERE owner_id = $1 AND status = 'pending'`,
      [userId],
    ),
    query<{ count: number } & QueryResultRow>(
      `SELECT count(*)::int AS count FROM app_private.bookings
       WHERE (user_id = $1 OR owner_id = $1) AND starts_at >= now() AND status <> 'cancelled'`,
      [userId],
    ),
  ]);
  res.json({
    stats: {
      properties: properties[0]?.count ?? 0,
      appointments: appointments[0]?.count ?? 0,
      incomingRequests: incoming[0]?.count ?? 0,
      upcomingViewings: upcoming[0]?.count ?? 0,
    },
  });
}));
