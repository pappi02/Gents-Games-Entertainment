import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import { getPublishedEvents, getVenueSettings } from "@/lib/public/queries";
import { formatEventDate } from "@/lib/public/format";
import { PageIntro } from "../_components/PageIntro";
import { ContactActions } from "../_components/ContactActions";
import { Icon } from "../_components/Icon";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming tournaments and events at The Gents Games & Entertainment.",
  alternates: { canonical: "/events" },
  openGraph: pageOpenGraph("Events", "/events"),
};

export default async function EventsPage() {
  const [events, venue] = await Promise.all([getPublishedEvents(), getVenueSettings()]);

  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="What's on"
          title={
            <>
              Events <span className="accent-serif">&amp;</span> tournaments
            </>
          }
          lede="Only confirmed events are listed here, with dates shown in Nairobi time."
        />

        <section className="section theme-light" aria-label="Upcoming events">
          <div className="container">
            {events.length === 0 ? (
              <div className="empty-state reveal">
                <Icon name="calendar" className="panel-icon" />
                <h2>No events scheduled right now</h2>
                <p>
                  There&apos;s nothing on the calendar at the moment. When a tournament or event is confirmed, it will
                  appear here with its date, time and how to take part. In the meantime, you&apos;re welcome to ask
                  about upcoming plans — or about organising something for your own group.
                </p>
                <div className="btn-row">
                  <Link href="/visit?topic=events#enquiry" className="btn btn-inverse">
                    Ask about upcoming events
                  </Link>
                  <Link href="/groups" className="btn btn-secondary">
                    Plan a group event
                  </Link>
                </div>
              </div>
            ) : (
              <ol className="event-list reveal-group">
                {events.map((e) => {
                  const d = formatEventDate(e.start_at, e.timezone);
                  return (
                    <li key={e.id} className="event-row">
                      <span className="date-block" aria-hidden="true">
                        <span className="dow">{d.weekday}</span>
                        <span className="day">{d.day}</span>
                        <span className="mon">{d.month}</span>
                      </span>
                      <div className="event-main">
                        <h2 className="event-title">
                          <Link href={`/events/${e.slug}`}>{e.title}</Link>
                        </h2>
                        <p className="event-meta">
                          <time dateTime={e.start_at}>
                            {d.full} · {d.time}
                          </time>
                        </p>
                        <p className="muted">{e.description}</p>
                      </div>
                      <span className="category-arrow" aria-hidden="true">
                        <Icon name="arrowRight" />
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <section className="section-tight theme-paper" aria-label="Contact">
          <div className="container cta-band">
            <p className="heading-sm">Questions about an event?</p>
            <div className="btn-row">
              <ContactActions venue={venue} />
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
