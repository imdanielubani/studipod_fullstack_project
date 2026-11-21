import {
  BadgeCheck,
  CircleHelp,
  Clock,
  Frown,
  Star,
  TrendingDown,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Traditional method vs StudiPod" comparison: two equal-height cards side by side
 * (stacked on mobile) — solo study on the left, the StudiPod approach on the right.
 */

interface Metric {
  label: string;
  value: string;
  gain?: string;
  icon: LucideIcon;
}

interface Comparison {
  badge: string;
  title: string;
  description: string;
  metrics: readonly Metric[];
  outcome: string;
  icon: LucideIcon;
}

const traditional: Comparison = {
  badge: "The Traditional Method",
  title: "Solo Cramming & Silent Fatigue",
  description:
    "Hours spent staring at dense text alone lead to passive skimming, unseen conceptual blind spots, and dwindling motivation when difficult vignettes stall your pace.",
  metrics: [
    { label: "Average 14-day Recall", value: "32%", icon: TrendingDown },
    { label: "Time Lost on Ambiguous Concepts", value: "4.5 hrs/wk", icon: Clock },
    { label: "Revision Burnout Incidence", value: "High", icon: Frown },
  ],
  outcome: "Isolated prep with uncertain benchmarks",
  icon: CircleHelp,
};

const studipod: Comparison = {
  badge: "The Pod Experience",
  title: "Mutual Accountability & Active Recall",
  description:
    "Deconstructing clinical cases out loud with matched peers unlocks instantaneous feedback, anchors memory through debate, and eliminates procrastination.",
  metrics: [
    { label: "Average 14-day Recall", value: "88%", gain: "+56%", icon: BadgeCheck },
    { label: "Doubts Resolved Live", value: "< 3 mins", icon: Zap },
    { label: "Consistent Schedule Adherence", value: "94%", icon: Star },
  ],
  outcome: "Sustained momentum & clinical fluency",
  icon: Users,
};

function ComparisonCard({ data, isDark }: { data: Comparison; isDark: boolean }) {
  const HeaderIcon = data.icon;
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl p-6 sm:p-8",
        isDark
          ? "bg-ink text-white shadow-[0_40px_80px_-32px_rgb(23_37_84/0.7)] ring-1 ring-white/10"
          : "bg-surface text-ink shadow-[0_24px_48px_-28px_rgb(23_37_84/0.35)] ring-1 ring-line",
      )}
    >
      {isDark ? (
        <div
          aria-hidden="true"
          className="absolute -right-16 -bottom-20 size-64 rounded-full bg-brand-600/40 blur-3xl"
        />
      ) : null}

      <div className="relative flex items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.04em]",
            isDark ? "bg-brand-600 text-white" : "bg-soft text-ink-muted ring-1 ring-line",
          )}
        >
          {data.badge}
        </span>
        <HeaderIcon
          aria-hidden="true"
          className={cn("size-5", isDark ? "text-brand-300" : "text-ink-subtle")}
        />
      </div>

      <h3 className="relative mt-5 text-xl leading-tight font-semibold tracking-[-0.02em] sm:text-2xl">
        {data.title}
      </h3>
      <p
        className={cn(
          "relative mt-2 text-sm leading-relaxed",
          isDark ? "text-brand-100/80" : "text-ink-muted",
        )}
      >
        {data.description}
      </p>

      <dl className="relative mt-5 space-y-2">
        {data.metrics.map(({ label, value, gain, icon: Icon }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
              isDark ? "bg-white/[0.06] ring-1 ring-white/[0.06]" : "bg-soft",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-4 shrink-0", isDark ? "text-brand-300" : "text-accent-600")}
            />
            <dt className="min-w-0 flex-1">{label}</dt>
            <dd
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                isDark ? "text-brand-300" : "text-ink",
              )}
            >
              {value}
              {gain ? (
                <span className="ml-1.5 text-xs font-medium text-accent-300">({gain})</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p
        className={cn(
          "relative mt-auto pt-6 text-[11px] font-semibold tracking-[0.12em] uppercase",
          isDark ? "text-brand-300" : "text-ink-subtle",
        )}
      >
        Outcome: {data.outcome}
      </p>
    </article>
  );
}

export function BigIdeaVisual() {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      <ComparisonCard data={traditional} isDark={false} />
      <ComparisonCard data={studipod} isDark />
    </div>
  );
}
