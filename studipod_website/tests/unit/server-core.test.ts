import { describe, expect, it, vi } from "vitest";
import { describeError, logger } from "@/lib/logger";
import type { WaitlistRepository } from "@/lib/waitlist/repository";
import { registerForWaitlist } from "@/lib/waitlist/service";

describe("getServerEnv", () => {
  async function loadEnv() {
    vi.resetModules();
    return import("@/lib/env");
  }

  it("treats empty optional variables as not configured", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");
    const { getServerEnv } = await loadEnv();
    expect(getServerEnv().CLOUDFLARE_TURNSTILE_SECRET_KEY).toBeUndefined();
  });

  it("caches the parsed environment", async () => {
    const { getServerEnv } = await loadEnv();
    expect(getServerEnv()).toBe(getServerEnv());
  });

  it("names invalid variables without revealing their values", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:super-secret-password@db.example/app");
    const { getServerEnv } = await loadEnv();
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
    expect(() => getServerEnv()).not.toThrow(/super-secret-password/);
  });

  it("requires Upstash URLs to use HTTPS", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://insecure.example");
    const { getServerEnv } = await loadEnv();
    expect(() => getServerEnv()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });
});

describe("logger", () => {
  it("writes structured JSON lines", () => {
    logger.warn("test.event", { attempt: 2 });
    const line = vi.mocked(console.warn).mock.calls.at(-1)?.[0] as string;
    expect(JSON.parse(line)).toMatchObject({ level: "warn", event: "test.event", attempt: 2 });

    logger.info("test.info");
    logger.error("test.error");
    expect(vi.mocked(console.error).mock.calls.at(-1)?.[0]).toContain('"level":"error"');
  });

  it("reduces errors to their type and code, never the message", () => {
    const error = Object.assign(new Error("password=hunter2 at db.example:5432"), {
      code: "ECONNREFUSED",
    });
    expect(describeError(error)).toEqual({ errorName: "Error", errorCode: "ECONNREFUSED" });
    expect(JSON.stringify(describeError(error))).not.toContain("hunter2");
    expect(describeError("plain string")).toEqual({ errorName: "string" });
  });
});

describe("registerForWaitlist", () => {
  function repository(status: "created" | "duplicate") {
    const create = vi
      .fn<WaitlistRepository["create"]>()
      .mockResolvedValue(
        status === "created" ? { status: "created", id: "id-1" } : { status: "duplicate" },
      );
    return { create };
  }

  it("persists only the explicit registration fields", async () => {
    const repo = repository("created");
    const request = {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      examinationCategory: "PLAB",
      company: "bot value",
      turnstileToken: "token",
    };

    expect(await registerForWaitlist(request, repo)).toEqual({ status: "registered" });
    expect(repo.create).toHaveBeenCalledWith({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      examinationCategory: "PLAB",
    });
  });

  it("reports duplicates", async () => {
    const result = await registerForWaitlist(
      { fullName: "Ada Lovelace", email: "ada@example.com" },
      repository("duplicate"),
    );
    expect(result).toEqual({ status: "duplicate" });
  });
});
