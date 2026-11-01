# Estatea — RealEstate Platform

Responsive React + TypeScript property platform with an Express/PostgreSQL API.
The core app includes accounts, property listings/search, viewing bookings, and
a protected database-backed dashboard. The optional AI hub is not enabled or
required.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- Supabase PostgreSQL (or another PostgreSQL 13+ database)
- SMTP account for password reset emails (optional until reset is needed)
- ImageKit account for property image uploads (optional until uploading images)

## Run locally (Windows PowerShell)

1. Copy the backend configuration template once, then edit `backend/.env`
   locally:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

   Set `DATABASE_URL` to the PostgreSQL connection URI from Supabase and set a
   unique `JWT_SECRET` with at least 32 characters. Set `CLIENT_ORIGIN` to
   `http://localhost:5173`. Keep the connection URI private; percent-encode
   reserved characters in its username or password if required by the URI
   format. Supabase pooler connections are upgraded to TLS by the backend;
   use the Supabase CA certificate with `sslmode=verify-full` when certificate
   and hostname verification is required.
2. Before starting the API for the first time, review and run
   `backend/sql/schema.sql` in the Supabase SQL Editor. The API does not create
   or alter tables automatically. The script configures the private schema
   and preserves booking history when a property is removed.
3. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to
   enable password reset and contact messages. Set `CONTACT_EMAIL` to the
   inbox that should receive contact-form submissions.
4. Set `IMAGEKIT_PRIVATE_KEY` to enable cloud image uploads. Keep it secret.
5. In `frontend`, copy `.env.example` to `.env` if the API is not at
   `http://localhost:4000/api`.
6. From this directory run:

   ```powershell
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   npm run dev
   ```

   The frontend is at `http://localhost:5173`; the API is at
   `http://localhost:4000/api`.

You can also run the client and API in separate terminals:

```powershell
npm run dev --prefix backend
npm run dev --prefix frontend
```

## Configuration and integrations

| Integration | Required setting | Behavior when absent |
| --- | --- | --- |
| PostgreSQL | `backend/.env` → `DATABASE_URL` | API starts, health check reports database disconnected, data endpoints return 503 |
| Authentication | `backend/.env` → `JWT_SECRET` (32+ characters) | Sign-in and registration return 503 |
| Password reset and contact messages | SMTP settings and `CONTACT_EMAIL` in `backend/.env` | Mail endpoints return 503; registration/login still work |
| Property images | `IMAGEKIT_PRIVATE_KEY` in `backend/.env` | Listings without images work; image uploads return 503 |
| Frontend API URL | `frontend/.env` → `VITE_API_URL` | Defaults to `http://localhost:4000/api` |

Never commit `.env` files. Both environment files are ignored by Git.

## Deployment

- **Render:** create a Node web service rooted at `backend`, build with
  `npm install && npm run build`, start with `npm start`, and configure all
  backend variables from `backend/.env.example`.
- **Vercel:** create a Vite project rooted at `frontend`, build with
  `npm run build`, output directory `dist`, and set `VITE_API_URL` to the
  deployed API URL plus `/api`.
- Set backend `CLIENT_ORIGIN` to the exact deployed frontend origin and allow
  that origin in your browser/API setup. Use HTTPS in production.
- The PostgreSQL provider must permit connections from the backend service.

No sample account, fake properties, production credentials, or deployment
configuration containing secrets is included. 
