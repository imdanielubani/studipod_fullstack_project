# App icons

All icons are generated from one source image by `pnpm icons:generate`
(`infrastructure/scripts/generate-icons.mjs`) and committed.

| File                                | Size   | Purpose                                      | Mark height |
| ----------------------------------- | ------ | -------------------------------------------- | ----------- |
| `public/icons/icon-192.png`         | 192 px | Manifest `any`, Android, Windows, macOS      | 70%         |
| `public/icons/icon-512.png`         | 512 px | Manifest `any`, install dialogs, splash      | 70%         |
| `public/icons/maskable-192.png`     | 192 px | Manifest `maskable` (Android adaptive icons) | 50%         |
| `public/icons/maskable-512.png`     | 512 px | Manifest `maskable`                          | 50%         |
| `public/icons/apple-touch-icon.png` | 180 px | iOS/iPadOS home screen                       | 60%         |
| `public/favicon.ico`                | 48 px  | Browser tab                                  | 80%         |

Maskable icons keep the mark inside the central safe zone (a circle of 80% diameter), so
Android launchers can crop them to any shape. All icons use a white, opaque background.

## Source artwork

- Current source: `public/images/studipod-mark.png`, the "i" with the play symbol taken from
  the Studipod logo (`public/images/studipod-logo.png`). It is low resolution (255 px tall),
  so the 512 px icons are slightly soft.
- **Before launch**, replace it with final square-friendly artwork at least 1024 px tall
  (transparent PNG), then run `pnpm icons:generate` and commit the results.
- To generate from another file: `pnpm icons:generate path/to/mark.png`.

## Checks

- Chrome DevTools → Application → Manifest shows no icon warnings.
- Maskable preview (for example maskable.app) shows the mark uncropped in a circle.
- The iOS home-screen icon has no transparent areas (iOS would fill them with black).
