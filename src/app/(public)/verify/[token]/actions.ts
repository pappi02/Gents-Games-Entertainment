"use server";

import { redirect } from "next/navigation";
import { getAdminProfile } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { loadVerifiedTicket } from "@/lib/tickets/server";

/**
 * Admits the holder of a scanned QR code. The signature is rechecked here rather
 * than trusted from the page, and the database function makes the transition
 * atomic and checks the caller's role itself.
 */
export async function admitScannedTicket(token: string) {
  const profile = await getAdminProfile();
  if (!profile) redirect("/admin/login");

  const verified = await loadVerifiedTicket(token);
  if (!verified) redirect(`/verify/${encodeURIComponent(token)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_check_in_ticket", {
    p_ticket_code: verified.ticket.ticket_code,
    p_method: "scan",
  });
  const result = error ? "error" : (data?.[0]?.result ?? "error");
  redirect(`/verify/${encodeURIComponent(token)}?result=${encodeURIComponent(result)}`);
}
