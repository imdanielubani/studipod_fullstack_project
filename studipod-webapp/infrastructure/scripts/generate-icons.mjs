/**
 * Generates the PWA, Apple and favicon icons from the brand mark.
 *
 *   pnpm icons:generate [path/to/mark.png]
 *
 * Default source: public/images/studipod-mark.png (transparent background). Replace it
 * with final high-resolution artwork (at least 1024 px tall) and run the script again;
 * every generated file is committed. Sizes and purposes: docs/pwa/icons.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SOURCE = path.resolve(ROOT, process.argv[2] ?? 'public/images/studipod-mark.png');
const ICONS_DIR = path.join(ROOT, 'public/icons');
const BACKGROUND = '#ffffff';

/** `markScale` is the mark's height as a share of the icon; maskable icons keep the 80% safe zone. */
const ICONS = [
  { file: 'icon-192.png', size: 192, markScale: 0.7 },
  { file: 'icon-512.png', size: 512, markScale: 0.7 },
  { file: 'maskable-192.png', size: 192, markScale: 0.5 },
  { file: 'maskable-512.png', size: 512, markScale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, markScale: 0.6 },
];
const FAVICON_SIZE = 48;

async function renderIcon(size, markScale) {
  const mark = await sharp(SOURCE)
    .resize({ height: Math.round(size * markScale), kernel: 'lanczos3' })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Wraps one PNG image in an ICO container (PNG-in-ICO is supported by all current browsers). */
function toIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const { file, size, markScale } of ICONS) {
    await writeFile(path.join(ICONS_DIR, file), await renderIcon(size, markScale));
    console.log(`icons/${file}`);
  }

  const faviconPng = await renderIcon(FAVICON_SIZE, 0.8);
  await writeFile(path.join(ROOT, 'public/favicon.ico'), toIco(faviconPng, FAVICON_SIZE));
  console.log('favicon.ico');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
