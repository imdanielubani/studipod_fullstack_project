"use client";

import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

/**
 * "Perspectives" diagram: three overlapping circles (another perspective, a shared
 * idea, the right people) converging on the StudiPod mark at their intersection.
 * Labels mirror the section copy so the illustration reinforces the message.
 *
 * Scroll-linked: the circles start apart and converge as the diagram scrolls
 * towards the centre of the viewport. Transform-only; static for reduced motion.
 */

const circles = [
  {
    cx: 160,
    cy: 150,
    label: "Another perspective",
    labelX: 160,
    labelY: 22,
    anchor: "middle",
    from: { x: 0, y: -34 },
  },
  {
    cx: 108,
    cy: 240,
    label: "A shared idea",
    labelX: 18,
    labelY: 372,
    anchor: "start",
    from: { x: -30, y: 18 },
  },
  {
    cx: 212,
    cy: 240,
    label: "The right people",
    labelX: 302,
    labelY: 372,
    anchor: "end",
    from: { x: 30, y: 18 },
  },
] as const;

const RADIUS = 92;

function ConvergingCircle({
  circle,
  progress,
  isStatic,
}: {
  circle: (typeof circles)[number];
  progress: MotionValue<number>;
  isStatic: boolean;
}) {
  const x = useTransform(progress, [0, 1], [circle.from.x, 0]);
  const y = useTransform(progress, [0, 1], [circle.from.y, 0]);
  return (
    <m.circle
      cx={circle.cx}
      cy={circle.cy}
      r={RADIUS}
      style={isStatic ? undefined : { x, y }}
      fill="#2563eb"
      fillOpacity="0.07"
      stroke="#2563eb"
      strokeOpacity="0.35"
      strokeWidth="1.25"
    />
  );
}

export function BigIdeaVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const markScale = useTransform(scrollYProgress, [0.55, 1], [0.6, 1]);
  const glowOpacity = useTransform(scrollYProgress, [0.3, 1], [0, 1]);

  return (
    <div ref={ref}>
      <svg
        viewBox="0 0 320 390"
        role="img"
        aria-label="Diagram: another perspective, a shared idea and the right people overlap, and StudiPod sits where they meet."
        className="h-auto w-full max-w-sm overflow-visible"
      >
        <defs>
          <radialGradient id="big-idea-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>

        <m.circle
          cx="160"
          cy="208"
          r="120"
          fill="url(#big-idea-core)"
          style={prefersReducedMotion ? undefined : { opacity: glowOpacity }}
        />

        {circles.map((circle) => (
          <ConvergingCircle
            key={circle.label}
            circle={circle}
            progress={scrollYProgress}
            isStatic={prefersReducedMotion}
          />
        ))}

        {circles.map((circle) => (
          <text
            key={circle.label}
            x={circle.labelX}
            y={circle.labelY}
            textAnchor={circle.anchor}
            className="fill-ink text-[13px] font-semibold tracking-[-0.01em]"
          >
            {circle.label}
          </text>
        ))}

        {/* Converging centre — the StudiPod mark */}
        <g transform="translate(160 208)">
          <m.g style={prefersReducedMotion ? undefined : { scale: markScale }}>
            <circle r="26" fill="#172554" />
            <path
              d="M-5 -9.6c0-1.4 1.5-2.2 2.7-1.5l14.4 8.3c1.2.7 1.2 2.4 0 3.1L-2.3 8.6C-3.5 9.3-5 8.4-5 7z"
              fill="#fb7185"
            />
          </m.g>
        </g>
      </svg>
    </div>
  );
}
