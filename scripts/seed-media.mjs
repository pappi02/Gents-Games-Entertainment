// (Re)seeds the catalogue's game photos from supabase/seed-assets/ into the
// game-media Storage bucket. For each game below, existing media rows AND
// their storage objects are removed first, so re-running this never leaves
// orphaned files behind. Images are expected to already be compressed
// WebP (see scripts/optimize-images.mjs).
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS — an
// ops script, never run from the app). Provenance/licensing per image is
// recorded in supabase/seed-assets/LICENSES.md.
//
// Usage: node scripts/seed-media.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local — aborting.");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_NOTE =
  "Provided directly by the business owner — provenance/license not independently verified. See supabase/seed-assets/LICENSES.md.";
const COMMONS_NOTE = "Wikimedia Commons, free license — see supabase/seed-assets/LICENSES.md.";

const GAMES = [
  {
    gameSlug: "pool",
    images: [
      { file: "owner-provided/pool-room.webp", alt: "A moody, upscale pool room with a table set up for play.", note: OWNER_NOTE },
      { file: "owner-provided/pool-bar.webp", alt: "A pool table racked and ready, cue resting on the rail.", note: OWNER_NOTE },
    ],
  },
  {
    gameSlug: "chess",
    images: [
      { file: "owner-provided/chess-lounge.webp", alt: "Two chess tables set up in a lounge seating area.", note: OWNER_NOTE },
      { file: "owner-provided/chess-room.webp", alt: "An elegant games room with a chess table at its center.", note: OWNER_NOTE },
    ],
  },
  {
    gameSlug: "cards",
    images: [
      { file: "owner-provided/games-spread.webp", alt: "A spread of playing cards, dice, and tabletop games.", note: OWNER_NOTE },
    ],
  },
  {
    gameSlug: "table-tennis",
    images: [
      { file: "owner-provided/table-tennis-clean.webp", alt: "A table tennis table set up with paddles and a ball.", note: OWNER_NOTE },
    ],
  },
  {
    gameSlug: "darts",
    images: [{ file: "darts.webp", alt: "Darts embedded in a dartboard.", note: COMMONS_NOTE }],
  },
];

for (const { gameSlug, images } of GAMES) {
  const { data: game, error: gameErr } = await admin.from("games").select("id, name").eq("slug", gameSlug).single();
  if (gameErr || !game) {
    console.log(`SKIP ${gameSlug}: game not found (${gameErr?.message ?? "no row"})`);
    continue;
  }

  const { data: existing } = await admin
    .from("game_media")
    .select("id, media_asset_id, media_assets(storage_bucket, storage_path)")
    .eq("game_id", game.id);

  for (const m of existing ?? []) {
    await admin.from("game_media").delete().eq("id", m.id);
    await admin.from("media_assets").delete().eq("id", m.media_asset_id);
    if (m.media_assets) {
      await admin.storage.from(m.media_assets.storage_bucket).remove([m.media_assets.storage_path]);
    }
  }

  let sortOrder = 0;
  for (const img of images) {
    const buffer = fs.readFileSync(path.join(root, "supabase", "seed-assets", img.file));
    const storagePath = `${game.id}/${path.basename(img.file)}`;

    const { error: uploadErr } = await admin.storage.from("game-media").upload(storagePath, buffer, {
      contentType: "image/webp",
      cacheControl: "31536000", // a year: paths change whenever the image does
      upsert: true,
    });
    if (uploadErr) {
      console.log(`FAIL upload ${game.name} (${img.file}): ${uploadErr.message}`);
      continue;
    }

    const { data: asset, error: assetErr } = await admin
      .from("media_assets")
      .insert({
        storage_bucket: "game-media",
        storage_path: storagePath,
        mime_type: "image/webp",
        size_bytes: buffer.length,
        is_placeholder: true,
        license_note: img.note,
      })
      .select("id")
      .single();
    if (assetErr || !asset) {
      console.log(`FAIL media_assets ${game.name}: ${assetErr?.message}`);
      continue;
    }

    const { error: linkErr } = await admin.from("game_media").insert({
      game_id: game.id,
      media_asset_id: asset.id,
      alt_text: img.alt,
      sort_order: sortOrder++,
    });
    if (linkErr) {
      console.log(`FAIL game_media ${game.name}: ${linkErr.message}`);
      continue;
    }

    console.log(`OK ${game.name} <- ${img.file} (${Math.round(buffer.length / 1024)} KB)`);
  }
}
