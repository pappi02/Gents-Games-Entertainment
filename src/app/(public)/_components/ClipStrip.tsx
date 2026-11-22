import type { Clip } from "@/lib/public/game-clips";
import { LoopVideo } from "./LoopVideo";

/**
 * A row of short looping clips. Portrait and landscape clips share one row
 * height, so a mix of phone footage sits evenly; it scrolls sideways on phones.
 */
export function ClipStrip({ clips, label }: { clips: Clip[]; label: string }) {
  return (
    <ul className="clip-strip" aria-label={label}>
      {clips.map((c) => (
        <li key={c.src} className={`clip clip--${c.orientation}`}>
          <figure>
            <LoopVideo src={c.src} poster={c.poster} label={c.label} />
            <figcaption>{c.title}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
