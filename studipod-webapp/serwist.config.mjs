// @ts-check
/**
 * Service worker build (runs after `next build`, see the "build" script).
 *
 * Bundles src/lib/pwa/service-worker/sw.ts into public/sw.js and injects a deliberately
 * small precache manifest: the offline fallback and the app icons. Next.js build assets
 * are cached at runtime when first requested (see sw.ts), and authenticated pages or API
 * responses are never cached. Caching rules: docs/pwa/caching-strategy.md.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { serwist } from '@serwist/next/config';

const OFFLINE_PAGE = 'public/offline.html';

/** Content hash, so installed clients fetch the offline page again only when it changes. */
const revisionOf = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

export default serwist({
  swSrc: 'src/lib/pwa/service-worker/sw.ts',
  swDest: 'public/sw.js',
  globDirectory: '.',
  globPatterns: ['public/icons/**/*.{png,svg,ico}'],
  // Listed explicitly: the default manifest transform would rewrite *.html paths as
  // prerendered routes ("/public/offline") instead of serving "/offline.html".
  additionalPrecacheEntries: [{ url: '/offline.html', revision: revisionOf(OFFLINE_PAGE) }],
  // Prerendered pages are not precached: navigations always go to the network.
  precachePrerendered: false,
});
