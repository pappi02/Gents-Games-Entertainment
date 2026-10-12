import { createClient } from "@/lib/supabase/server";
import { updateCategory } from "../../actions";
import { notFound } from "next/navigation";

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: category } = await supabase.from("game_categories").select("*").eq("id", id).single();

  if (!category) notFound();

  return (
    <div>
      <h1>Edit category</h1>
      {error && <p className="admin-auth-error">{error}</p>}

      <form action={updateCategory.bind(null, id)} className="admin-form">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={category.name} required />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={category.description ?? ""} />

        <label htmlFor="sort_order">Sort order</label>
        <input id="sort_order" name="sort_order" type="number" defaultValue={category.sort_order} />

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
