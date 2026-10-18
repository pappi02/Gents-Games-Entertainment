import { Suspense } from "react";
import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import { getVenueSettings, getGameBySlug, getEventBySlug, getMembershipTierBySlug } from "@/lib/public/queries";
import { contactLinks } from "@/lib/public/contact";
import { formatPhone } from "@/lib/public/format";
import { PageIntro } from "../_components/PageIntro";
import { Icon } from "../_components/Icon";
import { EnquiryForm } from "./EnquiryForm";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Visit Us",
  description:
    "Address, opening hours, phone and WhatsApp contacts, and how to send an enquiry to The Gents Games & Entertainment.",
  alternates: { canonical: "/visit" },
  openGraph: pageOpenGraph("Visit Us", "/visit"),
};

type VisitSearchParams = Promise<{
  submitted?: string;
  game?: string;
  event?: string;
  type?: string;
  topic?: string;
  tier?: string;
}>;

// The page itself never awaits searchParams: venue details come from cached
// data and render in the static shell immediately. Only the enquiry section
// depends on the URL (?game=, ?event=, ?type=, ?topic=, ?submitted=), so
// only that part is streamed inside <Suspense>.
export default function VisitPage({ searchParams }: { searchParams: VisitSearchParams }) {
  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="Visit us"
          title={
            <>
              Plan <span className="accent-serif">your</span> visit
            </>
          }
          lede="Find us, call or message the team, or send an enquiry about games, prices, group visits and events."
        />

        <section className="section theme-light">
          <div className="container visit-grid">
            <VenueDetails />

            <div id="enquiry" className="panel" aria-labelledby="enquiry-title">
              <div className="stack stack-tight">
                <h2 id="enquiry-title" className="display display-md">
                  Send an enquiry
                </h2>
                <p className="muted">We&apos;ll get back to you using the contact details you provide.</p>
                <p className="subtle">This is an 18+ venue. Valid photo ID is required at entry.</p>
              </div>
              <Suspense
                fallback={<div className="skeleton skeleton-form" aria-busy="true" aria-label="Loading enquiry form" />}
              >
                <EnquirySection searchParams={searchParams} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

async function VenueDetails() {
  const venue = await getVenueSettings();
  if (!venue) {
    return (
      <div className="stack">
        <h2 className="display display-md">Find us</h2>
        <p className="muted">
          Venue details are being updated. Please use the enquiry form and we&apos;ll get back to you.
        </p>
      </div>
    );
  }

  const primary = contactLinks(venue.phone_primary, venue.phone_primary_channels);
  const secondary = contactLinks(venue.phone_secondary, venue.phone_secondary_channels);

  return (
    <div className="stack-lg">
      <h2 className="display display-md">Find us</h2>
      <ul className="contact-list">
        <li>
          <Icon name="pin" />
          <div>
            <span className="label">Address</span>
            <address>{venue.address}</address>
            {venue.plus_code && <span className="subtle">Plus code: {venue.plus_code}</span>}
          </div>
        </li>
        {venue.hours_note && (
          <li>
            <Icon name="clock" />
            <div>
              <span className="label">Opening hours</span>
              {venue.hours_note}
            </div>
          </li>
        )}
        {venue.phone_primary && (primary.call || primary.whatsapp) && (
          <li>
            <Icon name="phone" />
            <div>
              <span className="label">
                {primary.call && primary.whatsapp ? "Call or WhatsApp" : primary.whatsapp ? "WhatsApp" : "Call"}
              </span>
              <a href={primary.call ?? primary.whatsapp!}>{formatPhone(venue.phone_primary)}</a>
            </div>
          </li>
        )}
        {venue.phone_secondary && secondary.call && (
          <li>
            <Icon name="phone" />
            <div>
              <span className="label">Call</span>
              <a href={secondary.call}>{formatPhone(venue.phone_secondary)}</a>
            </div>
          </li>
        )}
      </ul>

      <div className="btn-row btn-row-stack">
        {venue.map_url && (
          <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="btn btn-inverse">
            <Icon name="pin" />
            Get directions<span className="visually-hidden"> (opens Google Maps)</span>
          </a>
        )}
        {primary.call && (
          <a href={primary.call} className="btn btn-secondary">
            <Icon name="phone" />
            Call
          </a>
        )}
        {primary.whatsapp && (
          <a href={primary.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <Icon name="chat" />
            WhatsApp<span className="visually-hidden"> (opens WhatsApp)</span>
          </a>
        )}
      </div>
    </div>
  );
}

async function EnquirySection({ searchParams }: { searchParams: VisitSearchParams }) {
  const { submitted, game: gameSlug, event: eventSlug, type, topic, tier: tierSlug } = await searchParams;

  const [game, event, tier] = await Promise.all([
    gameSlug ? getGameBySlug(gameSlug) : Promise.resolve(null),
    eventSlug ? getEventBySlug(eventSlug) : Promise.resolve(null),
    type === "membership" && tierSlug ? getMembershipTierBySlug(tierSlug) : Promise.resolve(null),
  ]);

  if (submitted) {
    return (
      <div role="status" className="form-alert form-alert-success">
        <strong>Thanks — your enquiry has been received.</strong>
        <span>
          Your reference is <strong>{submitted.slice(0, 40)}</strong>. This confirms we have your message, not a booking
          — the team will follow up using the contact details you provided.
        </span>
        <div className="btn-row">
          <Link href="/games" className="btn btn-secondary btn-sm">
            Explore games
          </Link>
          <Link href="/visit#enquiry" className="btn btn-secondary btn-sm">
            Send another enquiry
          </Link>
        </div>
      </div>
    );
  }

  const enquiryType = game
    ? "game"
    : event
      ? "event"
      : type === "group"
        ? "group"
        : type === "membership"
          ? "membership"
          : "general";
  const hidden: Record<string, string> = {};
  if (game) hidden.related_game_id = game.id;
  if (event) hidden.related_event_id = event.id;
  if (!game && !event && topic === "events") hidden.topic = "events";
  if (enquiryType === "membership" && tier) hidden.membership_tier = tier.slug;

  const context = game
    ? `${game.name}`
    : event
      ? event.title
      : enquiryType === "group"
        ? "A group visit"
        : enquiryType === "membership"
          ? tier
            ? `${tier.name} membership`
            : "Membership"
          : topic === "events"
          ? "Upcoming events"
          : null;

  const messageHint =
    enquiryType === "group"
      ? "Include your preferred date, the occasion, and which games you're interested in."
      : enquiryType === "game"
        ? "e.g. prices, availability on a particular day, or anything else you'd like to know."
        : enquiryType === "membership"
          ? "Tell us which games you play most, how often you'd visit, and whether it's just you, a couple or a family."
        : "Ask about facilities, prices, group visits or upcoming events.";

  return (
    <div className="stack">
      {context && (
        <p className="context-chip">
          <span className="subtle">Asking about:</span> <strong>{context}</strong>
          <Link href="/visit#enquiry" className="text-link subtle">
            Change
          </Link>
        </p>
      )}
      <EnquiryForm
        enquiryType={enquiryType}
        hidden={hidden}
        messageHint={messageHint}
        showPartySize={enquiryType === "group" || enquiryType === "general"}
      />
    </div>
  );
}
