import { requireRole } from "@/lib/admin/session";
import { formatEventDate, formatMoney } from "@/lib/public/format";
import { createClient } from "@/lib/supabase/server";
import { createDiscountCode, setDiscountCodeActive } from "./actions";

export default async function DiscountCodesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["super_admin"]);

  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: codes }, { data: events }, { data: paidOrders }] = await Promise.all([
    supabase.from("discount_codes").select("*, events(title)").order("created_at", { ascending: false }),
    supabase.from("events").select("id, title").is("cancelled_at", null).order("start_at", { ascending: false }),
    supabase.from("ticket_orders").select("discount_code_id").eq("status", "paid").not("discount_code_id", "is", null),
  ]);

  const uses = new Map<string, number>();
  for (const order of paidOrders ?? []) uses.set(order.discount_code_id, (uses.get(order.discount_code_id) ?? 0) + 1);

  const date = (iso: string | null) => {
    if (!iso) return null;
    const d = formatEventDate(iso);
    return `${d.day} ${d.month}, ${d.time}`;
  };

  return (
    <div>
      <h1>Discount Codes</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p className="admin-section-note">
        A code applies once per order, and a fixed amount comes off the order total. A code can&apos;t reduce an order below KES 10.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Applies to</th>
            <th>Valid</th>
            <th>Paid uses</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {(codes ?? []).map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.code}</strong>
                {c.note && <div className="admin-hint">{c.note}</div>}
              </td>
              <td>{c.kind === "percent" ? `${c.amount}% off` : `${formatMoney(c.amount, "KES")} off`}</td>
              <td>{(c.events as unknown as { title: string } | null)?.title ?? "All events"}</td>
              <td>
                {date(c.starts_at) ?? "Now"} to {date(c.ends_at) ?? "no end date"}
              </td>
              <td>
                {uses.get(c.id) ?? 0}
                {c.max_uses ? ` of ${c.max_uses}` : ""}
              </td>
              <td>{c.is_active ? "Active" : "Off"}</td>
              <td className="admin-actions">
                <form action={setDiscountCodeActive.bind(null, c.id, !c.is_active)}>
                  <button type="submit">{c.is_active ? "Turn off" : "Turn on"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>New discount code</h2>
      <form action={createDiscountCode} className="admin-form">
        <label htmlFor="code">Code</label>
        <input id="code" name="code" required maxLength={32} placeholder="MASK500" />

        <label htmlFor="kind">Discount type</label>
        <select id="kind" name="kind" defaultValue="percent">
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off (KES)</option>
        </select>

        <label htmlFor="amount">Percentage or KES amount</label>
        <input id="amount" name="amount" required inputMode="decimal" placeholder="10 for 10%, or 500 for KES 500" />

        <label htmlFor="event_id">Applies to</label>
        <select id="event_id" name="event_id" defaultValue="">
          <option value="">All events</option>
          {(events ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>

        <label htmlFor="starts_at">Starts (Nairobi time, optional)</label>
        <input id="starts_at" name="starts_at" type="datetime-local" />

        <label htmlFor="ends_at">Ends (Nairobi time, optional)</label>
        <input id="ends_at" name="ends_at" type="datetime-local" />

        <label htmlFor="max_uses">Total uses allowed (optional)</label>
        <input id="max_uses" name="max_uses" type="number" min={1} />

        <label htmlFor="note">Internal note (optional)</label>
        <input id="note" name="note" maxLength={200} />

        <button type="submit">Create code</button>
      </form>
    </div>
  );
}
