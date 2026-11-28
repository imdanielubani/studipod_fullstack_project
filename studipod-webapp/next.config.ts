import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

import { getPublicEnv } from './src/config/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Baseline security headers for every response.
 *
 * A full Content-Security-Policy with per-request nonces (script-src, plus connect-src
 * for the API, WebSocket, LiveKit and file-upload origins) is added together with the
 * request proxy once authentication is implemented. See docs/security/security-architecture.md.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; worker-src 'self'; manifest-src 'self'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    // Camera, microphone and screen sharing are needed by video practice sessions
    // (first party only). Everything else is switched off.
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), autoplay=(self), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** The service worker must always be revalidated so updates reach installed clients. */
const serviceWorkerHeaders = [
  { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
];

const manifestHeaders = [
  { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
  { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the production Docker image.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/sw.js', headers: serviceWorkerHeaders },
      { source: '/manifest.json', headers: manifestHeaders },
    ];
  },
};

export default function config(phase: string): NextConfig {
  // NEXT_PUBLIC_* values are inlined at build time: fail the build if any is missing or
  // invalid. The runtime server does not need them, so other phases skip the check.
  if (phase === PHASE_PRODUCTION_BUILD) getPublicEnv();

  return withNextIntl(nextConfig);
}
