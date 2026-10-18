import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { GAME_MEDIA_EMBED, primaryImage } from "@/lib/public/media";

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

/**
 * Defence in depth on top of RLS for every public game read:
 *   * an `unverified` game is never public, even if it was published by
 *     mistake (the admin save action also refuses that combination);
 *   * `game_categories!inner` drops a published game whose category isn't
 *     published (RLS hides the category, so the inner join hides the game),
 *     so a card or page can never appear without its category.
 */
const PUBLIC_FACILITY_FILTER = "(available,coming_soon,unavailable)";

/**
 * The one column list every game card is built from — catalogue, featured,
 * related, and category listings all share it so a card can never show a
 * different status or description depending on where it appears.
 */
const GAME_CARD_SELECT = `id, name, slug, short_description, facility_status, category_id, updated_at, game_categories!inner(id, name, slug), ${GAME_MEDIA_EMBED}`;

export type PublicGameCard = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  facility_status: string;
  category_id: string;
  updated_at: string | null;
  game_categories: { id: string; name: string; slug: string } | null;
  game_media: unknown;
};

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

/** Published categories that contain at least one published game, with those games' names and a cover image. */
export async function getCategoriesWithGameCounts() {
  "use cache";
  cacheTag("categories", "games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("game_categories")
    .select(`id, name, slug, description, games(id, name, slug, facility_status, ${GAME_MEDIA_EMBED})`)
    .order("sort_order");

  type EmbeddedGame = { id: string; name: string; slug: string; facility_status: string; game_media: unknown };
  // Each category's cover image is the primary photo of its first game that
  // has one — no separate category-image field to keep in sync. A category
  // with no public game is dropped, so the site never shows an empty one.
  return (data ?? [])
    .map(({ games, ...c }) => ({
      ...c,
      games: ((games as EmbeddedGame[]) ?? [])
        .filter((g) => g.facility_status !== "unverified")
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((c) => c.games.length > 0)
    .map(({ games, ...c }) => ({
      ...c,
      gameCount: games.length,
      games: games.map(({ id, name, slug, facility_status }) => ({ id, name, slug, facility_status })),
      cover: games.map((g) => primaryImage(g.game_media)).find(Boolean) ?? null,
    }));
}

export async function getFeaturedGames(limit = 6): Promise<PublicGameCard[]> {
  "use cache";
  cacheTag("games", "categories");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("games")
    .select(GAME_CARD_SELECT)
    .eq("featured", true)
    .filter("facility_status", "in", PUBLIC_FACILITY_FILTER)
    .order("name")
    .limit(limit);
  return (data as unknown as PublicGameCard[]) ?? [];
}

/** Every published game — the catalogue is small, so filtering happens in memory over one cache entry. */
export async function getAllGames(): Promise<PublicGameCard[]> {
  "use cache";
  cacheTag("games", "categories");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("games")
    .select(GAME_CARD_SELECT)
    .filter("facility_status", "in", PUBLIC_FACILITY_FILTER)
    .order("name");
  return (data as unknown as PublicGameCard[]) ?? [];
}

/**
 * Catalogue search: case-insensitive match on name, short description, or
 * category name, combined (AND) with an optional category slug. Runs over
 * RLS-filtered published rows only, so drafts can never match.
 */
export async function getGames({ category, q }: { category?: string; q?: string } = {}) {
  const games = await getAllGames();
  const needle = q?.trim().toLocaleLowerCase();
  return games.filter((g) => {
    if (category && g.game_categories?.slug !== category) return false;
    if (!needle) return true;
    return [g.name, g.short_description, g.game_categories?.name ?? ""].some((s) =>
      s.toLocaleLowerCase().includes(needle),
    );
  });
}

export async function getGameBySlug(slug: string) {
  "use cache";
  cacheTag("games", "categories");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data: game } = await supabase
    .from("games")
    .select(
      `*, game_categories!inner(id, name, slug), pricing_options(id, amount_minor_units, currency, billing_unit, conditions, duration_minutes), ${GAME_MEDIA_EMBED}`,
    )
    .eq("slug", slug)
    .filter("facility_status", "in", PUBLIC_FACILITY_FILTER)
    .maybeSingle();

  return game ?? null;
}

/** Same-category games first, topped up with other published games so every detail page has somewhere to go next. */
export async function getRelatedGames(categoryId: string | null, excludeGameId: string, limit = 3) {
  const others = (await getAllGames()).filter((g) => g.id !== excludeGameId);
  const same = others.filter((g) => g.category_id === categoryId);
  const rest = others.filter((g) => g.category_id !== categoryId);
  return [...same, ...rest].slice(0, limit);
}

// An event without an end time stays listed for a few hours after it starts,
// so it doesn't vanish the moment doors open.
const EVENT_GRACE_MS = 6 * 60 * 60 * 1000;

/** Published events that haven't finished yet, soonest first. */
export async function getPublishedEvents() {
  "use cache";
  cacheTag("events");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").order("start_at");
  const now = Date.now();
  return (data ?? []).filter((e) =>
    e.end_at ? new Date(e.end_at).getTime() >= now : new Date(e.start_at).getTime() + EVENT_GRACE_MS >= now,
  );
}

export async function getEventBySlug(slug: string) {
  "use cache";
  cacheTag("events");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export type PublicMembershipTier = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string | null;
  benefits: string[];
  /** Null unless the owner has confirmed the fees — never render a guessed price. */
  fees: { currency: string; subscription: number; billingPeriod: string; joiningFee: number | null } | null;
  /** `comingSoon` when none of the category's public games is playable yet. */
  categories: { name: string; slug: string; comingSoon: boolean }[];
};

/**
 * Published membership tiers, in display order. Fees are only returned when
 * `fees_confirmed` is set (same rule as pricing_options.is_active), and a
 * tier's included categories are limited to published categories that hold
 * at least one public game — so a tier can never advertise access to an
 * unconfirmed facility.
 */
export async function getPublishedMembershipTiers(): Promise<PublicMembershipTier[]> {
  "use cache";
  cacheTag("membership", "categories", "games");
  cacheLife("hours");

  const supabase = createPublicClient();
  const [{ data: tiers }, categories] = await Promise.all([
    supabase
      .from("membership_tiers")
      .select(
        "id, name, slug, summary, description, benefits, currency, subscription_minor_units, billing_period, joining_fee_minor_units, fees_confirmed, membership_tier_categories(category_id)",
      )
      .order("sort_order"),
    getCategoriesWithGameCounts(),
  ]);

  return (tiers ?? []).map((t) => {
    const included = new Set(
      ((t.membership_tier_categories as { category_id: string }[] | null) ?? []).map((l) => l.category_id),
    );
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      summary: t.summary,
      description: t.description,
      benefits: (t.benefits ?? "")
        .split("\n")
        .map((b: string) => b.trim())
        .filter(Boolean),
      fees:
        t.fees_confirmed && t.subscription_minor_units !== null
          ? {
              currency: t.currency,
              subscription: Number(t.subscription_minor_units),
              billingPeriod: t.billing_period,
              joiningFee: t.joining_fee_minor_units === null ? null : Number(t.joining_fee_minor_units),
            }
          : null,
      categories: categories
        .filter((c) => included.has(c.id))
        .map(({ name, slug, games }) => ({
          name,
          slug,
          comingSoon: !games.some((g) => g.facility_status === "available"),
        })),
    };
  });
}

export async function getMembershipTierBySlug(slug: string) {
  return (await getPublishedMembershipTiers()).find((t) => t.slug === slug) ?? null;
}

export async function getVenueSettings() {
  "use cache";
  cacheTag("venue-settings");
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data } = await supabase.from("venue_settings").select("*").single();
  return data ?? null;
}
