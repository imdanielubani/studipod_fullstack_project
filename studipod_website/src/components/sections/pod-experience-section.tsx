import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { features } from "@/config/features";
import { SECTION_IDS } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Bento layout: two wide cards lead (6/12 each on desktop), three compact cards
 * follow (4/12 each). Varying spans give hierarchy instead of a uniform grid.
 */
const layout = [
  "lg:col-span-6",
  "lg:col-span-6",
  "lg:col-span-4",
  "lg:col-span-4",
  "md:col-span-2 lg:col-span-4",
] as const;

export function PodExperienceSection() {
  return (
    <section
      id={SECTION_IDS.features}
      aria-labelledby="pod-experience-heading"
      className="relative isolate overflow-hidden py-24 md:py-36"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-dot-grid mask-radial opacity-50"
      />

      <Container size="wide">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow as="h2" id="pod-experience-heading">
              The Pod Experience
            </Eyebrow>
            <p className="mt-8 text-headline font-semibold text-ink">
              Everything you need for a more{" "}
              <span className="font-serif font-normal tracking-[-0.02em] text-brand-600 italic">
                collaborative
              </span>{" "}
              study experience.
            </p>
          </div>
        </div>

        <ul className="mt-14 grid gap-4 md:mt-20 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li key={feature.id} className={cn("flex", layout[index])}>
                <article className="flex w-full flex-col rounded-xl bg-surface p-6 shadow-hairline sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-ink-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-10 text-xl font-semibold tracking-tight text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-ink-muted">{feature.description}</p>
                </article>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
