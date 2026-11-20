import "server-only";
import type { WaitlistRequest } from "@/lib/validations/waitlist.schema";
import { prismaWaitlistRepository, type WaitlistRepository } from "@/lib/waitlist/repository";

export type RegistrationResult = { status: "registered" } | { status: "duplicate" };

/**
 * Registers a validated, normalised request on the waitlist.
 * Email addresses are normalised before this point, so "Ada@Example.com" and
 * "ada@example.com " are treated as the same registration.
 */
export async function registerForWaitlist(
  request: WaitlistRequest,
  repository: WaitlistRepository = prismaWaitlistRepository,
): Promise<RegistrationResult> {
  const result = await repository.create({
    fullName: request.fullName,
    email: request.email,
    examinationCategory: request.examinationCategory,
  });
  return result.status === "created" ? { status: "registered" } : { status: "duplicate" };
}
