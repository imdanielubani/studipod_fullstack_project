# Push notifications (readiness)

> **Status:** prepared, not implemented. The service worker has no `push` handler yet, and
> the webapp never asks for notification permission.

## Backend side (already planned)

The backend sends browser push with the standard **Web Push protocol and VAPID keys**
(`web-push`), from a `push` queue that removes dead subscriptions on `404`/`410`. Firebase
Cloud Messaging is reserved for future native apps. The VAPID private key exists only in
the backend.

## Webapp flow to implement (notifications feature)

1. **Ask at the right moment.** Request permission only after a user action that explains
   the value (for example "Remind me before my session"), never on page load. Browsers
   (Safari in particular) block prompts that are not triggered by a user gesture.
2. Get the **VAPID public key** from the backend (an endpoint or a public build variable;
   decide with the backend; it is public by design).
3. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
4. Send the subscription (endpoint and keys) to the backend; it stores it per device.
5. Settings page: list devices, unsubscribe (`subscription.unsubscribe()` + backend delete).

## Service worker handlers to add (`sw.ts`)

- `push`: show a notification from the payload. Payloads contain only a title, a short
  non-sensitive body and a relative URL. **No message content, medical information or
  payment details in push payloads** (they are visible on lock screens).
- `notificationclick`: focus an open client or open the URL; validate that the URL is
  same-origin and relative.
- `pushsubscriptionchange`: re-subscribe and update the backend.

## Platform notes

| Platform                                        | Support                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Android, Windows, macOS (Chrome, Edge, Firefox) | Supported in the browser and installed app                      |
| macOS Safari 16+                                | Supported                                                       |
| iOS / iPadOS 16.4+                              | Only for apps **added to the Home Screen**; not in a Safari tab |

In-app notifications (the inbox, delivered over Socket.IO) remain the primary channel; push
is a supplement that candidates opt into.
