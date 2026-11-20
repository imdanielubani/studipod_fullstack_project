import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}

/** Small uppercase label with a coral marker, placed above section headings. */
export function Eyebrow({ children, tone = "light", className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-eyebrow font-semibold uppercase",
        tone === "light"
          ? "bg-surface text-brand-700 shadow-hairline"
          : "bg-white/8 text-brand-100 ring-1 ring-white/12",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-400" />
      {children}
    </p>
  );
}

interface SectionHeadingProps {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}

/** Eyebrow + H2 + optional supporting copy. Shared heading pattern for every section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className={cn(
          "max-w-3xl text-headline font-semibold",
          tone === "light" ? "text-ink" : "text-white",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-lead",
            tone === "light" ? "text-ink-muted" : "text-brand-100/80",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
