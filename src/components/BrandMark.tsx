import { BRAND_MARK } from "./brand-mark-geometry";

const INK = "#161513";
const PAPER = "#f4f1ea";
const RED = "#b8202e";

/**
 * The Gents Games & Entertainment mark: two interlocking G's on a square badge.
 * G1 (ink ring, red bar) and G2 (red ring, ink bar — the colours swapped) are
 * woven like chain links: each passes over the other once. Geometry comes from
 * ./brand-mark-geometry.ts, generated with the logo files in public/brand/ by
 * scripts/brand/generate-brand-assets.py, so every rendering matches exactly.
 *
 * `tone="reverse"` (paper badge) is for dark surfaces; `tone="default"` (ink
 * badge) is for light ones. `size` sets explicit pixel dimensions — needed
 * where no stylesheet applies, such as the generated share image. Uses no ids,
 * so it can appear many times per page.
 */
export function BrandMark({
  className = "brand-mark",
  tone = "reverse",
  size,
}: {
  className?: string;
  tone?: "default" | "reverse";
  size?: number;
}) {
  const badge = tone === "reverse" ? PAPER : INK;
  const glyph = tone === "reverse" ? INK : PAPER;
  const { stroke: w, gap, g1, g2, weave } = BRAND_MARK;
  const halo = w + 2 * gap;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="9" fill={badge} />
      <rect x="4.5" y="4.5" width="55" height="55" rx="6" fill="none" stroke={glyph} strokeOpacity="0.28" strokeWidth="1.25" />
      {/* G2 underneath: red ring, ink bar. */}
      <path d={g2.ring} fill="none" stroke={RED} strokeWidth={w} />
      <rect {...g2.bar} fill={glyph} />
      {/* G1 over it: a badge-coloured halo cuts the gap, then ink ring + red bar. */}
      <path d={g1.ring} fill="none" stroke={badge} strokeWidth={halo} />
      <rect
        x={g1.bar.x - gap}
        y={g1.bar.y - gap}
        width={g1.bar.width + 2 * gap}
        height={g1.bar.height + 2 * gap}
        fill={badge}
      />
      <path d={g1.ring} fill="none" stroke={glyph} strokeWidth={w} />
      <rect {...g1.bar} fill={RED} />
      {/* The weave: at the second crossing G2 passes back over G1. */}
      <path d={weave.cut} fill="none" stroke={badge} strokeWidth={halo} />
      <path d={weave.over} fill="none" stroke={RED} strokeWidth={w} />
    </svg>
  );
}
