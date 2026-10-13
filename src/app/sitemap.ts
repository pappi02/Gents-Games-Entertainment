import type { MetadataRoute } from "next";
import { getAllGames, getPublishedEvents } from "@/lib/public/queries";

/**
 * Only ever includes published content — built from the same cached,
 * RLS-filtered reads as the public pages, so a draft game or event can
 * never end up in the sitemap. See docs/TESTING.md §6.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_SITE_URL ?? "http://localhost:3000";
  const [games, events] = await Promise.all([getAllGames(), getPublishedEvents()]);

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

  const gameRoutes: MetadataRoute.Sitemap = games.map((g) => ({
    url: `${siteUrl}/games/${g.slug}`,
    lastModified: g.updated_at ?? undefined,
    priority: 0.8,
  }));

  // Upcoming events only — past events stay reachable but aren't promoted.
  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${siteUrl}/events/${e.slug}`,
    priority: 0.5,
  }));

  return [...staticRoutes, ...gameRoutes, ...eventRoutes];
}
