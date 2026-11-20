"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { mainNav, sectionHref, waitlistCta } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  id: string;
  isOpen: boolean;
  activeSection: string | null;
  /** Escape key or backdrop: close and return focus to the toggle. */
  onDismiss: () => void;
  /** A link was followed: close and let the browser move to the section. */
  onNavigate: () => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function MobileMenu({ id, isOpen, activeSection, onDismiss, onNavigate }: MobileMenuProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onDismiss]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            className="fixed inset-0 -z-10 bg-brand-950/20 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onDismiss}
          />
          <m.div
            key="panel"
            id={id}
            className="absolute inset-x-5 top-full mt-2 origin-top rounded-xl bg-white p-3 shadow-[var(--shadow-hairline),var(--shadow-lift)] sm:inset-x-6 md:hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          >
            <m.ul
              className="flex flex-col"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
              }}
            >
              {mainNav.map((item, index) => {
                const isActive = activeSection === item.sectionId;
                return (
                  <m.li
                    key={item.sectionId}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { ease: EASE_OUT_EXPO } },
                    }}
                  >
                    <a
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={sectionHref(item.sectionId)}
                      onClick={onNavigate}
                      aria-current={isActive ? "location" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-md px-4 py-3.5 text-lg font-medium tracking-tight transition-colors",
                        isActive ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-brand-50/60",
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full transition-colors",
                          isActive ? "bg-accent-400" : "bg-transparent",
                        )}
                      />
                    </a>
                  </m.li>
                );
              })}
            </m.ul>
            <ButtonLink
              href={sectionHref(waitlistCta.sectionId)}
              onClick={onNavigate}
              size="lg"
              className="mt-3 w-full"
            >
              {waitlistCta.label}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
