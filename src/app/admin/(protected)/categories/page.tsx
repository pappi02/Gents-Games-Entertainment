import { createClient } from "@/lib/supabase/server";
import { createCategory, updateCategoryStatus } from "./actions";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("game_categories")
    .select("id, name, slug, publication_status, sort_order")
    .order("sort_order");

  return (
    <div>
      <h1>Categories</h1>
      {error && <p className="admin-auth-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(categories ?? []).map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.slug}</td>
              <td>
                <span className={`admin-badge admin-badge-${c.publication_status}`}>{c.publication_status}</span>
              </td>
              <td>{c.sort_order}</td>
              <td className="admin-actions">
                <a href={`/admin/categories/${c.id}/edit`}>Edit</a>
                {c.publication_status !== "published" && (
                  <form action={updateCategoryStatus.bind(null, c.id, "published")}>
                    <button type="submit">Publish</button>
                  </form>
                )}
                {c.publication_status === "published" && (
                  <form action={updateCategoryStatus.bind(null, c.id, "draft")}>
                    <button type="submit">Unpublish</button>
                  </form>
                )}
                {c.publication_status !== "archived" && (
                  <form action={updateCategoryStatus.bind(null, c.id, "archived")}>
                    <button type="submit">Archive</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>New category</h2>
      <form action={createCategory} className="admin-form">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} />

        <button type="submit">Create (as draft)</button>
      </form>
    </div>
  );
}
