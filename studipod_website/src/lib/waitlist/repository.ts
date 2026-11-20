import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export interface NewWaitlistEntry {
  fullName: string;
  email: string;
  examinationCategory?: string;
}

export type CreateEntryResult = { status: "created"; id: string } | { status: "duplicate" };

/** Persistence boundary for waitlist entries (Repository pattern). */
export interface WaitlistRepository {
  create(entry: NewWaitlistEntry): Promise<CreateEntryResult>;
}

/** Prisma's error code for a unique-constraint violation. */
const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION
  );
}

/**
 * Prisma-backed repository. Fields are mapped explicitly — request data is
 * never spread into `data` — and only the id is selected back. Prisma issues
 * parameterised queries, so values are never concatenated into SQL.
 *
 * Duplicate protection relies on the unique index on `email` rather than a
 * check-then-insert, so concurrent submissions cannot race past it.
 */
export const prismaWaitlistRepository: WaitlistRepository = {
  async create(entry) {
    try {
      const { id } = await getPrisma().waitlistEntry.create({
        data: {
          fullName: entry.fullName,
          email: entry.email,
          examinationCategory: entry.examinationCategory ?? null,
        },
        select: { id: true },
      });
      return { status: "created", id };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) return { status: "duplicate" };
      throw error;
    }
  },
};
