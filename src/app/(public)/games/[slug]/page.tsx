import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/public/seo";
import Link from "next/link";
import Image from "next/image";
import { getGameBySlug, getRelatedGames, getVenueSettings } from "@/lib/public/queries";
import { gameImages, primaryImage } from "@/lib/public/media";
import { facilityStatus } from "@/lib/public/status";
import { formatBillingUnit, formatMoney } from "@/lib/public/format";
import { GameCard, gameImageTransitionName } from "../../_components/GameCard";
import { PageTransition } from "../../_components/PageTransition";
import { CategoryGlyph } from "../../_components/CategoryGlyph";
import { contactLinks } from "@/lib/public/contact";
import { StatusBadge } from "../../_components/StatusBadge";
import { Breadcrumbs } from "../../_components/Breadcrumbs";
import { ContactActions } from "../../_components/ContactActions";
import { Icon } from "../../_components/Icon";
import { LoopVideo } from "../../_components/LoopVideo";
import { gameClips } from "@/lib/public/game-clips";

// NOTE: `instant` is a dev-time navigation-validation toggle, not a
// rendering-mode switch (confirmed against Next's own docs) — it does NOT
// fix the HTTP-200-instead-of-404 issue on this dynamic-segment route under
// Partial Prerendering (Cache Components still ships a prerendered 200
// shell before the streamed notFound() resolves). Left here only because
// it's harmless; the actual status-code issue remains open — see
// docs/PHASE_6_STATUS.md for why this was investigated and not fixed, and
// docs/TESTING.md §6.
export const instant = false;

type PricingOption = {
  id: string;
  amount_minor_units: number;
  currency: string;
  billing_unit: string;
  conditions: string | null;
  duration_minutes: number | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return { title: "Game not found", robots: { index: false } };
  const image = primaryImage(game.game_media);
  const title = game.seo_title ?? game.name;
  const description = game.seo_description ?? game.short_description;
  return {
    title,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      title,
      description,
      url: `/games/${game.slug}`,
      images: [image ? { url: image.src, alt: image.alt } : DEFAULT_OG_IMAGE],
    },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) notFound();

  const category = game.game_categories as { id: string; name: string; slug: string } | null;
  const images = gameImages(game.game_media);
  const [main, ...rest] = images;
  const pricing = (game.pricing_options as PricingOption[] | null) ?? [];
  const status = facilityStatus(game.facility_status);
  const clip = gameClips[game.slug];

  const [related, venue] = await Promise.all([getRelatedGames(category?.id ?? null, game.id), getVenueSettings()]);

  const facts = [
    { label: "Players", value: game.typical_players },
    { label: "Typical duration", value: game.typical_duration },
    { label: "Equipment", value: game.equipment_notes },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const links = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);

  return (
    <PageTransition>
      <main>
        <section className="detail-hero theme-light">
          <div className="container">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/games", label: "Games" },
                ...(category ? [{ href: `/games?category=${category.slug}`, label: category.name }] : []),
                { label: game.name },
              ]}
            />

            <div className="detail-hero-grid">
              <div className="detail-gallery">
                <figure>
                  <ViewTransition name={gameImageTransitionName(game.slug)} share="morph" default="none">
                    <div className="media main">
                      {main ? (
                        <Image src={main.src} alt={main.alt} fill priority sizes="(max-width: 899px) 100vw, 55vw" />
                      ) : (
                        <div className="media-fallback">
                          <Icon name="image" />
                        </div>
                      )}
                      {main?.isPlaceholder && <span className="media-tag">Illustrative photo</span>}
                    </div>
                  </ViewTransition>
                  {main?.caption && <figcaption>{main.caption}</figcaption>}
                </figure>
                {rest.length > 0 && (
                  <ul className="detail-thumbs" aria-label="More photos">
                    {rest.map((img, i) => (
                      <li key={i}>
                        <figure>
                          <div className="media">
                            <Image src={img.src} alt={img.alt} fill sizes="(max-width: 899px) 33vw, 18vw" />
                          </div>
                          {img.caption && <figcaption>{img.caption}</figcaption>}
                        </figure>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="detail-summary enter-stagger">
                {category && (
                  <p className="eyebrow detail-eyebrow">
                    <CategoryGlyph slug={category.slug} className="glyph detail-glyph" />
                    <Link href={`/games?category=${category.slug}`} className="text-link">
                      {category.name}
                    </Link>
                  </p>
                )}
                <h1 className="display">{game.name}</h1>
                <p className="lede">{game.short_description}</p>

                <div className={`status-note status--${status.key}`}>
                  <StatusBadge status={game.facility_status} />
                  <span>{status.detail}</span>
                </div>

                {facts.length > 0 && (
                  <dl className="fact-list">
                    {facts.map((f) => (
                      <div key={f.label}>
                        <dt>{f.label}</dt>
                        <dd>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="btn-row btn-row-stack">
                  <Link href={`/visit?game=${game.slug}#enquiry`} className="btn btn-primary">
                    Ask about {game.name}
                  </Link>
                  <ContactActions venue={venue} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section theme-paper" aria-label={`About ${game.name}`}>
          <div className="container detail-body">
            <div>
              <div className="detail-section">
                <h2>About the game</h2>
                <p>{game.description}</p>
              </div>

              {game.rules && (
                <div className="detail-section">
                  <h2>How to play</h2>
                  <p>{game.rules}</p>
                </div>
              )}

              {game.beginner_notes && (
                <div className="detail-section">
                  <h2>New to this?</h2>
                  <p>{game.beginner_notes}</p>
                </div>
              )}

              {clip && (
                <div className="detail-section">
                  <h2>At the venue</h2>
                  <figure className={`game-clip game-clip--${clip.orientation}`}>
                    <LoopVideo src={clip.src} poster={clip.poster} label={clip.label} />
                    <figcaption>Filmed here at the venue.</figcaption>
                  </figure>
                </div>
              )}
            </div>

            <aside className="detail-aside" aria-labelledby="pricing-title">
              <div className="panel">
                <h2 id="pricing-title" className="heading-sm">
                  Prices
                </h2>
                {pricing.length > 0 ? (
                  <table className="price-table">
                    <caption className="visually-hidden">Current prices for {game.name}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Price</th>
                        <th scope="col">Charged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing.map((p) => (
                        <tr key={p.id}>
                          <td>{formatMoney(p.amount_minor_units, p.currency)}</td>
                          <td>
                            {formatBillingUnit(p.billing_unit)}
                            {p.duration_minutes ? ` · ${p.duration_minutes} min` : ""}
                            {p.conditions && (
                              <span className="subtle">
                                <br />
                                {p.conditions}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">
                    Prices are available on request. Ask the team for current rates before you visit.
                  </p>
                )}
                <div className="btn-row">
                  <Link href={`/visit?game=${game.slug}#enquiry`} className="btn btn-secondary">
                    {pricing.length > 0 ? "Ask a question" : "Ask about prices"}
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {related.length > 0 && (
          <section className="section theme-light" aria-labelledby="related-title">
            <div className="container">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Keep exploring</p>
                  <h2 id="related-title" className="display display-md">
                    You might also like
                  </h2>
                </div>
                <Link href="/games" className="arrow-link">
                  Back to all games <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="card-grid">
                {related.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Phones: the next action stays within thumb reach. */}
        <div className="action-bar theme-dark" role="region" aria-label={`Enquire about ${game.name}`}>
          <Link href={`/visit?game=${game.slug}#enquiry`} className="btn btn-primary">
            Ask about {game.name}
          </Link>
          {links.call && (
            <a href={links.call} className="btn btn-secondary btn-icon" aria-label="Call the venue">
              <Icon name="phone" />
            </a>
          )}
          {links.whatsapp && (
            <a
              href={links.whatsapp}
              className="btn btn-secondary btn-icon"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp the venue (opens WhatsApp)"
            >
              <Icon name="chat" />
            </a>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
