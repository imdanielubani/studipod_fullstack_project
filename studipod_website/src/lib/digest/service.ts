import "server-only";
import { buildDigestEmail } from "@/lib/digest/format";
import type { Mailer } from "@/lib/digest/mailer";
import { prismaDigestRepository, type DigestRepository } from "@/lib/digest/repository";

/**
 * Registrations newer than this are left for the next digest. It absorbs
 * inserts that were still committing when the digest ran, so nothing is ever
 * skipped between two digests.
 */
export const DIGEST_SAFETY_LAG_MS = 60_000;

export type DigestResult =
  | { status: "skipped"; reason: "no-new-entries" }
  | { status: "sent"; entryCount: number; totalCount: number };

interface SendDigestOptions {
  mailer: Mailer;
  recipient: string;
  siteUrl: string;
  repository?: DigestRepository;
}

/**
 * Emails the registrations made since the last successful digest.
 * The run is recorded only after the email is accepted by the mail server,
 * so a failed send is retried (with the same people) next time.
 */
export async function sendWaitlistDigest({
  mailer,
  recipient,
  siteUrl,
  repository = prismaDigestRepository,
}: SendDigestOptions): Promise<DigestResult> {
  const periodEnd = new Date((await repository.databaseNow()).getTime() - DIGEST_SAFETY_LAG_MS);
  const periodStart = await repository.latestPeriodEnd();
  const entries = await repository.entriesBetween(periodStart, periodEnd);
  if (entries.length === 0) return { status: "skipped", reason: "no-new-entries" };

  const totalCount = await repository.totalUntil(periodEnd);
  const email = buildDigestEmail({ entries, totalCount, periodStart, periodEnd, siteUrl });

  await mailer.send({
    to: recipient,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: [
      { filename: email.csvFilename, content: email.csv, contentType: "text/csv; charset=utf-8" },
    ],
  });
  await repository.recordRun({ periodStart, periodEnd, entryCount: entries.length });

  return { status: "sent", entryCount: entries.length, totalCount };
}
