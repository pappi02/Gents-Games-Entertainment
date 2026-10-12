import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { createAdminUser, setAdminUserActive } from "./actions";
import { redirect } from "next/navigation";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getAdminProfile();
  if (profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: users } = await supabase.from("admin_profiles").select("*").order("created_at");

  return (
    <div>
      <h1>Admin users</h1>
      {error && <p className="admin-auth-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((u) => (
            <tr key={u.id}>
              <td>{u.display_name}</td>
              <td>{u.role.replace("_", " ")}</td>
              <td>{u.is_active ? "Yes" : "No"}</td>
              <td className="admin-actions">
                {u.id !== profile.id && (
                  <form action={setAdminUserActive.bind(null, u.id, !u.is_active)}>
                    <button type="submit">{u.is_active ? "Deactivate" : "Activate"}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>New admin user</h2>
      <form action={createAdminUser} className="admin-form">
        <label htmlFor="display_name">Display name</label>
        <input id="display_name" name="display_name" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Temporary password</label>
        <input id="password" name="password" type="password" minLength={8} required />

        <label htmlFor="role">Role</label>
        <select id="role" name="role" defaultValue="enquiry_staff">
          <option value="enquiry_staff">Enquiry staff</option>
          <option value="content_editor">Content editor</option>
          <option value="super_admin">Super admin</option>
        </select>

        <button type="submit">Create user</button>
      </form>
    </div>
  );
}
