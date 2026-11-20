"use client";

import { m, type Transition, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered reveal primitives. Spring settings mirror the reference
 * site's appear effects (bounce 0.2, ~0.8s). Animations run once, use only
 * transform + opacity, and are disabled for reduced-motion users by the
 * MotionConfig in MotionProvider.
 *
 * `data-reveal` lets a <noscript> rule force content visible without JS.
 */

export const REVEAL_SPRING: Transition = { type: "spring", bounce: 0.2, duration: 0.8 };

const VIEWPORT = { once: true, amount: 0.25 } as const;

const HIDDEN = { opacity: 0, y: 24 } as const;

const itemVariants: Variants = {
  hidden: HIDDEN,
  visible: { opacity: 1, y: 0, transition: REVEAL_SPRING },
};

type RevealTag = "div" | "li" | "section" | "p" | "ul";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
}

/** Fades and rises a single block into view. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const Component = m[as];
  return (
    <Component
      data-reveal=""
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: HIDDEN,
        visible: { opacity: 1, y: 0, transition: { ...REVEAL_SPRING, delay } },
      }}
    >
      {children}
    </Component>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: RevealTag;
}

/** Container that staggers the reveal of its RevealItem children. */
export function RevealGroup({ children, className, stagger = 0.08, as = "div" }: RevealGroupProps) {
  const Component = m[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Component>
  );
}

/** Child of RevealGroup; inherits the group's hidden/visible state. */
export function RevealItem({ children, className, as = "div" }: Omit<RevealProps, "delay">) {
  const Component = m[as];
  return (
    <Component data-reveal="" className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}
