# Third-party integrations plan

Each integration gets a thin wrapper in `src/integrations/<vendor>/` exposing only the operations Studipod needs. Feature modules depend on the wrapper, never on the vendor SDK, which keeps vendor code mockable in tests and replaceable.

> **Status:** SDKs are installed and configuration namespaces exist. No wrapper is implemented.

| Integration    | Package(s)                                                     | Config namespace | Used by                                              |
| -------------- | -------------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| LiveKit Cloud  | `livekit-server-sdk`                                           | `video`          | `video-sessions`                                     |
| Cloudflare R2  | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp` | `storage`        | `file-storage`, `profiles`, `resources`, `messaging` |
| Stripe         | `stripe`                                                       | `payment`        | `subscriptions`, `payments`                          |
| Resend         | `resend`                                                       | `email`          | `email` (via the `email` queue)                      |
| Web Push       | `web-push`                                                     | `push`           | `push-notifications`                                 |
| Firebase (FCM) | `firebase-admin`                                               | `push`           | `push-notifications`                                 |

## LiveKit Cloud (video)

- LiveKit Cloud hosts all media servers. Nothing video-related runs on the Hostinger VPS.
- Flow: a candidate opens a confirmed booking → API checks they are a participant and the session window is open → API creates or reuses a room named after the session → API returns a short-lived access token (`LIVEKIT_TOKEN_TTL_SECONDS`) with grants limited to that room → the client connects to LiveKit directly.
- LiveKit webhooks (`room_started`, `participant_joined`, `room_finished`) are verified with the API key/secret and update `video_sessions` (attendance, duration). Processing is queued.
- Recording is off by default. If added, it requires explicit consent from all participants and a retention policy.

## Cloudflare R2 (files)

- Buckets per environment: private (attachments, uploads) and public (avatars, public resources behind `cdn.<domain>`).
- Uploads: the client asks the API for a presigned `PUT` URL (content type and size validated, expiry `STORAGE_SIGNED_URL_TTL_SECONDS`) → uploads directly to R2 → notifies the API → a `media` job verifies the object, re-encodes images with Sharp (strips metadata, generates sizes) and marks the file ready.
- Downloads from the private bucket always use presigned `GET` URLs after an authorisation check.
- Object keys are random (UUIDv7) and never contain user-supplied file names.

## Stripe (subscriptions)

- Stripe is the system of record for billing. Studipod mirrors plan and subscription state from webhooks for entitlement checks.
- Checkout via Stripe Checkout; self-service changes via the Stripe customer portal. Card data never reaches Studipod.
- Webhooks: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`. Verified with `STRIPE_WEBHOOK_SECRET`, deduplicated by event ID in `stripe_events`, processed in the `payments` queue.
- The Stripe API version is pinned in the wrapper so SDK upgrades are deliberate.

## Resend (email)

- All email is sent from the `email` queue, never inline in a request.
- Templates are versioned in the repository. Sender domain authenticated with SPF, DKIM and DMARC.
- Delivery webhooks (bounces, complaints) are verified with `RESEND_WEBHOOK_SECRET` and suppress further sends to bad addresses.

## Web Push and Firebase Cloud Messaging

- Browser push uses the standard Web Push protocol with VAPID keys (`web-push`). FCM (`firebase-admin`) is used for future native mobile apps and Android browsers where appropriate.
- Subscriptions and device tokens are stored per user and device and deleted when the push service reports them as expired (HTTP 404/410).
- Push payloads contain no sensitive content (for example "You have a new message", not the message text).
