import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/public/seo";
import { getPublishedMembershipTiers, getVenueSettings, type PublicMembershipTier } from "@/lib/public/queries";
import { formatMoney } from "@/lib/public/format";
import { PageIntro } from "../_components/PageIntro";
import { ContactActions } from "../_components/ContactActions";
import { Icon } from "../_components/Icon";
import { PageTransition } from "../_components/PageTransition";
import venueLounge from "@/assets/venue/throne-chairs-lounge-decanter.webp";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Membership at The Gents Games & Entertainment — tiers that unlock access to the games, entertainment and club facilities. Register your interest. 18+ venue.",
  alternates: { canonical: "/membership" },
  openGraph: pageOpenGraph("Membership", "/membership"),
};

const PERIOD: Record<string, string> = { monthly: "per month", quarterly: "per quarter", annual: "per year" };

// Membership is enquiry-only (docs/MEMBERSHIP_AND_LEISURE_EXPANSION.md): no
// accounts, no online sign-up, no payment. Tiers, fees and included access
// all come from the database and only appear once the owner has published
// and confirmed them — this page never fills gaps with guessed content.
export default async function MembershipPage() {
  const [tiers, venue] = await Promise.all([getPublishedMembershipTiers(), getVenueSettings()]);

  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="Membership"
          title={
            <>
              A club <span className="accent-serif">of your</span> own
            </>
          }
          lede="Regulars, couples and groups of friends can become members — one fee for the games and entertainment you come for most, and a standing place at the club."
        >
          <div className="btn-row btn-row-stack">
            <Link href="/visit?type=membership#enquiry" className="btn btn-primary">
              Register your interest
            </Link>
            <ContactActions venue={venue} />
          </div>
        </PageIntro>

        <section className="section theme-light" aria-labelledby="tiers-title">
          <div className="container stack-lg">
            <div className="section-head">
              <div>
                <p className="eyebrow">Tiers</p>
                <h2 id="tiers-title" className="display display-lg">
                  Choose your access
                </h2>
              </div>
            </div>

            {tiers.length > 0 ? (
              <ul className="panel-grid reveal-group" role="list">
                {tiers.map((tier) => (
                  <li key={tier.id}>
                    <TierPanel tier={tier} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel">
                <h3 className="heading-sm">Membership tiers are being finalised</h3>
                <p className="muted">
                  We&apos;re putting the finishing touches to membership options and fees. Register your interest and
                  the team will contact you as soon as membership opens.
                </p>
                <div className="btn-row">
                  <Link href="/visit?type=membership#enquiry" className="btn btn-primary">
                    Register your interest
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section theme-paper" aria-labelledby="join-title">
          <div className="container split split-top">
            <div className="stack">
              <p className="eyebrow">Joining</p>
              <h2 id="join-title" className="display display-lg">
                How membership works
              </h2>
              <ol className="steps reveal-group">
                <li>
                  <strong>Register your interest</strong>
                  <span>Tell us which tier you&apos;re considering and how you like to play.</span>
                </li>
                <li>
                  <strong>Talk it through</strong>
                  <span>
                    The team contacts you to go over the tiers, fees and what&apos;s included. Nothing is confirmed
                    until we&apos;ve replied.
                  </span>
                </li>
                <li>
                  <strong>Join at the venue</strong>
                  <span>Membership is completed in person. This is an 18+ venue, so bring valid photo ID.</span>
                </li>
              </ol>
              <p className="notice">
                <Icon name="info" />
                <span>
                  There&apos;s no online sign-up or payment. Membership is arranged directly with the team, and any
                  fees are paid at the venue.
                </span>
              </p>
            </div>
            <figure className="reveal">
              <div className="media ratio-4x3">
                <Image
                  src={venueLounge}
                  placeholder="blur"
                  alt="The club lounge: gold-trimmed throne chairs, a sofa and a decanter set on the coffee table."
                  fill
                  sizes="(max-width: 899px) 100vw, 50vw"
                />
              </div>
            </figure>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

function TierPanel({ tier }: { tier: PublicMembershipTier }) {
  return (
    <article className="panel" aria-labelledby={`tier-${tier.slug}`}>
      <div className="stack stack-tight">
        <h3 id={`tier-${tier.slug}`} className="display display-md">
          {tier.name}
        </h3>
        <p className="lede">{tier.summary}</p>
      </div>

      {tier.fees ? (
        <dl className="fact-list">
          <div>
            <dt>Subscription</dt>
            <dd>
              {formatMoney(tier.fees.subscription, tier.fees.currency)} {PERIOD[tier.fees.billingPeriod] ?? ""}
            </dd>
          </div>
          {tier.fees.joiningFee !== null && (
            <div>
              <dt>Joining fee</dt>
              <dd>{formatMoney(tier.fees.joiningFee, tier.fees.currency)} one-off</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="subtle">Fees on enquiry — ask the team for current rates.</p>
      )}

      {tier.description && <p className="muted">{tier.description}</p>}

      {tier.categories.length > 0 && (
        <div className="stack stack-tight">
          <p className="eyebrow">Includes access to</p>
          <ul className="checklist">
            {tier.categories.map((c) => (
              <li key={c.slug}>
                <Icon name="check" />
                <span>
                  <Link href={`/games?category=${c.slug}`} className="text-link">
                    {c.name}
                  </Link>
                  {c.comingSoon && <span className="subtle"> · Coming soon</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tier.benefits.length > 0 && (
        <div className="stack stack-tight">
          <p className="eyebrow">Member benefits</p>
          <ul className="checklist">
            {tier.benefits.map((b) => (
              <li key={b}>
                <Icon name="check" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="btn-row">
        <Link href={`/visit?type=membership&tier=${tier.slug}#enquiry`} className="btn btn-primary">
          Ask about {tier.name}
        </Link>
      </div>
    </article>
  );
}
