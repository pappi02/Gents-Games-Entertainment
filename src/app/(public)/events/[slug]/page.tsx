import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import { getEventBySlug, getVenueSettings } from "@/lib/public/queries";
import { formatEventDate, formatMoney, hasEnded } from "@/lib/public/format";
import { Breadcrumbs } from "../../_components/Breadcrumbs";
import { ContactActions } from "../../_components/ContactActions";
import { Icon } from "../../_components/Icon";
import { PageTransition } from "../../_components/PageTransition";

// Same Partial Prerendering caveat as games/[slug]: an unknown slug renders
// the not-found UI but with HTTP 200 — see docs/PHASE_6_STATUS.md.
export const instant = false;

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

  const start = formatEventDate(event.start_at, event.timezone);
  const end = event.end_at ? formatEventDate(event.end_at, event.timezone) : null;
  const finished = hasEnded(event);

  // Built only from the published event record and verified venue settings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.start_at,
    ...(event.end_at ? { endDate: event.end_at } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(venue ? { location: { "@type": "Place", name: venue.brand_name, address: venue.address } } : {}),
  };

  const facts = [
    { label: "Date", value: end && end.full !== start.full ? `${start.full} – ${end.full}` : start.full },
    { label: "Time", value: end ? `${start.time} – ${end.time} (Nairobi time)` : `From ${start.time} (Nairobi time)` },
    ...(event.capacity ? [{ label: "Places", value: `Up to ${event.capacity}` }] : []),
    ...(event.price_minor_units != null
      ? [{ label: "Entry", value: formatMoney(event.price_minor_units, event.currency ?? "KES") }]
      : []),
  ];

  return (
    <PageTransition>
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="detail-hero theme-light">
          <div className="container container-narrow">
            <Breadcrumbs
              items={[{ href: "/", label: "Home" }, { href: "/events", label: "Events" }, { label: event.title }]}
            />
            <div className="stack-lg event-detail">
              <p className="eyebrow">{finished ? "Past event" : "Upcoming event"}</p>
              <h1 className="display display-xl">{event.title}</h1>
              {finished && (
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
              {!finished && (
                <div className="btn-row btn-row-stack">
                  <Link href={`/visit?event=${event.slug}#enquiry`} className="btn btn-primary">
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
