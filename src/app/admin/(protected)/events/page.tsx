import { requireRole } from "@/lib/admin/session";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, formatMoney } from "@/lib/public/format";
import { ticketingReady } from "@/lib/tickets/server";
import { cancelEvent, setTicketSales, updateEventStatus } from "./actions";

type TicketType = {
  id: string;
  name: string;
  price_minor_units: number;
  currency: string;
  quantity_total: number;
  sales_status: string;
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["super_admin", "content_editor"]);
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: paidOrders }] = await Promise.all([
    supabase.from("events").select("*, ticket_types(*)").order("start_at", { ascending: false }),
    supabase.from("ticket_orders").select("event_id, quantity").eq("status", "paid"),
  ]);

  const sold = new Map<string, number>();
  for (const order of paidOrders ?? []) sold.set(order.event_id, (sold.get(order.event_id) ?? 0) + order.quantity);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Events &amp; Tickets</h1>
        <Link href="/admin/events/new" className="admin-button-link">
          New event
        </Link>
      </div>
      {error && <p className="admin-auth-error">{error}</p>}
      {!ticketingReady() && (
        <p className="admin-warning">
          Online sales are switched off because the payment or ticket-signing settings are missing, so the site shows tickets
          as not on sale. See docs/EVENT_TICKETING.md.
        </p>
      )}
      <p className="admin-section-note">
        Only publish an event, and only open sales, once its date, price and ticket numbers are confirmed.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Starts (Nairobi)</th>
            <th>Status</th>
            <th>Tickets</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(events ?? []).map((e) => {
            const when = formatEventDate(e.start_at, e.timezone);
            const ticket = ((e.ticket_types as TicketType[] | null) ?? [])[0];
            const onSale = ticket?.sales_status === "on_sale";
            return (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>
                  {when.day} {when.month}, {when.time}
                </td>
                <td>
                  <span className={`admin-badge admin-badge-${e.publication_status}`}>{e.publication_status}</span>
                  {e.cancelled_at && <span className="admin-badge admin-badge-archived"> cancelled</span>}
                </td>
                <td>
                  {ticket ? (
                    <>
                      {ticket.name}, {formatMoney(Number(ticket.price_minor_units), ticket.currency)}
                      <br />
                      {sold.get(e.id) ?? 0} of {ticket.quantity_total} sold · {onSale ? "on sale" : "sales closed"}
                    </>
                  ) : (
                    "Enquiry only"
                  )}
                </td>
                <td className="admin-actions admin-actions-wrap">
                  <Link href={`/admin/events/${e.id}/edit`}>Edit</Link>
                  {ticket && <Link href={`/admin/events/${e.id}/sales`}>Sales</Link>}
                  {e.publication_status !== "published" ? (
                    <form action={updateEventStatus.bind(null, e.id, "published")}>
                      <button type="submit">Publish</button>
                    </form>
                  ) : (
                    <form action={updateEventStatus.bind(null, e.id, "draft")}>
                      <button type="submit">Unpublish</button>
                    </form>
                  )}
                  {ticket && !e.cancelled_at && e.publication_status === "published" && (
                    <form action={setTicketSales.bind(null, e.id, onSale ? "closed" : "on_sale")}>
                      <button type="submit">{onSale ? "Close sales" : "Open sales"}</button>
                    </form>
                  )}
                  {!e.cancelled_at && (
                    <form action={cancelEvent.bind(null, e.id)}>
                      <button type="submit">Cancel event</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
