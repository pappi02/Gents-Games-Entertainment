import { contactLinks } from "@/lib/public/contact";
import { Icon } from "./Icon";

type VenueContact = {
  phone_primary: string | null;
  phone_primary_channels: string[] | null;
} | null;

/**
 * Call / WhatsApp buttons built only from venue_settings — a channel is
 * shown only when the venue has confirmed it for that number.
 */
export function ContactActions({ venue, primaryCall = false }: { venue: VenueContact; primaryCall?: boolean }) {
  const links = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);
  return (
    <>
      {links.call && (
        <a href={links.call} className={`btn ${primaryCall ? "btn-primary" : "btn-secondary"}`}>
          <Icon name="phone" />
          Call us
        </a>
      )}
      {links.whatsapp && (
        <a href={links.whatsapp} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
          <Icon name="chat" />
          WhatsApp<span className="visually-hidden"> (opens WhatsApp)</span>
        </a>
      )}
    </>
  );
}
