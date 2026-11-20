import "server-only";
import type { WaitlistRequest } from "@/lib/validations/waitlist.schema";
import { prismaWaitlistRepository, type WaitlistRepository } from "@/lib/waitlist/repository";

export type RegistrationResult = { status: "registered" };

/** Registers a validated, normalised request on the waitlist. */
export async function registerForWaitlist(
  request: WaitlistRequest,
  repository: WaitlistRepository = prismaWaitlistRepository,
): Promise<RegistrationResult> {
  await repository.create({
    fullName: request.fullName,
    email: request.email,
    examinationCategory: request.examinationCategory,
  });
  return { status: "registered" };
}
