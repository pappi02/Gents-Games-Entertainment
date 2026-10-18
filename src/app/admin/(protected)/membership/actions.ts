"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/session";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

const BILLING_PERIODS = ["monthly", "quarterly", "annual"];

/**
 * Parses a KES amount typed in whole or decimal units ("15000", "15,000.50")
 * into integer minor units using string arithmetic only — no float ever
 * touches the value (docs/CODE_STYLE.md §2). Empty → null; invalid → NaN.
 */
function toMinorUnits(input: string): number | null {
  const s = input.replaceAll(",", "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,12})(?:\.(\d{1,2}))?$/);
  if (!m) return Number.NaN;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

async function audit(action: string, tierId: string, summary?: string) {
  const supabase = await createClient();
  const profile = await getAdminProfile();
  await supabase.from("audit_logs").insert({
    actor_id: profile?.id ?? null,
    action,
    entity_type: "membership_tiers",
    entity_id: tierId,
    summary: summary ?? null,
  });
}

function refresh() {
  revalidatePath("/admin/membership");
  updateTag("membership");
}

/**
 * Saves a tier's content, fees and included categories. RLS
 * (membership_tiers_super_admin_all) is the authorization boundary: only a
 * super_admin's write succeeds, whatever the UI shows.
 */
export async function updateMembershipTier(tierId: string, formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const back = (msg: string) => redirect(`/admin/membership/${tierId}/edit?error=${encodeURIComponent(msg)}`);

  const name = text("name");
  const summary = text("summary");
  const billingPeriod = text("billing_period");
  const subscription = toMinorUnits(text("subscription"));
  const joiningFee = toMinorUnits(text("joining_fee"));
  const feesConfirmed = formData.get("fees_confirmed") === "on";
  const categoryIds = formData.getAll("category_ids").map(String);

  if (!name || !summary) back("Name and summary are required.");
  if (!BILLING_PERIODS.includes(billingPeriod)) back("Choose a billing period.");
  if (Number.isNaN(subscription) || Number.isNaN(joiningFee)) back("Enter fees as a plain amount, e.g. 15000.");
  if (feesConfirmed && subscription === null) back("Enter a subscription amount before confirming fees.");

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("membership_tiers")
    .select("subscription_minor_units, joining_fee_minor_units, fees_confirmed")
    .eq("id", tierId)
    .single();

  const profile = await getAdminProfile();
  const { error } = await supabase
    .from("membership_tiers")
    .update({
      name,
      summary,
      description: text("description") || null,
      benefits: text("benefits") || null,
      billing_period: billingPeriod,
      subscription_minor_units: subscription,
      joining_fee_minor_units: joiningFee,
      fees_confirmed: feesConfirmed,
      sort_order: Number(text("sort_order")) || 0,
      updated_by: profile?.id ?? null,
    })
    .eq("id", tierId);
  if (error) back(error.message);

  // Replace the inclusion set. Delete-then-insert is fine at this size; RLS
  // applies to both statements.
  const { error: delErr } = await supabase.from("membership_tier_categories").delete().eq("tier_id", tierId);
  if (delErr) back(delErr.message);
  if (categoryIds.length > 0) {
    const { error: insErr } = await supabase
      .from("membership_tier_categories")
      .insert(categoryIds.map((category_id) => ({ tier_id: tierId, category_id })));
    if (insErr) back(insErr.message);
  }

  // Fee changes are pricing changes — always audited.
  if (
    before &&
    (before.subscription_minor_units !== subscription ||
      before.joining_fee_minor_units !== joiningFee ||
      before.fees_confirmed !== feesConfirmed)
  ) {
    await audit(
      "membership_fees_changed",
      tierId,
      `subscription ${before.subscription_minor_units ?? "—"} → ${subscription ?? "—"}, joining ${before.joining_fee_minor_units ?? "—"} → ${joiningFee ?? "—"}, confirmed ${before.fees_confirmed} → ${feesConfirmed}`,
    );
  }

  refresh();
  redirect("/admin/membership");
}

export async function updateMembershipTierStatus(tierId: string, status: "draft" | "published" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase.from("membership_tiers").update({ publication_status: status }).eq("id", tierId);
  if (!error) {
    await audit(`membership_tier_${status}`, tierId);
    refresh();
  }
}

export async function createMembershipTier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!name || !summary) redirect(`/admin/membership?error=${encodeURIComponent("Name and summary are required.")}`);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const supabase = await createClient();
  const profile = await getAdminProfile();
  const { data, error } = await supabase
    .from("membership_tiers")
    .insert({ name, slug, summary, created_by: profile?.id ?? null })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/membership?error=${encodeURIComponent(error?.message ?? "Could not create tier.")}`);

  refresh();
  redirect(`/admin/membership/${data.id}/edit`);
}
