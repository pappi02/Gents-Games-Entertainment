type MediaRow = {
  alt_text: string | null;
  caption?: string | null;
  sort_order: number;
  media_assets: { storage_bucket: string; storage_path: string; is_placeholder?: boolean | null } | null;
};

export type PublicImage = { src: string; alt: string; caption: string | null; isPlaceholder: boolean };

/** PostgREST embed for a game's media, shared by every public query. */
export const GAME_MEDIA_EMBED =
  "game_media(alt_text, caption, sort_order, media_assets(storage_bucket, storage_path, is_placeholder))";

export function publicImageUrl(bucket: string, path: string) {
  // Build a public URL without a network round-trip — the game-media
  // bucket's SELECT policy is public (docs/PHASE_3_STATUS.md), so this URL
  // format is stable and doesn't need a signed token.
  return `${process.env.NEXT_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** All images from a `game_media` embed, ordered by sort_order. */
export function gameImages(gameMedia: unknown): PublicImage[] {
  return ((gameMedia as MediaRow[] | null) ?? [])
    .filter((m) => m.media_assets)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      src: publicImageUrl(m.media_assets!.storage_bucket, m.media_assets!.storage_path),
      alt: m.alt_text ?? "",
      caption: m.caption ?? null,
      // Treat a missing flag as a placeholder — never imply a photo is of
      // the real venue unless it's explicitly marked as such.
      isPlaceholder: m.media_assets!.is_placeholder !== false,
    }));
}

/** First image (by sort_order) from a `game_media` embed, or null when there is none. */
export function primaryImage(gameMedia: unknown): PublicImage | null {
  return gameImages(gameMedia)[0] ?? null;
}
