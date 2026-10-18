import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateMembershipTier } from "../../actions";

/** Integer minor units → the plain amount shown in the form ("15000" or "15000.50"). */
function toInput(minor: number | null) {
  if (minor === null) return "";
  const cents = minor % 100;
  return cents ? `${Math.trunc(minor / 100)}.${String(cents).padStart(2, "0")}` : String(Math.trunc(minor / 100));
}

export default async function EditMembershipTierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: tier }, { data: categories }] = await Promise.all([
    supabase.from("membership_tiers").select("*, membership_tier_categories(category_id)").eq("id", id).single(),
    supabase.from("game_categories").select("id, name, publication_status").order("sort_order"),
  ]);
  if (!tier) notFound();

  const included = new Set(
    ((tier.membership_tier_categories as { category_id: string }[] | null) ?? []).map((l) => l.category_id),
  );

  return (
    <div>
      <h1>Edit membership tier</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p className="admin-section-note">
        Enquiry link: <code>/visit?type=membership&amp;tier={tier.slug}</code> — the slug stays the same if you rename
        the tier. Only a super admin can save changes here, as fees are pricing.
      </p>

      <form action={updateMembershipTier.bind(null, id)} className="admin-form">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={tier.name} required />

        <label htmlFor="summary">One-line summary</label>
        <input id="summary" name="summary" defaultValue={tier.summary} required />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={tier.description ?? ""} />

        <label htmlFor="benefits">Member benefits (one per line)</label>
        <textarea id="benefits" name="benefits" rows={5} defaultValue={tier.benefits ?? ""} />

        <fieldset>
          <legend>Includes access to</legend>
          {(categories ?? []).map((c) => (
            <label key={c.id} style={{ display: "block", fontWeight: "normal" }}>
              <input type="checkbox" name="category_ids" value={c.id} defaultChecked={included.has(c.id)} /> {c.name}
              {c.publication_status !== "published" && (
                <span style={{ color: "#777" }}> ({c.publication_status} — hidden from the public tier until published)</span>
              )}
            </label>
          ))}
        </fieldset>

        <label htmlFor="subscription">Subscription (KES)</label>
        <input
          id="subscription"
          name="subscription"
          inputMode="decimal"
          placeholder="e.g. 15000"
          defaultValue={toInput(tier.subscription_minor_units === null ? null : Number(tier.subscription_minor_units))}
        />

        <label htmlFor="billing_period">Billing period</label>
        <select id="billing_period" name="billing_period" defaultValue={tier.billing_period}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>

        <label htmlFor="joining_fee">One-off joining fee (KES, optional)</label>
        <input
          id="joining_fee"
          name="joining_fee"
          inputMode="decimal"
          placeholder="Leave blank if none"
          defaultValue={toInput(tier.joining_fee_minor_units === null ? null : Number(tier.joining_fee_minor_units))}
        />

        <label style={{ fontWeight: "normal" }}>
          <input type="checkbox" name="fees_confirmed" defaultChecked={tier.fees_confirmed} /> Owner has confirmed
          these fees — show them publicly
        </label>

        <label htmlFor="sort_order">Sort order</label>
        <input id="sort_order" name="sort_order" type="number" defaultValue={tier.sort_order} />

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
