/**
 * Short, silent clips filmed at the venue (owner's footage, November 2026;
 * trimmed, stabilised and colour-graded only). Static files in public/videos.
 */
export type Clip = {
  src: string;
  poster: string;
  /** Short title shown under the clip. */
  title: string;
  /** Describes what the clip shows, for screen readers. */
  label: string;
  orientation: "portrait" | "landscape";
};

const clip = (name: string, title: string, label: string, orientation: Clip["orientation"]): Clip => ({
  src: `/videos/${name}.mp4`,
  poster: `/videos/${name}-poster.webp`,
  title,
  label,
  orientation,
});

const dartsThrow = clip("games-darts-throw-1", "Darts", "A player throwing darts at the board on the wall.", "portrait");
const dartsThrow2 = clip("games-darts-throw-2", "Lining up", "A player lining up a throw at the dartboard.", "portrait");
const dartsThrow3 = clip("games-darts-throw-3", "On the oche", "A dart thrown at the board by the covered walkway.", "portrait");
const dartsBoard = clip("games-darts-board-closeup", "On the board", "Close-up of darts landing in the board.", "portrait");
const dartsPull = clip("games-darts-pulling-darts", "Next round", "A player pulling the darts out of the board.", "portrait");
const badminton1 = clip("games-badminton-rally-1", "Badminton", "Two players in a badminton rally on the garden lawn.", "landscape");
const badminton2 = clip("games-badminton-rally-2", "On the lawn", "A badminton rally on the lawn, guests watching from the veranda.", "landscape");

/** Clips per game slug, shown at the top of the game page. */
export const gameClips: Record<string, Clip[]> = {
  darts: [dartsThrow, dartsBoard, dartsPull, dartsThrow3],
  badminton: [badminton2, badminton1],
};

/** Homepage "See it in play" strip. */
export const homeClips: Clip[] = [badminton2, dartsThrow, dartsBoard, badminton1, dartsPull, dartsThrow2];

/** /venue: the place itself. */
export const venueClips: Clip[] = [
  clip("hideaway-evening-arrival", "Arriving", "The house and parking, lit up for the evening.", "landscape"),
  clip("hideaway-garden-pan", "The garden", "A slow pan across the garden lawn and the house.", "landscape"),
  clip("hideaway-evening-veranda-lights", "The veranda", "The veranda lit up in pink as the evening comes in.", "landscape"),
  clip("hideaway-lounge-chandelier", "The lounge", "The lounge under the chandelier, with the bar behind.", "portrait"),
];
