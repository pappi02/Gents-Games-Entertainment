import { requireRole } from "@/lib/admin/session";
import { EventForm } from "../EventForm";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["super_admin", "content_editor"]);
  const { error } = await searchParams;
  return (
    <div>
      <h1>New event</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <EventForm />
    </div>
  );
}
