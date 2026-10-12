import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const supabaseHostname = process.env.NEXT_SUPABASE_URL
  ? new URL(process.env.NEXT_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Lets next/image optimize game photos served from Supabase Storage.
    // See docs/TESTING.md §2 (responsive images, modern formats).
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
    // Serve AVIF where the browser supports it (smaller than WebP), WebP
    // otherwise. Optimized variants are cached for 30 days — source paths
    // change whenever an image is replaced, so long caching is safe.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    serverActions: {
      // Server Actions cap request bodies at 1 MB by default, which would
      // reject most phone photos before the admin media upload action even
      // runs. Matches the 5 MB limit enforced in that action and the
      // game-media bucket.
      bodySizeLimit: "5mb",
    },
  },
};

// Wraps the config to upload source maps and set tunneling, etc. Safe to
// keep even before a Sentry org/project exists — see docs/PHASE_1_STATUS.md.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
