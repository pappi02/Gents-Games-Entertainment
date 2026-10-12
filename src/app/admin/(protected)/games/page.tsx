import { createClient } from "@/lib/supabase/server";

export default async function AdminGamesPage() {
  const supabase = await createClient();
  const { data: games } = await supabase
    .from("games")
    .select("id, name, slug, facility_status, publication_status, featured, game_categories(name)")
    .order("name");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Games</h1>
        <a href="/admin/games/new">+ New game</a>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Facility</th>
            <th>Publication</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(games ?? []).map((g) => (
            <tr key={g.id}>
              <td>
                {g.name} {g.featured && <span title="Featured">★</span>}
              </td>
              <td>{(g.game_categories as unknown as { name: string } | null)?.name}</td>
              <td>
                <span className={`admin-badge admin-badge-${g.facility_status}`}>
                  {g.facility_status.replace("_", " ")}
                </span>
              </td>
              <td>
                <span className={`admin-badge admin-badge-${g.publication_status}`}>{g.publication_status}</span>
              </td>
              <td className="admin-actions">
                <a href={`/admin/games/${g.id}/edit`}>Edit</a>
                <a href={`/admin/games/${g.id}/media`}>Media</a>
                <a href={`/admin/games/${g.id}/pricing`}>Pricing</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
