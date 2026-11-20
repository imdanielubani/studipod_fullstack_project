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
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7">
            <Eyebrow as="h2" id="big-idea-heading">
              The Big Idea
            </Eyebrow>

            <p className="mt-8 text-headline font-semibold text-ink">
              Learning is better when we figure things out{" "}
              <span className="font-serif font-normal tracking-[-0.02em] text-brand-600 italic">
                together.
              </span>
            </p>

            <div className="mt-12 max-w-xl space-y-8 md:mt-16">
              <p className="text-lead text-ink-muted">
                Sometimes, all it takes is another perspective, a shared idea or the right people to
                make a difficult subject easier to understand.
              </p>
              <p className="border-l-2 border-accent-400 pl-5 text-title font-semibold text-ink">
                StudiPod creates the space for that to happen.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative grid place-items-center overflow-hidden rounded-2xl bg-soft px-6 py-12 sm:px-10 sm:py-14">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-dot-grid mask-radial opacity-70"
              />
              <div className="relative w-full max-w-xs sm:max-w-sm">
                <BigIdeaVisual />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
