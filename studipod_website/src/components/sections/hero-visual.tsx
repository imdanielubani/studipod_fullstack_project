import { CircleCheck, FileText, MonitorUp, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Illustrative product preview of a StudiPod study session, built in markup so it
 * stays crisp at every size, costs no image bytes and inherits the design tokens.
 * Purely decorative for assistive technology (summarised by a single label).
 */

const participants = [
  { initials: "AO", tone: "from-brand-500 to-brand-700", speaking: true },
  { initials: "MK", tone: "from-accent-300 to-accent-400", speaking: false },
  { initials: "JS", tone: "from-brand-300 to-brand-500", speaking: false },
  { initials: "You", tone: "from-brand-800 to-brand-950", speaking: false },
] as const;

const steps = [
  { label: "Recall first-line management", done: true },
  { label: "Compare approaches as a group", done: true },
  { label: "Work through a case together", done: false },
] as const;

function delay(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

export function HeroVisual() {
  return (
    <div
      role="img"
      aria-label="Preview of a StudiPod study pod: a live group session with a shared study board, participant video tiles and shared resources."
      className="relative animate-rise"
      style={delay(520)}
    >
      {/* Floating card — shared resource (desktop only) */}
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -left-4 z-20 hidden w-64 animate-float rounded-lg bg-white p-4 shadow-[var(--shadow-hairline),var(--shadow-lift)] lg:block xl:-left-10"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-accent-100 text-accent-600">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-subtle">Resource shared</p>
            <p className="truncate text-sm font-semibold text-ink">Revision notes.pdf</p>
          </div>
        </div>
      </div>

      {/* Floating card — practice (desktop only) */}
      <div
        aria-hidden="true"
        className="absolute -top-16 right-10 z-20 hidden w-60 animate-float rounded-lg bg-white p-4 shadow-[var(--shadow-hairline),var(--shadow-lift)] [animation-delay:-4s] lg:block xl:right-24"
      >
        <p className="flex items-center gap-2 text-xs font-medium text-ink-subtle">
          <Sparkles className="size-3.5 text-brand-600" />
          Practice together
        </p>
        <div className="mt-3 flex gap-1.5">
          {[true, true, true, false].map((isFilled, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                isFilled ? "bg-brand-600" : "bg-brand-100",
              )}
            />
          ))}
        </div>
        <p className="mt-2.5 text-sm font-semibold text-ink">Question set in progress</p>
      </div>

      {/* App frame */}
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-xl bg-brand-950 p-2 shadow-[0_40px_80px_-32px_rgb(23_37_84/0.55)] ring-1 ring-brand-950/10 sm:p-3 md:rounded-2xl"
      >
        <div
          className="pointer-events-none absolute -top-1/2 left-1/2 h-full w-3/4 -translate-x-1/2 rounded-full bg-brand-600/40 blur-3xl"
          aria-hidden="true"
        />

        {/* Session header */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-white/10 text-sm font-semibold text-white ring-1 ring-white/15">
              Pd
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Exam Prep Pod</p>
              <p className="text-xs text-brand-200/80">Focused study session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-400/15 px-2.5 py-1 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/30">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent-400" />
              </span>
              Live
            </span>
            <span className="hidden rounded-full bg-white/8 px-2.5 py-1 font-mono text-xs text-brand-100 ring-1 ring-white/10 sm:inline-flex">
              25:00 focus
            </span>
          </div>
        </div>

        {/* Session body */}
        <div className="relative grid gap-2 sm:gap-3 md:grid-cols-5">
          {/* Shared board */}
          <div className="rounded-lg bg-white p-4 sm:p-6 md:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-eyebrow font-semibold text-brand-700 uppercase">Shared board</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                <MonitorUp className="size-3.5" />
                Screen shared
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Today&rsquo;s topic: talking it through
            </p>
            <ul className="mt-5 space-y-2.5">
              {steps.map((step) => (
                <li
                  key={step.label}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                    step.done ? "bg-brand-50 text-ink" : "text-ink-muted ring-1 ring-line",
                  )}
                >
                  {step.done ? (
                    <CircleCheck className="size-4 shrink-0 text-brand-600" />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border-2 border-dashed border-brand-300" />
                  )}
                  {step.label}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-ink-subtle">
                <span>Session progress</span>
                <span className="font-medium text-ink">2 of 3</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-brand-500 to-brand-700" />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 md:col-span-2 md:grid-cols-2">
            {participants.map((person) => (
              <div
                key={person.initials}
                className={cn(
                  "relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-white/[0.06] ring-1 ring-white/10 md:aspect-auto md:min-h-28",
                  person.speaking && "ring-2 ring-accent-400/70",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full bg-gradient-to-br text-xs font-semibold text-white sm:size-12 sm:text-sm",
                    person.tone,
                  )}
                >
                  {person.initials}
                </span>
                {person.speaking ? (
                  <span className="absolute bottom-2 left-2 hidden items-end gap-0.5 sm:flex">
                    {[3, 6, 4].map((height, index) => (
                      <span
                        key={index}
                        className="w-0.5 animate-pulse rounded-full bg-accent-300"
                        style={{ height: `${height * 2}px`, animationDelay: `${index * 150}ms` }}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
