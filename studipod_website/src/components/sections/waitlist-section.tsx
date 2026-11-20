import { FadeIn } from "@/components/animations/fade-in";
import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { SECTION_IDS } from "@/config/navigation";

export function WaitlistSection() {
  // Public site key (safe to expose). The secret key is only read in lib/env.ts.
  const turnstileSiteKey = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || null;

  return (
    <section
      id={SECTION_IDS.waitlist}
      aria-labelledby="waitlist-heading"
      className="px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="relative isolate overflow-hidden rounded-2xl bg-brand-950 py-20 md:py-28">
        {/* Atmosphere */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] mask-radial [background-size:22px_22px]" />
          <div className="absolute -top-32 -left-24 size-[32rem] animate-drift rounded-full bg-brand-600/35 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[28rem] animate-drift rounded-full bg-accent-400/20 blur-3xl [animation-delay:-8s]" />
        </div>

        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-6">
              <FadeIn>
                <Eyebrow tone="dark">Early access</Eyebrow>
              </FadeIn>
              <Reveal>
                <h2 id="waitlist-heading" className="mt-8 text-headline font-semibold text-white">
                  Be Part of our{" "}
                  <span className="font-serif font-normal tracking-[-0.02em] text-brand-300 italic">
                    Study Experience.
                  </span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-lg text-lead text-brand-100/80">
                  Join over a thousand NHS and commonwealth doctors locking in disciplined study
                  routines. Invitations sent in rolling batches.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8">
              <div className="rounded-xl bg-surface p-6 shadow-[0_40px_80px_-32px_rgb(0_0_0/0.5)] sm:p-8">
                <WaitlistForm turnstileSiteKey={turnstileSiteKey} />
              </div>
            </Reveal>
          </div>
        </Container>
      </div>
    </section>
  );
}
