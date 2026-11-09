import { minorUnitsToKesInput, utcToNairobiInput } from "@/lib/tickets/format";
import { eventPosterUrl } from "@/lib/public/tickets";
import { saveEvent } from "./actions";

type EventValues = {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  location_note: string | null;
  registration_instructions: string | null;
  poster_path: string | null;
  poster_alt: string | null;
};

type TicketValues = {
  name: string;
  description: string | null;
  price_minor_units: number;
  quantity_total: number;
  max_per_order: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
};

export function EventForm({ event, ticket }: { event?: EventValues; ticket?: TicketValues | null }) {
  return (
    <form action={saveEvent.bind(null, event?.id ?? null)} className="admin-form">
      <h2 className="admin-form-heading">Event details</h2>

      <label htmlFor="title">Title</label>
      <input id="title" name="title" required maxLength={150} defaultValue={event?.title} />

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" rows={5} required defaultValue={event?.description} />

      <label htmlFor="start_at">Starts (Nairobi time)</label>
      <input id="start_at" name="start_at" type="datetime-local" required defaultValue={utcToNairobiInput(event?.start_at)} />

      <label htmlFor="end_at">Ends (Nairobi time, optional)</label>
      <input id="end_at" name="end_at" type="datetime-local" defaultValue={utcToNairobiInput(event?.end_at)} />

      <label htmlFor="location_note">Location (optional)</label>
      <input
        id="location_note"
        name="location_note"
        maxLength={150}
        placeholder="Leave blank if it's at the main venue"
        defaultValue={event?.location_note ?? ""}
      />

      <label htmlFor="registration_instructions">Extra instructions (optional)</label>
      <input id="registration_instructions" name="registration_instructions" defaultValue={event?.registration_instructions ?? ""} />

      <h2 className="admin-form-heading">Poster</h2>
      {event?.poster_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eventPosterUrl(event.poster_path)} alt={event.poster_alt ?? ""} className="admin-poster-preview" />
      )}
      <label htmlFor="poster">{event?.poster_path ? "Replace poster" : "Poster image"} (JPEG, PNG or WebP, max 4 MB)</label>
      <input id="poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp" />

      <label htmlFor="poster_alt">Poster description, for screen readers</label>
      <input id="poster_alt" name="poster_alt" maxLength={200} defaultValue={event?.poster_alt ?? ""} />

      <h2 className="admin-form-heading">Tickets</h2>
      <p className="admin-hint">Only enter a price and quantity the owner has confirmed. Leave both blank for an enquiry-only event.</p>

      <label htmlFor="ticket_name">Ticket name</label>
      <input id="ticket_name" name="ticket_name" maxLength={80} defaultValue={ticket?.name ?? "Gentleman Experience"} />

      <label htmlFor="ticket_description">What the ticket includes (optional)</label>
      <input id="ticket_description" name="ticket_description" defaultValue={ticket?.description ?? ""} />

      <label htmlFor="ticket_price">Price (KES)</label>
      <input id="ticket_price" name="ticket_price" inputMode="decimal" defaultValue={minorUnitsToKesInput(ticket?.price_minor_units)} />

      <label htmlFor="ticket_quantity">Tickets available</label>
      <input id="ticket_quantity" name="ticket_quantity" type="number" min={1} defaultValue={ticket?.quantity_total} />

      <label htmlFor="ticket_max_per_order">Most tickets per order</label>
      <input id="ticket_max_per_order" name="ticket_max_per_order" type="number" min={1} max={50} defaultValue={ticket?.max_per_order ?? 10} />

      <label htmlFor="ticket_sales_start">Sales start (Nairobi time, optional)</label>
      <input id="ticket_sales_start" name="ticket_sales_start" type="datetime-local" defaultValue={utcToNairobiInput(ticket?.sales_start_at)} />

      <label htmlFor="ticket_sales_end">Sales end (Nairobi time, optional)</label>
      <input id="ticket_sales_end" name="ticket_sales_end" type="datetime-local" defaultValue={utcToNairobiInput(ticket?.sales_end_at)} />

      <button type="submit">{event ? "Save changes" : "Create (as draft)"}</button>
    </form>
  );
}
