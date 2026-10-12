import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";

export default async function AdminDashboardPage() {
  const profile = await getAdminProfile();
  const supabase = await createClient();

  const [draftGames, newEnquiries, upcomingEvents] = await Promise.all([
    supabase.from("games").select("id", { count: "exact", head: true }).eq("publication_status", "draft"),
    profile && ["super_admin", "content_editor", "enquiry_staff"].includes(profile.role)
      ? supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: null }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("publication_status", "published"),
  ]);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Signed in as {profile?.display_name} ({profile?.role.replace("_", " ")})</p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <SummaryCard label="Draft games needing review" value={draftGames.count ?? 0} href="/admin/games?status=draft" />
        <SummaryCard label="New enquiries" value={newEnquiries.count ?? "—"} href="/admin/enquiries?status=new" />
        <SummaryCard label="Published events" value={upcomingEvents.count ?? 0} href="/admin/events" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        background: "white",
        padding: "1rem 1.25rem",
        borderRadius: 6,
        textDecoration: "none",
        color: "#1a1a1a",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "0.85rem", color: "#555" }}>{label}</div>
    </a>
  );
}
