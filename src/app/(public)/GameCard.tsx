import Link from "next/link";
import Image from "next/image";
import { primaryImage } from "@/lib/public/media";

export type CardGame = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  facility_status?: string;
  game_media?: unknown;
};

export function GameCard({ game, priority = false }: { game: CardGame; priority?: boolean }) {
  const image = primaryImage(game.game_media);

  return (
    <Link href={`/games/${game.slug}`} className="card">
      <div className="card-image" style={{ position: "relative" }}>
        {image && (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            style={{ objectFit: "cover" }}
            priority={priority}
          />
        )}
      </div>
      <div className="card-body">
        <h3>{game.name}</h3>
        <p>{game.short_description}</p>
        {game.facility_status && (
          <span className={`status-badge status-${game.facility_status}`}>{game.facility_status.replace("_", " ")}</span>
        )}
      </div>
    </Link>
  );
}
