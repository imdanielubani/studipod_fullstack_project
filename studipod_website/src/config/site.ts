/**
 * Central site configuration.
 *
 * Public, non-secret values only. Anything here may be bundled into client code.
 * External links (social profiles, FAQ) are read from NEXT_PUBLIC_* variables so they
 * can be configured per environment without code changes. When a link is not
 * configured the UI renders a clearly-labelled placeholder instead of a dead link.
 * The contact email defaults to DEFAULT_CONTACT_EMAIL.
 */

function readUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readEmail(value: string | undefined): string | null {
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** Public contact address. NEXT_PUBLIC_CONTACT_EMAIL can override it per environment. */
export const DEFAULT_CONTACT_EMAIL = "hello@studipod.com";

const siteUrl = (readUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const siteConfig = {
  name: "StudiPod",
  legalName: "StudiPod Inc.",
  tagline: "Study Together. Prepare Better.",
  title: "StudiPod — The Study Experience, Reimagined",
  description:
    "Meet StudiPod — a peer-to-peer collaborative learning and exam preparation platform that connects individuals preparing for examinations to study, exchange knowledge, practise and learn together.",
  url: siteUrl,
  locale: "en_GB",
  copyrightYear: 2026,
  links: {
    instagram: readUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
    linkedin: readUrl(process.env.NEXT_PUBLIC_LINKEDIN_URL),
    faq: readUrl(process.env.NEXT_PUBLIC_FAQ_URL),
    contactEmail: readEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? DEFAULT_CONTACT_EMAIL,
  },
} as const;

export type SiteConfig = typeof siteConfig;
