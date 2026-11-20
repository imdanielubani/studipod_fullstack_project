import { Check, FileText, MessageCircle, MonitorUp, Presentation } from "lucide-react";
import type { JSX } from "react";
import type { FeatureId } from "@/config/features";
import { cn } from "@/lib/utils";

/**
 * Small, code-built scenes that illustrate each Pod Experience feature.
 * Hover micro-interactions are driven by the parent card's `group/card` state
 * using transform/opacity only (compositor-friendly, no layout shift).
 * Decorative: hidden from assistive technology; the card text carries meaning.
 */

const EASE = "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)";

function CircleScene() {
  const people = [
    {
      initials: "AO",
      className: "left-[18%] top-[22%] from-brand-500 to-brand-700",
      hover: "group-hover/card:-translate-x-2 group-hover/card:-translate-y-1",
    },
    {
      initials: "MK",
      className: "left-[44%] top-[52%] from-accent-300 to-accent-400",
      hover: "group-hover/card:translate-y-1",
    },
    {
      initials: "JS",
      className: "left-[70%] top-[18%] from-brand-300 to-brand-500",
      hover: "group-hover/card:translate-x-2 group-hover/card:-translate-y-1",
    },
  ];
  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 300 160"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M72 52 L150 100 L228 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          className="text-brand-300"
        />
      </svg>
      {people.map((person) => (
        <span
          key={person.initials}
          className={cn(
            "absolute grid size-11 place-items-center rounded-full bg-gradient-to-br text-xs font-semibold text-white shadow-[0_0_0_4px_white]",
            EASE,
            person.className,
            person.hover,
          )}
        >
          {person.initials}
        </span>
      ))}
    </div>
  );
}

function PurposeScene() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 px-6">
      <div
        className={cn(
          "flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-hairline",
          EASE,
          "group-hover/card:-translate-y-0.5",
        )}
      >
        <span className="text-sm font-semibold text-ink">Exam study group</span>
        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Joined
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md bg-white/70 px-4 py-3 ring-1 ring-line",
          EASE,
          "group-hover/card:translate-x-1",
        )}
      >
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100">
          <span
            className={cn(
              "block h-full w-1/2 origin-left rounded-full bg-accent-400",
              "transition-transform duration-700 ease-(--ease-out-expo) group-hover/card:scale-x-[1.6]",
            )}
          />
        </span>
        <span className="font-mono text-[11px] text-ink-muted">Focus session</span>
      </div>
    </div>
  );
}

function InteractiveScene() {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-6">
      <div className="w-full max-w-[13rem] overflow-hidden rounded-md bg-brand-950 p-2 shadow-card">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="flex items-center gap-1 text-[10px] font-medium text-brand-100">
            <MonitorUp className="size-3" /> Sharing screen
          </span>
          <span className="size-1.5 rounded-full bg-accent-400" />
        </div>
        <div className="grid h-14 place-items-center rounded-sm bg-white/10">
          <Presentation className="size-5 text-brand-200" />
        </div>
      </div>
      <span
        className={cn(
          "absolute right-5 bottom-5 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-ink shadow-card",
          EASE,
          "group-hover/card:-translate-y-1.5",
        )}
      >
        <MessageCircle className="size-3 text-brand-600" /> Great point!
      </span>
    </div>
  );
}

function PracticeScene() {
  const options = ["A", "B", "C"];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 px-6">
      {options.map((option, index) => {
        const isCorrect = index === 1;
        return (
          <div
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs",
              EASE,
              isCorrect
                ? "bg-white text-ink shadow-hairline group-hover/card:translate-x-1.5"
                : "bg-white/60 text-ink-subtle",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[10px] font-semibold",
                isCorrect ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700",
              )}
            >
              {isCorrect ? <Check className="size-3" /> : option}
            </span>
            <span
              className={cn(
                "h-1.5 rounded-full",
                isCorrect ? "w-24 bg-brand-200" : "w-16 bg-brand-100",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function ShareScene() {
  const files = [
    {
      motion:
        "-translate-x-12 translate-y-1 -rotate-[10deg] group-hover/card:-translate-x-16 group-hover/card:-rotate-[16deg]",
      tone: "bg-brand-100",
    },
    { motion: "z-10 -translate-y-1 group-hover/card:-translate-y-3", tone: "bg-white" },
    {
      motion:
        "translate-x-12 translate-y-1 rotate-[10deg] group-hover/card:translate-x-16 group-hover/card:rotate-[16deg]",
      tone: "bg-accent-100",
    },
  ];
  return (
    <div className="relative grid h-full w-full place-items-center">
      {files.map((file, index) => (
        <div
          key={index}
          className={cn(
            "absolute flex h-24 w-20 flex-col gap-1.5 rounded-md p-2.5 shadow-card ring-1 ring-line",
            "transition-[transform,rotate,translate] duration-(--duration-slow) ease-(--ease-out-expo)",
            file.motion,
            file.tone,
          )}
        >
          <FileText className="size-4 text-brand-600" />
          <span className="h-1 w-full rounded-full bg-brand-950/10" />
          <span className="h-1 w-3/4 rounded-full bg-brand-950/10" />
          <span className="h-1 w-5/6 rounded-full bg-brand-950/10" />
        </div>
      ))}
    </div>
  );
}

const scenes: Record<FeatureId, () => JSX.Element> = {
  circle: CircleScene,
  purpose: PurposeScene,
  interactive: InteractiveScene,
  practice: PracticeScene,
  share: ShareScene,
};

export function FeatureIllustration({ id, className }: { id: FeatureId; className?: string }) {
  const Scene = scenes[id];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-lg bg-soft bg-dot-grid [background-size:18px_18px]",
        className,
      )}
    >
      <Scene />
    </div>
  );
}
