import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('Errors');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('notFoundTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('notFoundDescription')}</p>
    </main>
  );
}
