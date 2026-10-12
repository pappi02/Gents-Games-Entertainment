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

function fieldsFromForm(formData: FormData) {
  return {
    category_id: String(formData.get("category_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    short_description: String(formData.get("short_description") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    typical_players: String(formData.get("typical_players") ?? "").trim() || null,
    typical_duration: String(formData.get("typical_duration") ?? "").trim() || null,
    rules: String(formData.get("rules") ?? "").trim() || null,
    facility_status: String(formData.get("facility_status") ?? "unverified"),
    publication_status: String(formData.get("publication_status") ?? "draft"),
    featured: formData.get("featured") === "on",
  };
}

export async function createGame(formData: FormData) {
  const fields = fieldsFromForm(formData);
  if (!fields.name || !fields.category_id) return;

  const supabase = await createClient();
  const profile = await getAdminProfile();
  const { error } = await supabase.from("games").insert({
    ...fields,
    slug: slugify(fields.name),
    created_by: profile?.id ?? null,
    updated_by: profile?.id ?? null,
  });

  if (error) {
    redirect(`/admin/games/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/games");
  updateTag("games");
  redirect("/admin/games");
}

export async function updateGame(gameId: string, formData: FormData) {
  const fields = fieldsFromForm(formData);

  const supabase = await createClient();
  const { data: before } = await supabase.from("games").select("publication_status, created_by, updated_by").eq("id", gameId).single();
  const profile = await getAdminProfile();

  const { error } = await supabase
    .from("games")
    .update({ ...fields, updated_by: profile?.id ?? null, created_by: before?.created_by ?? profile?.id ?? null })
    .eq("id", gameId);

  if (error) {
    redirect(`/admin/games/${gameId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  if (before && before.publication_status !== fields.publication_status) {
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      action: `game_${fields.publication_status}`,
      entity_type: "games",
      entity_id: gameId,
      summary: `Changed publication_status from ${before.publication_status} to ${fields.publication_status}.`,
    });
  }

  revalidatePath("/admin/games");
  updateTag("games");
  redirect("/admin/games");
}
