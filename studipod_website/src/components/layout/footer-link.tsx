import Link from "next/link";
import type { ReactNode } from "react";

interface FooterLinkProps {
  /** Destination. `null` renders a clearly-labelled placeholder instead of a dead link. */
  href: string | null;
  children: ReactNode;
  icon?: ReactNode;
}

const linkClasses =
  "group/link inline-flex items-center gap-2.5 whitespace-nowrap rounded-sm text-[0.9375rem] text-ink-muted transition-colors duration-(--duration-base) hover:text-ink";

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

export function FooterLink({ href, children, icon }: FooterLinkProps) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-2.5 text-[0.9375rem] whitespace-nowrap text-ink-subtle">
        {icon}
        {children}
        <span className="rounded-full bg-brand-950/[0.05] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-subtle uppercase">
          Soon
        </span>
      </span>
    );
  }

  const content = (
    <>
      {icon}
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/link:scale-x-100"
        />
      </span>
    </>
  );

  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
        {content}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={linkClasses}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClasses}>
      {content}
    </Link>
  );
}
