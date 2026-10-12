"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { revalidatePath } from "next/cache";

export async function updateEnquiryStatus(enquiryId: string, newStatus: string) {
  const supabase = await createClient();
  const profile = await getAdminProfile();

  const { data: current } = await supabase.from("enquiries").select("status").eq("id", enquiryId).single();

  const { error } = await supabase.from("enquiries").update({ status: newStatus }).eq("id", enquiryId);
  if (!error && current) {
    await supabase.from("enquiry_status_history").insert({
      enquiry_id: enquiryId,
      old_status: current.status,
      new_status: newStatus,
      changed_by: profile?.id ?? null,
    });
  }

  revalidatePath("/admin/enquiries");
}

export async function addEnquiryNote(enquiryId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const supabase = await createClient();
  const profile = await getAdminProfile();

  await supabase.from("enquiry_notes").insert({
    enquiry_id: enquiryId,
    admin_id: profile?.id ?? null,
    note,
  });

  revalidatePath("/admin/enquiries");
}
