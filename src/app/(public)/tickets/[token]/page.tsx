import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { formatEventDate, isPast } from "@/lib/public/format";
import { accessCookieName, parseOrderLinkToken, verifyAccessSession } from "@/lib/tickets/crypto";
import {
  getOrder,
  getOrderEvent,
  getOrderTickets,
  getTicketTypeName,
  maskEmail,
  syncOrderPayment,
  ticketToken,
  verifyUrl,
} from "@/lib/tickets/server";
import { Icon } from "../../_components/Icon";
import { PageTransition } from "../../_components/PageTransition";
import { AccessForm } from "./AccessForm";

export const instant = false;

export const metadata: Metadata = {
  title: "Your tickets",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const TICKET_STATUS_LABEL = { valid: "Valid", used: "Used", cancelled: "Cancelled" } as const;

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow stack-lg">
          <div>
            <p className="eyebrow">Your tickets</p>
            <h1 className="display display-lg">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </PageTransition>
  );
}

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { token } = await params;
  const { from } = await searchParams;

  let orderId: string | null = null;
  try {
    orderId = parseOrderLinkToken(token);
  } catch {
    notFound();
  }
  if (!orderId) notFound();

  let order = await getOrder(orderId);
  if (!order) notFound();

  const cookieStore = await cookies();
  const hasSession = verifyAccessSession(order.id, cookieStore.get(accessCookieName(order.id))?.value);

  // The webhook normally confirms first. This covers a delayed or lost webhook.
  // It asks Paystack directly, so visiting this URL can't fake a payment.
  if (order.status === "pending" && (hasSession || from === "payment")) {
    try {
      await syncOrderPayment(order.reference);
      order = (await getOrder(order.id)) ?? order;
    } catch {
      // Paystack unreachable: show the waiting state and try again on refresh.
    }
  }

  const event = await getOrderEvent(order.event_id);
  if (!event) notFound();
  const when = formatEventDate(event.start_at, event.timezone);

  if (order.status === "pending") {
    if (isPast(order.hold_expires_at)) {
      return (
        <Shell title="Checkout expired">
          <p className="muted">
            We haven&apos;t received a payment for this order and the hold has ended. If money left your account, contact
            us with reference <strong>{order.reference}</strong>.
          </p>
          <div className="btn-row">
            <Link href={`/events/${event.slug}#tickets`} className="btn btn-primary">
              Back to {event.title}
            </Link>
          </div>
        </Shell>
      );
    }
    return (
      <Shell title="Waiting for payment">
        {/* Rechecks automatically while the buyer approves the M-Pesa prompt. */}
        <meta httpEquiv="refresh" content="8" />
        <p className="muted" role="status">
          Your tickets for {event.title} are held. If you&apos;ve just paid, confirmation can take a moment and this page
          will update by itself.
        </p>
        <div className="btn-row">
          <Link href={`/tickets/${token}`} className="btn btn-secondary">
            Check again
          </Link>
        </div>
      </Shell>
    );
  }

  if (order.status === "cancelled") {
    return (
      <Shell title="Order not completed">
        <p className="muted">This order wasn&apos;t completed and you haven&apos;t been issued tickets.</p>
        <div className="btn-row">
          <Link href={`/events/${event.slug}#tickets`} className="btn btn-primary">
            Back to {event.title}
          </Link>
        </div>
      </Shell>
    );
  }

  if (order.status === "needs_review") {
    return (
      <Shell title="We're checking your payment">
        <p className="notice">
          <Icon name="info" />
          <span>
            We received a payment but couldn&apos;t issue tickets automatically. Our team will review it and contact you
            at {maskEmail(order.buyer_email)}. Your reference is <strong>{order.reference}</strong>.
          </span>
        </p>
      </Shell>
    );
  }

  if (order.status === "refunded") {
    return (
      <Shell title="Order refunded">
        <p className="muted">This order was refunded and its tickets are no longer valid.</p>
      </Shell>
    );
  }

  if (!hasSession) {
    return (
      <Shell title={event.title}>
        <p className="muted">
          {when.full}, {when.time} (Nairobi time)
        </p>
        <AccessForm token={token} maskedEmail={maskEmail(order.buyer_email)} />
      </Shell>
    );
  }

  const [tickets, ticketTypeName] = await Promise.all([getOrderTickets(order.id), getTicketTypeName(order.ticket_type_id)]);
  const visible = tickets.filter((t) => t.status !== "cancelled");
  const cards = await Promise.all(
    visible.map(async (ticket) => ({
      ticket,
      qr:
        ticket.status === "valid"
          ? await QRCode.toDataURL(verifyUrl(ticketToken(ticket)), { errorCorrectionLevel: "M", margin: 2, width: 320 })
          : null,
    })),
  );

  return (
    <Shell title={event.title}>
      <p className="muted">
        {when.full}, {when.time} (Nairobi time){event.location_note ? ` · ${event.location_note}` : ""}
      </p>
      {event.cancelled_at && (
        <p className="notice">
          <Icon name="info" />
          <span>This event has been cancelled. Please contact us about your refund.</span>
        </p>
      )}
      {order.email_error && (
        <p className="notice">
          <Icon name="info" />
          <span>We couldn&apos;t email your ticket link, so please bookmark this page or download your tickets now.</span>
        </p>
      )}
      <p className="notice">
        <Icon name="info" />
        <span>
          <strong>Treat each QR code like cash.</strong> Each ticket admits one person and only the first scan gets in, so
          don&apos;t post it or share it with anyone you don&apos;t trust.
        </span>
      </p>

      {visible.length > 1 && (
        <div className="btn-row">
          <a href={`/tickets/${token}/pdf`} className="btn btn-primary">
            Download all {visible.length} tickets (PDF)
          </a>
        </div>
      )}

      <ul className="ticket-grid">
        {cards.map(({ ticket, qr }, index) => (
          <li key={ticket.id} className="ticket-card">
            <p className="eyebrow">
              {ticketTypeName} · Ticket {index + 1} of {cards.length}
            </p>
            <p className="ticket-holder">{ticket.holder_name}</p>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR code for ticket ${ticket.ticket_code}`} width={240} height={240} className="ticket-qr" />
            ) : (
              <p className="ticket-used">
                <Icon name="check" /> Used
              </p>
            )}
            <p className="ticket-code">{ticket.ticket_code}</p>
            <p className="subtle">Status: {TICKET_STATUS_LABEL[ticket.status]}</p>
            {ticket.status === "valid" && (
              <a href={`/tickets/${token}/pdf?ticket=${ticket.ticket_code}`} className="btn btn-secondary btn-sm">
                Download PDF
              </a>
            )}
          </li>
        ))}
      </ul>
    </Shell>
  );
}
