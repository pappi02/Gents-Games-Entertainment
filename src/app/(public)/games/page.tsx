import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGames, getPublishedCategories } from "@/lib/public/queries";
import { GameCard } from "../GameCard";

export const metadata: Metadata = {
  title: "Explore Games",
  description: "Browse the games and recreation activities available at The Gents Games & Entertainment.",
  // Canonicalizes every ?category=/?q= filter combination to the plain
  // listing page — filtered views are useful to visitors but shouldn't be
  // indexed as separate pages. See docs/TESTING.md §6.
  alternates: { canonical: "/games" },
};

type GamesSearchParams = Promise<{ category?: string; q?: string }>;

// The page shell never awaits searchParams; the filters and results depend
// on the URL, so they stream inside <Suspense> while the heading renders
// immediately from the static shell.
export default function GamesPage({ searchParams }: { searchParams: GamesSearchParams }) {
  return (
    <main id="main-content" className="section section-light">
      <div className="container">
        <h1>Explore Games</h1>
        <Suspense fallback={<div style={{ minHeight: 480 }} aria-busy="true" />}>
          <GamesCatalog searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function GamesCatalog({ searchParams }: { searchParams: GamesSearchParams }) {
  const { category, q } = await searchParams;
  const [games, categories] = await Promise.all([getGames({ category, q }), getPublishedCategories()]);

  return (
    <>
      <form method="get" style={{ margin: "1.5rem 0" }}>
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search games…"
          className="search-input"
          aria-label="Search games"
        />
      </form>

      <div className="filter-bar">
        <Link href={buildUrl(undefined, q)} className={`filter-chip ${!category ? "active" : ""}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={buildUrl(c.slug, q)} className={`filter-chip ${category === c.slug ? "active" : ""}`}>
            {c.name}
          </Link>
        ))}
      </div>

      {games.length === 0 ? (
        <p className="empty-state">
          No games match your search yet. Try a different keyword or category, or{" "}
          <Link href="/games" style={{ textDecoration: "underline" }}>
            view all games
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-3">
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} priority={i < 3} />
          ))}
        </div>
      )}
    </>
  );
}

function buildUrl(category?: string, q?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}
