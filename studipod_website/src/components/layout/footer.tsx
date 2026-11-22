import { Mail } from "lucide-react";
import { CookieSettingsButton } from "@/components/cookies/cookie-settings-button";
import { FooterLink } from "@/components/layout/footer-link";
import { InstagramIcon, LinkedInIcon } from "@/components/layout/social-icons";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { SECTION_IDS } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const contactHref = siteConfig.links.contactEmail
  ? `mailto:${siteConfig.links.contactEmail}`
  : null;

/** Section links are absolute (/#id) so they also work from the legal pages. */
const exploreLinks = [
  { label: "About", href: `/#${SECTION_IDS.about}` },
  { label: "Features", href: `/#${SECTION_IDS.features}` },
  { label: "FAQs", href: siteConfig.links.faq },
  { label: "Contact", href: contactHref },
] as const;

const socialLinks = [
  { label: "Instagram", href: siteConfig.links.instagram, Icon: InstagramIcon },
  { label: "LinkedIn", href: siteConfig.links.linkedin, Icon: LinkedInIcon },
  { label: "Contact Us", href: contactHref, Icon: Mail },
] as const;

/** Placeholder targets until the approved legal content is published. */
const legalLinks = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Use", href: "#" },
] as const;

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-surface" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <Container size="wide" className="pt-20 pb-10 md:pt-24">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Logo />
            <p className="mt-6 max-w-sm text-title font-semibold text-ink">
              <span className="block">Study Together.</span>
              <span className="block text-brand-600">Prepare Better.</span>
            </p>
            <p className="mt-4 text-sm text-ink-subtle">{siteConfig.legalName}</p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-1 gap-10 xs:grid-cols-2 sm:gap-16 lg:col-span-6 lg:justify-self-end"
          >
            <div>
              <h3 className="text-eyebrow font-semibold text-ink uppercase">Explore</h3>
              <ul className="mt-5 space-y-3.5">
                {exploreLinks.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-eyebrow font-semibold text-ink uppercase">Connect</h3>
              <ul className="mt-5 space-y-3.5">
                {socialLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <FooterLink
                      href={href}
                      icon={<Icon aria-hidden="true" className="size-4 shrink-0" />}
                    >
                      {label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-ink-subtle md:flex-row md:items-center md:justify-between">
          <p>© {siteConfig.copyrightYear} StudiPod. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </div>
      </Container>

      {/* Oversized wordmark watermark */}
      <p
        aria-hidden="true"
        className="pointer-events-none -mb-[0.22em] text-center text-[clamp(5rem,22vw,20rem)] leading-none font-semibold tracking-[-0.06em] text-brand-950/[0.04] select-none"
      >
        StudiPod
      </p>
    </footer>
  );
}
