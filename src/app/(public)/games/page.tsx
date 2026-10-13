import { Suspense, ViewTransition } from "react";
import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import Image from "next/image";
import { getAllGames, getCategoriesWithGameCounts, getGames } from "@/lib/public/queries";
import { GameCard } from "../_components/GameCard";
import { PageIntro } from "../_components/PageIntro";
import { PageTransition } from "../_components/PageTransition";
import { LinkPending } from "../_components/LinkPending";
import { SearchBox } from "../_components/SearchBox";
import { CategoryGlyph } from "../_components/CategoryGlyph";
import { Icon } from "../_components/Icon";

export const metadata: Metadata = {
  title: "Explore Games",
  description:
    "Browse the games and recreation at The Gents Games & Entertainment — cue sports, strategy and card games, table tennis, darts and more.",
  // Canonicalizes every ?category=/?q= filter combination to the plain
  // listing page — filtered views are useful to visitors but shouldn't be
  // indexed as separate pages. See docs/TESTING.md §6.
  alternates: { canonical: "/games" },
  openGraph: pageOpenGraph("Explore Games", "/games"),
};

type GamesSearchParams = Promise<{ category?: string | string[]; q?: string | string[] }>;

// The page shell never awaits searchParams; the filters and results depend
// on the URL, so they stream inside <Suspense> while the heading renders
// immediately from the static shell.
export default function GamesPage({ searchParams }: { searchParams: GamesSearchParams }) {
  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="The catalogue"
          title={
            <>
              Explore <span className="accent-serif">the</span> games
            </>
          }
          lede="Every game listed here is published by the venue, with its current status on each card. Search by name or pick a category."
        />
        <div className="container catalog-body">
          <Suspense fallback={<CatalogSkeleton />}>
            <GamesCatalog searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </PageTransition>
  );
}

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

async function GamesCatalog({ searchParams }: { searchParams: GamesSearchParams }) {
  const params = await searchParams;
  const category = first(params.category);
  const q = first(params.q)?.slice(0, 80);

  const [games, categories, all] = await Promise.all([
    getGames({ category, q }),
    // Only categories that actually hold a published game are offered as filters.
    getCategoriesWithGameCounts(),
    getAllGames(),
  ]);

  const matchingQuery = q ? await getGames({ q }) : all;
  const counts = new Map<string, number>();
  for (const g of matchingQuery) {
    const slug = g.game_categories?.slug;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const activeCategory = categories.find((c) => c.slug === category) ?? null;
  const unknownCategory = Boolean(category && !activeCategory);

  return (
    <>
      <div className="catalog-toolbar">
        <SearchBox q={q ?? ""} category={category ?? null} />

        <nav aria-label="Game categories">
          <ul className="chip-scroller">
            <li>
              <Link
                href={buildUrl(undefined, q)}
                className="chip"
                aria-current={!category ? "page" : undefined}
                scroll={false}
              >
                All <span className="chip-count">{matchingQuery.length}</span>
                <LinkPending />
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={buildUrl(c.slug, q)}
                  className="chip"
                  aria-current={category === c.slug ? "page" : undefined}
                  scroll={false}
                >
                  <CategoryGlyph slug={c.slug} className="glyph chip-glyph" />
                  {c.name} <span className="chip-count">{counts.get(c.slug) ?? 0}</span>
                  <LinkPending />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {activeCategory && (
        <ViewTransition key={activeCategory.slug} enter="swap" exit="swap" default="none">
          <section className="category-banner theme-dark" aria-label={`${activeCategory.name} category`}>
            <div className="category-banner-copy">
              <CategoryGlyph slug={activeCategory.slug} />
              <div>
                <h2 className="display">{activeCategory.name}</h2>
                {activeCategory.description && <p className="muted">{activeCategory.description}</p>}
              </div>
            </div>
            {activeCategory.cover && (
              <div className="media category-banner-media">
                <Image src={activeCategory.cover.src} alt="" fill sizes="(max-width: 899px) 100vw, 40vw" />
              </div>
            )}
          </section>
        </ViewTransition>
      )}

      <div className="result-bar">
        <p role="status">
          {unknownCategory ? (
            <>That category isn&apos;t available.</>
          ) : (
            <>
              <strong>
                {games.length} {games.length === 1 ? "game" : "games"}
              </strong>
              {activeCategory && <> in {activeCategory.name}</>}
              {q && <> matching “{q}”</>}
            </>
          )}
        </p>
        {(category || q) && (
          <Link href="/games" className="arrow-link" scroll={false}>
            <Icon name="close" /> Clear filters
          </Link>
        )}
      </div>

      {games.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" className="panel-icon" />
          <h2>{unknownCategory ? "Category not found" : "Nothing on that table"}</h2>
          <p>
            {unknownCategory
              ? "This category isn't currently listed. Browse the full catalogue instead."
              : q
                ? `Nothing matched “${q}”${activeCategory ? ` in ${activeCategory.name}` : ""}. Try a different word, or one of these:`
                : "There are no published games in this category right now."}
          </p>
          {q && !unknownCategory && all.length > 0 && (
            <ul className="category-games" aria-label="All games">
              {all.map((g) => (
                <li key={g.id} className="suggestion">
                  <Link href={`/games/${g.slug}`}>{g.name}</Link>
                </li>
              ))}
            </ul>
          )}
          <div className="btn-row">
            {q && category && !unknownCategory && (
              <Link href={buildUrl(undefined, q)} className="btn btn-secondary">
                Search all categories
              </Link>
            )}
            <Link href="/games" className="btn btn-inverse">
              View all games
            </Link>
            <Link href="/visit#enquiry" className="btn btn-secondary">
              Ask us
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {games.map((g, i) => (
            // Each card keeps its identity across filter changes, so staying
            // cards glide to their new slot while others scale in/out.
            <ViewTransition
              key={g.id}
              name={`card-${g.slug}`}
              update="card"
              share="card"
              enter="card-in"
              exit="card-out"
              default="none"
            >
              <div className="card-slot">
                <GameCard game={g} priority={i < 3} headingLevel="h2" />
              </div>
            </ViewTransition>
          ))}
        </div>
      )}
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading games">
      <div className="catalog-toolbar">
        <div className="skeleton skeleton-bar" />
        <div className="skeleton skeleton-bar" />
      </div>
      <div className="card-grid">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}

function buildUrl(category?: string, q?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}
