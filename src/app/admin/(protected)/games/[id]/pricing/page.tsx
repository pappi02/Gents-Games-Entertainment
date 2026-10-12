import { createClient } from "@/lib/supabase/server";
import { createPricingOption, togglePricingActive, deletePricingOption } from "./actions";
import { notFound } from "next/navigation";

export default async function GamePricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: game } = await supabase.from("games").select("id, name").eq("id", id).single();
  if (!game) notFound();

  const { data: options } = await supabase
    .from("pricing_options")
    .select("*")
    .eq("game_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1>Pricing — {game.name}</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Only active prices are shown publicly. Per docs/PHASE_0_DISCOVERY.md §4, the site launches enquiry-only — leave
        new prices inactive unless the owner has explicitly approved publishing a rate.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Amount (KES)</th>
            <th>Unit</th>
            <th>Conditions</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(options ?? []).map((o) => (
            <tr key={o.id}>
              <td>{(o.amount_minor_units / 100).toLocaleString()}</td>
              <td>{o.billing_unit.replace("_", " ")}</td>
              <td>{o.conditions ?? "—"}</td>
              <td>
                <span className={`admin-badge ${o.is_active ? "admin-badge-available" : "admin-badge-draft"}`}>
                  {o.is_active ? "active" : "inactive"}
                </span>
              </td>
              <td className="admin-actions">
                <form action={togglePricingActive.bind(null, id, o.id, !o.is_active)}>
                  <button type="submit">{o.is_active ? "Deactivate" : "Activate"}</button>
                </form>
                <form action={deletePricingOption.bind(null, id, o.id)}>
                  <button type="submit">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>New price</h2>
      <form action={createPricingOption.bind(null, id)} className="admin-form">
        <label htmlFor="amount">Amount (KES)</label>
        <input id="amount" name="amount" type="number" step="0.01" min="0" required />

        <label htmlFor="billing_unit">Billing unit</label>
        <select id="billing_unit" name="billing_unit" defaultValue="per_session">
          <option value="per_game">Per game</option>
          <option value="per_table">Per table</option>
          <option value="per_person">Per person</option>
          <option value="per_hour">Per hour</option>
          <option value="per_session">Per session</option>
          <option value="other">Other</option>
        </select>

        <label htmlFor="conditions">Conditions (optional)</label>
        <input id="conditions" name="conditions" placeholder="e.g. includes equipment" />

        <button type="submit">Add price (inactive)</button>
      </form>
    </div>
  );
}
