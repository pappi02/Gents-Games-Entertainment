import { requireRole } from "@/lib/admin/session";
import { connection } from "next/server";
import { formatEventDate, isoDaysAgo } from "@/lib/public/format";
import { createClient } from "@/lib/supabase/server";
import { checkInTypedCode } from "./actions";

const RESULTS: Record<string, { ok: boolean; message: string }> = {
  admitted: { ok: true, message: "Admitted. Let this guest in." },
  already_used: { ok: false, message: "Do not admit. This ticket has already been used." },
  cancelled: { ok: false, message: "Do not admit. This ticket has been cancelled." },
  wrong_event: { ok: false, message: "Do not admit. This ticket is for a different event." },
  event_cancelled: { ok: false, message: "Do not admit. This event was cancelled." },
  outside_window: { ok: false, message: "Do not admit. Check-in opens 12 hours before the event and closes 6 hours after it." },
  not_found: { ok: false, message: "Do not admit. No ticket has that ID." },
  error: { ok: false, message: "Check-in failed. Nothing was recorded. Try again." },
};

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; result?: string; code?: string; name?: string }>;
}) {
  await requireRole(["super_admin", "content_editor", "enquiry_staff"]);
  await connection(); // The event list depends on the current time.
  const { event: eventId, result, code, name } = await searchParams;
  const supabase = await createClient();

  const since = isoDaysAgo(2);
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_at, timezone")
    .eq("publication_status", "published")
    .is("cancelled_at", null)
    .gte("start_at", since)
    .order("start_at")
    .limit(30);

  const selected = (events ?? []).find((e) => e.id === eventId) ?? null;
  const { data: stats } = selected ? await supabase.rpc("admin_door_stats", { p_event_id: selected.id }) : { data: null };
  const counts = stats?.[0] as { total: number; admitted: number } | undefined;
  const outcome = result ? RESULTS[result] : null;

  return (
    <div>
      <h1>Door Check-in</h1>

      <p className="admin-section-note">
        <strong>To scan:</strong> stay signed in on your phone and point the phone&apos;s camera at the guest&apos;s QR code. Open the
        link it shows, check the result, then tap <em>Admit guest</em>. Each ticket can only be admitted once.
      </p>

      <form method="get" className="admin-form">
        <label htmlFor="event">Event</label>
        <select id="event" name="event" defaultValue={selected?.id ?? ""} required>
          <option value="" disabled>
            Choose an event
          </option>
          {(events ?? []).map((e) => {
            const d = formatEventDate(e.start_at, e.timezone);
            return (
              <option key={e.id} value={e.id}>
                {e.title} ({d.day} {d.month})
              </option>
            );
          })}
        </select>
        <button type="submit">Select event</button>
      </form>

      {selected && (
        <>
          {counts && (
            <p className="admin-stat-line">
              <strong>{counts.admitted}</strong> admitted of <strong>{counts.total}</strong> tickets
            </p>
          )}

          {outcome && (
            <div className={outcome.ok ? "admin-door-result admin-door-ok" : "admin-door-result admin-door-bad"} role="alert">
              <div>{outcome.message}</div>
              {code && <div className="admin-door-detail">Ticket {code}{name ? ` · ${name}` : ""}</div>}
              <div className="admin-door-detail">Typed ID: the digital signature wasn&apos;t checked.</div>
            </div>
          )}

          <h2>Can&apos;t scan? Type the ticket ID</h2>
          <form action={checkInTypedCode.bind(null, selected.id)} className="admin-form">
            <label htmlFor="code">Ticket ID</label>
            <input id="code" name="code" required autoComplete="off" autoCapitalize="characters" autoFocus placeholder="GG-XXXX-XXXX-XXXX" />
            <button type="submit">Check in</button>
          </form>
        </>
      )}
    </div>
  );
}
