import { createClient } from "@/lib/supabase/server";

type AdminGameRow = {
  id: string;
  name: string;
  slug: string;
  facility_status: string;
  publication_status: string;
  featured: boolean;
  game_categories: { name: string; publication_status: string } | null;
};

/**
 * Why a game is or isn't on the public site — mirrors the public read rules
 * (RLS + src/lib/public/queries.ts): published, not unverified, and in a
 * published category.
 */
function publicVisibility(g: AdminGameRow) {
  if (g.publication_status !== "published") return "No — not published";
  if (g.facility_status === "unverified") return "No — unverified";
  if (g.game_categories?.publication_status !== "published") return "No — category not published";
  return "Yes";
}

export default async function AdminGamesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("id, name, slug, facility_status, publication_status, featured, game_categories(name, publication_status)")
    .order("name");
  const games = (data as unknown as AdminGameRow[] | null) ?? [];

  // Unverified games are candidates the owner hasn't confirmed yet — kept
  // apart so they're never mistaken for the live catalogue.
  const proposed = games.filter((g) => g.facility_status === "unverified" && g.publication_status !== "archived");
  const catalogue = games.filter((g) => !proposed.includes(g));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Games</h1>
        <a href="/admin/games/new">+ New game</a>
      </div>

      <h2>Catalogue</h2>
      <GamesTable games={catalogue} empty="No confirmed games yet." />

      <h2 style={{ marginTop: "2rem" }}>Proposed additions — pending owner confirmation</h2>
      <p className="admin-section-note">
        Candidate games that haven&apos;t been confirmed as physically available at the venue. They never appear on the
        public site. To launch one: confirm it with the owner, then edit it — set its facility status, fill in only
        confirmed details, add an image — and publish. Its category must be published too.
      </p>
      <GamesTable games={proposed} empty="No proposed games." />
    </div>
  );
}

function GamesTable({ games, empty }: { games: AdminGameRow[]; empty: string }) {
  if (games.length === 0) return <p className="admin-section-note">{empty}</p>;
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Facility</th>
          <th>Publication</th>
          <th>On public site</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {games.map((g) => (
          <tr key={g.id}>
            <td>
              {g.name} {g.featured && <span title="Featured">★</span>}
            </td>
            <td>
              {g.game_categories?.name}
              {g.game_categories && g.game_categories.publication_status !== "published" && (
                <> ({g.game_categories.publication_status})</>
              )}
            </td>
            <td>
              <span className={`admin-badge admin-badge-${g.facility_status}`}>
                {g.facility_status.replace("_", " ")}
              </span>
            </td>
            <td>
              <span className={`admin-badge admin-badge-${g.publication_status}`}>{g.publication_status}</span>
            </td>
            <td>{publicVisibility(g)}</td>
            <td className="admin-actions">
              <a href={`/admin/games/${g.id}/edit`}>Edit</a>
              <a href={`/admin/games/${g.id}/media`}>Media</a>
              <a href={`/admin/games/${g.id}/pricing`}>Pricing</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
