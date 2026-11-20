import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/animations/motion-provider";
import { siteConfig } from "@/config/site";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
});

/** Accent face for a few emphasised words only — italic 400, single file. */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#172554",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Per-request CSP nonce set by src/proxy.ts. Reading request headers also opts
  // pages into dynamic rendering, which nonce-based CSP requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en-GB" className={`${interTight.variable} ${instrumentSerif.variable}`}>
      <head>
        {/* Without JavaScript, scroll-reveal content must still be visible. */}
        <noscript>
          <style nonce={nonce}>
            {"[data-reveal]{opacity:1!important;transform:none!important}"}
          </style>
        </noscript>
      </head>
      <body className="min-h-dvh">
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-full bg-brand-950 px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
