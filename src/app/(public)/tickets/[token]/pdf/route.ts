import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { formatEventDate } from "@/lib/public/format";
import { accessCookieName, parseOrderLinkToken, verifyAccessSession } from "@/lib/tickets/crypto";
import { buildTicketPdf } from "@/lib/tickets/pdf";
import {
  getOrder,
  getOrderEvent,
  getOrderTickets,
  getTicketTypeName,
  logAccess,
  ticketToken,
  verifyUrl,
  withinRateLimit,
} from "@/lib/tickets/server";

const DENIED = { status: 404, headers: { "Cache-Control": "no-store" } };

/**
 * Guarded download. A PDF is generated per request, never stored, and each
 * download is logged. Every refusal is the same 404, so this can't be used to
 * probe which orders or tickets exist.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderId = parseOrderLinkToken(token);
  if (!orderId) return new Response("Not found", DENIED);

  const session = (await cookies()).get(accessCookieName(orderId))?.value;
  if (!verifyAccessSession(orderId, session)) return new Response("Not found", DENIED);

  const order = await getOrder(orderId);
  if (!order || order.status !== "paid") return new Response("Not found", DENIED);

  if (!(await withinRateLimit(`pdf:${order.id}`, 30, 3600))) {
    return new Response("Too many downloads. Please try again later.", { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const requested = request.nextUrl.searchParams.get("ticket");
  const tickets = (await getOrderTickets(order.id)).filter(
    (t) => t.status === "valid" && (!requested || t.ticket_code === requested),
  );
  if (tickets.length === 0) return new Response("Not found", DENIED);

  const [event, ticketTypeName] = await Promise.all([getOrderEvent(order.event_id), getTicketTypeName(order.ticket_type_id)]);
  if (!event) return new Response("Not found", DENIED);

  const when = formatEventDate(event.start_at, event.timezone);
  const bytes = await buildTicketPdf(
    tickets.map((ticket) => {
      const signed = ticketToken(ticket);
      return {
        ticketCode: ticket.ticket_code,
        holderName: ticket.holder_name,
        ticketTypeName,
        eventTitle: event.title,
        eventDate: when.full,
        eventTime: when.time,
        location: event.location_note,
        verifyUrl: verifyUrl(signed),
        token: signed,
        sample: event.is_demo,
      };
    }),
  );

  await Promise.all(tickets.map((ticket) => logAccess(order.id, ticket.id, "pdf_download")));

  const filename = tickets.length === 1 ? `${event.is_demo ? "sample-" : ""}ticket-${tickets[0].ticket_code}.pdf` : `tickets-${order.reference.slice(0, 12)}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
