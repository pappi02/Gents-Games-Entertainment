import type { Metadata } from "next";

/**
 * Next replaces (doesn't merge) a page's `openGraph` object with the
 * parent's, so a page that sets its own OG title would otherwise lose the
 * site-wide share image. Every static public page builds its OG block here.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "The Gents Games & Entertainment — games and recreation in Nairobi",
};

export function pageOpenGraph(title: string, path: string, description?: string): Metadata["openGraph"] {
  return { title, url: path, ...(description ? { description } : {}), images: [DEFAULT_OG_IMAGE] };
}
