import { describe, expect, it } from "vitest";
import {
  API_CONTENT_SECURITY_POLICY,
  buildContentSecurityPolicy,
  securityHeaders,
} from "@/lib/security/headers";

function directive(policy: string, name: string): string {
  return policy.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("buildContentSecurityPolicy", () => {
  const production = buildContentSecurityPolicy({
    nonce: "abc123",
    isDevelopment: false,
    upgradeInsecureRequests: true,
  });

  it("requires the request nonce for scripts and uses strict-dynamic", () => {
    const scriptSrc = directive(production, "script-src");
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("never allows inline or eval'd scripts in production", () => {
    const scriptSrc = directive(production, "script-src");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("only allows 'unsafe-eval' in development", () => {
    const development = buildContentSecurityPolicy({
      nonce: "n",
      isDevelopment: true,
      upgradeInsecureRequests: false,
    });
    expect(directive(development, "script-src")).toContain("'unsafe-eval'");
    expect(development).not.toContain("upgrade-insecure-requests");
  });

  it("blocks framing, plugins and base-tag injection", () => {
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("base-uri 'self'");
    expect(production).toContain("form-action 'self'");
  });

  it("only allows the Turnstile origin to be framed or contacted", () => {
    expect(directive(production, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
    expect(directive(production, "connect-src")).toBe(
      "connect-src 'self' https://challenges.cloudflare.com",
    );
  });

  it("adds upgrade-insecure-requests when requested", () => {
    expect(production).toContain("upgrade-insecure-requests");
  });
});

describe("securityHeaders", () => {
  const byKey = (isProduction: boolean) =>
    Object.fromEntries(securityHeaders({ isProduction }).map(({ key, value }) => [key, value]));

  it("sets the baseline hardening headers", () => {
    const headers = byKey(true);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("only sends HSTS in production", () => {
    expect(byKey(true)["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(byKey(false)["Strict-Transport-Security"]).toBeUndefined();
  });

  it("locks API responses down completely", () => {
    expect(API_CONTENT_SECURITY_POLICY).toBe("default-src 'none'; frame-ancestors 'none'");
  });
});
