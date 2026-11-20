import "server-only";
import { getPrisma } from "@/lib/prisma";

export interface NewWaitlistEntry {
  fullName: string;
  email: string;
  examinationCategory?: string;
}

/** Persistence boundary for waitlist entries (Repository pattern). */
export interface WaitlistRepository {
  create(entry: NewWaitlistEntry): Promise<{ id: string }>;
}

/**
 * Prisma-backed repository. Fields are mapped explicitly — request data is
 * never spread into `data` — and only the id is selected back. Prisma issues
 * parameterised queries, so values are never concatenated into SQL.
 */
export const prismaWaitlistRepository: WaitlistRepository = {
  async create(entry) {
    return getPrisma().waitlistEntry.create({
      data: {
        fullName: entry.fullName,
        email: entry.email,
        examinationCategory: entry.examinationCategory ?? null,
      },
      select: { id: true },
    });
  },
};
