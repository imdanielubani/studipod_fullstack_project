import { describe, expect, it, vi } from "vitest";
import { submitWaitlist } from "@/lib/waitlist-client";

const submission = { fullName: "Ada Lovelace", email: "ada@example.com" };

function respondWith(body: unknown, status = 201) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    );
}

describe("submitWaitlist", () => {
  it("posts JSON to the waitlist endpoint and returns the success envelope", async () => {
    const envelope = { success: true, data: { message: "You're on the waitlist." }, error: null };
    const fetchImpl = respondWith(envelope);

    expect(await submitWaitlist(submission, fetchImpl)).toEqual(envelope);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("/api/waitlist");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual(submission);
  });

  it("returns API error envelopes unchanged", async () => {
    const envelope = {
      success: false,
      data: null,
      error: { code: "ALREADY_REGISTERED", message: "Already registered." },
    };
    expect(await submitWaitlist(submission, respondWith(envelope, 409))).toEqual(envelope);
  });

  it("turns network failures into a friendly connection error", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await submitWaitlist(submission, fetchImpl);
    expect(result).toMatchObject({ success: false, error: { code: "SERVER_ERROR" } });
    expect(!result.success && result.error.message).toMatch(/connection/i);
  });

  it.each([
    ["non-JSON responses", "<html>Bad gateway</html>"],
    ["unexpected JSON shapes", { hello: "world" }],
    ["error envelopes without a code", { success: false, error: { message: "x" } }],
  ])("treats %s as an unexpected error", async (_label, body) => {
    const result = await submitWaitlist(submission, respondWith(body, 502));
    expect(result).toMatchObject({ success: false, error: { code: "SERVER_ERROR" } });
  });
});
