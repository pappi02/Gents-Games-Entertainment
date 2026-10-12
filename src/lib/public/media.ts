type MediaRow = {
  alt_text: string | null;
  sort_order: number;
  media_assets: { storage_bucket: string; storage_path: string } | null;
};

export function publicImageUrl(bucket: string, path: string) {
  // Build a public URL without a network round-trip — the game-media
  // bucket's SELECT policy is public (docs/PHASE_3_STATUS.md), so this URL
  // format is stable and doesn't need a signed token.
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** First image (by sort_order) from a `game_media` embed, or null when there is none. */
export function primaryImage(gameMedia: unknown): { src: string; alt: string } | null {
  const rows = ((gameMedia as MediaRow[] | null) ?? [])
    .filter((m) => m.media_assets)
    .sort((a, b) => a.sort_order - b.sort_order);
  const first = rows[0];
  if (!first?.media_assets) return null;
  return {
    src: publicImageUrl(first.media_assets.storage_bucket, first.media_assets.storage_path),
    alt: first.alt_text ?? "",
  };
}
