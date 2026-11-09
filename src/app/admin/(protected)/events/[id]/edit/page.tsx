import { requireRole } from "@/lib/admin/session";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "../../EventForm";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["super_admin", "content_editor"]);
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();
  const { data: ticket } = await supabase.from("ticket_types").select("*").eq("event_id", id).maybeSingle();

  return (
    <div>
      <h1>Edit event</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <EventForm event={event} ticket={ticket ? { ...ticket, price_minor_units: Number(ticket.price_minor_units) } : null} />
    </div>
  );
}
