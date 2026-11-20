/** Section anchors on the one-page landing experience. */
export const SECTION_IDS = {
  home: "home",
  about: "about",
  features: "features",
  waitlist: "waitlist",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

export interface NavItem {
  label: string;
  sectionId: SectionId;
}

/** Primary navigation (the "Join Waitlist" CTA is rendered separately as a button). */
export const mainNav: readonly NavItem[] = [
  { label: "Home", sectionId: SECTION_IDS.home },
  { label: "About", sectionId: SECTION_IDS.about },
  { label: "Features", sectionId: SECTION_IDS.features },
] as const;

export const waitlistCta: NavItem = { label: "Join Waitlist", sectionId: SECTION_IDS.waitlist };

export function sectionHref(sectionId: SectionId): `#${SectionId}` {
  return `#${sectionId}`;
}
