import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin is also independently authenticated (docs/SECURITY.md §2) —
      // this disallow is a courtesy to crawlers, not the security boundary.
      // Ticket and verify URLs carry private tokens. They also send noindex.
      disallow: ["/admin", "/tickets", "/verify", "/api", "/demo", "/demo-pay"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
