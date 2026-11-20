"use client";

import { ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { mainNav, sectionHref, SECTION_IDS, waitlistCta } from "@/config/navigation";
import { useActiveSection, useScrolled } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

const OBSERVED_SECTIONS = Object.values(SECTION_IDS);

export function Navbar() {
  const isScrolled = useScrolled();
  const activeSection = useActiveSection(OBSERVED_SECTIONS);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 md:pt-4">
      <Container size="wide">
        <nav
          aria-label="Primary"
          className={cn(
            "flex h-16 items-center justify-between gap-4 rounded-full pr-2 pl-5 md:pl-6",
            "transition-[background-color,box-shadow,backdrop-filter] duration-(--duration-slow) ease-(--ease-out-expo)",
            isScrolled
              ? "bg-white/75 shadow-[var(--shadow-hairline),var(--shadow-card)] backdrop-blur-xl backdrop-saturate-150"
              : "bg-transparent",
          )}
        >
          <Logo priority />

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

          <ButtonLink
            href={sectionHref(waitlistCta.sectionId)}
            size="sm"
            className="h-10 pr-3 pl-4"
          >
            {waitlistCta.label}
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
            />
          </ButtonLink>
        </nav>
      </Container>
    </header>
  );
}
