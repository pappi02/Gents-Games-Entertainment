import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getGameBySlug, getRelatedGames, getVenueSettings } from "@/lib/public/queries";
import { publicImageUrl } from "@/lib/public/queries";
import { contactLinks } from "@/lib/public/contact";
import { GameCard } from "../../GameCard";

// NOTE: `instant` is a dev-time navigation-validation toggle, not a
// rendering-mode switch (confirmed against Next's own docs) — it does NOT
// fix the HTTP-200-instead-of-404 issue on this dynamic-segment route under
// Partial Prerendering (Cache Components still ships a prerendered 200
// shell before the streamed notFound() resolves). Left here only because
// it's harmless; the actual status-code issue remains open — see
// docs/PHASE_6_STATUS.md for why this was investigated and not fixed, and
// docs/TESTING.md §6.
export const instant = false;

type MediaAsset = { storage_bucket: string; storage_path: string };
type GameMedia = { alt_text: string | null; sort_order: number; media_assets: MediaAsset | null };
type PricingOption = {
  amount_minor_units: number;
  currency: string;
  billing_unit: string;
  conditions: string | null;
  duration_minutes: number | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return {};
  return {
    title: game.seo_title ?? game.name,
    description: game.seo_description ?? game.short_description,
    alternates: { canonical: `/games/${game.slug}` },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) notFound();

  const category = game.game_categories as unknown as { id: string; name: string; slug: string } | null;
  const media = (game.game_media as unknown as GameMedia[]) ?? [];
  const pricing = (game.pricing_options as unknown as PricingOption[]) ?? [];

  const [related, venue] = await Promise.all([
    category ? getRelatedGames(category.id, game.id) : Promise.resolve([]),
    getVenueSettings(),
  ]);
  const primary = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);

  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 760 }}>
        {category && (
          <p style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.6 }}>
            <Link href={`/games?category=${category.slug}`}>{category.name}</Link>
          </p>
        )}
        <h1>{game.name}</h1>
        <span className={`status-badge status-${game.facility_status}`} style={{ marginBottom: "1rem" }}>
          {game.facility_status.replace("_", " ")}
        </span>

        {media.length > 0 && (
          <div className="grid grid-2" style={{ margin: "1.5rem 0" }}>
            {media
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((m, i) =>
                m.media_assets ? (
                  <div key={i} style={{ position: "relative", aspectRatio: "4/3", borderRadius: 4, overflow: "hidden" }}>
                    <Image
                      src={publicImageUrl(m.media_assets.storage_bucket, m.media_assets.storage_path)}
                      alt={m.alt_text ?? ""}
                      fill
                      sizes="(max-width: 640px) 100vw, 380px"
                      style={{ objectFit: "cover" }}
                      priority={i === 0}
                    />
                  </div>
                ) : null,
              )}
          </div>
        )}

        <p style={{ fontSize: "1.05rem", margin: "1rem 0" }}>{game.description}</p>

        {game.rules && (
          <>
            <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Rules</h2>
            <p style={{ marginTop: "0.5rem" }}>{game.rules}</p>
          </>
        )}

        {game.beginner_notes && (
          <>
            <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>New to this?</h2>
            <p style={{ marginTop: "0.5rem" }}>{game.beginner_notes}</p>
          </>
        )}

        {game.equipment_notes && <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.75 }}>{game.equipment_notes}</p>}

        <dl className="grid grid-2" style={{ marginTop: "1.5rem", gap: "0.75rem" }}>
          {game.typical_players && (
            <div>
              <dt style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Players</dt>
              <dd>{game.typical_players}</dd>
            </div>
          )}
          {game.typical_duration && (
            <div>
              <dt style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6 }}>Typical duration</dt>
              <dd>{game.typical_duration}</dd>
            </div>
          )}
        </dl>

        {pricing.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Pricing</h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              {pricing.map((p, i) => (
                <li key={i}>
                  {p.currency} {(p.amount_minor_units / 100).toLocaleString()} — {p.billing_unit.replace("_", " ")}
                  {p.conditions ? ` (${p.conditions})` : ""}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="contact-buttons">
          <Link href={`/visit?game=${game.slug}`} className="btn btn-primary">
            Send an enquiry
          </Link>
          {primary.call && (
            <a href={primary.call} className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
              Call
            </a>
          )}
          {primary.whatsapp && (
            <a href={primary.whatsapp} className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
              WhatsApp
            </a>
          )}
        </div>

        {related.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.1rem", marginTop: "2.5rem" }}>You might also like</h2>
            <div className="grid grid-3" style={{ marginTop: "1rem" }}>
              {related.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
