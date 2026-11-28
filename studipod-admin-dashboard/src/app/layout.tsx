import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { AppProviders } from '@/providers/app-providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Studipod Admin',
    template: '%s · Studipod Admin',
  },
  description: 'Internal administration console for the Studipod platform.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#172554',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB" className={cn(inter.variable, jetBrainsMono.variable)}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
