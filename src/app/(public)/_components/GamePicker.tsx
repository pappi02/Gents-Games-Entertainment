"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CategoryGlyph } from "./CategoryGlyph";
import { StatusBadge } from "./StatusBadge";
import { Icon } from "./Icon";

export type PickerGame = {
  slug: string;
  name: string;
  categoryName: string | null;
  categorySlug: string | null;
  status: string;
  image: { src: string; alt: string } | null;
};

const SPIN_STEPS = 9;
const SPIN_MS = 80;

/**
 * "Let the table decide" — picks a random game from the playable-now games
 * passed in by the server (never a coming-soon or unavailable one). Purely a playful way into a real game page; it
 * says nothing about availability beyond the game's own status badge.
 */
export function GamePicker({ games }: { games: PickerGame[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "spinning" | "landed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (games.length === 0) return null;

  function pick() {
    if (phase === "spinning") return;
    // Never land on the same game twice in a row when there's a choice.
    let target = Math.floor(Math.random() * games.length);
    if (games.length > 1 && target === index) target = (target + 1) % games.length;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setIndex(target);
      setPhase("landed");
      return;
    }

    setPhase("spinning");
    let step = 0;
    const tick = () => {
      step += 1;
      if (step >= SPIN_STEPS) {
        setIndex(target);
        setPhase("landed");
        return;
      }
      setIndex((i) => ((i ?? 0) + 1) % games.length);
      timer.current = setTimeout(tick, SPIN_MS + step * 12);
    };
    tick();
  }

  const game = index === null ? null : games[index];
  const landed = phase === "landed" && game;

  return (
    <div className="picker">
      <div>
        <p className="eyebrow">Can&apos;t decide?</p>
        <h3 className="heading-sm picker-title">
          Let the table decide
        </h3>
      </div>

      <div className={`picker-stage is-${phase}`} key={phase === "landed" ? `landed-${index}` : phase}>
        <div className="picker-thumb">
          {game?.image && phase === "landed" ? (
            <Image src={game.image.src} alt="" fill sizes="112px" />
          ) : (
            <CategoryGlyph slug={game?.categorySlug ?? ""} />
          )}
        </div>
        <div>
          <p className="picker-name">{game ? game.name : "Your game?"}</p>
          {landed ? (
            <div className="picker-meta">
              {game.categoryName && <span className="subtle">{game.categoryName}</span>}
              <StatusBadge status={game.status} />
            </div>
          ) : (
            <p className="subtle picker-hint">
              {phase === "spinning" ? "Shuffling…" : `One of ${games.length} games on the list.`}
            </p>
          )}
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {landed ? `Picked ${game.name}.` : ""}
      </p>

      <div className="btn-row">
        <button type="button" className="btn btn-inverse" onClick={pick} disabled={phase === "spinning"}>
          <Icon name="target" />
          {phase === "idle" ? "Pick a game for us" : "Pick again"}
        </button>
        {landed && (
          <Link href={`/games/${game.slug}`} className="btn btn-secondary">
            See {game.name}
            <Icon name="arrowRight" />
          </Link>
        )}
      </div>
    </div>
  );
}
