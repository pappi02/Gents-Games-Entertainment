// Compresses the repo's source images in place: resizes to at most 1600px
// wide (never upscales), strips EXIF/metadata, and re-encodes as WebP.
// The original .jpg is deleted once its .webp is written.
//
// Usage: node scripts/optimize-images.mjs

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DIRS = ["supabase/seed-assets", "supabase/seed-assets/owner-provided", "src/assets"];
const MAX_WIDTH = 1600;
const QUALITY = 78;

let before = 0;
let after = 0;

for (const dir of DIRS) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;

  for (const name of fs.readdirSync(abs)) {
    if (!/\.(jpe?g|png|jfif)$/i.test(name)) continue;
    const src = path.join(abs, name);
    const dest = src.replace(/\.(jpe?g|png|jfif)$/i, ".webp");

    const input = fs.readFileSync(src);
    const output = await sharp(input)
      .rotate() // honor EXIF orientation before metadata is stripped
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();

    fs.writeFileSync(dest, output);
    fs.unlinkSync(src);

    before += input.length;
    after += output.length;
    console.log(`${path.join(dir, name)}: ${kb(input.length)} -> ${kb(output.length)}`);
  }
}

console.log(`\nTotal: ${kb(before)} -> ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`);

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}
