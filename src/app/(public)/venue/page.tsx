import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import Image from "next/image";
import { getAllGames, getCategoriesWithGameCounts, getVenueSettings } from "@/lib/public/queries";
import { primaryImage } from "@/lib/public/media";
import { PageIntro } from "../_components/PageIntro";
import { CategoryGameName } from "../_components/CategoryGameName";
import { Icon } from "../_components/Icon";
import loungeWide from "@/assets/venue/lounge-pool-wide-landscape.webp";
import loungeThroneWide from "@/assets/venue/lounge-pool-throne-wide.webp";
import throneChairs from "@/assets/venue/throne-chairs-lounge-decanter.webp";
import loungeSofa from "@/assets/venue/lounge-sofa-throne-chairs.webp";
import poolFireplace from "@/assets/venue/pool-table-fireplace-lounge.webp";
import poolWindow from "@/assets/venue/pool-table-window-mirror.webp";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "The Venue",
  description:
    "The atmosphere, activities, and recreation spaces at The Gents Games & Entertainment in Kileleshwa, Nairobi.",
  alternates: { canonical: "/venue" },
  openGraph: pageOpenGraph("The Venue", "/venue"),
};

// Real photographs of the venue (owner, November 2026), shown ahead of the
// catalogue's game shots. Lead image first; the gallery grid gives it 2x2.
const venueShots = [
  { src: loungeThroneWide, alt: "The full lounge: the pool table, gold throne chairs and a white coffee table.", caption: "The lounge" },
  { src: throneChairs, alt: "Gold-trimmed throne chairs beside the sofa, with a decanter set on the coffee table.", caption: "Throne chairs" },
  { src: poolFireplace, alt: "The pool table racked and ready, with the fireplace wall and pink orchids behind.", caption: "By the fireplace" },
  { src: poolWindow, alt: "The pool table by the windows, with a tall plant and an arched mirror.", caption: "Window side" },
  { src: loungeSofa, alt: "A light sofa and throne chairs on the parquet floor of the lounge.", caption: "Seating" },
];

export default async function VenuePage() {
  const [categories, games, venue] = await Promise.all([
    getCategoriesWithGameCounts(),
    getAllGames(),
    getVenueSettings(),
  ]);

  // Gallery is assembled from the published catalogue, so swapping in real
  // venue photography (is_placeholder = false) updates it — and drops the
  // "illustrative" labels — without touching this layout.
  const gameShots = games
    .map((g) => ({ game: g, image: primaryImage(g.game_media) }))
    .filter((x): x is { game: (typeof games)[number]; image: NonNullable<ReturnType<typeof primaryImage>> } =>
      Boolean(x.image),
    )
    .slice(0, 3);

  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="The venue"
          title={
            <>
              Built for <span className="accent-serif">good</span> company
            </>
          }
          lede="Drop in on your own, bring friends, or challenge colleagues — there's always a game on, with friendly competition at its heart."
        >
          <p className="notice">
            <Icon name="info" />
            <span>
              Photos without a label were taken at the venue. Anything marked &quot;Illustrative&quot; shows the style
              we&apos;re going for, not the space itself, and will be replaced as we photograph more of it.
            </span>
          </p>
          <p className="notice">
            <Icon name="info" />
            <span>This is an 18+ venue. Valid photo ID is required at entry — no exceptions.</span>
          </p>
        </PageIntro>

        <section className="section theme-light" aria-labelledby="gallery-title">
          <div className="container">
            <h2 id="gallery-title" className="visually-hidden">
              Gallery
            </h2>
            <ul className="gallery reveal-group">
              <li>
                <figure>
                  <div className="media">
                    <Image
                      src={loungeWide}
                      placeholder="blur"
                      alt="The lounge at the venue: the pool table, sofas, the fireplace wall and the staircase behind."
                      fill
                      priority
                      sizes="(max-width: 899px) 100vw, 50vw"
                    />
                  </div>
                  <figcaption>The games lounge</figcaption>
                </figure>
              </li>
              {venueShots.map((shot) => (
                <li key={shot.caption}>
                  <figure>
                    <div className="media">
                      <Image src={shot.src} placeholder="blur" alt={shot.alt} fill sizes="(max-width: 899px) 50vw, 25vw" />
                    </div>
                    <figcaption>{shot.caption}</figcaption>
                  </figure>
                </li>
              ))}
              {gameShots.map(({ game, image }) => (
                <li key={game.id}>
                  <figure>
                    <div className="media">
                      <Image src={image.src} alt={image.alt} fill sizes="(max-width: 899px) 50vw, 25vw" />
                      {image.isPlaceholder && <span className="media-tag">Illustrative</span>}
                    </div>
                    <figcaption>
                      <Link href={`/games/${game.slug}`} className="text-link">
                        {game.name}
                      </Link>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="section theme-paper" aria-labelledby="available-title">
            <div className="container split split-top">
              <div className="stack">
                <p className="eyebrow">On site</p>
                <h2 id="available-title" className="display display-lg">
                  What you can play
                </h2>
                <p className="lede">
                  These are the activities currently published by the venue. Each game page shows its current status.
                </p>
                <div className="btn-row">
                  <Link href="/games" className="btn btn-inverse">
                    Explore all games
                  </Link>
                </div>
              </div>
              <ol className="category-index reveal-group">
                {categories.map((c, i) => (
                  <li key={c.id} className="category-row venue-category">
                    <span className="category-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="category-main">
                      <h3 className="display category-name venue-category-name">
                        <Link href={`/games?category=${c.slug}`}>{c.name}</Link>
                      </h3>
                      {c.description && <p className="category-desc">{c.description}</p>}
                      <ul className="category-games" aria-label={`${c.name} activities`}>
                        {c.games.map((g) => (
                          <CategoryGameName key={g.id} game={g} />
                        ))}
                      </ul>
                    </div>
                    <span className="category-arrow" aria-hidden="true">
                      <Icon name="arrowRight" />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="section theme-dark" aria-labelledby="visit-title">
          <div className="container cta-band">
            <div className="stack">
              <h2 id="visit-title" className="display display-md">
                Come and see it for yourself
              </h2>
              {venue && (
                <p className="muted">
                  {venue.address}
                  {venue.hours_note ? ` · ${venue.hours_note}` : ""}
                </p>
              )}
            </div>
            <div className="btn-row">
              <Link href="/visit" className="btn btn-primary">
                Plan your visit
              </Link>
              {venue?.map_url && (
                <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  <Icon name="pin" />
                  Directions<span className="visually-hidden"> (opens Google Maps)</span>
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
