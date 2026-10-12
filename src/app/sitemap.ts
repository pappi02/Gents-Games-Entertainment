import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * Only ever includes published content — relies on the same RLS-filtered
 * queries as the rest of the public site, so a draft game can never end up
 * in the sitemap. See docs/TESTING.md §6.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  // No individual /events/[slug] route exists yet (see docs/PHASE_6_STATUS.md
  // — carried over from Phase 5), so events aren't included here; adding a
  // /visit?event=slug enquiry URL would be a low-value, non-canonical page
  // per docs/TESTING.md §6, not a page worth indexing.
  const { data: games } = await supabase.from("games").select("slug, updated_at");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, priority: 1 },
    { url: `${siteUrl}/games`, priority: 0.9 },
    { url: `${siteUrl}/events`, priority: 0.6 },
    { url: `${siteUrl}/venue`, priority: 0.7 },
    { url: `${siteUrl}/groups`, priority: 0.6 },
    { url: `${siteUrl}/visit`, priority: 0.8 },
    { url: `${siteUrl}/privacy`, priority: 0.2 },
    { url: `${siteUrl}/terms`, priority: 0.2 },
    { url: `${siteUrl}/accessibility`, priority: 0.2 },
  ];

  const gameRoutes: MetadataRoute.Sitemap = (games ?? []).map((g) => ({
    url: `${siteUrl}/games/${g.slug}`,
    lastModified: g.updated_at ?? undefined,
    priority: 0.8,
  }));

  return [...staticRoutes, ...gameRoutes];
}
