import { createPublicClient } from "@/lib/supabase/public";
import { publicImageUrl } from "@/lib/public/media";
import { ticketingReady } from "@/lib/tickets/server";

export type SaleState =
  | "on_sale"
  | "not_started"
  | "closed"
  | "sales_ended"
  | "sold_out"
  | "all_held"
  | "cancelled"
  | "ended";

export type TicketAvailability = {
  event_id: string;
  ticket_type_id: string;
  name: string;
  description: string | null;
  price_minor_units: number;
  currency: string;
  state: SaleState;
  can_buy: number;
};

/**
 * Live availability, deliberately uncached: a stale "on sale" for a sold-out
 * event would break the facility-accuracy rule. If payments or signing keys
 * aren't configured, tickets show as closed rather than failing at checkout.
 */
export async function getTicketAvailability(eventId?: string): Promise<TicketAvailability[]> {
  const { data, error } = await createPublicClient().rpc("ticket_availability", { p_event_id: eventId ?? null });
  if (error || !data) return [];
  const ready = ticketingReady();
  return (data as TicketAvailability[]).map((row) => ({
    ...row,
    price_minor_units: Number(row.price_minor_units),
    state: !ready && row.state === "on_sale" ? "closed" : row.state,
    can_buy: !ready ? 0 : row.can_buy,
  }));
}

/** Never colour alone: each state always renders with this text. */
export const SALE_STATE_LABEL: Record<SaleState, string> = {
  on_sale: "Tickets on sale",
  not_started: "Tickets on sale soon",
  closed: "Tickets not on sale",
  sales_ended: "Ticket sales ended",
  sold_out: "Sold out",
  all_held: "Remaining tickets on hold",
  cancelled: "Cancelled",
  ended: "Event finished",
};

export function eventPosterUrl(path: string) {
  return publicImageUrl("event-media", path);
}
