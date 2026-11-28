# Progressive Web App architecture

## Components

| Piece                 | File                                              | Notes                                                     |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| Web app manifest      | `public/manifest.json`                            | Linked from the root layout metadata                      |
| Service worker source | `src/lib/pwa/service-worker/sw.ts`                | Serwist; own `tsconfig.json` with the `webworker` library |
| Service worker build  | `serwist.config.mjs`                              | `pnpm build` runs `next build`, then `serwist build`      |
| Generated worker      | `public/sw.js`                                    | Build output, git-ignored, served with `no-store`         |
| Registration          | `src/providers/app-providers.tsx`                 | `SerwistProvider`, production builds only                 |
| Offline fallback      | `public/offline.html`                             | Static, self-contained, precached                         |
| Icons                 | `public/icons/`, `public/favicon.ico`             | See [icons](icons.md)                                     |
| Apple metadata        | Root layout `metadata.appleWebApp`, `icons.apple` | Standalone mode and home-screen icon on iOS/iPadOS        |

**Why Serwist:** it is the maintained successor of `next-pwa`/Workbox for Next.js. Its
configurator mode (`@serwist/next/config` + `@serwist/cli`) builds the worker with esbuild
after `next build`, so it works with Turbopack, the Next.js 16 default bundler, without
switching the app back to webpack.

## Lifecycle

1. **Register:** after the first page load (production only), scope `/`, classic worker.
2. **Install:** precache the offline page and icons (about 26 kB).
3. **Activate:** `skipWaiting` + `clientsClaim`, so a new deploy takes control on the next
   navigation. Old precache entries are cleaned up automatically.
4. **Run:** apply the [caching rules](caching-strategy.md). Navigation preload is enabled so
   network-only page loads are not slowed down by the worker.
5. **Update:** browsers re-check `/sw.js` on navigation (it is served with `no-store`).

Registration options deliberately disable two Serwist defaults:

- `cacheOnNavigation: false`: visited pages are **not** added to a cache, because candidate
  pages contain personal data.
- `reloadOnOnline: false`: the app does not reload itself when the connection returns, so
  unsaved form input is not lost.

Planned: an "update available" prompt (listen for the waiting worker) once there is UI for it.

## Installation by platform

| Platform                                       | How candidates install                            | Requirements met by                                            |
| ---------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Android (Chrome, Edge, Samsung Internet)       | Install prompt or menu → Install app              | Manifest, 192/512 icons, maskable icons, service worker, HTTPS |
| iOS / iPadOS (Safari 16.4+)                    | Share → Add to Home Screen                        | `apple-touch-icon` (180 px), `appleWebApp` metadata, manifest  |
| Windows (Edge, Chrome)                         | Address bar install icon or menu → Apps → Install | Manifest, icons, service worker                                |
| macOS (Chrome, Edge; Safari 17+ "Add to Dock") | Address bar install icon / File → Add to Dock     | Manifest, icons                                                |

iOS has no install prompt event, so an in-app hint ("Add to Home Screen") is planned for
Safari users. Splash screens on iOS fall back to the background colour; dedicated
`apple-touch-startup-image` assets can be added later.

`start_url` is `/`. Once the `(marketing)` and `(candidate)` routes exist, `/` decides where
a signed-in candidate lands.

## Network status awareness (planned)

- A `useOnlineStatus` hook (in `src/hooks`) based on `navigator.onLine` plus `online` /
  `offline` events, with failed requests as the real signal (`onLine` can be wrong).
- A global, polite (`aria-live="polite"`) banner when offline.
- Real-time features (messaging, matching, bookings, video) disable their actions and say
  why. Nothing is queued for later sending: a booking or message must never be sent
  unexpectedly after reconnecting.
- TanStack Query pauses queries while offline and refetches on reconnect.

## Push notifications

See [push notifications](push-notifications.md).

## Testing PWA behaviour

- Use a production build: `pnpm build && pnpm start --port 3100`, then
  `http://localhost:3100` (service workers require `https://` or `localhost`).
- Chrome DevTools → Application: Manifest (installability errors), Service workers,
  Cache storage (must contain only the caches listed in the caching strategy).
- Network → Offline, then navigate: the offline page must appear.
- Lighthouse PWA/best-practice audit before release.
