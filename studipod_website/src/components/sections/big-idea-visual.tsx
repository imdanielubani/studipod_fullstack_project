/**
 * "Perspectives" diagram: three overlapping circles (another perspective, a shared
 * idea, the right people) converging on the StudiPod mark at their intersection.
 * Labels mirror the section copy so the illustration reinforces the message.
 */

const circles = [
  { cx: 160, cy: 150, label: "Another perspective", labelX: 160, labelY: 22, anchor: "middle" },
  { cx: 108, cy: 240, label: "A shared idea", labelX: 18, labelY: 372, anchor: "start" },
  { cx: 212, cy: 240, label: "The right people", labelX: 302, labelY: 372, anchor: "end" },
] as const;

const RADIUS = 92;

export function BigIdeaVisual() {
  return (
    <svg
      viewBox="0 0 320 390"
      role="img"
      aria-label="Diagram: another perspective, a shared idea and the right people overlap, and StudiPod sits where they meet."
      className="h-auto w-full max-w-sm"
    >
      <defs>
        <radialGradient id="big-idea-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="160" cy="208" r="120" fill="url(#big-idea-core)" />

      {circles.map((circle) => (
        <g key={circle.label}>
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={RADIUS}
            fill="#2563eb"
            fillOpacity="0.07"
            stroke="#2563eb"
            strokeOpacity="0.35"
            strokeWidth="1.25"
          />
          <text
            x={circle.labelX}
            y={circle.labelY}
            textAnchor={circle.anchor}
            className="fill-ink text-[13px] font-semibold tracking-[-0.01em]"
          >
            {circle.label}
          </text>
        </g>
      ))}

      {/* Converging centre — the StudiPod mark */}
      <g transform="translate(160 208)">
        <circle r="26" fill="#172554" />
        <path
          d="M-5 -9.6c0-1.4 1.5-2.2 2.7-1.5l14.4 8.3c1.2.7 1.2 2.4 0 3.1L-2.3 8.6C-3.5 9.3-5 8.4-5 7z"
          fill="#fb7185"
        />
      </g>
    </svg>
  );
}
