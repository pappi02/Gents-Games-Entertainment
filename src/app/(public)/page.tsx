import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import Image from "next/image";
import {
  getAllGames,
  getCategoriesWithGameCounts,
  getFeaturedGames,
  getPublishedEvents,
  getVenueSettings,
} from "@/lib/public/queries";
import { primaryImage } from "@/lib/public/media";
import { isAvailableNow } from "@/lib/public/status";
import { formatEventDate, formatPhone } from "@/lib/public/format";
import { contactLinks } from "@/lib/public/contact";
import { GameCard } from "./_components/GameCard";
import { ContactActions } from "./_components/ContactActions";
import { StatusBadge } from "./_components/StatusBadge";
import { CategoryGlyph } from "./_components/CategoryGlyph";
import { CategoryGameName } from "./_components/CategoryGameName";
import { GamePicker, type PickerGame } from "./_components/GamePicker";
import { PageTransition } from "./_components/PageTransition";
import { Icon } from "./_components/Icon";
import { ClipStrip } from "./_components/ClipStrip";
import { homeClips } from "@/lib/public/game-clips";
import venuePoolRoom from "@/assets/venue/pool-table-lounge.webp";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: pageOpenGraph("The Gents Games & Entertainment", "/"),
};

/** Stagger index for CSS entrance delays (see motion.css). */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function HomePage() {
  const [categories, featured, allGames, events, venue] = await Promise.all([
    getCategoriesWithGameCounts(),
    getFeaturedGames(),
    getAllGames(),
    getPublishedEvents(),
    getVenueSettings(),
  ]);

  // Fall back to the full published catalogue if nothing is marked
  // "featured" yet — still only ever published games, per
  // docs/PRODUCT_REQUIREMENTS.md §2.
  const spotlight = (featured.length > 0 ? featured : allGames).slice(0, 6);
  const withImages = spotlight.filter((g) => primaryImage(g.game_media));
  const insetGame = withImages[1] ?? withImages[0] ?? null;
  const experienceGame = withImages[2] ?? withImages[0] ?? null;
  const insetImage = insetGame ? primaryImage(insetGame.game_media) : null;
  const experienceImage = experienceGame ? primaryImage(experienceGame.game_media) : null;
  const primary = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);

  // The picker and ticker name games without saying anything about status
  // up front, so they only ever draw from games playable today.
  const playableGames = allGames.filter((g) => isAvailableNow(g.facility_status));
  const pickerGames: PickerGame[] = playableGames.map((g) => {
    const img = primaryImage(g.game_media);
    return {
      slug: g.slug,
      name: g.name,
      categoryName: g.game_categories?.name ?? null,
      categorySlug: g.game_categories?.slug ?? null,
      status: g.facility_status,
      image: img ? { src: img.src, alt: img.alt } : null,
    };
  });

  // Only emitted when every fact below is a real, verified value — never
  // fabricated, per docs/PRODUCT_REQUIREMENTS.md §2. Opening hours are
  // deliberately omitted from structured markup unless explicitly modeled
  // as openingHoursSpecification; a free-text note like "Open 24/7" isn't
  // safe to encode as schema.org structured hours without that structure.
  const localBusinessJsonLd = venue
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: venue.brand_name,
        address: venue.address,
        ...(process.env.NEXT_SITE_URL ? { url: process.env.NEXT_SITE_URL } : {}),
        ...(venue.map_url ? { hasMap: venue.map_url } : {}),
        ...(venue.phone_primary ? { telephone: venue.phone_primary } : {}),
      }
    : null;

  return (
    <PageTransition>
      <main>
        {localBusinessJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
          />
        )}

        {/* ── Hero ── */}
        <section className="home-hero theme-dark" aria-labelledby="hero-title">
          <BankShot />
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow" style={stagger(0)}>
                Games &amp; recreation · Nairobi
              </p>
              <h1 id="hero-title" className="display">
                <span className="line">
                  <span style={stagger(1)}>Your game.</span>
                </span>
                <span className="line">
                  <span style={stagger(2)}>
                    Your <span className="accent-serif">people.</span>
                  </span>
                </span>
                <span className="line">
                  <span style={stagger(3)}>Your space.</span>
                </span>
              </h1>
              <p className="lede" style={stagger(4)}>
                Classic games, friendly rivalry and good company. Come with friends or come on your own — there&apos;s
                always someone to play at The Gents Games &amp; Entertainment.
              </p>
              <div className="btn-row btn-row-stack" style={stagger(5)}>
                <Link href="/games" className="btn btn-primary">
                  Explore games
                  <Icon name="arrowRight" />
                </Link>
                <Link href="/visit" className="btn btn-secondary">
                  Plan your visit
                </Link>
              </div>
            </div>

            <div className="home-hero-visual">
              <div className="media main">
                <Image
                  src={venuePoolRoom}
                  alt="The pool table at The Gents, set in the lounge with gold throne chairs and sofas."
                  fill
                  priority
                  placeholder="blur"
                  sizes="(max-width: 899px) 100vw, 46vw"
                />
              </div>
              {insetGame && insetImage && (
                <Link href={`/games/${insetGame.slug}`} className="hero-inset">
                  <div className="media ratio-3x2">
                    <Image src={insetImage.src} alt="" fill sizes="240px" />
                  </div>
                  <div className="hero-inset-body">
                    <span>{insetGame.name}</span>
                    <StatusBadge status={insetGame.facility_status} />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Quick facts — every value comes from verified data ── */}
        <div className="fact-strip theme-dark">
          <ul className="container">
            {venue?.hours_note && (
              <li>
                <Icon name="clock" />
                <span>
                  <strong>{venue.hours_note}</strong>
                </span>
              </li>
            )}
            {allGames.length > 0 && (
              <li>
                <Icon name="target" />
                <span>
                  <strong>
                    {allGames.length} {allGames.length === 1 ? "game" : "games"}
                  </strong>{" "}
                  across {categories.length} {categories.length === 1 ? "category" : "categories"}
                </span>
              </li>
            )}
            {venue && (
              <li>
                <Icon name="pin" />
                <span>{venue.address}</span>
              </li>
            )}
            <li>
              <Icon name="info" />
              <span>
                <strong>18+</strong> — valid ID required at entry
              </span>
            </li>
          </ul>
        </div>

        {/* ── Scroll-linked ticker of the real game list (decorative) ── */}
        {playableGames.length > 0 && (
          <div className="ticker theme-light" aria-hidden="true">
            <div className="ticker-track">
              {[0, 1].flatMap((round) =>
                playableGames.map((g, i) => (
                  <span key={`${round}-${g.id}`}>
                    <span className={(i + round) % 2 === 0 ? "solid" : undefined}>{g.name}</span>
                    <span className="dot"> ●</span>
                  </span>
                )),
              )}
            </div>
          </div>
        )}

        {/* ── Gameplay clips filmed at the venue ── */}
        <section className="section theme-paper" aria-labelledby="in-play-title">
          <div className="container">
            <div className="section-head reveal">
              <div>
                <p className="eyebrow">Filmed at the venue</p>
                <h2 id="in-play-title" className="display display-lg">
                  See it <span className="accent-serif">in play</span>
                </h2>
              </div>
              <Link href="/venue" className="arrow-link">
                See the venue <Icon name="arrowRight" />
              </Link>
            </div>
            <ClipStrip clips={homeClips} label="Short clips of games at the venue" />
          </div>
        </section>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section className="section theme-light" aria-labelledby="categories-title">
            <div className="container">
              <div className="section-head reveal">
                <div>
                  <p className="eyebrow">The games</p>
                  <h2 id="categories-title" className="display display-lg">
                    Find your kind of competition
                  </h2>
                </div>
                <Link href="/games" className="arrow-link">
                  All games <Icon name="arrowRight" />
                </Link>
              </div>

              <ol className="category-index reveal-group">
                {categories.map((c, i) => (
                  <li key={c.id} className="category-row has-glyph">
                    <span className="category-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <CategoryGlyph slug={c.slug} />
                    <div className="category-main">
                      <h3 className="category-name display">
                        <Link href={`/games?category=${c.slug}`}>{c.name}</Link>
                      </h3>
                      {c.description && <p className="category-desc">{c.description}</p>}
                      <ul className="category-games" aria-label={`${c.name} games`}>
                        {c.games.map((g) => (
                          <CategoryGameName key={g.id} game={g} />
                        ))}
                      </ul>
                    </div>
                    <div className="category-thumb media">
                      {c.cover && <Image src={c.cover.src} alt="" fill sizes="150px" />}
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

        {/* ── Featured games: one spotlight, the rest beside it ── */}
        {spotlight.length > 0 && (
          <section className="section theme-paper" aria-labelledby="featured-title">
            <div className="container">
              <div className="section-head reveal">
                <div>
                  <p className="eyebrow">On the tables</p>
                  <h2 id="featured-title" className="display display-lg">
                    Something for every <span className="accent-serif">kind</span> of player
                  </h2>
                </div>
                <Link href="/games" className="arrow-link">
                  Browse the catalogue <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="feature-grid reveal-group">
                {spotlight.map((g, i) => (
                  <GameCard key={g.id} game={g} variant={i === 0 ? "spotlight" : "default"} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── The experience ── */}
        <section className="section theme-dark" aria-labelledby="experience-title">
          <div className="container split">
            {experienceImage && (
              <figure className="experience-media reveal">
                <div className="media">
                  <Image
                    src={experienceImage.src}
                    alt={experienceImage.alt}
                    fill
                    sizes="(max-width: 899px) 100vw, 50vw"
                  />
                  {experienceImage.isPlaceholder && <span className="media-tag">Illustrative photo</span>}
                </div>
              </figure>
            )}
            <div className="stack-lg reveal">
              <div className="stack">
                <p className="eyebrow">The experience</p>
                <h2 id="experience-title" className="display display-lg">
                  More than <span className="accent-serif">just</span> a game
                </h2>
                <p className="lede">
                  Come with friends or come on your own, choose your game, and enjoy the challenge. Whether you&apos;re
                  here for a relaxed evening or a competitive rematch, the space is built for good company and friendly
                  rivalry.
                </p>
              </div>
              <ul className="point-list">
                {categories.length > 0 && (
                  <li>
                    <Icon name="target" />
                    <div>
                      <strong>Pick your game</strong>
                      <span>{categories.map((c) => c.name).join(" · ")}</span>
                    </div>
                  </li>
                )}
                {venue?.hours_note && (
                  <li>
                    <Icon name="clock" />
                    <div>
                      <strong>{venue.hours_note}</strong>
                      <span>Call ahead if you want to check on a particular table or activity.</span>
                    </div>
                  </li>
                )}
                <li>
                  <Icon name="target" />
                  <div>
                    <strong>Coming solo?</strong>
                    <span>Pair up with other guests, or ask the staff for a game.</span>
                  </div>
                </li>
                <li>
                  <Icon name="users" />
                  <div>
                    <strong>Bring the group</strong>
                    <span>Friends, colleagues or a celebration — tell us what you have in mind.</span>
                  </div>
                </li>
              </ul>
              <div className="btn-row">
                <Link href="/venue" className="btn btn-secondary">
                  About the venue
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Play together: groups + the game picker ── */}
        <section className="section theme-light" aria-labelledby="together-title">
          <div className="container play-grid">
            <div className="stack-lg reveal">
              <div className="stack">
                <p className="eyebrow">Play your way</p>
                <h2 id="together-title" className="display display-lg">
                  Bring <span className="accent-serif">the</span> rivalry
                </h2>
                <p className="lede">
                  Drop in on your own and take on other guests or the staff. Planning a birthday, a work outing, or a
                  standing game night? Share your preferred date, group size and the games you&apos;re interested in
                  — the team will come back to you with what&apos;s possible.
                </p>
              </div>
              <ul className="format-list">
                <li>
                  <strong>Solo drop-in</strong>
                  <span>Find an opponent when you arrive.</span>
                </li>
                <li>
                  <strong>Head to head</strong>
                  <span>Settle it one on one.</span>
                </li>
                <li>
                  <strong>Doubles &amp; teams</strong>
                  <span>Pair up and play as a side.</span>
                </li>
                <li>
                  <strong>Group night</strong>
                  <span>Rotate through the games together.</span>
                </li>
              </ul>
              <div className="btn-row btn-row-stack">
                <Link href="/groups" className="btn btn-primary">
                  Plan a group visit
                  <Icon name="arrowRight" />
                </Link>
                <Link href="/visit?type=group#enquiry" className="btn btn-secondary">
                  Send a group enquiry
                </Link>
              </div>
            </div>
            <div className="reveal">
              <GamePicker games={pickerGames} />
            </div>
          </div>
        </section>

        {/* ── Events — useful whether or not anything is scheduled ── */}
        <section className="section theme-paper" aria-labelledby="events-title">
          <div className="container">
            {events.length > 0 ? (
              <>
                <div className="section-head reveal">
                  <div>
                    <p className="eyebrow">What&apos;s on</p>
                    <h2 id="events-title" className="display display-lg">
                      Coming up
                    </h2>
                  </div>
                  <Link href="/events" className="arrow-link">
                    All events <Icon name="arrowRight" />
                  </Link>
                </div>
                <ol className="event-list reveal-group">
                  {events.slice(0, 3).map((e) => {
                    const d = formatEventDate(e.start_at, e.timezone);
                    return (
                      <li key={e.id} className="event-row">
                        <span className="date-block" aria-hidden="true">
                          <span className="dow">{d.weekday}</span>
                          <span className="day">{d.day}</span>
                          <span className="mon">{d.month}</span>
                        </span>
                        <div className="event-main">
                          <h3 className="event-title">
                            <Link href={`/events/${e.slug}`}>{e.title}</Link>
                          </h3>
                          <p className="event-meta">
                            <time dateTime={e.start_at}>
                              {d.full} · {d.time}
                            </time>
                          </p>
                        </div>
                        <span className="category-arrow" aria-hidden="true">
                          <Icon name="arrowRight" />
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="calendar-clear reveal">
                <CalendarArt />
                <div className="stack">
                  <p className="eyebrow">What&apos;s on</p>
                  <h2 id="events-title" className="display display-lg">
                    The calendar&apos;s clear — <span className="accent-serif">for now</span>
                  </h2>
                  <p className="lede">
                    No tournaments or events are scheduled at the moment. Confirmed events appear here with their date
                    and how to take part. Got an idea for one? Tell us.
                  </p>
                  <div className="btn-row btn-row-stack">
                    <Link href="/visit?topic=events#enquiry" className="btn btn-inverse">
                      Ask about upcoming events
                    </Link>
                    <Link href="/groups" className="btn btn-secondary">
                      Organise your own
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="section closing theme-dark" aria-labelledby="closing-title">
          <div className="container closing-grid">
            <div className="stack-lg reveal">
              <p className="eyebrow">Visit &amp; enquire</p>
              <h2 id="closing-title" className="display">
                Ready for your <span className="accent-serif">next</span> game?
              </h2>
              <p className="lede">
                Ask about facilities, prices, group visits or upcoming activities — call, message us on WhatsApp, or
                send an enquiry online.
              </p>
              <div className="btn-row btn-row-stack">
                <ContactActions venue={venue} primaryCall />
                <Link href="/visit#enquiry" className="btn btn-secondary">
                  Send an enquiry
                </Link>
              </div>
            </div>
            {venue && (
              <ul className="contact-list reveal">
                <li>
                  <Icon name="pin" />
                  <div>
                    <span className="label">Address</span>
                    {venue.address}
                    {venue.map_url && (
                      <>
                        <br />
                        <a href={venue.map_url} target="_blank" rel="noopener noreferrer">
                          Get directions<span className="visually-hidden"> (opens Google Maps)</span>
                        </a>
                      </>
                    )}
                  </div>
                </li>
                {venue.hours_note && (
                  <li>
                    <Icon name="clock" />
                    <div>
                      <span className="label">Hours</span>
                      {venue.hours_note}
                    </div>
                  </li>
                )}
                {primary.call && (
                  <li>
                    <Icon name="phone" />
                    <div>
                      <span className="label">Phone</span>
                      <a href={primary.call}>{formatPhone(venue.phone_primary)}</a>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

/** One-shot pool "bank shot" drawn behind the hero copy — decorative. */
function BankShot() {
  return (
    <svg
      className="bank-shot"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="20" y="20" width="1160" height="560" rx="28" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        className="shot-path"
        d="M 40 520 L 520 120 L 900 470 L 1180 300"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle className="shot-ball" r="14" fill="currentColor" />
      <circle cx="1180" cy="300" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A blank month grid — a quiet illustration for the empty events state. */
function CalendarArt() {
  return (
    <div className="calendar-art" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
