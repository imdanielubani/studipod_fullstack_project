"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Last-resort boundary for errors in the root layout itself. Rendered without
 * the app's layout or stylesheet, so it uses minimal inline styling and shows
 * no error details.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f9fe",
          color: "#172554",
          textAlign: "center",
        }}
      >
        <main style={{ padding: "2rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong.</h1>
          <p style={{ color: "#475073", lineHeight: 1.6 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              border: 0,
              borderRadius: "999px",
              background: "#2563eb",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
