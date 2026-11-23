import { ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { primaryImage } from "@/lib/public/media";
import type { PublicGameCard } from "@/lib/public/queries";
import { StatusBadge } from "./StatusBadge";
import { Icon } from "./Icon";

// Two to a row on phones (public.css), so half the width there too.
export const CARD_IMAGE_SIZES = "(max-width: 1000px) 50vw, 400px";
const SPOTLIGHT_IMAGE_SIZES = "(max-width: 899px) 100vw, 60vw";

/** Shared view-transition name so a card's photo morphs into the detail page hero. */
export function gameImageTransitionName(slug: string) {
  return `game-image-${slug}`;
}

/**
 * The one card used for a game everywhere it appears — catalogue, home,
 * related. `spotlight` is the wide editorial variant used to lead a set.
 */
export function GameCard({
  game,
  priority = false,
  headingLevel = "h3",
  variant = "default",
}: {
  game: PublicGameCard;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  variant?: "default" | "spotlight";
}) {
  const image = primaryImage(game.game_media);
  const Heading = headingLevel;
  const spotlight = variant === "spotlight";

  return (
    <article className={`game-card${spotlight ? " game-card--spotlight" : ""}`}>
      <ViewTransition name={gameImageTransitionName(game.slug)} share="morph" default="none">
        <div className="media ratio-4x3">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={spotlight ? SPOTLIGHT_IMAGE_SIZES : CARD_IMAGE_SIZES}
              priority={priority}
            />
          ) : (
            <div className="media-fallback">
              <Icon name="target" />
            </div>
          )}
          {image?.isPlaceholder && <span className="media-tag">Illustrative photo</span>}
        </div>
      </ViewTransition>
      <div className="game-card-body">
        {game.game_categories && <p className="game-card-category">{game.game_categories.name}</p>}
        <Heading className="game-card-title">
          <Link href={`/games/${game.slug}`}>{game.name}</Link>
        </Heading>
        <p className="game-card-desc">{game.short_description}</p>
        <div className="game-card-foot">
          <StatusBadge status={game.facility_status} />
          {spotlight ? (
            <span className="arrow-link" aria-hidden="true">
              Explore <Icon name="arrowRight" />
            </span>
          ) : (
            <Icon name="arrowRight" className="chevron" />
          )}
        </div>
      </div>
    </article>
  );
}
