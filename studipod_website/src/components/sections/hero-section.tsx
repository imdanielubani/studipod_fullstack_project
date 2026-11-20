import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { HeroVisual } from "@/components/sections/hero-visual";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { sectionHref, SECTION_IDS } from "@/config/navigation";

const HEADLINE_LEAD = ["The", "Study", "Experience,"] as const;
const WORD_STAGGER_MS = 70;

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

/**
 * Hero. Entrance motion is pure CSS (keyframes + staggered delays) so it plays
 * from first paint without waiting for hydration — this keeps the section a
 * Server Component and protects Largest Contentful Paint.
 */
export function HeroSection() {
  return (
    <section
      id={SECTION_IDS.home}
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 md:pb-28"
    >
      {/* Atmosphere: dotted grid + a single slow-drifting brand glow */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dot-grid mask-fade-b opacity-60" />
        <div className="absolute -top-40 right-[-10%] size-[42rem] animate-drift rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute top-[30%] left-[-15%] size-[28rem] animate-drift rounded-full bg-accent-100/60 blur-3xl [animation-delay:-9s]" />
      </div>

      <Container size="wide">
        <div className="animate-rise" style={delay(0)}>
          <Eyebrow>Early access · Rolling invitations</Eyebrow>
        </div>

        <h1
          id="hero-heading"
          className="mt-7 max-w-5xl text-display font-semibold text-ink"
          aria-label="The Study Experience, Reimagined"
        >
          <span aria-hidden="true">
            {HEADLINE_LEAD.map((word, index) => (
              <span
                key={word}
                className="mr-[0.22em] inline-block animate-rise"
                style={delay(80 + index * WORD_STAGGER_MS)}
              >
                {word}
              </span>
            ))}
            <span
              className="relative inline-block animate-rise font-serif font-normal tracking-[-0.02em] text-brand-600 italic"
              style={delay(80 + HEADLINE_LEAD.length * WORD_STAGGER_MS)}
            >
              Reimagined
              <svg
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.08em] left-0 h-[0.14em] w-full text-accent-400"
              >
                <path
                  d="M2 9.5C60 3.5 140 2 298 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="animate-draw"
                  pathLength={1}
                />
              </svg>
            </span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 md:mt-12 md:flex-row md:items-end md:gap-14">
          <p className="max-w-xl animate-rise text-lead text-ink-muted" style={delay(380)}>
            Meet StudiPod — a peer-to-peer collaborative learning and exam preparation platform that
            connects individuals preparing for examinations to study, exchange knowledge, practise
            and learn together.
          </p>
          <div className="shrink-0 animate-rise md:pb-1" style={delay(460)}>
            <ButtonLink href={sectionHref(SECTION_IDS.waitlist)} size="lg">
              Join the Waitlist
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
              />
            </ButtonLink>
          </div>
        </div>

        <div className="relative mt-16 md:mt-20">
          <HeroVisual />
        </div>
      </Container>
    </section>
  );
}
