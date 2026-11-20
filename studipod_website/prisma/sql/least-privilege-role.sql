-- -----------------------------------------------------------------------------
-- StudiPod — least-privilege runtime database role
--
-- Run ONCE as a database owner/administrator AFTER `prisma migrate deploy`.
-- The application's runtime DATABASE_URL should use this role; the owner role
-- (used only by DIRECT_URL for migrations) keeps DDL rights.
--
-- The runtime role can only:
--   * INSERT waitlist registrations
--   * read back the generated id (needed for INSERT ... RETURNING)
-- It cannot read names or email addresses, update, delete or alter schema.
--
-- Replace the password placeholder with a long random secret from your secret
-- manager before running. Never commit the real value.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'studipod_app') THEN
    CREATE ROLE studipod_app LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_SECRET';
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO studipod_app', current_database());
END
$$;

-- Start from nothing.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM studipod_app;
REVOKE CREATE ON SCHEMA public FROM studipod_app;

GRANT USAGE ON SCHEMA public TO studipod_app;
GRANT USAGE ON TYPE public.waitlist_status TO studipod_app;

-- Minimum privileges for registration.
GRANT INSERT ON TABLE public.waitlist_entries TO studipod_app;
GRANT SELECT (id) ON TABLE public.waitlist_entries TO studipod_app;

-- Defensive limits for this role.
ALTER ROLE studipod_app SET statement_timeout = '5s';
ALTER ROLE studipod_app SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE studipod_app CONNECTION LIMIT 20;
