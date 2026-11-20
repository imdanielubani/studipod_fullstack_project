import "server-only";

export type JsonBodyResult =
  { ok: true; value: unknown } | { ok: false; reason: "too_large" | "invalid_json" | "empty" };

/** True when the Content-Type header declares JSON (parameters such as charset allowed). */
export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const [mediaType] = contentType.split(";");
  return mediaType?.trim().toLowerCase() === "application/json";
}

/**
 * Reads and parses a JSON body while enforcing a hard byte limit.
 * The limit is enforced on the actual stream, not just the Content-Length
 * header, so a lying or missing header cannot bypass it.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: false, reason: "empty" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }

  if (received === 0) return { ok: false, reason: "empty" };

  const text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
