-- Runs once, when the PostgreSQL data directory is first initialised.
-- Extensions required by the planned search and data model. Prisma migrations
-- will also declare them (CREATE EXTENSION IF NOT EXISTS) so that managed or
-- pre-existing databases end up identical.

-- Trigram similarity for fuzzy name and subject search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Case-insensitive text for email addresses.
CREATE EXTENSION IF NOT EXISTS citext;
-- Accent-insensitive full-text search (unaccent dictionary).
CREATE EXTENSION IF NOT EXISTS unaccent;
-- GiST support for btree types: exclusion constraints that prevent double booking.
CREATE EXTENSION IF NOT EXISTS btree_gist;
