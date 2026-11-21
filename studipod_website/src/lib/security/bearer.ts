import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Checks an `Authorization: Bearer <token>` header against a shared secret in
 * constant time. Both values are hashed first so the comparison does not leak
 * the secret's length.
 */
export function isValidBearerToken(authorization: string | null, secret: string): boolean {
  const match = /^Bearer\s+(\S+)$/.exec(authorization ?? "");
  if (!match?.[1]) return false;
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(match[1]), digest(secret));
}
