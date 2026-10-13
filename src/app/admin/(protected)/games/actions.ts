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
    beginner_notes: String(formData.get("beginner_notes") ?? "").trim() || null,
    equipment_notes: String(formData.get("equipment_notes") ?? "").trim() || null,
    facility_status: String(formData.get("facility_status") ?? "unverified"),
    publication_status: String(formData.get("publication_status") ?? "draft"),
    featured: formData.get("featured") === "on",
  };
}

/**
 * Facility-accuracy gate (docs/CLAUDE.md): an unverified game can never be
 * published or featured. Enforced here, server-side, not by hiding options
 * in the form. Returns an error message, or null when the fields are valid.
 */
function publishingError(fields: ReturnType<typeof fieldsFromForm>): string | null {
  if (fields.publication_status === "published" && fields.facility_status === "unverified") {
    return "An unverified game can't be published. Confirm it with the owner and set its facility status first (Available, Coming soon or Unavailable).";
  }
  if (fields.featured && fields.facility_status === "unverified") {
    return "An unverified game can't be featured on the homepage.";
  }
  return null;
}

export async function createGame(formData: FormData) {
  const fields = fieldsFromForm(formData);
  if (!fields.name || !fields.category_id) return;
  const invalid = publishingError(fields);
  if (invalid) redirect(`/admin/games/new?error=${encodeURIComponent(invalid)}`);

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
  const invalid = publishingError(fields);
  if (invalid) redirect(`/admin/games/${gameId}/edit?error=${encodeURIComponent(invalid)}`);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("games")
    .select("publication_status, facility_status, created_by, updated_by")
    .eq("id", gameId)
    .single();
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

  if (before && before.facility_status !== fields.facility_status) {
    await supabase.from("audit_logs").insert({
      actor_id: profile?.id ?? null,
      action: `game_facility_${fields.facility_status}`,
      entity_type: "games",
      entity_id: gameId,
      summary: `Changed facility_status from ${before.facility_status} to ${fields.facility_status}.`,
    });
  }

  revalidatePath("/admin/games");
  updateTag("games");
  redirect("/admin/games");
}
