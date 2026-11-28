import { z } from 'zod';

/**
 * Error envelope shared by every Studipod API response
 * (see studipod-backend/docs/api/api-architecture.md).
 *
 * `meta` carries structured, non-field context for a specific error code
 * (for example remaining attempts or a lock expiry). It is optional so the
 * client keeps working when the backend omits it.
 */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
    details: z
      .array(z.object({ field: z.string(), issue: z.string() }))
      .optional()
      .catch(undefined),
    meta: z.record(z.string(), z.unknown()).optional().catch(undefined),
    requestId: z.string().optional().catch(undefined),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/** Wraps a payload schema in the `{ data: ... }` success envelope. */
export function successEnvelope<T extends z.ZodType>(data: T) {
  return z.object({ data });
}
