import { createClient } from "@/lib/supabase/server";
import { updateEnquiryStatus, addEnquiryNote } from "./actions";

const STATUSES = ["new", "in_progress", "awaiting_response", "resolved", "spam"];

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("enquiries")
    .select("*, enquiry_notes(id, note, created_at)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: enquiries } = await query;

  return (
    <div>
      <h1>Enquiries</h1>

      <div className="admin-actions" style={{ marginBottom: "1rem" }}>
        <a href="/admin/enquiries">All</a>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/enquiries?status=${s}`}>
            {s.replace("_", " ")}
          </a>
        ))}
      </div>

      {(enquiries ?? []).map((e) => (
        <div key={e.id} style={{ background: "white", padding: "1rem", borderRadius: 6, marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{e.public_reference}</strong>
            <span className={`admin-badge admin-badge-${e.status === "resolved" ? "available" : "draft"}`}>
              {e.status.replace("_", " ")}
            </span>
          </div>
          <p style={{ margin: "0.4rem 0" }}>
            {e.contact_name} — {e.contact_phone ?? e.contact_email} ({e.preferred_contact_method ?? "no preference"})
          </p>
          <p style={{ margin: "0.4rem 0" }}>{e.message}</p>
          <p style={{ fontSize: "0.8rem", color: "#777" }}>
            {e.enquiry_type} · {new Date(e.created_at).toLocaleString()}
          </p>

          <div className="admin-actions" style={{ marginTop: "0.5rem" }}>
            {STATUSES.filter((s) => s !== e.status).map((s) => (
              <form key={s} action={updateEnquiryStatus.bind(null, e.id, s)}>
                <button type="submit">Mark {s.replace("_", " ")}</button>
              </form>
            ))}
          </div>

          {(e.enquiry_notes ?? []).length > 0 && (
            <ul style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {(e.enquiry_notes as { id: string; note: string; created_at: string }[]).map((n) => (
                <li key={n.id}>{n.note}</li>
              ))}
            </ul>
          )}

          <form action={addEnquiryNote.bind(null, e.id)} style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <input name="note" placeholder="Add internal note" style={{ flexGrow: 1, padding: "0.4rem" }} />
            <button type="submit">Add note</button>
          </form>
        </div>
      ))}

      {(enquiries ?? []).length === 0 && <p>No enquiries.</p>}
    </div>
  );
}
