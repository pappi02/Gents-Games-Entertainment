/**
 * A small line drawing per category — a visual signature, not data. Keyed by
 * category slug with a neutral fallback, so a new category added in the
 * admin still renders sensibly. Parts carry classes that motion.css animates
 * on hover/focus of the surrounding row (never continuously).
 */
export function CategoryGlyph({ slug, className = "glyph" }: { slug: string; className?: string }) {
  const common = {
    viewBox: "0 0 48 48",
    className: `${className} glyph--${glyphKey(slug)}`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    focusable: "false" as const,
  };

  switch (glyphKey(slug)) {
    case "cue":
      // Cue ball rolling towards a racked pair.
      return (
        <svg {...common}>
          <path d="M4 40 22 26" className="glyph-cue" />
          <circle cx="27" cy="22" r="5" className="glyph-ball" />
          <circle cx="38" cy="13" r="5" />
          <circle cx="38" cy="25" r="5" />
        </svg>
      );
    case "board":
      // Chequerboard corner with a pawn.
      return (
        <svg {...common}>
          <rect x="5" y="5" width="38" height="38" rx="2" />
          <path d="M5 24h38M24 5v38" />
          <rect x="5" y="5" width="19" height="19" className="glyph-square" fill="currentColor" stroke="none" opacity="0.18" />
          <g className="glyph-piece">
            <circle cx="33.5" cy="29.5" r="3" />
            <path d="M29.5 39h8l-1.6-5.5h-4.8z" />
          </g>
        </svg>
      );
    case "target":
      // Dartboard rings with a dart.
      return (
        <svg {...common}>
          <circle cx="22" cy="26" r="17" />
          <circle cx="22" cy="26" r="10" className="glyph-ring" />
          <circle cx="22" cy="26" r="3" fill="currentColor" />
          <path d="M22 26 40 8m0 0-6 1m6-1-1 6" className="glyph-dart" />
        </svg>
      );
    case "leisure":
      // A putting green: flag in the hole, ball on its way.
      return (
        <svg {...common}>
          <ellipse cx="26" cy="38" rx="18" ry="5" />
          <path d="M30 38V7l11 5-11 5" />
          <circle cx="12" cy="36" r="2.5" fill="currentColor" className="glyph-ball" />
        </svg>
      );
    case "music":
      // Paired quavers.
      return (
        <svg {...common}>
          <path d="M18 34V10l20-4v24" />
          <path d="M18 16l20-4" />
          <ellipse cx="13" cy="34" rx="5" ry="4" className="glyph-piece" />
          <ellipse cx="33" cy="30" rx="5" ry="4" className="glyph-piece" />
        </svg>
      );
    case "chip":
      // A play chip — edge notches and an inner ring.
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <circle cx="24" cy="24" r="10" className="glyph-ring" />
          <path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M36.7 11.3l-4.2 4.2M15.5 32.5l-4.2 4.2" />
        </svg>
      );
    default:
      // A die — generic "game".
      return (
        <svg {...common}>
          <rect x="8" y="8" width="32" height="32" rx="6" className="glyph-die" />
          <circle cx="17" cy="17" r="2" fill="currentColor" />
          <circle cx="24" cy="24" r="2" fill="currentColor" />
          <circle cx="31" cy="31" r="2" fill="currentColor" />
        </svg>
      );
  }
}

function glyphKey(slug: string) {
  if (/casino|roulette|blackjack|poker/.test(slug)) return "chip";
  if (/live|music|entertainment|band|salsa/.test(slug)) return "music";
  if (/outdoor|leisure|golf|swim/.test(slug)) return "leisure";
  if (/cue|pool|billiard|snooker/.test(slug)) return "cue";
  if (/social|party/.test(slug)) return "die";
  if (/board|strategy|chess|card/.test(slug)) return "board";
  if (/table|indoor|dart|tennis/.test(slug)) return "target";
  return "die";
}
