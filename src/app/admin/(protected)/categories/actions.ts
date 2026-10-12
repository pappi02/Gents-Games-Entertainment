"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return;

  const supabase = await createClient();
  // RLS (game_categories_admin_all) enforces that only super_admin/
  // content_editor can actually write — this insert fails for anyone else,
  // regardless of what the UI shows them.
  const { error } = await supabase.from("game_categories").insert({
    name,
    slug: slugify(name),
    description,
  });

  if (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  updateTag("categories");
  redirect("/admin/categories");
}

export async function updateCategoryStatus(categoryId: string, status: "draft" | "published" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("game_categories")
    .update({ publication_status: status })
    .eq("id", categoryId);

  if (!error) {
    const profile = await getAdminProfile();
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      action: `category_${status}`,
      entity_type: "game_categories",
      entity_id: categoryId,
    });
    revalidatePath("/admin/categories");
    updateTag("categories");
  }
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  const supabase = await createClient();
  const { error } = await supabase
    .from("game_categories")
    .update({ name, description, sort_order: sortOrder })
    .eq("id", categoryId);

  if (error) {
    redirect(`/admin/categories/${categoryId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  updateTag("categories");
  redirect("/admin/categories");
}
