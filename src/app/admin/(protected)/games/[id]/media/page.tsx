import { createClient } from "@/lib/supabase/server";
import { uploadGameMedia, deleteGameMedia } from "./actions";
import { notFound } from "next/navigation";

export default async function GameMediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: game } = await supabase.from("games").select("id, name").eq("id", id).single();
  if (!game) notFound();

  const { data: media } = await supabase
    .from("game_media")
    .select("id, alt_text, media_assets(id, storage_bucket, storage_path, is_placeholder)")
    .eq("game_id", id)
    .order("sort_order");

  return (
    <div>
      <h1>Media — {game.name}</h1>
      {error && <p className="admin-auth-error">{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
        {(media ?? []).map((m) => {
          const asset = m.media_assets as unknown as {
            id: string;
            storage_bucket: string;
            storage_path: string;
            is_placeholder: boolean;
          } | null;
          if (!asset) return null;
          const { data: publicUrl } = supabase.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path);
          return (
            <div key={m.id} style={{ background: "white", padding: "0.75rem", borderRadius: 6, width: 180 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl.publicUrl} alt={m.alt_text ?? ""} loading="lazy" decoding="async" style={{ width: "100%", borderRadius: 4 }} />
              <p style={{ fontSize: "0.8rem", margin: "0.4rem 0" }}>
                {asset.is_placeholder ? <span className="admin-badge admin-badge-draft">placeholder</span> : null}
              </p>
              <form action={deleteGameMedia.bind(null, id, m.id, asset.id)}>
                <button type="submit">Remove</button>
              </form>
            </div>
          );
        })}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Upload image</h2>
      <form action={uploadGameMedia.bind(null, id)} className="admin-form" encType="multipart/form-data">
        <label htmlFor="file">Image (JPEG/PNG/WebP, max 5 MB — automatically resized and compressed to WebP)</label>
        <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />

        <label htmlFor="alt_text">Alt text</label>
        <input id="alt_text" name="alt_text" placeholder="Describe the image for accessibility" />

        <label>
          <input type="checkbox" name="is_placeholder" defaultChecked style={{ marginRight: "0.4rem" }} />
          This is a stock/placeholder image (per docs/PHASE_0_DISCOVERY.md §5)
        </label>

        <button type="submit">Upload</button>
      </form>
    </div>
  );
}
