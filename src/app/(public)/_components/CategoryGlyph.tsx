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
  if (/cue|pool|billiard|snooker/.test(slug)) return "cue";
  if (/social|party/.test(slug)) return "die";
  if (/board|strategy|chess|card/.test(slug)) return "board";
  if (/table|indoor|dart|tennis/.test(slug)) return "target";
  return "die";
}
