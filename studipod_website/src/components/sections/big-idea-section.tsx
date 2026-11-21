import { FadeIn } from "@/components/animations/fade-in";
import { Reveal } from "@/components/animations/reveal";
import { BigIdeaVisual } from "@/components/sections/big-idea-visual";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { SECTION_IDS } from "@/config/navigation";

export function BigIdeaSection() {
  return (
    <section
      id={SECTION_IDS.about}
      aria-labelledby="big-idea-heading"
      className="relative bg-surface py-24 md:py-36"
    >
      <Container size="wide">
        <div className="grid gap-14 md:gap-20">
          <div className="max-w-4xl">
            <FadeIn>
              <Eyebrow as="h2" id="big-idea-heading">
                The Big Idea
              </Eyebrow>
            </FadeIn>

            <Reveal as="p" className="mt-8 text-headline font-semibold text-ink">
              Learning is better when we figure things out{" "}
              <span className="font-serif font-normal tracking-[-0.02em] text-brand-600 italic">
                together.
              </span>
            </Reveal>

            <Reveal delay={0.12} className="mt-12 max-w-xl space-y-8 md:mt-16">
              <p className="text-lead text-ink-muted">
                Sometimes, all it takes is another perspective, a shared idea or the right people to
                make a difficult subject easier to understand.
              </p>
              <p className="border-l-2 border-accent-400 pl-5 text-title font-semibold text-ink">
                StudiPod creates the space for that to happen.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl bg-soft p-4 sm:p-6 lg:p-8">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-dot-grid mask-radial opacity-70"
              />
              <div className="relative">
                <BigIdeaVisual />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
