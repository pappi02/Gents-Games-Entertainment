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
// Usage: node scripts/seed-media.mjs [game-slug ...]

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

const admin = createClient(env.NEXT_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_NOTE =
  "Provided directly by the business owner — provenance/license not independently verified. See supabase/seed-assets/LICENSES.md.";
const VENUE_NOTE = "Photographed at the venue, supplied by the business owner (October 2026).";
const COMMONS_NOTE = "Wikimedia Commons, free license — see supabase/seed-assets/LICENSES.md.";

const GAMES = [
  // Real photos of the venue (October 2026), so these go up with
  // is_placeholder = false and the site shows them without an
  // "Illustrative" label.
  {
    gameSlug: "pool",
    images: [
      { file: "venue/pool-table.webp", alt: "The pool table at the venue, racked and ready with two cues on the cloth.", note: VENUE_NOTE, real: true },
      { file: "venue/pool-rack.webp", alt: "A full rack of pool balls in the triangle, with cues resting on the table.", note: VENUE_NOTE, real: true },
      { file: "venue/pool-table-lounge.webp", alt: "The pool table in the lounge, with high-backed chairs and sofas behind it.", note: VENUE_NOTE, real: true },
    ],
  },
  {
    gameSlug: "chess",
    images: [
      { file: "venue/chess-board.webp", alt: "A chess set laid out for a new game on a round lounge table.", note: VENUE_NOTE, real: true },
      { file: "venue/chess-lounge-table.webp", alt: "A chess board set up on a marble side table beside a lounge chair.", note: VENUE_NOTE, real: true },
      { file: "venue/chess-board-side.webp", alt: "A chess set ready to play, seen from the side of the board.", note: VENUE_NOTE, real: true },
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
  // October 2026 leisure / entertainment / casino-style additions. These games
  // are draft + unverified, so the images stay private (game_media RLS only
  // exposes media on published games) until the owner confirms each one.
  {
    gameSlug: "mini-golf",
    images: [{ file: "mini-golf.webp", caption: "Photo: David Dugan, CC BY-SA 3.0, via Wikimedia Commons", alt: "A mini golf hole with a raised green and a numbered flag sign.", note: COMMONS_NOTE }],
  },
  {
    gameSlug: "swimming-pool",
    images: [{ file: "swimming-pool.webp", caption: "Photo: Bernard Gagnon, CC BY-SA 4.0, via Wikimedia Commons", alt: "An outdoor swimming pool with a tiled deck and loungers.", note: COMMONS_NOTE }],
  },
  {
    gameSlug: "live-band-salsa",
    images: [
      { file: "live-band-salsa.webp", caption: "Photo: Glen Bowman, CC BY 2.0, via Wikimedia Commons", alt: "A salsa band performs on stage while a couple dances in front.", note: COMMONS_NOTE },
      { file: "salsa-dancers.webp", caption: "Photo: Hilcias Salazar, CC BY 2.0, via Wikimedia Commons", alt: "Two salsa dancers in performance costume mid-routine.", note: COMMONS_NOTE },
    ],
  },
  {
    gameSlug: "roulette",
    images: [{ file: "roulette.webp", caption: "Photo: Håkan Dahlström, CC BY 2.0, via Wikimedia Commons", alt: "Close-up of a green roulette table layout.", note: COMMONS_NOTE }],
  },
  {
    gameSlug: "blackjack",
    images: [{ file: "blackjack.webp", alt: "Cards and chips dealt on a green blackjack table.", note: COMMONS_NOTE }],
  },
  {
    gameSlug: "poker",
    images: [{ file: "poker.webp", alt: "Stacks of coloured poker chips.", note: COMMONS_NOTE }],
  },
];

// Optional slug filter, so new games can be seeded without re-uploading
// everyone else's photos: node scripts/seed-media.mjs mini-golf roulette
const only = process.argv.slice(2);

for (const { gameSlug, images } of GAMES.filter((g) => only.length === 0 || only.includes(g.gameSlug))) {
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
        is_placeholder: !img.real,
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
      caption: img.caption ?? null,
      sort_order: sortOrder++,
    });
    if (linkErr) {
      console.log(`FAIL game_media ${game.name}: ${linkErr.message}`);
      continue;
    }

    console.log(`OK ${game.name} <- ${img.file} (${Math.round(buffer.length / 1024)} KB)`);
  }
}
