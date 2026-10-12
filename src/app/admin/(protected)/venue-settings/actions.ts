"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function updateVenueSettings(formData: FormData) {
  const supabase = await createClient();
  const profile = await getAdminProfile();

  const phonePrimaryChannels = formData.getAll("phone_primary_channels").map(String);
  const phoneSecondaryChannels = formData.getAll("phone_secondary_channels").map(String);

  const { error } = await supabase
    .from("venue_settings")
    .update({
      brand_name: String(formData.get("brand_name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      plus_code: String(formData.get("plus_code") ?? "").trim() || null,
      map_url: String(formData.get("map_url") ?? "").trim() || null,
      phone_primary: String(formData.get("phone_primary") ?? "").trim() || null,
      phone_primary_channels: phonePrimaryChannels.length ? phonePrimaryChannels : ["call"],
      phone_secondary: String(formData.get("phone_secondary") ?? "").trim() || null,
      phone_secondary_channels: phoneSecondaryChannels.length ? phoneSecondaryChannels : ["call"],
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      hours_note: String(formData.get("hours_note") ?? "").trim() || null,
    })
    .eq("id", true);

  if (error) {
    redirect(`/admin/venue-settings?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile?.id ?? null,
    action: "update_venue_settings",
    entity_type: "venue_settings",
    entity_id: null,
  });

  revalidatePath("/admin/venue-settings");
  updateTag("venue-settings");
  redirect("/admin/venue-settings");
}
