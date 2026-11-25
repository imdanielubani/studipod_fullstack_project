/**
 * Studipod service worker.
 *
 * Built by `serwist build` (serwist.config.mjs) into public/sw.js. Rules:
 *
 * - Only same-origin, public, content-hashed or static assets are cached.
 * - Page navigations always go to the network; when it is unreachable the precached
 *   offline page is shown. Authenticated pages are never served from a cache.
 * - API, WebSocket, LiveKit, file-storage and payment traffic is cross-origin and is
 *   not handled here at all, so it always goes straight to the network.
 *
 * See docs/pwa/caching-strategy.md before adding a rule.
 */
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = '/offline.html';
const DAY_IN_SECONDS = 60 * 60 * 24;

const isSameOriginGet = (request: Request, url: URL): boolean =>
  request.method === 'GET' && url.origin === self.location.origin;

const okResponsesOnly = new CacheableResponsePlugin({ statuses: [200] });

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      // Content-hashed Next.js build output: safe to keep until it expires.
      matcher: ({ request, url }) =>
        isSameOriginGet(request, url) && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({
        cacheName: 'next-static',
        plugins: [
          okResponsesOnly,
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * DAY_IN_SECONDS }),
        ],
      }),
    },
    {
      // Public files shipped in /public (icons, brand images, fonts).
      matcher: ({ request, url }) =>
        isSameOriginGet(request, url) && /^\/(icons|images|fonts)\//.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: 'public-assets',
        plugins: [
          okResponsesOnly,
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * DAY_IN_SECONDS }),
        ],
      }),
    },
    {
      // Pages: network only, never cached.
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [{ url: OFFLINE_URL, matcher: ({ request }) => request.mode === 'navigate' }],
  },
});

serwist.addEventListeners();

// Web Push: `push` and `notificationclick` listeners are added here together with the
// notifications feature (docs/pwa/push-notifications.md).
