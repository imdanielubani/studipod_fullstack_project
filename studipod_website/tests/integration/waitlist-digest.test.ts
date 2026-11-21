import { afterAll, describe, expect, it } from "vitest";
import { prismaDigestRepository } from "@/lib/digest/repository";
import { getPrisma } from "@/lib/prisma";

/** The digest repository against real PostgreSQL (time-windowed to this test's rows). */
const DOMAIN = "digest.studipod.test";
const runIds: string[] = [];

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.waitlistEntry.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  await prisma.waitlistDigestRun.deleteMany({ where: { id: { in: runIds } } });
});

describe("prismaDigestRepository", () => {
  it("reads the database clock", async () => {
    const now = await prismaDigestRepository.databaseNow();
    expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("selects only registrations inside the window, oldest first", async () => {
    const before = await prismaDigestRepository.databaseNow();
    const prisma = getPrisma();
    await prisma.waitlistEntry.create({
      data: { fullName: "First Person", email: `first@${DOMAIN}`, examinationCategory: "MRCP" },
    });
    await prisma.waitlistEntry.create({
      data: { fullName: "Second Person", email: `second@${DOMAIN}` },
    });
    const until = await prismaDigestRepository.databaseNow();

    const entries = (await prismaDigestRepository.entriesBetween(before, until)).filter((entry) =>
      entry.email.endsWith(`@${DOMAIN}`),
    );
    expect(entries.map((entry) => entry.email)).toEqual([`first@${DOMAIN}`, `second@${DOMAIN}`]);
    expect(entries[0]).toEqual({
      fullName: "First Person",
      email: `first@${DOMAIN}`,
      examinationCategory: "MRCP",
      createdAt: expect.any(Date),
    });

    expect(await prismaDigestRepository.entriesBetween(until, until)).toHaveLength(0);
    expect(await prismaDigestRepository.totalUntil(until)).toBeGreaterThanOrEqual(2);
  });

  it("records runs and reports the latest period end", async () => {
    const periodEnd = new Date(Date.now() + 365 * 24 * 3600 * 1000); // later than any real run
    const run = await prismaDigestRepository.recordRun({
      periodStart: null,
      periodEnd,
      entryCount: 2,
    });
    runIds.push(run.id);
    expect((await prismaDigestRepository.latestPeriodEnd())?.getTime()).toBe(periodEnd.getTime());
  });
});
