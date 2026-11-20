"use client";

import { m } from "motion/react";
import { useEffect, useRef } from "react";
import { firstName } from "@/lib/utils";

interface WaitlistSuccessProps {
  fullName: string;
  email: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Confirmation state. Focus moves to the heading so screen readers announce it. */
export function WaitlistSuccess({ fullName, email }: WaitlistSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const name = firstName(fullName);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center py-6 text-center sm:py-10"
    >
      <m.div
        className="relative grid size-20 place-items-center rounded-full bg-brand-600 text-white shadow-glow"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.45, duration: 0.7 }}
      >
        <m.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full ring-2 ring-brand-400"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 0.2 }}
        />
        <svg viewBox="0 0 24 24" className="size-9" fill="none" aria-hidden="true">
          <m.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.25 }}
          />
        </svg>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.3 }}
      >
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="mt-8 text-title font-semibold text-ink outline-none"
        >
          You&rsquo;re on the list{name ? `, ${name}` : ""}.
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-ink-muted">
          We&rsquo;ll email <span className="font-medium break-all text-ink">{email}</span> when
          your invitation is ready. Invitations are sent in rolling batches.
        </p>
      </m.div>
    </div>
  );
}
