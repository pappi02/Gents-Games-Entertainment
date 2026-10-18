import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/public/format";
import { createMembershipTier, updateMembershipTierStatus } from "./actions";

export default async function AdminMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: tiers } = await supabase
    .from("membership_tiers")
    .select(
      "id, name, slug, publication_status, sort_order, currency, subscription_minor_units, billing_period, fees_confirmed, membership_tier_categories(game_categories(name))",
    )
    .order("sort_order");

  return (
    <div>
      <h1>Membership</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p className="admin-section-note">
        Tiers appear on the public <a href="/membership">/membership</a> page once published. Fees stay hidden
        (&ldquo;Fees on enquiry&rdquo;) until you tick <strong>Owner has confirmed these fees</strong>. Included
        categories only show publicly when the category itself is published and holds a confirmed game. There is no
        online sign-up or payment — interest arrives under <a href="/admin/enquiries">Enquiries</a> as type
        &ldquo;membership&rdquo;.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Status</th>
            <th>Subscription</th>
            <th>Includes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(tiers ?? []).map((t) => {
            const includes = ((t.membership_tier_categories as unknown as { game_categories: { name: string } | null }[]) ?? [])
              .map((l) => l.game_categories?.name)
              .filter(Boolean);
            return (
              <tr key={t.id}>
                <td>
                  {t.name}
                  <div style={{ fontSize: "0.8rem", color: "#777" }}>/{t.slug}</div>
                </td>
                <td>
                  <span className={`admin-badge admin-badge-${t.publication_status}`}>{t.publication_status}</span>
                </td>
                <td>
                  {t.subscription_minor_units !== null
                    ? `${formatMoney(Number(t.subscription_minor_units), t.currency)} ${t.billing_period}`
                    : "—"}
                  <div style={{ fontSize: "0.8rem", color: "#777" }}>
                    {t.fees_confirmed ? "Confirmed — shown publicly" : "Not confirmed — hidden"}
                  </div>
                </td>
                <td style={{ fontSize: "0.85rem" }}>{includes.length > 0 ? includes.join(", ") : "—"}</td>
                <td className="admin-actions">
                  <a href={`/admin/membership/${t.id}/edit`}>Edit</a>
                  {t.publication_status !== "published" && (
                    <form action={updateMembershipTierStatus.bind(null, t.id, "published")}>
                      <button type="submit">Publish</button>
                    </form>
                  )}
                  {t.publication_status === "published" && (
                    <form action={updateMembershipTierStatus.bind(null, t.id, "draft")}>
                      <button type="submit">Unpublish</button>
                    </form>
                  )}
                  {t.publication_status !== "archived" && (
                    <form action={updateMembershipTierStatus.bind(null, t.id, "archived")}>
                      <button type="submit">Archive</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(tiers ?? []).length === 0 && <p>No membership tiers yet.</p>}

      <h2 style={{ marginTop: "2rem" }}>New tier</h2>
      <form action={createMembershipTier} className="admin-form">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />

        <label htmlFor="summary">One-line summary</label>
        <input id="summary" name="summary" required />

        <button type="submit">Create (as draft)</button>
      </form>
    </div>
  );
}
