"use server";

import { getAdminProfile } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAdminUser(formData: FormData) {
  // Explicit authorization check — this is the first line of defense since
  // the service-role client used below bypasses RLS entirely.
  // docs/SECURITY.md §2: deny-by-default, enforced server-side.
  const caller = await getAdminProfile();
  if (caller?.role !== "super_admin") {
    redirect("/admin/users?error=" + encodeURIComponent("Only super admins can create admin users."));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = String(formData.get("role") ?? "enquiry_staff");

  if (!email || !password || !displayName) {
    redirect("/admin/users?error=" + encodeURIComponent("All fields are required."));
  }
  if (password.length < 8) {
    redirect("/admin/users?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    redirect("/admin/users?error=" + encodeURIComponent(createErr?.message ?? "Failed to create user."));
  }

  const { error: profileErr } = await admin.from("admin_profiles").insert({
    id: created.user.id,
    display_name: displayName,
    role,
    is_active: true,
  });

  if (profileErr) {
    redirect("/admin/users?error=" + encodeURIComponent(profileErr.message));
  }

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    action: "create_admin_user",
    entity_type: "admin_profiles",
    entity_id: created.user.id,
    summary: `Created admin user "${displayName}" with role ${role}.`,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setAdminUserActive(userId: string, isActive: boolean) {
  const caller = await getAdminProfile();
  if (caller?.role !== "super_admin") return;

  const supabase = await createClient();
  await supabase.from("admin_profiles").update({ is_active: isActive }).eq("id", userId);
  await supabase.from("audit_logs").insert({
    actor_id: caller.id,
    action: isActive ? "activate_admin_user" : "deactivate_admin_user",
    entity_type: "admin_profiles",
    entity_id: userId,
  });
  revalidatePath("/admin/users");
}
