import { FeatureIllustration } from "@/components/features/feature-illustration";
import type { Feature } from "@/config/features";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  feature: Feature;
  index: number;
  /** Taller illustration for the wide leading cards. */
  isProminent?: boolean;
  className?: string;
}

/** A single Pod Experience feature: illustration, index, icon, title and description. */
export function FeatureCard({ feature, index, isProminent = false, className }: FeatureCardProps) {
  const Icon = feature.icon;
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      className={cn(
        "group/card flex h-full w-full flex-col rounded-xl bg-surface p-3 shadow-hairline",
        "transition-[transform,box-shadow] duration-(--duration-slow) ease-(--ease-out-expo)",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-hairline),var(--shadow-lift)]",
        className,
      )}
    >
      <FeatureIllustration id={feature.id} className={isProminent ? "h-48 sm:h-56" : "h-44"} />

      <div className="flex flex-1 flex-col px-3 pt-6 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-md bg-brand-50 text-brand-700",
              "transition-colors duration-(--duration-base) group-hover/card:bg-brand-600 group-hover/card:text-white",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="font-mono text-xs text-ink-subtle" aria-hidden="true">
            {number}
          </span>
        </div>
        <h3 className="mt-6 text-xl font-semibold tracking-tight text-ink sm:text-[1.375rem]">
          {feature.title}
        </h3>
        <p className="mt-2 max-w-md text-ink-muted">{feature.description}</p>
      </div>
    </article>
  );
}
