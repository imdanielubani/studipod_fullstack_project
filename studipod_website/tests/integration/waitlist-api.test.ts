import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as RouteModuleTypes from "@/app/api/waitlist/route";
import { getPrisma } from "@/lib/prisma";

/**
 * Integration tests for POST /api/waitlist against a real PostgreSQL database
 * (docker-compose locally, a service container in CI). External services
 * (Cloudflare Turnstile) are stubbed at the network boundary.
 */

const DOMAIN = "integration.studipod.test";
const SITE = "http://localhost:3000";
let ipCounter = 0;

type RouteModule = typeof RouteModuleTypes;

/** Re-import the route so env changes and the rate limiter start fresh. */
async function loadRoute(): Promise<RouteModule> {
  vi.resetModules();
  return import("@/app/api/waitlist/route");
}

interface RequestOptions {
  ip?: string;
  headers?: Record<string, string>;
  rawBody?: string;
}

function postRequest(body: unknown, { ip, headers, rawBody }: RequestOptions = {}): Request {
  ipCounter += 1;
  return new Request(`${SITE}/api/waitlist`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: SITE,
      "sec-fetch-site": "same-origin",
      "x-real-ip": ip ?? `198.51.100.${ipCounter % 250}`,
      ...headers,
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function registration(localPart: string, extra: Record<string, unknown> = {}) {
  return { fullName: "Ada Lovelace", email: `${localPart}@${DOMAIN}`, ...extra };
}

async function storedEntries() {
  return getPrisma().waitlistEntry.findMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
    orderBy: { createdAt: "asc" },
  });
}

async function cleanUp() {
  await getPrisma().waitlistEntry.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
}

beforeAll(async () => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "Integration tests need PostgreSQL. Run `npm run db:up && npx prisma migrate deploy`, or set DATABASE_URL.",
    );
  }
});

beforeEach(cleanUp);

afterAll(async () => {
  await cleanUp();
  await getPrisma().$disconnect();
});

describe("POST /api/waitlist — successful registration", () => {
  it("stores a valid registration and returns 201", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      postRequest(registration("ada", { examinationCategory: "PLAB 1" })),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      success: true,
      data: { message: "You're on the waitlist." },
      error: null,
    });

    const [entry] = await storedEntries();
    expect(entry).toMatchObject({
      fullName: "Ada Lovelace",
      email: `ada@${DOMAIN}`,
      examinationCategory: "PLAB 1",
      status: "PENDING",
    });
    expect(entry?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(entry?.createdAt).toBeInstanceOf(Date);
    expect(entry?.updatedAt).toBeInstanceOf(Date);
  });

  it("normalises input before storing it", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      postRequest({
        fullName: "  Grace   Hopper ",
        email: `  Grace.Hopper@${DOMAIN.toUpperCase()} `,
        examinationCategory: "   ",
      }),
    );

    expect(response.status).toBe(201);
    const [entry] = await storedEntries();
    expect(entry).toMatchObject({
      fullName: "Grace Hopper",
      email: `grace.hopper@${DOMAIN}`,
      examinationCategory: null,
    });
  });
});

describe("POST /api/waitlist — invalid registration", () => {
  it("returns 422 with field errors and stores nothing", async () => {
    const { POST } = await loadRoute();
    const response = await POST(postRequest({ fullName: "A", email: "not-an-email" }));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body).toMatchObject({ success: false, error: { code: "INVALID_INPUT" } });
    expect(body.error.fieldErrors.fullName).toBeTruthy();
    expect(body.error.fieldErrors.email).toBeTruthy();
    expect(await storedEntries()).toHaveLength(0);
  });

  it("rejects unknown fields so clients cannot set server-controlled columns", async () => {
    const { POST } = await loadRoute();
    const response = await POST(postRequest(registration("mass", { status: "INVITED" })));

    expect(response.status).toBe(422);
    expect(await storedEntries()).toHaveLength(0);
  });

  it("rejects non-JSON content types with 415", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      postRequest(null, {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        rawBody: "fullName=Ada",
      }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects oversized bodies with 413", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      postRequest(null, { rawBody: JSON.stringify({ x: "a".repeat(8000) }) }),
    );
    expect(response.status).toBe(413);
  });

  it("rejects malformed JSON with 400", async () => {
    const { POST } = await loadRoute();
    const response = await POST(postRequest(null, { rawBody: "{bad json" }));
    expect(response.status).toBe(400);
  });

  it("rejects cross-site requests with 403", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      postRequest(registration("csrf"), {
        headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      }),
    );
    expect(response.status).toBe(403);
    expect(await storedEntries()).toHaveLength(0);
  });

  it("only exposes POST (other methods receive 405 from Next.js)", async () => {
    const route = await loadRoute();
    expect(Object.keys(route).filter((key) => /^[A-Z]+$/.test(key))).toEqual(["POST"]);
  });
});

describe("POST /api/waitlist — duplicate protection", () => {
  it("returns 409 for an address that is already registered, regardless of case", async () => {
    const { POST } = await loadRoute();
    expect((await POST(postRequest(registration("dup")))).status).toBe(201);

    const response = await POST(
      postRequest({ fullName: "Ada L", email: `  DUP@${DOMAIN.toUpperCase()}` }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "ALREADY_REGISTERED" } });
    expect(await storedEntries()).toHaveLength(1);
  });

  it("allows exactly one of several concurrent submissions of the same address", async () => {
    const { POST } = await loadRoute();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => POST(postRequest(registration("race")))),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409]);
    expect(await storedEntries()).toHaveLength(1);
  });
});

describe("POST /api/waitlist — rate limiting", () => {
  it("returns 429 with Retry-After once a client exceeds the limit", async () => {
    const { POST } = await loadRoute();
    const ip = "203.0.113.99";
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await POST(postRequest(registration(`limit${attempt}`), { ip }));
      statuses.push(response.status);
      if (response.status === 429) {
        expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
        expect(await response.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
      }
    }

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    expect(await storedEntries()).toHaveLength(5);
  });
});

describe("POST /api/waitlist — bot protection", () => {
  it("silently discards honeypot submissions", async () => {
    const { POST } = await loadRoute();
    const response = await POST(postRequest(registration("honeypot", { company: "Acme Bots" })));

    expect(response.status).toBe(201);
    expect(await storedEntries()).toHaveLength(0);
  });

  describe("with Cloudflare Turnstile enabled", () => {
    function stubSiteverify(result: Response | Error) {
      const fetchMock = vi.fn<typeof fetch>((input) => {
        expect(String(input)).toContain("challenges.cloudflare.com");
        return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    beforeEach(() => {
      vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "test-secret");
    });

    it("rejects submissions without a token (403)", async () => {
      const { POST } = await loadRoute();
      const response = await POST(postRequest(registration("notoken")));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: "BOT_VERIFICATION_FAILED" } });
      expect(await storedEntries()).toHaveLength(0);
    });

    it("rejects tokens Cloudflare does not accept (403)", async () => {
      stubSiteverify(Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
      const { POST } = await loadRoute();
      const response = await POST(postRequest(registration("badtoken", { turnstileToken: "x" })));
      expect(response.status).toBe(403);
      expect(await storedEntries()).toHaveLength(0);
    });

    it("returns 503 when the verifier is unreachable", async () => {
      stubSiteverify(new Error("network down"));
      const { POST } = await loadRoute();
      const response = await POST(postRequest(registration("outage", { turnstileToken: "x" })));
      expect(response.status).toBe(503);
      expect(await storedEntries()).toHaveLength(0);
    });

    it("registers submissions with a valid token", async () => {
      const fetchMock = stubSiteverify(Response.json({ success: true, action: "waitlist" }));
      const { POST } = await loadRoute();
      const response = await POST(postRequest(registration("human", { turnstileToken: "ok" })));
      expect(response.status).toBe(201);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(await storedEntries()).toHaveLength(1);
    });
  });
});
