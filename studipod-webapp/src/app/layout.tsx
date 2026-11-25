import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { AppProviders } from '@/providers/app-providers';

import './globals.css';

const BRAND_NAVY = '#0a1d54';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  const applicationName = t('applicationName');

  return {
    applicationName,
    title: { default: applicationName, template: `%s · ${applicationName}` },
    description: t('description'),
    manifest: '/manifest.json',
    appleWebApp: { capable: true, title: applicationName, statusBarStyle: 'default' },
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: BRAND_NAVY,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
