"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { kesToMinorUnits, nairobiInputToUtc } from "@/lib/tickets/format";

const PATH = "/admin/discount-codes";

function back(message: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

export async function createDiscountCode(formData: FormData) {
  const profile = await requireRole(["super_admin"]);
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const code = text("code").toUpperCase();
  const kind = text("kind");
  const eventId = text("event_id") || null;
  const startsRaw = text("starts_at");
  const endsRaw = text("ends_at");
  const startsAt = startsRaw ? nairobiInputToUtc(startsRaw) : null;
  const endsAt = endsRaw ? nairobiInputToUtc(endsRaw) : null;
  const maxUsesRaw = text("max_uses");
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) back("Codes are 3 to 32 letters, numbers, dashes or underscores.");
  if (kind !== "percent" && kind !== "fixed") back("Choose a discount type.");

  let amount: number | null;
  if (kind === "percent") {
    amount = Number(text("amount"));
    if (!Number.isInteger(amount) || amount < 1 || amount > 99) back("A percentage must be a whole number from 1 to 99.");
  } else {
    amount = kesToMinorUnits(text("amount"));
    if (!amount) back("Enter the amount off in KES.");
  }
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) back("A date isn't valid.");
  if (startsAt && endsAt && endsAt <= startsAt) back("The code must end after it starts.");
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) back("Total uses must be a whole number, or blank for no limit.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code,
      kind,
      amount,
      event_id: eventId,
      starts_at: startsAt,
      ends_at: endsAt,
      max_uses: maxUses,
      note: text("note") || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) back(error.code === "23505" ? `The code ${code} already exists.` : error.message);

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "discount_code.created",
    entity_type: "discount_code",
    entity_id: data?.id,
    summary: `${code}: ${kind} ${amount}`,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

/** Codes are switched off, never deleted, so past orders keep their history. */
export async function setDiscountCodeActive(codeId: string, isActive: boolean) {
  const profile = await requireRole(["super_admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").update({ is_active: isActive }).eq("id", codeId);
  if (error) back(error.message);
  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: isActive ? "discount_code.enabled" : "discount_code.disabled",
    entity_type: "discount_code",
    entity_id: codeId,
  });
  revalidatePath(PATH);
}
