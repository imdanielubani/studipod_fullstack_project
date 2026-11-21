-- CreateTable
CREATE TABLE "waitlist_digest_runs" (
    "id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(3),
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "sent_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_digest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_digest_runs_period_end_idx" ON "waitlist_digest_runs"("period_end");
