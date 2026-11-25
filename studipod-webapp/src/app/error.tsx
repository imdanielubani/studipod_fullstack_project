'use client';

import { useTranslations } from 'next-intl';

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Root error boundary. Shows only the opaque digest, never the error message. */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('Errors.unexpectedTitle')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('Errors.unexpectedDescription')}</p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          {t('Errors.reference', { digest: error.digest })}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t('Common.tryAgain')}
      </button>
    </main>
  );
}
