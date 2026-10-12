import Link from "next/link";
import Image from "next/image";
import {
  getCategoriesWithGameCounts,
  getFeaturedGames,
  getGames,
  getPublishedEvents,
  getVenueSettings,
} from "@/lib/public/queries";
import { contactLinks } from "@/lib/public/contact";
import { GameCard } from "./GameCard";
import venueLounge from "@/assets/venue-lounge.webp";

export default async function HomePage() {
  const [categories, featured, events, venue] = await Promise.all([
    getCategoriesWithGameCounts(),
    getFeaturedGames(),
    getPublishedEvents(),
    getVenueSettings(),
  ]);

  // Fall back to a few representative games if nothing is marked
  // "featured" yet — still only ever published games, per
  // docs/PRODUCT_REQUIREMENTS.md §2.
  const spotlightGames = featured.length > 0 ? featured : await getGames();
  const primary = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);

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
        ...(venue.map_url ? { hasMap: venue.map_url } : {}),
        ...(venue.phone_primary ? { telephone: venue.phone_primary } : {}),
      }
    : null;

  return (
    <main id="main-content">
      {localBusinessJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      )}
      <section className="hero">
        <Image
          src={venueLounge}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="hero-bg-image"
          style={{ objectFit: "cover" }}
        />
        <div className="hero-overlay" />
        <div className="container hero-inner">
          <h1>Your Game. Your People. Your Space.</h1>
          <p>
            Discover a place to enjoy classic games, test your skills, and spend quality time with friends. Explore
            the activities available at The Gents Games &amp; Entertainment.
          </p>
          <div className="cta-row">
            <Link href="/games" className="btn btn-primary">
              Explore Games
            </Link>
            <Link href="/visit" className="btn btn-secondary">
              Plan Your Visit
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section section-light">
          <div className="container">
            <h2>Find Your Kind of Competition</h2>
            <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
              {categories.map((c) => (
                <Link key={c.id} href={`/games?category=${c.slug}`} className="card">
                  <div className="card-image" style={{ position: "relative" }}>
                    {c.cover && (
                      <Image
                        src={c.cover.src}
                        alt={c.cover.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div className="card-body">
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                    <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      {c.gameCount} {c.gameCount === 1 ? "activity" : "activities"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {spotlightGames.length > 0 && (
        <section className="section section-dark">
          <div className="container">
            <h2>Something for Every Kind of Player</h2>
            <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
              {spotlightGames.slice(0, 6).map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section-light">
        <div className="container">
          <h2>More Than Just a Game</h2>
          <p style={{ maxWidth: 640, marginTop: "1rem" }}>
            Bring your friends, choose your game, and enjoy the challenge. Whether you&apos;re here for a relaxed
            evening or a competitive rematch, our recreation spaces are built for good company and friendly
            rivalry.
          </p>
        </div>
      </section>

      {events.length > 0 && (
        <section className="section section-dark">
          <div className="container">
            <h2>Bring the Competition to Life</h2>
            <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
              {events.map((e) => (
                <div key={e.id} className="card" style={{ padding: "1.25rem" }}>
                  <h3 style={{ textTransform: "none" }}>{e.title}</h3>
                  <p>{new Date(e.start_at).toLocaleString()}</p>
                  <p>{e.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section-light">
        <div className="container">
          <h2>Ready for Your Next Game?</h2>
          <p style={{ maxWidth: 560, marginTop: "1rem" }}>
            Ask us about facilities, prices, group visits, and upcoming activities. Reach out directly — our full
            enquiry form is coming soon.
          </p>
          <div className="contact-buttons">
            {primary.call && (
              <a href={primary.call} className="btn btn-primary">
                Call us
              </a>
            )}
            {primary.whatsapp && (
              <a href={primary.whatsapp} className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
                WhatsApp us
              </a>
            )}
            <Link href="/visit" className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
              Visit details
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
