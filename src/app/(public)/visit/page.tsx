import { Suspense } from "react";
import type { Metadata } from "next";
import { getVenueSettings, getGameBySlug, getPublishedEvents } from "@/lib/public/queries";
import { contactLinks } from "@/lib/public/contact";
import { submitPublicEnquiry } from "./actions";

export const metadata: Metadata = {
  title: "Visit Us",
  description: "Address, opening hours, contacts, and how to send an enquiry to The Gents Games & Entertainment.",
};

type VisitSearchParams = Promise<{
  error?: string;
  submitted?: string;
  game?: string;
  event?: string;
  type?: string;
}>;

// The page itself never awaits searchParams: venue details come from cached
// data and render in the static shell immediately. Only the enquiry section
// depends on the URL (?game=, ?event=, ?submitted=, ?error=), so only that
// part is streamed inside <Suspense>.
export default function VisitPage({ searchParams }: { searchParams: VisitSearchParams }) {
  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1>Visit Us</h1>
        <VenueDetails />

        <h2 style={{ marginTop: "2.5rem", fontSize: "1.1rem" }}>Send an enquiry</h2>
        <Suspense fallback={<div style={{ minHeight: 520 }} aria-busy="true" />}>
          <EnquirySection searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function VenueDetails() {
  const venue = await getVenueSettings();
  if (!venue) return null;

  const primary = contactLinks(venue.phone_primary, venue.phone_primary_channels);
  const secondary = contactLinks(venue.phone_secondary, venue.phone_secondary_channels);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <p>{venue.address}</p>
      {venue.map_url && (
        <a href={venue.map_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
          View on map
        </a>
      )}
      {venue.hours_note && <p style={{ marginTop: "0.5rem" }}>{venue.hours_note}</p>}

      <div className="contact-buttons">
        {primary.call && (
          <a href={primary.call} className="btn btn-primary">
            Call {venue.phone_primary}
          </a>
        )}
        {primary.whatsapp && (
          <a href={primary.whatsapp} className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
            WhatsApp {venue.phone_primary}
          </a>
        )}
        {secondary.call && (
          <a href={secondary.call} className="btn btn-secondary" style={{ borderColor: "#141414", color: "#141414" }}>
            Call {venue.phone_secondary}
          </a>
        )}
      </div>
    </div>
  );
}

async function EnquirySection({ searchParams }: { searchParams: VisitSearchParams }) {
  const { error, submitted, game: gameSlug, event: eventSlug, type } = await searchParams;

  const [game, events] = await Promise.all([
    gameSlug ? getGameBySlug(gameSlug) : Promise.resolve(null),
    eventSlug ? getPublishedEvents() : Promise.resolve([]),
  ]);
  const event = eventSlug ? events.find((e) => e.slug === eventSlug) ?? null : null;

  const enquiryType = game ? "game" : event ? "event" : type === "group" ? "group" : "general";

  return (
    <>
      {submitted && (
        <p
          role="status"
          style={{ background: "#d7f3dd", color: "#19692c", padding: "0.75rem 1rem", borderRadius: 4, marginTop: "1rem" }}
        >
          Thanks — your enquiry has been received. Your reference is <strong>{submitted}</strong>. This confirms we
          have your message, not a booking — our team will follow up using the contact details you provided.
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{ background: "#f3d7d7", color: "#8a1f1f", padding: "0.75rem 1rem", borderRadius: 4, marginTop: "1rem" }}
        >
          {error}
        </p>
      )}

      {(game || event) && (
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.75 }}>
          Asking about: <strong>{game ? game.name : event?.title}</strong>
        </p>
      )}

      <form
        action={submitPublicEnquiry}
        style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}
      >
        {game && <input type="hidden" name="related_game_id" value={game.id} />}
        {game && <input type="hidden" name="game_slug" value={game.slug} />}
        {event && <input type="hidden" name="related_event_id" value={event.id} />}
        {event && <input type="hidden" name="event_slug" value={event.slug} />}
        <input type="hidden" name="enquiry_type" value={enquiryType} />

        <label htmlFor="contact_name" style={labelStyle}>
          Name
        </label>
        <input id="contact_name" name="contact_name" required style={formInputStyle} />

        <label htmlFor="contact_phone" style={labelStyle}>
          Phone
        </label>
        <input id="contact_phone" name="contact_phone" type="tel" style={formInputStyle} />

        <label htmlFor="contact_email" style={labelStyle}>
          Email (optional if phone given)
        </label>
        <input id="contact_email" name="contact_email" type="email" style={formInputStyle} />

        <label htmlFor="preferred_contact_method" style={labelStyle}>
          Preferred contact method
        </label>
        <select id="preferred_contact_method" name="preferred_contact_method" style={formInputStyle} defaultValue="either">
          <option value="either">No preference</option>
          <option value="call">Call</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        {!game && !event && (
          <>
            <label htmlFor="party_size" style={labelStyle}>
              Group size (optional)
            </label>
            <input id="party_size" name="party_size" type="number" min="1" style={formInputStyle} />
          </>
        )}

        <label htmlFor="message" style={labelStyle}>
          Message
        </label>
        <textarea id="message" name="message" rows={4} required style={formInputStyle} />

        <button type="submit" className="btn btn-primary" style={{ border: "none", marginTop: "0.5rem" }}>
          Send enquiry
        </button>
      </form>
    </>
  );
}

const labelStyle: React.CSSProperties = { fontSize: "0.85rem", fontWeight: 600 };

const formInputStyle: React.CSSProperties = {
  padding: "0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.95rem",
  fontFamily: "inherit",
};
