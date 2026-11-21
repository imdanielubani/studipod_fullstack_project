import "server-only";
import type { DigestEntry } from "@/lib/digest/format";
import { getReportingPrisma } from "@/lib/prisma";

/** Data access for the waitlist digest (read-only reporting role in production). */
export interface DigestRepository {
  /** The database's current time — used so app/database clock skew cannot drop rows. */
  databaseNow(): Promise<Date>;
  /** End of the last successfully sent digest, or null if none has been sent. */
  latestPeriodEnd(): Promise<Date | null>;
  /** Registrations with after < createdAt <= until (after = null means from the start). */
  entriesBetween(after: Date | null, until: Date): Promise<DigestEntry[]>;
  totalUntil(until: Date): Promise<number>;
  recordRun(run: {
    periodStart: Date | null;
    periodEnd: Date;
    entryCount: number;
  }): Promise<{ id: string }>;
}

function createdAtWindow(after: Date | null, until: Date) {
  return after ? { gt: after, lte: until } : { lte: until };
}

export const prismaDigestRepository: DigestRepository = {
  async databaseNow() {
    const [row] = await getReportingPrisma().$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
    if (!row) throw new Error("Could not read the database time");
    return new Date(row.now);
  },

  async latestPeriodEnd() {
    const latest = await getReportingPrisma().waitlistDigestRun.findFirst({
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true },
    });
    return latest?.periodEnd ?? null;
  },

  async entriesBetween(after, until) {
    return getReportingPrisma().waitlistEntry.findMany({
      where: { createdAt: createdAtWindow(after, until) },
      orderBy: { createdAt: "asc" },
      select: { fullName: true, email: true, examinationCategory: true, createdAt: true },
    });
  },

  async totalUntil(until) {
    return getReportingPrisma().waitlistEntry.count({ where: { createdAt: { lte: until } } });
  },

  async recordRun(run) {
    return getReportingPrisma().waitlistDigestRun.create({ data: run, select: { id: true } });
  },
};
