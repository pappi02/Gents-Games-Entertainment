"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { normalizeTypedTicketCode } from "@/lib/tickets/crypto";

/**
 * Typed check-in, for when a phone can't scan. With no QR there's no signature
 * to verify, so the event must match and the screen says the signature wasn't
 * checked. The database function makes the transition atomic.
 */
export async function checkInTypedCode(eventId: string, formData: FormData) {
  await requireRole(["super_admin", "content_editor", "enquiry_staff"]);
  const path = `/admin/check-in?event=${encodeURIComponent(eventId)}`;

  const code = normalizeTypedTicketCode(String(formData.get("code") ?? ""));
  if (!code) redirect(`${path}&result=not_found`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_check_in_ticket", {
    p_ticket_code: code,
    p_method: "typed",
    p_event_id: eventId,
  });
  const row = data?.[0];
  const result = error || !row ? "error" : row.result;
  const name = result === "admitted" && row?.holder_name ? `&name=${encodeURIComponent(row.holder_name)}` : "";
  redirect(`${path}&result=${encodeURIComponent(result)}&code=${encodeURIComponent(code)}${name}`);
}
