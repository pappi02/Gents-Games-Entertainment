import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const profile = await getAdminProfile();
  if (profile?.role !== "super_admin") redirect("/admin");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, summary, created_at, admin_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1>Audit log</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {(logs ?? []).map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.created_at).toLocaleString()}</td>
              <td>{(l.admin_profiles as unknown as { display_name: string } | null)?.display_name ?? "—"}</td>
              <td>{l.action}</td>
              <td>{l.entity_type}</td>
              <td>{l.summary ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(logs ?? []).length === 0 && <p>No audit entries yet.</p>}
    </div>
  );
}
