-- Run once in your Supabase project's SQL Editor.
-- The private schema is NOT exposed through Supabase's public Data API.
-- Only your Express backend connects with DATABASE_URL.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL CHECK (char_length(trim(name)) >= 2),
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone varchar(30) NOT NULL DEFAULT '',
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES app_private.users(id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  description varchar(5000) NOT NULL,
  price numeric(15,2) NOT NULL CHECK (price > 0),
  property_type varchar(20) NOT NULL CHECK (property_type IN ('apartment','house','villa','plot','commercial')),
  listing_type varchar(10) NOT NULL CHECK (listing_type IN ('sale','rent')),
  city varchar(80) NOT NULL,
  address varchar(250) NOT NULL,
  area numeric(15,2) NOT NULL CHECK (area > 0),
  bedrooms integer NOT NULL CHECK (bedrooms BETWEEN 0 AND 30),
  bathrooms integer NOT NULL CHECK (bathrooms BETWEEN 0 AND 30),
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES app_private.properties(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES app_private.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_private.users(id) ON DELETE SET NULL,
  guest_name varchar(100), guest_email varchar(254), guest_phone varchar(30),
  starts_at timestamptz NOT NULL,
  message varchar(1000) NOT NULL DEFAULT '',
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  guest_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Preserve appointment history when a listing is removed. This also upgrades
-- databases where the earlier schema used a NOT NULL / cascading property FK.
ALTER TABLE app_private.bookings ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE app_private.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_fkey;
ALTER TABLE app_private.bookings
  ADD CONSTRAINT bookings_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES app_private.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_owner ON app_private.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON app_private.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_created ON app_private.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON app_private.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON app_private.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_starts ON app_private.bookings(starts_at);
-- Defense in depth: table owner / postgres role bypasses RLS; anonymous Data API roles are denied.
ALTER TABLE app_private.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM anon, authenticated;
