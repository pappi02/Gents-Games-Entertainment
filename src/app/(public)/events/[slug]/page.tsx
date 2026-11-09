import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Image from "next/image";
import Link from "next/link";
import { getEventBySlug, getVenueSettings } from "@/lib/public/queries";
import { formatEventDate, formatMoney, hasEnded } from "@/lib/public/format";
import { eventPosterUrl, getTicketAvailability, SALE_STATE_LABEL } from "@/lib/public/tickets";
import { Breadcrumbs } from "../../_components/Breadcrumbs";
import { ContactActions } from "../../_components/ContactActions";
import { Icon } from "../../_components/Icon";
import { PageTransition } from "../../_components/PageTransition";
import { TicketPurchaseForm } from "./TicketPurchaseForm";

// Same Partial Prerendering caveat as games/[slug]: an unknown slug renders
// the not-found UI but with HTTP 200 — see docs/PHASE_6_STATUS.md.
export const instant = false;

const SALE_STATE_NOTE = {
  not_started: "Tickets aren't on sale yet. Check back soon.",
  closed: "Tickets aren't on sale for this event right now.",
  sales_ended: "Online ticket sales for this event have ended.",
  sold_out: "This event is sold out.",
  all_held:
    "All remaining tickets are held by buyers at checkout. Any that aren't paid for are released within 15 minutes, so please check back.",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found", robots: { index: false } };
  const title = event.seo_title ?? event.title;
  const description = event.seo_description ?? String(event.description).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: pageOpenGraph(title, `/events/${event.slug}`, description),
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, venue] = await Promise.all([getEventBySlug(slug), getVenueSettings()]);
  if (!event) notFound();

  const [ticket] = await getTicketAvailability(event.id);
  const start = formatEventDate(event.start_at, event.timezone);
  const end = event.end_at ? formatEventDate(event.end_at, event.timezone) : null;
  const finished = hasEnded(event);
  const cancelled = Boolean(event.cancelled_at);

  // Built only from the published event record and verified venue settings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.start_at,
    ...(event.end_at ? { endDate: event.end_at } : {}),
    eventStatus: cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.poster_path ? { image: eventPosterUrl(event.poster_path) } : {}),
    ...(venue ? { location: { "@type": "Place", name: event.location_note ?? venue.brand_name, address: venue.address } } : {}),
  };

  const facts = [
    { label: "Date", value: end && end.full !== start.full ? `${start.full} – ${end.full}` : start.full },
    { label: "Time", value: end ? `${start.time} – ${end.time} (Nairobi time)` : `From ${start.time} (Nairobi time)` },
    ...(event.location_note ? [{ label: "Where", value: event.location_note }] : []),
    // A ticket type is the source of truth for price. The legacy event price
    // only shows for an event with no tickets.
    ...(ticket
      ? [{ label: ticket.name, value: formatMoney(ticket.price_minor_units, ticket.currency) }]
      : event.price_minor_units != null
        ? [{ label: "Entry", value: formatMoney(event.price_minor_units, event.currency ?? "KES") }]
        : []),
  ];

  return (
    <PageTransition>
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <section className="detail-hero theme-light">
          <div className="container container-narrow">
            <Breadcrumbs
              items={[{ href: "/", label: "Home" }, { href: "/events", label: "Events" }, { label: event.title }]}
            />
            <div className="stack-lg event-detail">
              <p className="eyebrow">{cancelled ? "Cancelled event" : finished ? "Past event" : "Upcoming event"}</p>
              <h1 className="display display-xl">{event.title}</h1>
              {event.poster_path && (
                <div className="event-poster">
                  <Image
                    src={eventPosterUrl(event.poster_path)}
                    alt={event.poster_alt ?? `Poster for ${event.title}`}
                    width={1400}
                    height={1980}
                    sizes="(min-width: 760px) 640px, 100vw"
                    priority
                  />
                </div>
              )}
              {cancelled && (
                <p className="notice">
                  <Icon name="info" />
                  <span>This event has been cancelled. Ticket holders should contact us about refunds.</span>
                </p>
              )}
              {finished && !cancelled && (
                <p className="notice">
                  <Icon name="info" />
                  <span>This event has already taken place.</span>
                </p>
              )}
              <dl className="fact-list">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>

              {ticket && !finished && !cancelled && (
                <div className="ticket-panel" id="tickets">
                  <h2>Get your tickets</h2>
                  {ticket.description && <p className="muted">{ticket.description}</p>}
                  {ticket.state === "on_sale" && ticket.can_buy > 0 ? (
                    <TicketPurchaseForm
                      slug={event.slug}
                      ticketTypeId={ticket.ticket_type_id}
                      ticketName={ticket.name}
                      unitPrice={ticket.price_minor_units}
                      currency={ticket.currency}
                      maxQuantity={ticket.can_buy}
                    />
                  ) : (
                    <p className={`ticket-state ticket-state-${ticket.state}`}>
                      <strong>{SALE_STATE_LABEL[ticket.state]}.</strong>{" "}
                      {SALE_STATE_NOTE[ticket.state as keyof typeof SALE_STATE_NOTE]}
                    </p>
                  )}
                </div>
              )}

              <div className="detail-section">
                <h2>About this event</h2>
                <p>{event.description}</p>
              </div>
              {event.registration_instructions && (
                <div className="detail-section">
                  <h2>How to take part</h2>
                  <p>{event.registration_instructions}</p>
                </div>
              )}
              {!finished && !cancelled && (
                <div className="btn-row btn-row-stack">
                  <Link href={`/visit?event=${event.slug}#enquiry`} className={ticket ? "btn btn-secondary" : "btn btn-primary"}>
                    Enquire about this event
                  </Link>
                  <ContactActions venue={venue} />
                </div>
              )}
              <Link href="/events" className="arrow-link">
                All events <Icon name="arrowRight" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
