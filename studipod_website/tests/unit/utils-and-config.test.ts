import { describe, expect, it, vi } from "vitest";
import { mainNav, sectionHref, SECTION_IDS, waitlistCta } from "@/config/navigation";
import { cn, firstName } from "@/lib/utils";

describe("cn", () => {
  it("keeps custom font-size tokens alongside colour utilities", () => {
    expect(cn("text-headline", "text-ink")).toBe("text-headline text-ink");
    expect(cn("text-eyebrow text-brand-700 uppercase")).toBe(
      "text-eyebrow text-brand-700 uppercase",
    );
  });

  it("resolves genuinely conflicting utilities to the last one", () => {
    expect(cn("text-lead", "text-sm")).toBe("text-sm");
    expect(cn("px-4", false, undefined, "px-6")).toBe("px-6");
  });
});

describe("firstName", () => {
  it("returns the first word of a full name", () => {
    expect(firstName("  Ada   Lovelace ")).toBe("Ada");
    expect(firstName("Cher")).toBe("Cher");
  });

  it("returns an empty string for blank input", () => {
    expect(firstName("   ")).toBe("");
  });
});

describe("navigation config", () => {
  it("links every primary item to an on-page section", () => {
    expect(mainNav.map((item) => sectionHref(item.sectionId))).toEqual([
      "#home",
      "#about",
      "#features",
    ]);
    expect(sectionHref(waitlistCta.sectionId)).toBe(`#${SECTION_IDS.waitlist}`);
  });
});

describe("site config", () => {
  async function loadSiteConfig() {
    vi.resetModules();
    return (await import("@/config/site")).siteConfig;
  }

  it("uses the configured site URL without a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studipod.example/");
    expect((await loadSiteConfig()).url).toBe("https://studipod.example");
  });

  it("falls back to localhost when the site URL is missing or unsafe", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "javascript:alert(1)");
    expect((await loadSiteConfig()).url).toBe("http://localhost:3000");
  });

  it("only exposes well-formed external links", async () => {
    vi.stubEnv("NEXT_PUBLIC_INSTAGRAM_URL", "https://instagram.example/studipod");
    vi.stubEnv("NEXT_PUBLIC_LINKEDIN_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "hello@studipod.example");
    vi.stubEnv("NEXT_PUBLIC_FAQ_URL", "ftp://files.example");
    const { links } = await loadSiteConfig();
    expect(links.instagram).toBe("https://instagram.example/studipod");
    expect(links.linkedin).toBeNull();
    expect(links.contactEmail).toBe("hello@studipod.example");
    expect(links.faq).toBeNull();
  });

  it("rejects malformed contact emails", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "not-an-email");
    expect((await loadSiteConfig()).links.contactEmail).toBeNull();
  });
});
