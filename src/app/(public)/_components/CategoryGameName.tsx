import { facilityStatus, isAvailableNow } from "@/lib/public/status";

/**
 * One game name in a category's name list. These lists carry no badges, so
 * a game that isn't playable today says so in words next to its name —
 * otherwise "Air Hockey" under "What you can play" would read as available.
 */
export function CategoryGameName({ game }: { game: { name: string; facility_status: string } }) {
  return (
    <li>
      {game.name}
      {!isAvailableNow(game.facility_status) && <> · {facilityStatus(game.facility_status).label}</>}
    </li>
  );
}
