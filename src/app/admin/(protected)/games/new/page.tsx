import { createClient } from "@/lib/supabase/server";
import { createGame } from "../actions";
import { GameForm } from "../GameForm";

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("game_categories").select("id, name").order("sort_order");

  return (
    <div>
      <h1>New game</h1>
      {error && <p className="admin-auth-error">{error}</p>}
      <GameForm action={createGame} categories={categories ?? []} submitLabel="Create game" />
    </div>
  );
}
