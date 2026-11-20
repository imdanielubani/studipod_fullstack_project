import { describe, expect, it } from "vitest";
import { isJsonContentType, readJsonBody } from "@/lib/api/request";
import { errorResponse, successResponse } from "@/lib/api/response";

const API_URL = "http://localhost:3000/api/waitlist";

describe("isJsonContentType", () => {
  it.each(["application/json", "application/json; charset=utf-8", "Application/JSON"])(
    "accepts %s",
    (value) => expect(isJsonContentType(value)).toBe(true),
  );

  it.each([null, "", "text/plain", "application/x-www-form-urlencoded", "multipart/form-data"])(
    "rejects %s",
    (value) => expect(isJsonContentType(value)).toBe(false),
  );
});

describe("readJsonBody", () => {
  it("parses a JSON body within the limit", async () => {
    const request = new Request(API_URL, { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await readJsonBody(request, 1024)).toEqual({ ok: true, value: { a: 1 } });
  });

  it("rejects a body whose declared length exceeds the limit", async () => {
    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-length": "5000" },
      body: "{}",
    });
    expect(await readJsonBody(request, 1024)).toEqual({ ok: false, reason: "too_large" });
  });

  it("enforces the limit on the stream even without a Content-Length header", async () => {
    const chunk = new TextEncoder().encode("x".repeat(600));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const request = new Request(API_URL, {
      method: "POST",
      body: stream,
      // Required by the Fetch spec for streaming request bodies.
      duplex: "half",
    } as RequestInit);
    expect(await readJsonBody(request, 1024)).toEqual({ ok: false, reason: "too_large" });
  });

  it("reports malformed JSON", async () => {
    const request = new Request(API_URL, { method: "POST", body: "{not json" });
    expect(await readJsonBody(request, 1024)).toEqual({ ok: false, reason: "invalid_json" });
  });

  it("reports an empty body", async () => {
    expect(await readJsonBody(new Request(API_URL, { method: "POST" }), 1024)).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(await readJsonBody(new Request(API_URL, { method: "POST", body: "" }), 1024)).toEqual({
      ok: false,
      reason: "empty",
    });
  });
});

describe("response helpers", () => {
  it("builds a non-cacheable success envelope", async () => {
    const response = successResponse("Done");
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: { message: "Done" },
      error: null,
    });
  });

  it("builds an error envelope with optional field errors and headers", async () => {
    const response = errorResponse("INVALID_INPUT", "Check fields", 422, {
      fieldErrors: { email: "Invalid" },
      headers: { "Retry-After": "30" },
    });
    expect(response.status).toBe(422);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      success: false,
      data: null,
      error: { code: "INVALID_INPUT", message: "Check fields", fieldErrors: { email: "Invalid" } },
    });
  });

  it("omits fieldErrors when none are supplied", async () => {
    const body = await errorResponse("SERVER_ERROR", "Oops", 500).json();
    expect(body.error).toEqual({ code: "SERVER_ERROR", message: "Oops" });
  });
});
