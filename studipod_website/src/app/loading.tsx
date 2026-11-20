/** Lightweight route loading state shown while a page streams in. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center">
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-pulse rounded-full bg-brand-600"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
