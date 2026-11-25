# Accessibility standards

Target: **WCAG 2.2 Level AA** on every screen, on mobile and desktop, in the browser and
in the installed app. Accessibility is part of a feature's definition of done.

## Foundations already in place

- `lang` on `<html>` comes from the active locale (`en-GB`).
- Viewport allows zooming (no `maximum-scale`, no `user-scalable=no`).
- Root loading state uses `role="status"` with `aria-live="polite"`.
- Error boundary button has a visible focus ring and a 44 px minimum height.
- Global `prefers-reduced-motion` rule shortens animations and transitions.
- Safe-area padding keeps content clear of notches in the installed app.
- ESLint (`eslint-config-next`) includes `jsx-a11y` checks.
- shadcn/ui primitives are built on Radix, which handles focus management and ARIA for
  dialogs, menus, popovers and tabs.

## Rules for every screen

| Area             | Rule                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Structure        | One `<h1>` per page; headings in order; landmarks (`header`, `nav`, `main`, `footer`).                                 |
| Keyboard         | Everything works with the keyboard; visible focus; no traps; logical order; skip link.                                 |
| Targets          | Interactive targets at least 44 × 44 px (WCAG 2.5.8 minimum is 24 px; we use 44 for touch).                            |
| Colour           | Text contrast at least 4.5:1 (3:1 for large text and UI parts). Colour is never the only signal.                       |
| Forms            | Visible labels; errors linked with `aria-describedby`, announced, and focus moved to the first error.                  |
| Images and icons | Meaningful images have alt text from the message files; decorative ones `alt=""`; icon-only buttons have `aria-label`. |
| Dynamic content  | New messages, toasts and status changes are announced through polite live regions.                                     |
| Time limits      | Session-expiry warnings give time to extend; no content disappears without warning.                                    |
| Motion           | Respect `prefers-reduced-motion`; nothing flashes more than three times per second.                                    |
| Zoom and reflow  | Usable at 200% zoom and 320 px width without horizontal scrolling.                                                     |
| Authentication   | No cognitive tests; allow password managers and paste (WCAG 3.3.8).                                                    |

## Feature-specific notes

- **Video sessions:** labelled controls for camera, microphone, screen share and leave;
  announce participants joining or leaving; captions are a planned enhancement.
- **Messaging:** new messages announced without moving focus; message list is a proper list
  with sender and time for each item.
- **Calendar and availability:** grid navigation with arrow keys, and an equivalent list
  view; time zone shown next to times.
- **Offline state:** announced once through a polite live region, not repeated.

## Testing

- Automated: axe checks in Playwright journeys (add `@axe-core/playwright` with the first
  journey) and `jsx-a11y` lint rules.
- Manual for each feature: keyboard-only pass; VoiceOver (iOS Safari, macOS) and TalkBack
  (Android Chrome); NVDA on Windows for complex widgets; 200% zoom; reduced motion.
