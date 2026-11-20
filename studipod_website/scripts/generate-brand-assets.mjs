/**
 * Generates optimised brand assets from the source logo and the SVG brand mark.
 *
 *   npm run brand:assets
 *
 * Outputs:
 *   public/logo/studipod-logo.png  – trimmed wordmark, 880px wide (2x of max rendered width)
 *   src/app/favicon.ico            – 16/32/48px PNG-in-ICO favicon
 *   src/app/apple-icon.png         – 180px touch icon
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_SOURCE = path.join(root, "design/brand/studipod-logo-cropped.png");
const MARK_SOURCE = path.join(root, "src/app/icon.svg");

/** Pack PNG buffers into a single .ico container (PNG-compressed entries). */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

async function main() {
  await sharp(LOGO_SOURCE)
    .trim()
    .resize({ width: 880 })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(path.join(root, "public/logo/studipod-logo.png"));

  const mark = await readFile(MARK_SOURCE);
  const icoImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await sharp(mark, { density: 384 }).resize(size, size).png().toBuffer(),
    })),
  );
  await writeFile(path.join(root, "src/app/favicon.ico"), packIco(icoImages));

  await sharp(mark, { density: 768 })
    .resize(180, 180)
    .flatten({ background: "#172554" })
    .png()
    .toFile(path.join(root, "src/app/apple-icon.png"));

  console.warn("Brand assets generated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
