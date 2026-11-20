import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

/**
 * Database failure handling. The database layer is replaced with one that
 * fails, to prove the API degrades safely and never leaks internal details.
 */

const create = vi.fn();
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ waitlistEntry: { create } }),
}));

function request() {
  return new Request("http://localhost:3000/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "x-real-ip": "192.0.2.10",
    },
    body: JSON.stringify({ fullName: "Ada Lovelace", email: "ada@example.com" }),
  });
}

describe("POST /api/waitlist — database errors", () => {
  it("returns a generic 500 without exposing internal details", async () => {
    create.mockRejectedValueOnce(
      Object.assign(
        new Error("connect ECONNREFUSED 10.1.2.3:5432 (user=studipod password=hunter2)"),
        { code: "ECONNREFUSED" },
      ),
    );
    const { POST } = await import("@/app/api/waitlist/route");
    const response = await POST(request());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toMatchObject({ success: false, error: { code: "SERVER_ERROR" } });
    for (const secret of ["ECONNREFUSED", "5432", "10.1.2.3", "hunter2", "password"]) {
      expect(text).not.toContain(secret);
    }

    const logged = vi.mocked(console.error).mock.calls.flat().join("\n");
    expect(logged).toContain("waitlist.registration_failed");
    expect(logged).toContain("ECONNREFUSED");
    expect(logged).not.toContain("hunter2");
  });

  it("maps a unique-constraint violation to 409 rather than an error", async () => {
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const { POST } = await import("@/app/api/waitlist/route");
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "ALREADY_REGISTERED" } });
  });
});
