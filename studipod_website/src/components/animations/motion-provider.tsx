"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Loads the DOM animation feature set lazily (smaller initial bundle than `motion.*`)
 * and makes every animation honour the user's prefers-reduced-motion setting.
 * `strict` guarantees components use the lightweight `m.*` elements.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
