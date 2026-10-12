type Category = { id: string; name: string };
type Game = {
  category_id?: string;
  name?: string;
  short_description?: string;
  description?: string;
  typical_players?: string | null;
  typical_duration?: string | null;
  rules?: string | null;
  facility_status?: string;
  publication_status?: string;
  featured?: boolean;
};

export function GameForm({
  action,
  categories,
  game,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  categories: Category[];
  game?: Game;
  submitLabel: string;
}) {
  return (
    <form action={action} className="admin-form">
      <label htmlFor="category_id">Category</label>
      <select id="category_id" name="category_id" defaultValue={game?.category_id} required>
        <option value="" disabled>
          Select a category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label htmlFor="name">Name</label>
      <input id="name" name="name" defaultValue={game?.name} required />

      <label htmlFor="short_description">Short description</label>
      <input id="short_description" name="short_description" defaultValue={game?.short_description} required />

      <label htmlFor="description">Full description</label>
      <textarea id="description" name="description" rows={5} defaultValue={game?.description} required />

      <label htmlFor="rules">Rules / beginner notes (optional)</label>
      <textarea id="rules" name="rules" rows={3} defaultValue={game?.rules ?? ""} />

      <label htmlFor="typical_players">Typical players</label>
      <input id="typical_players" name="typical_players" defaultValue={game?.typical_players ?? ""} />

      <label htmlFor="typical_duration">Typical duration</label>
      <input id="typical_duration" name="typical_duration" defaultValue={game?.typical_duration ?? ""} />

      <label htmlFor="facility_status">Facility status</label>
      <select id="facility_status" name="facility_status" defaultValue={game?.facility_status ?? "unverified"}>
        <option value="unverified">Unverified</option>
        <option value="available">Available</option>
        <option value="coming_soon">Coming soon</option>
        <option value="unavailable">Unavailable</option>
      </select>

      <label htmlFor="publication_status">Publication status</label>
      <select id="publication_status" name="publication_status" defaultValue={game?.publication_status ?? "draft"}>
        <option value="draft">Draft (not public)</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>

      <label>
        <input type="checkbox" name="featured" defaultChecked={game?.featured} style={{ marginRight: "0.4rem" }} />
        Featured on homepage
      </label>

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
