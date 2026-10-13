"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "./Icon";

const DEBOUNCE_MS = 250;

/**
 * Catalogue search. Without JS it's a plain GET form to /games. With JS it
 * filters as you type: the URL is updated with router.replace (so results
 * stay shareable and Back isn't flooded with one entry per keystroke),
 * inside a transition so the current results stay on screen until the new
 * ones are ready.
 */
export function SearchBox({ q, category }: { q: string; category: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the query changes from outside (chips, "Clear filters", Back),
  // adopt it — adjusting state during render rather than in an effect.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function navigate(next: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (next.trim()) params.set("q", next.trim().slice(0, 80));
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/games?${qs}` : "/games", { scroll: false });
    });
  }

  return (
    <form
      action="/games"
      method="get"
      role="search"
      className={`search-form${pending ? " is-searching" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(value);
      }}
    >
      {category && <input type="hidden" name="category" value={category} />}
      {pending ? <span className="spinner search-icon" aria-hidden="true" /> : <Icon name="search" className="search-icon" />}
      <label htmlFor="game-search" className="visually-hidden">
        Search games
      </label>
      <input
        id="game-search"
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
        }}
        placeholder="Search games, e.g. pool"
        maxLength={80}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            navigate("");
          }}
        >
          <Icon name="close" />
        </button>
      )}
      <button type="submit">Search</button>
    </form>
  );
}
