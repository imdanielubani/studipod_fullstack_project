'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces the
 * whole document, so it cannot rely on the layout's providers (including translations)
 * and keeps its text and styles inline.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#0a1d54',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: '28rem', margin: 0, color: '#55607f' }}>
          Studipod could not be displayed. Try again, and contact support if the problem continues.
        </p>
        {error.digest ? <p style={{ fontSize: 12, margin: 0 }}>Reference: {error.digest}</p> : null}
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: 44,
            padding: '10px 20px',
            border: 0,
            borderRadius: 8,
            background: '#1c61f7',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
