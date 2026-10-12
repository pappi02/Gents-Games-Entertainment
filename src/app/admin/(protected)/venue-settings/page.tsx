import { createClient } from "@/lib/supabase/server";
import { updateVenueSettings } from "./actions";

export default async function VenueSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: venue } = await supabase.from("venue_settings").select("*").single();

  return (
    <div>
      <h1>Venue settings</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Only enter facts verified by the owner — see docs/PHASE_0_DISCOVERY.md. Never fabricate hours, contacts, or
        addresses here.
      </p>

      <form action={updateVenueSettings} className="admin-form">
        <label htmlFor="brand_name">Brand name</label>
        <input id="brand_name" name="brand_name" defaultValue={venue?.brand_name} required />

        <label htmlFor="address">Address</label>
        <textarea id="address" name="address" rows={2} defaultValue={venue?.address} required />

        <label htmlFor="plus_code">Plus code</label>
        <input id="plus_code" name="plus_code" defaultValue={venue?.plus_code ?? ""} />

        <label htmlFor="map_url">Map URL</label>
        <input id="map_url" name="map_url" defaultValue={venue?.map_url ?? ""} />

        <label htmlFor="phone_primary">Primary phone</label>
        <input id="phone_primary" name="phone_primary" defaultValue={venue?.phone_primary ?? ""} />
        <div>
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="phone_primary_channels"
              value="call"
              defaultChecked={venue?.phone_primary_channels?.includes("call")}
            />{" "}
            Call
          </label>{" "}
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="phone_primary_channels"
              value="whatsapp"
              defaultChecked={venue?.phone_primary_channels?.includes("whatsapp")}
            />{" "}
            WhatsApp
          </label>
        </div>

        <label htmlFor="phone_secondary">Secondary phone</label>
        <input id="phone_secondary" name="phone_secondary" defaultValue={venue?.phone_secondary ?? ""} />
        <div>
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="phone_secondary_channels"
              value="call"
              defaultChecked={venue?.phone_secondary_channels?.includes("call")}
            />{" "}
            Call
          </label>{" "}
          <label style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              name="phone_secondary_channels"
              value="whatsapp"
              defaultChecked={venue?.phone_secondary_channels?.includes("whatsapp")}
            />{" "}
            WhatsApp
          </label>
        </div>

        <label htmlFor="contact_email">Contact email (leave blank if none)</label>
        <input id="contact_email" name="contact_email" type="email" defaultValue={venue?.contact_email ?? ""} />

        <label htmlFor="hours_note">Opening hours note</label>
        <input id="hours_note" name="hours_note" defaultValue={venue?.hours_note ?? ""} />

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
