"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startAt = String(formData.get("start_at") ?? "");
  const registrationInstructions = String(formData.get("registration_instructions") ?? "").trim() || null;

  if (!title || !description || !startAt) return;

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    title,
    slug: slugify(title),
    description,
    start_at: new Date(startAt).toISOString(),
    registration_instructions: registrationInstructions,
  });

  if (error) {
    redirect(`/admin/events?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/events");
  updateTag("events");
  redirect("/admin/events");
}

export async function updateEventStatus(eventId: string, status: "draft" | "published" | "archived") {
  const supabase = await createClient();
  await supabase.from("events").update({ publication_status: status }).eq("id", eventId);
  revalidatePath("/admin/events");
  updateTag("events");
}
