import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/session";
import { formatEventDate, formatMoney, isPast } from "@/lib/public/format";
import { createClient } from "@/lib/supabase/server";
import { correctOrderEmail, recheckPayment, recordRefund, replaceTicket, resendTicketEmail } from "./actions";

type Order = {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  subtotal_minor_units: number;
  discount_minor_units: number;
  total_minor_units: number;
  currency: string;
  discount_code: string | null;
  status: string;
  review_reason: string | null;
  hold_expires_at: string;
  email_sent_at: string | null;
  email_error: string | null;
  refund_note: string | null;
  created_at: string;
  tickets: { id: string; ticket_code: string; status: string; checked_in_at: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Awaiting payment",
  expired: "Hold expired",
  cancelled: "Not completed",
  needs_review: "Needs review",
  refunded: "Refunded",
};

export default async function EventSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const profile = await requireRole(["super_admin", "content_editor"]);
  const { id } = await params;
  const { error, notice } = await searchParams;
  const supabase = await createClient();

  const [{ data: event }, { data: ticketType }, { data: orderRows }] = await Promise.all([
    supabase.from("events").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("ticket_types").select("name, quantity_total, currency").eq("event_id", id).maybeSingle(),
    supabase
      .from("ticket_orders")
      .select("*, tickets!tickets_order_id_fkey(id, ticket_code, status, checked_in_at)")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (!event) notFound();

  const isSuperAdmin = profile.role === "super_admin";
  const orders = (orderRows ?? []) as Order[];
  const paid = orders.filter((o) => o.status === "paid");
  const currency = ticketType?.currency ?? "KES";

  const sold = paid.reduce((sum, o) => sum + o.quantity, 0);
  const held = orders
    .filter((o) => o.status === "pending" && !isPast(o.hold_expires_at))
    .reduce((sum, o) => sum + o.quantity, 0);
  const revenue = paid.reduce((sum, o) => sum + Number(o.total_minor_units), 0);
  const discounts = paid.reduce((sum, o) => sum + Number(o.discount_minor_units), 0);
  const admitted = paid.flatMap((o) => o.tickets).filter((t) => t.status === "used").length;
  const reviewCount = orders.filter((o) => o.status === "needs_review").length;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Sales: {event.title}</h1>
        <a href={`/admin/events/${id}/sales/export`} className="admin-button-link">
          Export CSV
        </a>
      </div>
      {error && <p className="admin-auth-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}
      {reviewCount > 0 && (
        <p className="admin-warning">
          {reviewCount} {reviewCount === 1 ? "payment needs" : "payments need"} review. These buyers paid but have no tickets.
        </p>
      )}

      <div className="admin-stats">
        <Stat label="Tickets sold" value={`${sold} of ${ticketType?.quantity_total ?? 0}`} />
        <Stat label="Held at checkout" value={held} />
        <Stat label="Admitted" value={admitted} />
        <Stat label="Revenue (before fees)" value={formatMoney(revenue, currency)} />
        <Stat label="Discounts given" value={formatMoney(discounts, currency)} />
      </div>

      <h2>Orders</h2>
      {orders.length === 0 && <p className="admin-section-note">No orders yet.</p>}
      <div className="admin-orders">
        {orders.map((order) => {
          const expired = order.status === "pending" && isPast(order.hold_expires_at);
          const statusKey = expired ? "expired" : order.status;
          const created = formatEventDate(order.created_at);
          return (
            <details key={order.id} className="admin-order">
              <summary>
                <span className={`admin-badge admin-order-${statusKey}`}>{STATUS_LABEL[statusKey] ?? statusKey}</span>{" "}
                <strong>{order.buyer_name}</strong> · {order.quantity} × · {formatMoney(Number(order.total_minor_units), order.currency)}
                {order.email_error && <span className="admin-badge admin-order-needs_review"> email failed</span>}
              </summary>
              <dl className="admin-order-facts">
                <dt>Reference</dt>
                <dd>{order.reference}</dd>
                <dt>Email</dt>
                <dd>
                  {order.buyer_email}
                  {order.email_error ? ` (failed: ${order.email_error})` : order.email_sent_at ? " (tickets sent)" : ""}
                </dd>
                <dt>Placed</dt>
                <dd>
                  {created.day} {created.month}, {created.time}
                </dd>
                {order.discount_code && (
                  <>
                    <dt>Discount</dt>
                    <dd>
                      {order.discount_code}: −{formatMoney(Number(order.discount_minor_units), order.currency)}
                    </dd>
                  </>
                )}
                {order.review_reason && (
                  <>
                    <dt>Review reason</dt>
                    <dd>{order.review_reason}</dd>
                  </>
                )}
                {order.refund_note && (
                  <>
                    <dt>Refund note</dt>
                    <dd>{order.refund_note}</dd>
                  </>
                )}
              </dl>

              {order.tickets.length > 0 && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Status</th>
                      {isSuperAdmin && <th>Replace if leaked or lost</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {order.tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>{ticket.ticket_code}</td>
                        <td>{ticket.status}</td>
                        {isSuperAdmin && (
                          <td>
                            {ticket.status === "valid" && (
                              <form action={replaceTicket.bind(null, id, ticket.id)} className="admin-inline-form">
                                <input name="reason" placeholder="Reason" aria-label={`Reason for replacing ${ticket.ticket_code}`} />
                                <button type="submit">Cancel and reissue</button>
                              </form>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="admin-actions admin-actions-wrap admin-order-actions">
                {(order.status === "pending" || order.status === "cancelled") && (
                  <form action={recheckPayment.bind(null, id, order.id)}>
                    <button type="submit">Re-check payment</button>
                  </form>
                )}
                {order.status === "paid" && (
                  <form action={resendTicketEmail.bind(null, id, order.id)}>
                    <button type="submit">Resend ticket email</button>
                  </form>
                )}
              </div>

              {isSuperAdmin && order.status === "paid" && (
                <form action={correctOrderEmail.bind(null, id, order.id)} className="admin-inline-form">
                  <input name="email" type="email" required placeholder="Correct email address" aria-label="Correct email address" />
                  <button type="submit">Update email and resend</button>
                </form>
              )}
              {isSuperAdmin && (order.status === "paid" || order.status === "needs_review") && (
                <form action={recordRefund.bind(null, id, order.id)} className="admin-inline-form">
                  <input name="note" required placeholder="Paystack refund reference" aria-label="Paystack refund reference" />
                  <button type="submit">Record refund</button>
                </form>
              )}
            </details>
          );
        })}
      </div>
      <p className="admin-hint">
        Refund the buyer in the Paystack dashboard first. Recording it here cancels their unused tickets, but doesn&apos;t move money.
      </p>
      <p>
        <Link href="/admin/events">Back to events</Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-hint">{label}</div>
    </div>
  );
}
