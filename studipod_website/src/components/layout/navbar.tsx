"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { mainNav, sectionHref, SECTION_IDS, waitlistCta } from "@/config/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useActiveSection, useScrolled } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

const OBSERVED_SECTIONS = Object.values(SECTION_IDS);
const MOBILE_MENU_ID = "mobile-menu";

export function Navbar() {
  const isScrolled = useScrolled();
  const activeSection = useActiveSection(OBSERVED_SECTIONS);
  const isDesktop = useMediaQuery("(min-width: 48rem)");
  const [isMenuRequested, setIsMenuRequested] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Derived: the mobile menu can never be open at desktop widths.
  const isMenuOpen = isMenuRequested && !isDesktop;
  const isElevated = isScrolled || isMenuOpen;

  const closeMenu = useCallback(() => setIsMenuRequested(false), []);
  const dismissMenu = useCallback(() => {
    setIsMenuRequested(false);
    toggleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 md:pt-4">
      <Container size="wide" className="relative">
        <nav
          aria-label="Primary"
          className={cn(
            "relative flex h-16 items-center justify-between gap-3 rounded-full pr-2 pl-5 md:pl-6",
            "transition-[background-color,box-shadow,backdrop-filter] duration-(--duration-slow) ease-(--ease-out-expo)",
            isElevated
              ? "bg-white/80 shadow-[var(--shadow-hairline),var(--shadow-card)] backdrop-blur-xl backdrop-saturate-150"
              : "bg-transparent",
          )}
        >
          <Logo priority onNavigate={closeMenu} />

          <ul className="hidden items-center gap-1 rounded-full bg-brand-950/[0.04] p-1 md:flex">
            {mainNav.map((item) => {
              const isActive = activeSection === item.sectionId;
              return (
                <li key={item.sectionId}>
                  <a
                    href={sectionHref(item.sectionId)}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "relative block rounded-full px-4 py-2 text-sm font-medium",
                      "transition-[background-color,color,box-shadow] duration-(--duration-base) ease-(--ease-out-expo)",
                      isActive
                        ? "bg-white text-ink shadow-hairline"
                        : "text-ink-muted hover:bg-white/70 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <ButtonLink
              href={sectionHref(waitlistCta.sectionId)}
              size="sm"
              className="hidden h-10 pr-3 pl-4 xs:inline-flex"
              onClick={closeMenu}
            >
              {waitlistCta.label}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
              />
            </ButtonLink>

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls={MOBILE_MENU_ID}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsMenuRequested((open) => !open)}
              className="inline-flex size-10 items-center justify-center rounded-full bg-brand-950/[0.05] text-ink transition-[background-color,transform] duration-(--duration-base) hover:bg-brand-950/10 active:scale-95 md:hidden"
            >
              <span className="relative size-5">
                <Menu
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 size-5 transition-[opacity,transform] duration-(--duration-base) ease-(--ease-out-expo)",
                    isMenuOpen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                  )}
                />
                <X
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 size-5 transition-[opacity,transform] duration-(--duration-base) ease-(--ease-out-expo)",
                    isMenuOpen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0",
                  )}
                />
              </span>
            </button>
          </div>
        </nav>

        <MobileMenu
          id={MOBILE_MENU_ID}
          isOpen={isMenuOpen}
          activeSection={activeSection}
          onDismiss={dismissMenu}
          onNavigate={closeMenu}
        />
      </Container>
    </header>
  );
}
