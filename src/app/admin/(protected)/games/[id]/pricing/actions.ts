"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createPricingOption(gameId: string, formData: FormData) {
  // Amounts are entered in whole currency units (KES) in the form and
  // converted to integer minor units here — never store/compute as float.
  // See docs/CODE_STYLE.md §2.
  const amountInput = String(formData.get("amount") ?? "0");
  const amountMinorUnits = Math.round(parseFloat(amountInput) * 100);
  const billingUnit = String(formData.get("billing_unit") ?? "per_session");
  const conditions = String(formData.get("conditions") ?? "").trim() || null;

  if (!Number.isFinite(amountMinorUnits) || amountMinorUnits < 0) {
    redirect(`/admin/games/${gameId}/pricing?error=${encodeURIComponent("Enter a valid amount.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pricing_options").insert({
    game_id: gameId,
    amount_minor_units: amountMinorUnits,
    billing_unit: billingUnit,
    conditions,
    is_active: false,
  });

  if (error) {
    redirect(`/admin/games/${gameId}/pricing?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/games/${gameId}/pricing`);
  updateTag("games");
  redirect(`/admin/games/${gameId}/pricing`);
}

export async function togglePricingActive(gameId: string, pricingId: string, nextActive: boolean) {
  const supabase = await createClient();
  // pricing_options RLS write policy is super_admin-only (docs/SECURITY.md
  // §2 "optional configurable permission" for content_editor — not granted
  // by default), so this fails silently-to-the-user for non-super-admins;
  // that's RLS doing its job, not a bug.
  await supabase.from("pricing_options").update({ is_active: nextActive }).eq("id", pricingId);
  revalidatePath(`/admin/games/${gameId}/pricing`);
  updateTag("games");
}

export async function deletePricingOption(gameId: string, pricingId: string) {
  const supabase = await createClient();
  await supabase.from("pricing_options").delete().eq("id", pricingId);
  revalidatePath(`/admin/games/${gameId}/pricing`);
  updateTag("games");
}
