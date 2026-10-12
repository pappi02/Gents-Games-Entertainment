import { createClient } from "@/lib/supabase/server";

export type AdminRole = "super_admin" | "content_editor" | "enquiry_staff";

export type AdminProfile = {
  id: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
};

/**
 * Returns the current signed-in user's admin profile, or null if not
 * signed in / not an active admin. This is a convenience read for UI
 * decisions (what to show) — it is NOT the authorization boundary.
 *
 * The actual authorization boundary is Postgres RLS (see
 * supabase/migrations/*_init_schema.sql, docs/SECURITY.md §2): every
 * mutation goes through RLS regardless of what this function returns, so a
 * bug here can at most show/hide UI, never grant real access.
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, display_name, role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (!profile || !profile.is_active) return null;
  return profile as AdminProfile;
}

export function hasRole(profile: AdminProfile | null, roles: AdminRole[]): boolean {
  return !!profile && roles.includes(profile.role);
}
