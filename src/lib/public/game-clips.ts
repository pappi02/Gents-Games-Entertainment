/**
 * Short, silent gameplay clips filmed at the venue (owner's footage, November
 * 2026; trimmed, stabilised and colour-graded only). Static files in
 * public/videos, keyed by game slug. A game without an entry shows no clip.
 */
export type GameClip = {
  src: string;
  poster: string;
  /** Describes what the clip shows, for screen readers. */
  label: string;
  orientation: "portrait" | "landscape";
};

export const gameClips: Record<string, GameClip> = {
  darts: {
    src: "/videos/games-darts-throw-1.mp4",
    poster: "/videos/games-darts-throw-1-poster.webp",
    label: "A player throwing darts at the board on the wall at the venue.",
    orientation: "portrait",
  },
  badminton: {
    src: "/videos/games-badminton-rally-2.mp4",
    poster: "/videos/games-badminton-rally-2-poster.webp",
    label: "Two players in a badminton rally on the garden lawn.",
    orientation: "landscape",
  },
};
