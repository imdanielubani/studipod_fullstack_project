-- CreateEnum
CREATE TYPE "waitlist_status" AS ENUM ('PENDING', 'INVITED', 'JOINED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "examination_category" VARCHAR(100),
    "status" "waitlist_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "waitlist_entries_status_created_at_idx" ON "waitlist_entries"("status", "created_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_created_at_idx" ON "waitlist_entries"("created_at");

-- Defence in depth: integrity rules enforced by the database itself, so data
-- stays valid even if a future code path bypasses application validation.
ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_email_normalised_chk"
    CHECK ("email" = lower(btrim("email")) AND "email" LIKE '%_@_%'),
  ADD CONSTRAINT "waitlist_entries_full_name_chk"
    CHECK (char_length(btrim("full_name")) >= 2),
  ADD CONSTRAINT "waitlist_entries_examination_category_chk"
    CHECK ("examination_category" IS NULL OR char_length(btrim("examination_category")) >= 1);
