import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { primaryImage } from "@/lib/public/media";

export { publicImageUrl } from "@/lib/public/media";

/**
 * Public read helpers for the marketing site. Every function is a cached
 * Server Function ("use cache") using the anon client (src/lib/supabase/public.ts
 * — "use cache" forbids reading cookies, which the admin-aware client
 * needs). Caching relies entirely on RLS to filter to published/active rows
 * — there is exactly one place the facility-accuracy rule
 * (docs/PRODUCT_REQUIREMENTS.md §2) can be gotten wrong: the database —
 * and on cache tags being invalidated by every admin mutation (see the
 * `updateTag` calls in src/app/admin/(protected)/**\/actions.ts).
 */

export async function getPublishedCategories() {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("game_categories")
    .select("id, name, slug, description")
    .order("sort_order");
  return data ?? [];
}

export async function getCategoriesWithGameCounts() {
  "use cache";
  cacheTag("categories", "games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("game_categories")
    .select("id, name, slug, description, games(id, game_media(alt_text, sort_order, media_assets(storage_bucket, storage_path)))")
    .order("sort_order");
  // Each category's cover image is the primary photo of its first game that
  // has one — no separate category-image field to keep in sync.
  return (data ?? [])
    .filter((c) => (c.games as unknown[]).length > 0)
    .map(({ games, ...c }) => {
      const cover =
        (games as { game_media: unknown }[]).map((g) => primaryImage(g.game_media)).find(Boolean) ?? null;
      return { ...c, gameCount: (games as unknown[]).length, cover };
    });
}

export async function getFeaturedGames(limit = 6) {
  "use cache";
  cacheTag("games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("games")
    .select("id, name, slug, short_description, facility_status, game_categories(name, slug), game_media(alt_text, sort_order, media_assets(storage_bucket, storage_path))")
    .eq("featured", true)
    .limit(limit);
  return data ?? [];
}

export async function getGames({ category, q }: { category?: string; q?: string } = {}) {
  "use cache";
  cacheTag("games", "categories");
  cacheLife("hours");

  const supabase = createPublicClient();

  let categoryId: string | null = null;
  if (category) {
    const { data: cat } = await supabase.from("game_categories").select("id").eq("slug", category).single();
    if (!cat) return []; // Unknown/unpublished category slug — no results, not an error.
    categoryId = cat.id;
  }

  let query = supabase
    .from("games")
    .select("id, name, slug, short_description, facility_status, game_categories(id, name, slug), game_media(alt_text, sort_order, media_assets(storage_bucket, storage_path))")
    .order("name");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getGameBySlug(slug: string) {
  "use cache";
  cacheTag("games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data: game } = await supabase
    .from("games")
    .select(
      "*, game_categories(id, name, slug), pricing_options(amount_minor_units, currency, billing_unit, conditions, duration_minutes), game_media(alt_text, sort_order, media_assets(storage_bucket, storage_path))",
    )
    .eq("slug", slug)
    .single();

  return game ?? null;
}

export async function getRelatedGames(categoryId: string, excludeGameId: string, limit = 3) {
  "use cache";
  cacheTag("games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("games")
    .select("id, name, slug, short_description, game_media(alt_text, sort_order, media_assets(storage_bucket, storage_path))")
    .eq("category_id", categoryId)
    .neq("id", excludeGameId)
    .limit(limit);
  return data ?? [];
}

export async function getPublishedEvents() {
  "use cache";
  cacheTag("events");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").order("start_at");
  return data ?? [];
}

export async function getVenueSettings() {
  "use cache";
  cacheTag("venue-settings");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase.from("venue_settings").select("*").single();
  return data ?? null;
}
