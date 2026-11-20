"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

/** Opacity-only entrance for small labels and supporting elements. */
export function FadeIn({ children, className, delay = 0, duration = 0.6 }: FadeInProps) {
  return (
    <m.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}
