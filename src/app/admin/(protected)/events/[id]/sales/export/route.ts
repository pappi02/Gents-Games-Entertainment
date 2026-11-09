import { getAdminProfile, hasRole } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { csvCell } from "@/lib/tickets/format";

/**
 * Attendee and order export. Route handlers don't run the admin layout's guard,
 * so the role is checked here; RLS on the tables is the second layer.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getAdminProfile();
  if (!hasRole(profile, ["super_admin", "content_editor"])) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tickets")
    .select("ticket_code, holder_name, status, checked_in_at, ticket_orders!inner(reference, buyer_email, status, total_minor_units, discount_code)")
    .eq("event_id", id)
    .order("created_at");

  const header = ["Ticket ID", "Name", "Ticket status", "Admitted at (UTC)", "Order reference", "Buyer email", "Order status", "Discount code"];
  const lines = (rows ?? []).map((row) => {
    const order = row.ticket_orders as unknown as { reference: string; buyer_email: string; status: string; discount_code: string | null };
    return [row.ticket_code, row.holder_name, row.status, row.checked_in_at, order.reference, order.buyer_email, order.status, order.discount_code]
      .map(csvCell)
      .join(",");
  });

  return new Response(`${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${id.slice(0, 8)}-tickets.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
