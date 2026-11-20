import { describe, expect, it } from "vitest";
import { allowedOriginsFor, isAllowedOrigin } from "@/lib/security/origin";

const API_URL = "http://localhost:3000/api/waitlist";

function request(headers: Record<string, string>) {
  return new Request(API_URL, { method: "POST", headers });
}

describe("isAllowedOrigin", () => {
  const allowed = ["http://localhost:3000", "https://studipod.example"];

  it("allows same-origin browser requests", () => {
    expect(
      isAllowedOrigin(
        request({ origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }),
        allowed,
      ),
    ).toBe(true);
  });

  it("allows the configured site origin", () => {
    expect(isAllowedOrigin(request({ origin: "https://studipod.example" }), allowed)).toBe(true);
  });

  it("blocks cross-site requests identified by Fetch Metadata", () => {
    expect(
      isAllowedOrigin(
        request({ origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }),
        allowed,
      ),
    ).toBe(false);
    expect(isAllowedOrigin(request({ "sec-fetch-site": "same-site" }), allowed)).toBe(false);
  });

  it("blocks foreign origins", () => {
    expect(isAllowedOrigin(request({ origin: "https://evil.example" }), allowed)).toBe(false);
  });

  it("allows non-browser clients that send no Origin", () => {
    expect(isAllowedOrigin(request({}), allowed)).toBe(true);
  });
});

describe("allowedOriginsFor", () => {
  it("includes the request origin and the configured site origin", () => {
    expect(allowedOriginsFor(request({}), "https://studipod.example/path")).toEqual([
      "http://localhost:3000",
      "https://studipod.example",
    ]);
  });

  it("ignores a missing or malformed site URL", () => {
    expect(allowedOriginsFor(request({}), undefined)).toEqual(["http://localhost:3000"]);
    expect(allowedOriginsFor(request({}), "not a url")).toEqual(["http://localhost:3000"]);
  });
});
