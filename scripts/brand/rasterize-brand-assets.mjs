// Rasterizes the SVGs written by generate-brand-assets.py into the bitmap
// files browsers and platforms still expect. Run after the Python step:
//   node scripts/brand/rasterize-brand-assets.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = (p) => path.join(root, "scripts/brand/.out", p);
const out = (p) => path.join(root, p);

async function png(svgPath, width) {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: 1200 }).resize({ width }).png({ compressionLevel: 9 }).toBuffer();
}

// ICO container holding PNG-encoded images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const icoImages = await Promise.all(sizes.map(async (size) => ({ size, data: await png(src("favicon.svg"), size) })));
await writeFile(out("src/app/favicon.ico"), ico(icoImages));
await writeFile(out("src/app/apple-icon.png"), await png(src("apple-icon.svg"), 180));

await writeFile(out("public/brand/gents-mark.png"), await png(out("public/brand/gents-mark.svg"), 512));
await writeFile(out("public/brand/gents-logo.png"), await png(out("public/brand/gents-logo.svg"), 1200));
await writeFile(out("public/brand/gents-logo-reverse.png"), await png(out("public/brand/gents-logo-reverse.svg"), 1200));

console.log("wrote favicon.ico, apple-icon.png and PNG logos");
