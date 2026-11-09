import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEventDate } from "@/lib/public/format";
import { hashIp, orderLinkToken, parseTicketToken, signTicket, ticketingSecretsConfigured, verifyTicketSignature } from "./crypto";
import { demoModeEnabled } from "./demo";
import { sendTicketEmail } from "./email";
import { paystackConfigured, verifyTransaction } from "./paystack";

/**
 * Server-side ticketing operations. The service-role client bypasses RLS, so
 * nothing here may be reachable without its own checks: buyer access is proved
 * by the caller (signed link plus session), payment by Paystack itself, and
 * every state change goes through a database function with its own rules.
 */

export type OrderRow = {
  id: string;
  reference: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  buyer_name: string;
  buyer_email: string;
  total_minor_units: number;
  currency: string;
  status: "pending" | "paid" | "cancelled" | "needs_review" | "refunded";
  hold_expires_at: string;
  email_sent_at: string | null;
  email_error: string | null;
};

export type TicketRow = {
  id: string;
  ticket_code: string;
  order_id: string;
  event_id: string;
  ticket_type_id: string;
  holder_name: string;
  issued_at: string;
  status: "valid" | "used" | "cancelled";
  checked_in_at: string | null;
};

export type EventSummary = {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_note: string | null;
  cancelled_at: string | null;
  is_demo: boolean;
};

export function siteUrl() {
  // A preview's QR codes must scan back to that preview, not to the real site.
  if (demoModeEnabled() && process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return (process.env.NEXT_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Selling needs every piece in place; otherwise the site says sales are closed rather than failing at payment. */
export function ticketingReady() {
  return Boolean(ticketingSecretsConfigured() && paystackConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Sample events need no payment provider, but still need real signing keys and the server database key. */
export function demoTicketingReady() {
  return Boolean(demoModeEnabled() && ticketingSecretsConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function orderLink(orderId: string) {
  return `${siteUrl()}/tickets/${orderLinkToken(orderId)}`;
}

export function verifyUrl(token: string) {
  return `${siteUrl()}/verify/${token}`;
}

export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return hashIp(ip);
}

/** Fails closed: if the limiter can't run, the request is refused. */
export async function withinRateLimit(key: string, limit: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_ticket_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

export async function logAccess(orderId: string, ticketId: string | null, action: string, detail?: string) {
  await createAdminClient().rpc("log_ticket_access", {
    p_order_id: orderId,
    p_ticket_id: ticketId,
    p_action: action,
    p_ip_hash: await clientIpHash(),
    p_detail: detail ?? null,
  });
}

export async function getOrder(orderId: string) {
  const { data } = await createAdminClient().from("ticket_orders").select("*").eq("id", orderId).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function getOrderEvent(eventId: string) {
  const { data } = await createAdminClient()
    .from("events")
    .select("id, title, slug, start_at, end_at, timezone, location_note, cancelled_at, is_demo")
    .eq("id", eventId)
    .maybeSingle();
  return (data as EventSummary | null) ?? null;
}

export async function getOrderTickets(orderId: string) {
  const { data } = await createAdminClient()
    .from("tickets")
    .select("id, ticket_code, order_id, event_id, ticket_type_id, holder_name, issued_at, status, checked_in_at")
    .eq("order_id", orderId)
    .order("created_at");
  return (data as TicketRow[] | null) ?? [];
}

export async function getTicketTypeName(ticketTypeId: string) {
  const { data } = await createAdminClient().from("ticket_types").select("name").eq("id", ticketTypeId).maybeSingle();
  return (data?.name as string | undefined) ?? "Ticket";
}

/**
 * Sends the ticket link and records the result. The caller decides when, so a
 * repeated payment notification can't send a second email: only the first
 * "issued" outcome triggers this.
 */
export async function deliverTickets(orderId: string) {
  const order = await getOrder(orderId);
  if (!order || order.status !== "paid") return "Order isn't paid.";
  const event = await getOrderEvent(order.event_id);
  if (!event) return "Event not found.";
  // Never email from a demo, even if a real address was typed.
  if (event.is_demo) return "Demo mode: no email sent.";
  const when = formatEventDate(event.start_at, event.timezone);
  const error = await sendTicketEmail({
    to: order.buyer_email,
    name: order.buyer_name,
    eventTitle: event.title,
    eventWhen: `${when.full}, ${when.time}`,
    quantity: order.quantity,
    link: orderLink(order.id),
  });
  await createAdminClient().rpc("record_ticket_email", { p_order_id: order.id, p_error: error });
  return error;
}

export type SyncOutcome = "issued" | "already_paid" | "review" | "refunded" | "not_found" | "unpaid";

/**
 * The single path from "Paystack says paid" to tickets, used by the webhook, the
 * buyer's return page and the staff re-check button. It always asks Paystack
 * directly, so a forged request or redirect can't mark anything as paid.
 */
export async function syncOrderPayment(reference: string): Promise<SyncOutcome> {
  const transaction = await verifyTransaction(reference);
  if (!transaction || transaction.status !== "success") return "unpaid";

  const { data, error } = await createAdminClient().rpc("confirm_ticket_payment", {
    p_reference: reference,
    p_amount_minor_units: transaction.amountMinorUnits,
    p_currency: transaction.currency,
    p_provider_transaction_id: transaction.transactionId,
  });
  if (error) throw new Error(`confirm_ticket_payment failed: ${error.code ?? "unknown"}`);

  const row = (data as { order_id: string | null; outcome: SyncOutcome }[])[0];
  if (row?.outcome === "issued" && row.order_id) await deliverTickets(row.order_id);
  return row?.outcome ?? "not_found";
}

export function ticketToken(ticket: TicketRow) {
  return signTicket(ticket);
}

export type VerifiedTicket = {
  ticket: TicketRow;
  event: EventSummary;
  ticketTypeName: string;
};

/**
 * Checks the signature before trusting anything. A QR code that wasn't made
 * with our private key is rejected without revealing whether its code exists.
 */
export async function loadVerifiedTicket(token: string): Promise<VerifiedTicket | null> {
  const parsed = parseTicketToken(token);
  if (!parsed) return null;

  const { data } = await createAdminClient()
    .from("tickets")
    .select("id, ticket_code, order_id, event_id, ticket_type_id, holder_name, issued_at, status, checked_in_at")
    .eq("ticket_code", parsed.ticketCode)
    .maybeSingle();
  const ticket = (data as TicketRow | null) ?? null;
  if (!ticket || !verifyTicketSignature(parsed, ticket)) return null;

  const [event, ticketTypeName] = await Promise.all([getOrderEvent(ticket.event_id), getTicketTypeName(ticket.ticket_type_id)]);
  if (!event) return null;
  return { ticket, event, ticketTypeName };
}

/** "Am*** N***": enough for a holder to recognise, not enough to identify a stranger. */
export function maskName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? "*" : `${[...part][0]}${"*".repeat(Math.min(part.length - 1, 4))}`))
    .join(" ");
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
