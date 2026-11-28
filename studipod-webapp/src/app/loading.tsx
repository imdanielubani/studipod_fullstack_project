import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('Common');

  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center">
      <span className="text-sm text-muted-foreground">{t('loading')}</span>
    </div>
  );
}
