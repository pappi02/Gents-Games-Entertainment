"use server";

import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadGameMedia(gameId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const altText = String(formData.get("alt_text") ?? "").trim();
  const isPlaceholder = formData.get("is_placeholder") === "on";

  if (!file || file.size === 0) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent("Choose a file.")}`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent("Unsupported file type.")}`);
  }
  if (file.size > MAX_BYTES) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent("File too large (max 5 MB).")}`);
  }

  const supabase = await createClient();

  // Re-encode every upload server-side: caps width at 1600px, strips
  // EXIF (including any GPS location embedded by phone cameras — docs/
  // SECURITY.md §4), and stores compressed WebP. Decoding with sharp also
  // rejects files whose bytes aren't really an image, regardless of the
  // MIME type the browser claimed.
  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent("That file isn't a readable image.")}`);
  }

  // Server-generated storage path — never trust the client's filename.
  const storagePath = `${gameId}/${crypto.randomUUID()}.webp`;

  const { error: uploadErr } = await supabase.storage.from("game-media").upload(storagePath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });

  if (uploadErr) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent(uploadErr.message)}`);
  }

  const { data: asset, error: assetErr } = await supabase
    .from("media_assets")
    .insert({
      storage_bucket: "game-media",
      storage_path: storagePath,
      mime_type: "image/webp",
      size_bytes: optimized.length,
      is_placeholder: isPlaceholder,
    })
    .select("id")
    .single();

  if (assetErr || !asset) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent(assetErr?.message ?? "Failed to save media record.")}`);
  }

  const { data: existing } = await supabase
    .from("game_media")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  const { error: linkErr } = await supabase.from("game_media").insert({
    game_id: gameId,
    media_asset_id: asset.id,
    alt_text: altText || null,
    sort_order: existing ? 0 : 0,
  });

  if (linkErr) {
    redirect(`/admin/games/${gameId}/media?error=${encodeURIComponent(linkErr.message)}`);
  }

  revalidatePath(`/admin/games/${gameId}/media`);
  updateTag("games");
  redirect(`/admin/games/${gameId}/media`);
}

export async function deleteGameMedia(gameId: string, gameMediaId: string, mediaAssetId: string) {
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("media_assets")
    .select("storage_bucket, storage_path")
    .eq("id", mediaAssetId)
    .single();

  await supabase.from("game_media").delete().eq("id", gameMediaId);
  await supabase.from("media_assets").delete().eq("id", mediaAssetId);

  if (asset) {
    await supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);
  }

  revalidatePath(`/admin/games/${gameId}/media`);
  updateTag("games");
}
