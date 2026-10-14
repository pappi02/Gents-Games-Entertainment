"""
Generates The Gents Games & Entertainment brand assets from one geometry.

Outputs (all committed — re-run only when the logo itself changes):
  public/brand/gents-mark.svg            ink badge, for light backgrounds
  public/brand/gents-mark-reverse.svg    paper badge, for dark backgrounds
  public/brand/gents-logo.svg            horizontal lockup, for light backgrounds
  public/brand/gents-logo-reverse.svg    horizontal lockup, for dark backgrounds
  src/app/icon.svg                       browser-tab icon (Next.js `icon` convention)
  src/components/brand-mark-geometry.ts  the mark's geometry, for the React component
  scripts/brand/.out/*.svg               sources that rasterize-brand-assets.mjs turns
                                         into favicon.ico, apple-icon.png and PNG logos

The wordmark is Archivo (SIL Open Font License, the site's own typeface),
converted to outlines so the files render identically without the font.

Usage (needs Python 3 + fonttools, and the Archivo variable font):
  pip install fonttools
  curl -L -o Archivo.ttf "https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf"
  python scripts/brand/generate-brand-assets.py path/to/Archivo.ttf
  node scripts/brand/rasterize-brand-assets.mjs

The in-site mark (src/components/BrandMark.tsx) and the share image read the
same geometry from src/components/brand-mark-geometry.ts, which this script
writes — so every rendering of the mark stays identical.
"""

import json
import math
import pathlib
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT_PUBLIC = ROOT / "public" / "brand"
OUT_APP = ROOT / "src" / "app"
OUT_RASTER_SRC = ROOT / "scripts" / "brand" / ".out"

# Palette — mirrors the tokens in src/app/globals.css.
INK = "#161513"
PAPER = "#f4f1ea"
RED = "#b8202e"
STONE = "#9a9387"  # tagline on dark
STONE_DARK = "#6e685e"  # tagline on light


# ── The mark ────────────────────────────────────────────────────────────────
# 64-unit square badge carrying an interlocking double-G monogram.
#
#   G1 — the original G: ink ring, red bar. Sits lower right.
#   G2 — its counterpart with the colours swapped: red ring, ink bar. Turned
#        180° about the badge centre so the pair is point-symmetric. Upper left.
#
# Each G's mouth faces away from the other, so the rings cross at two points
# where both are solid. The rings are woven like chain links: G1 passes over
# G2 at one crossing (P) and under it at the other (Q). "Over" is drawn by
# cutting a thin gap in the lower strand with a badge-coloured halo, then
# drawing the upper strand on top — how engraved monograms show depth.
#
# No clip paths, masks or filters: the mark can appear several times on one
# page (header + footer) without colliding SVG ids, and renders identically in
# browsers, Satori (share image) and librsvg/sharp (PNG exports).

R = 11.0  # ring centre-line radius
W = 5.5  # stroke weight — rings and bars share it
GAP = 1.1  # width of the cut between woven strands
OFFSET = (11.5, 7.5)  # G1 centre minus G2 centre; the pair is centred on (32, 32)
OPENING = (-45.0, 0.0)  # a G's mouth, in degrees (SVG: 0 = east, clockwise positive)
BAR_START = 3.75  # where a bar begins, measured out from its G's centre — clears the other ring


def _polar(cx: float, cy: float, deg: float, r: float = R) -> tuple[float, float]:
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def _f(v: float) -> str:
    return f"{v:.3f}".rstrip("0").rstrip(".")


class Letter:
    """One G: a ring open across OPENING (turned by `rot`) plus a bar from just
    out from the centre (BAR_START) to just past the ring's outer edge."""

    def __init__(self, cx: float, cy: float, rot: float):
        if rot % 360 not in (0, 180):
            raise ValueError("letters may only be turned 0° or 180°")
        self.cx, self.cy, self.rot = cx, cy, rot
        x0, y0 = _polar(cx, cy, OPENING[0] + rot)
        x1, y1 = _polar(cx, cy, OPENING[1] + rot)
        # The long way round, from the mouth's upper lip to where the bar joins.
        self.ring = f"M{_f(x0)} {_f(y0)}A{_f(R)} {_f(R)} 0 1 0 {_f(x1)} {_f(y1)}"
        bx, by, bw, bh = cx + BAR_START, cy - W / 2, R + W / 2 + 0.5 - BAR_START, W
        if rot % 360 == 180:  # a 180° turn of an axis-aligned rect stays axis-aligned
            bx, by = 2 * cx - (bx + bw), 2 * cy - (by + bh)
        self.bar = (bx, by, bw, bh)

    def solid_at(self, x: float, y: float) -> bool:
        """True if the ring is drawn (not the mouth) at the angle of point (x, y)."""
        deg = math.degrees(math.atan2(y - self.cy, x - self.cx)) - self.rot
        deg = (deg + 180) % 360 - 180
        return not (OPENING[0] < deg < OPENING[1])


def _crossings(a: Letter, b: Letter) -> tuple[tuple[float, float], tuple[float, float]]:
    dx, dy = b.cx - a.cx, b.cy - a.cy
    d = math.hypot(dx, dy)
    if not 0 < d < 2 * R:
        raise ValueError("rings must overlap to interlock")
    m, h = d / 2, math.sqrt(R * R - (d / 2) ** 2)
    ux, uy = dx / d, dy / d
    mx, my = a.cx + ux * m, a.cy + uy * m
    return (mx + uy * h, my - ux * h), (mx - uy * h, my + ux * h)


def _segment(letter: Letter, at: tuple[float, float], half_len: float) -> str:
    """Short arc of `letter`'s ring centred on point `at`, `half_len` units each way."""
    mid = math.degrees(math.atan2(at[1] - letter.cy, at[0] - letter.cx))
    span = math.degrees(half_len / R)
    x0, y0 = _polar(letter.cx, letter.cy, mid - span)
    x1, y1 = _polar(letter.cx, letter.cy, mid + span)
    return f"M{_f(x0)} {_f(y0)}A{_f(R)} {_f(R)} 0 0 1 {_f(x1)} {_f(y1)}"


def _arc_between(letter: Letter, a: tuple[float, float], b: tuple[float, float]) -> float:
    """Shorter arc length between two points on `letter`'s ring."""
    t = abs(math.atan2(a[1] - letter.cy, a[0] - letter.cx) - math.atan2(b[1] - letter.cy, b[0] - letter.cx))
    return R * min(t, 2 * math.pi - t)


def build_geometry() -> dict:
    g1 = Letter(32 + OFFSET[0] / 2, 32 + OFFSET[1] / 2, rot=0)
    g2 = Letter(32 - OFFSET[0] / 2, 32 - OFFSET[1] / 2, rot=180)
    p, q = _crossings(g1, g2)
    for pt in (p, q):
        if not (g1.solid_at(*pt) and g2.solid_at(*pt)):
            raise ValueError("a crossing falls in a G's mouth — adjust OFFSET")

    # Angle between the strands at a crossing (the same at both, by symmetry).
    d = math.hypot(*OFFSET)
    cross = math.acos(max(-1.0, min(1.0, (2 * R * R - d * d) / (2 * R * R))))
    sin_c, cot_c = math.sin(cross), abs(math.cos(cross) / math.sin(cross))
    # Along G2's ring the cut must clear G1's strand plus a gap either side…
    cut = (W / 2 + GAP) / sin_c + (W / 2) * cot_c + 0.6
    # …and the red redraw runs further, so its ends land on red rather than on the
    # cut. The margin is generous because the strands are thick relative to R:
    # along the inner edge they meet more obliquely than the centre-line angle says.
    over = cut + 3.2
    if over > _arc_between(g2, p, q) - cut:
        raise ValueError("weave redraw would reach the other crossing — reduce GAP or W")

    def bar(b: tuple[float, float, float, float]) -> dict:
        return {"x": round(b[0], 3), "y": round(b[1], 3), "width": round(b[2], 3), "height": round(b[3], 3)}

    return {
        "stroke": W,
        "gap": GAP,
        "g1": {"ring": g1.ring, "bar": bar(g1.bar)},
        "g2": {"ring": g2.ring, "bar": bar(g2.bar)},
        "weave": {"cut": _segment(g2, q, cut), "over": _segment(g2, q, over)},
    }


GEOMETRY = build_geometry()


def mark_body(badge: str, glyph: str, *, keyline: bool, scale: float = 1.0) -> str:
    """Everything drawn on top of the badge, on the 64-unit grid. Classes let the
    adaptive tab icon swap badge/glyph colours: b = badge fill, h = badge stroke,
    gf = glyph fill, gs = glyph stroke."""
    g = GEOMETRY
    w, gap = g["stroke"], g["gap"]

    def rect(b: dict, fill: str, cls: str = "", grow: float = 0) -> str:
        c = f' class="{cls}"' if cls else ""
        return (
            f'<rect{c} x="{_f(b["x"] - grow)}" y="{_f(b["y"] - grow)}" '
            f'width="{_f(b["width"] + 2 * grow)}" height="{_f(b["height"] + 2 * grow)}" fill="{fill}"/>'
        )

    def stroke(d: str, colour: str, width: float, cls: str = "") -> str:
        c = f' class="{cls}"' if cls else ""
        return f'<path{c} d="{d}" fill="none" stroke="{colour}" stroke-width="{_f(width)}"/>'

    keyline_el = (
        f'<rect x="4.5" y="4.5" width="55" height="55" rx="6" fill="none" stroke="{glyph}" stroke-opacity="0.28" stroke-width="1.25"/>'
        if keyline
        else ""
    )
    transform = "" if scale == 1 else f' transform="translate(32 32) scale({_f(scale)}) translate(-32 -32)"'
    return (
        f"{keyline_el}<g{transform}>"
        # G2 underneath: red ring, ink bar.
        + stroke(g["g2"]["ring"], RED, w)
        + rect(g["g2"]["bar"], glyph, "gf")
        # G1 over it: a badge-coloured halo cuts the gap, then ink ring + red bar.
        + stroke(g["g1"]["ring"], badge, w + 2 * gap, "h")
        + rect(g["g1"]["bar"], badge, "b", gap)
        + stroke(g["g1"]["ring"], glyph, w, "gs")
        + rect(g["g1"]["bar"], RED)
        # Weave: at Q, G2's ring passes back over G1.
        + stroke(g["weave"]["cut"], badge, w + 2 * gap, "h")
        + stroke(g["weave"]["over"], RED, w)
        + "</g>"
    )


def mark_svg(
    badge: str,
    glyph: str,
    *,
    keyline: bool,
    rounded: bool = True,
    size: int | None = None,
    adaptive: bool = False,
) -> str:
    """Standalone mark. Without the keyline (icon sizes) the monogram is drawn
    larger so it still reads at 16px. `adaptive` swaps to the paper badge when
    the browser UI is dark, so the tab icon never disappears into a dark tab strip."""
    rx = 9 if rounded else 0
    attrs = f' width="{size}" height="{size}"' if size else ""
    style = (
        "<style>@media (prefers-color-scheme: dark){"
        f".b{{fill:{glyph}}}.h{{stroke:{glyph}}}.gf{{fill:{badge}}}.gs{{stroke:{badge}}}"
        "}</style>"
        if adaptive
        else ""
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"{attrs}>'
        f"<title>The Gents Games &amp; Entertainment</title>"
        f"{style}"
        f'<rect class="b" width="64" height="64" rx="{rx}" fill="{badge}"/>'
        f"{mark_body(badge, glyph, keyline=keyline, scale=1 if keyline else 1.16)}"
        f"</svg>"
    )


def mark_group(badge: str, glyph: str) -> str:
    """The mark for embedding in a lockup (64-unit box at the origin)."""
    return f'<rect width="64" height="64" rx="9" fill="{badge}"/>{mark_body(badge, glyph, keyline=True)}'


def geometry_module() -> str:
    """TypeScript copy of the geometry, read by the React mark and the share image."""
    return (
        "// Generated by scripts/brand/generate-brand-assets.py — do not edit by hand.\n"
        "// Interlocking double-G monogram on a 64-unit grid; the script explains the construction.\n"
        f"export const BRAND_MARK = {json.dumps(GEOMETRY, indent=2)} as const;\n"
    )


# ── Wordmark ────────────────────────────────────────────────────────────────

class Face:
    def __init__(self, path: str, wght: float, wdth: float):
        font = instancer.instantiateVariableFont(TTFont(path), {"wght": wght, "wdth": wdth})
        self.upm = font["head"].unitsPerEm
        self.cap = font["OS/2"].sCapHeight
        self.cmap = font.getBestCmap()
        self.glyphs = font.getGlyphSet()
        self.hmtx = font["hmtx"]

    def advance(self, ch: str) -> int:
        return self.hmtx[self.cmap[ord(ch)]][0]

    def width(self, text: str, size: float, tracking: float) -> float:
        s = size / self.upm
        w = sum(self.advance(c) * s for c in text) + tracking * size * (len(text) - 1)
        return w

    def path(self, text: str, x: float, baseline: float, size: float, tracking: float) -> str:
        s = size / self.upm
        out = []
        for c in text:
            name = self.cmap[ord(c)]
            pen = SVGPathPen(self.glyphs)
            self.glyphs[name].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
            d = pen.getCommands()
            if d:
                out.append(d)
            x += self.advance(c) * s + tracking * size
        return "".join(out)


def lockup_svg(font_path: str, *, badge: str, glyph: str, name_fill: str, tag_fill: str) -> str:
    display = Face(font_path, wght=800, wdth=72)  # matches .brand-name
    caps = Face(font_path, wght=600, wdth=100)  # matches .brand-sub

    name, tag = "THE GENTS", "GAMES & ENTERTAINMENT"
    text_x = 80

    # Name: cap height 27 units, sitting in the upper part of the 64 box.
    name_size = 27 / (display.cap / display.upm)
    name_tracking = 0.02
    name_w = display.width(name, name_size, name_tracking)

    # Tagline: cap height 8.5 units, tracked out so it spans the name's width.
    tag_size = 8.5 / (caps.cap / caps.upm)
    base_w = caps.width(tag, tag_size, 0)
    tag_tracking = (name_w - base_w) / (tag_size * (len(tag) - 1))

    name_base, tag_base = 35.5, 55.5
    width = math.ceil(text_x + name_w + 2)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 64">'
        f"<title>The Gents Games &amp; Entertainment</title>"
        f"{mark_group(badge, glyph)}"
        f'<path fill="{name_fill}" d="{display.path(name, text_x, name_base, name_size, name_tracking)}"/>'
        f'<path fill="{tag_fill}" d="{caps.path(tag, text_x, tag_base, tag_size, tag_tracking)}"/>'
        f"</svg>"
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    font_path = sys.argv[1]

    OUT_PUBLIC.mkdir(parents=True, exist_ok=True)
    OUT_RASTER_SRC.mkdir(parents=True, exist_ok=True)

    files = {
        OUT_PUBLIC / "gents-mark.svg": mark_svg(INK, PAPER, keyline=True),
        OUT_PUBLIC / "gents-mark-reverse.svg": mark_svg(PAPER, INK, keyline=True),
        OUT_PUBLIC / "gents-logo.svg": lockup_svg(font_path, badge=INK, glyph=PAPER, name_fill=INK, tag_fill=STONE_DARK),
        OUT_PUBLIC / "gents-logo-reverse.svg": lockup_svg(font_path, badge=PAPER, glyph=INK, name_fill=PAPER, tag_fill=STONE),
        # Tab icon: no keyline (it vanishes at 16px); adapts to dark browser UI.
        OUT_APP / "icon.svg": mark_svg(INK, PAPER, keyline=False, adaptive=True),
        # Raster sources. Apple icons are square — iOS applies its own mask.
        OUT_RASTER_SRC / "favicon.svg": mark_svg(INK, PAPER, keyline=False, size=64),
        OUT_RASTER_SRC / "apple-icon.svg": mark_svg(INK, PAPER, keyline=False, rounded=False, size=180),
        ROOT / "src" / "components" / "brand-mark-geometry.ts": geometry_module(),
    }
    for path, svg in files.items():
        path.write_text(svg + "\n", encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
