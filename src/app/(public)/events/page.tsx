import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/public/queries";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming tournaments and events at The Gents Games & Entertainment.",
};

export default async function EventsPage() {
  const events = await getPublishedEvents();

  return (
    <main id="main-content" className="section section-light">
      <div className="container">
        <h1>Events</h1>

        {events.length === 0 ? (
          <p className="empty-state">
            No events are scheduled right now. Check back soon, or{" "}
            <Link href="/visit?type=group" style={{ textDecoration: "underline" }}>
              ask us about organising one
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
            {events.map((e) => (
              <div key={e.id} className="card" style={{ padding: "1.25rem" }}>
                <h3 style={{ textTransform: "none" }}>{e.title}</h3>
                <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>{new Date(e.start_at).toLocaleString()}</p>
                <p>{e.description}</p>
                {e.registration_instructions && <p style={{ fontSize: "0.85rem" }}>{e.registration_instructions}</p>}
                <Link href={`/visit?event=${e.slug}`} className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                  Enquire
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
