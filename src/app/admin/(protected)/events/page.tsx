import { createClient } from "@/lib/supabase/server";
import { createEvent, updateEventStatus } from "./actions";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*").order("start_at", { ascending: false });

  return (
    <div>
      <h1>Events</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Per docs/PHASE_0_DISCOVERY.md §3, group events/tournaments are confirmed offered — but only publish a specific
        event once its date and details are confirmed.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Starts</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(events ?? []).map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td>{new Date(e.start_at).toLocaleString()}</td>
              <td>
                <span className={`admin-badge admin-badge-${e.publication_status}`}>{e.publication_status}</span>
              </td>
              <td className="admin-actions">
                {e.publication_status !== "published" && (
                  <form action={updateEventStatus.bind(null, e.id, "published")}>
                    <button type="submit">Publish</button>
                  </form>
                )}
                {e.publication_status === "published" && (
                  <form action={updateEventStatus.bind(null, e.id, "draft")}>
                    <button type="submit">Unpublish</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>New event</h2>
      <form action={createEvent} className="admin-form">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} required />

        <label htmlFor="start_at">Starts at</label>
        <input id="start_at" name="start_at" type="datetime-local" required />

        <label htmlFor="registration_instructions">Registration instructions (optional)</label>
        <input id="registration_instructions" name="registration_instructions" />

        <button type="submit">Create (as draft)</button>
      </form>
    </div>
  );
}
