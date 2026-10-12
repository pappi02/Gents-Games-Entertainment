import { createClient } from "@/lib/supabase/server";
import { updateGame } from "../../actions";
import { GameForm } from "../../GameForm";
import { notFound } from "next/navigation";

export default async function EditGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: game }, { data: categories }] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).single(),
    supabase.from("game_categories").select("id, name").order("sort_order"),
  ]);

  if (!game) notFound();

  return (
    <div>
      <h1>Edit game</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <GameForm action={updateGame.bind(null, id)} categories={categories ?? []} game={game} submitLabel="Save" />
      <p style={{ marginTop: "1rem" }}>
        <a href={`/admin/games/${id}/media`}>Manage media</a> ·{" "}
        <a href={`/admin/games/${id}/pricing`}>Manage pricing</a>
      </p>
    </div>
  );
}
