# Design System — The Gents Games & Entertainment

## 1. Visual Direction

**A modern gentlemen's recreation club.** Confident, contemporary, built around real recreation, social connection, and friendly competition. The site must read as a credible physical venue — not a casino, a generic gaming portal, or an AI-generated landing page.

**Style keywords:** Bold & refined · Editorial layout · Premium, adult-oriented recreation-club aesthetic.

## 2. Colour Tokens (proposed — validate before implementation)

| Token | Value | Role |
|---|---|---|
| Charcoal | `#141414` | Primary dark background |
| Graphite | `#252525` | Secondary dark surface |
| Accent red | `#B8202E` | Accent only — never a background for long text |
| Warm white | `#F4F1EA` | Light surfaces, primary text on dark |

These are design tokens, not confirmed brand specifications — validate contrast ratios before implementation, and treat red as an accent, not a body-text background.

## 3. Typography & Branding

- Compact wordmark: **The Gents Games & Entertainment.**
- Distinct logo and favicon — separate from the sister brand's identity.
- **Logo:** an interlocking double-G monogram on a square badge. G1 has an ink ring and a red bar; G2 swaps the colours (red ring, ink bar) and is turned 180°. The two rings are woven like chain links — each passes over the other once, shown by a thin badge-coloured gap at the crossings; wordmark "THE GENTS" in Archivo 800 at `wdth` 72 over "GAMES & ENTERTAINMENT" in Archivo 600, tracked to the same width. Ink badge on light backgrounds, paper badge ("reverse") on dark.
  - Files: `public/brand/` — `gents-logo(.svg|.png)`, `gents-logo-reverse(.svg|.png)`, `gents-mark(.svg|.png)`, `gents-mark-reverse.svg`. Favicon/app icons: `src/app/favicon.ico`, `icon.svg` (switches badge for dark browser UI), `apple-icon.png`.
  - In-site: `src/components/BrandMark.tsx` (header, footer lockup, admin, share image), drawn from the generated `src/components/brand-mark-geometry.ts`. Lettering in the header/footer is live text in the site font; the files above have it outlined.
  - All generated from one geometry by `scripts/brand/generate-brand-assets.py` then `rasterize-brand-assets.mjs` — edit there, not by hand.
  - Minimum size: mark 16px (icon variant), lockup 120px wide. Keep clear space of half the mark's width around it; don't recolour, stretch, or rotate it.
- Restrained pairing: strong display typography for headers + highly readable body text.
- Alternate darker editorial sections with lighter content areas where it improves readability.

## 4. Photography

- Use genuine venue photography as it becomes available.
- Use **clearly labelled placeholders** during development — never present fabricated/stock venue photos as authentic.
- Cinematic photography is fine for featured activities, but the whole site should not read as overly dark.

## 5. Layout Principles

- Strong typography, generous spacing, large real-world photography.
- Responsive game cards and filters that work comfortably on mobile.
- Avoid: excessive gradients, decorative dividers, oversized icons, generic stock-photo grids, cluttered layouts.
- Keep interactions fast, consistent, keyboard-accessible, and comfortable on small screens.
- Animations restrained; **respect `prefers-reduced-motion`** — never rely on animation to convey information.

## 6. Responsive Breakpoints

Use the existing framework's conventions if one is already in place. If starting fresh:

- **640px** — mobile → small tablet
- **768px** — tablet
- **1024px** — desktop

| Viewport | Layout notes |
|---|---|
| Mobile | Single-column hero, horizontal category filters where appropriate, stacked forms, easily tapped actions |
| Tablet | Two-column cards, flexible navigation |
| Desktop | Editorial hero layouts, 3–4 column catalogue grids where space permits, expansive venue gallery |

These are implementation defaults, not a universal standard — fluid sizing between breakpoints.

## 7. Global Navigation

- **Desktop:** Home, Games, Events, The Venue, Groups, Visit Us.
- **Mobile:** compact menu with a clearly visible "Explore Games" action.
- **Footer:** verified contact details, location, opening hours, key page links, privacy/terms links, discreet sister-brand link (The Gents Playhouse).

## 8. Homepage Section Structure

1. **Hero** — "Your Game. Your People. Your Space." Primary CTA: Explore Games. Secondary CTA: Plan Your Visit.
2. **Game Categories** — cards for Cue Sports, Board & Strategy, Table Games, Cards, Video Gaming, Social Entertainment. Only show categories that contain published activities.
3. **Featured Activities** — 3–6 verified activities, each with name, short description, real/placeholder image, facility status, link to detail page.
4. **The Experience** — atmosphere, group experience, equipment, recreation options. No unsupported promises (privacy, luxury, refreshments, exclusivity) unless verified.
5. **Events** — only shown when dates/details/status are confirmed; otherwise hidden or a factual empty state.
6. **Visit & Enquire** — invite enquiries about facilities, prices, group visits; verified contact options and directions.

## 9. Game/Category Card Requirements

- Consistent aspect ratio across activity-card images.
- Clear facility-status indicator — **never colour-only** (accessibility requirement, see [TESTING.md](TESTING.md)).
- Name, short description, status, link to detail page.

## 10. Accessibility-Linked Design Rules

(Full accessibility requirements in [TESTING.md](TESTING.md).)

- Sufficient text/interface contrast at all token combinations.
- Visible keyboard focus indicators.
- No colour-only status indication.
- Accessible touch target sizes and spacing.
- Alt text for meaningful images; empty alt for decorative images.

## 11. Implementation (October 2026 redesign)

Where the system above lives in code — change it here rather than per page.

- **Tokens:** `src/app/globals.css` — palette (ink/stone/paper/red), fluid type scale `--step--2…--step-5`, spacing `--space-1…9`, `--section-y`, `--gutter`, `--content-max`, radii, shadows, motion.
- **Surfaces:** every section declares `.theme-light`, `.theme-paper`, or `.theme-dark` (`src/app/(public)/public.css`), which sets semantic properties (`--surface`, `--text`, `--text-muted`, `--border`, `--accent-text`, `--status-*`). Components only consume the semantic ones, so a card or badge is correct on any surface. Accent red text on dark uses `--color-red-300` for AA contrast.
- **Type:** Archivo (variable, `wdth` axis) for display and body — `.display` is the condensed uppercase cut; Instrument Serif italic (`.accent-serif`) for one accent word per heading at most.
- **Components** (`src/app/(public)/_components/`): `SiteHeader`/`MainNav` (desktop links + mobile disclosure menu), `SiteFooter`, `PageIntro` (every inner page's h1), `GameCard` (the only game card), `StatusBadge` (label + distinct glyph per state), `Breadcrumbs` (+ BreadcrumbList JSON-LD), `ContactActions`, `Icon` (inline SVG set — no icon dependency).
- **Facility status copy:** `src/lib/public/status.ts` is the single source for labels and explanations.
- **Placeholder imagery:** any image whose `media_assets.is_placeholder` isn't explicitly `false` gets an "Illustrative photo" tag; the static lounge image is always tagged "Illustrative image".
- **Image ratios:** cards 4:3, hero 4:5 (desktop) / 4:3 (mobile), category thumbnails 3:2, venue gallery 16:9 lead + 4:3.

### Motion

All motion lives in `src/app/(public)/motion.css` — no animation library.

- **Timing:** `--dur-fast` 140ms (press/hover feedback), `--dur-base` 240ms (state changes), `--dur-slow` 600ms (entrances); `--ease-out` for arrivals, `--ease-spring` for presses and pops, `--stagger` 70ms between siblings.
- **Entrances:** home hero (masked headline lines, copy, CTAs done by ~950ms; photo settles from a slight scale), detail-page summary (`.enter-stagger`). Animations run *from* a hidden state *to* the normal one, so nothing depends on JS to become visible.
- **Scroll:** `.reveal` / `.reveal-group` use CSS scroll-driven animations (`animation-timeline: view()`); browsers without support simply show the content. The hero photo drift and the game-name ticker are scroll-linked, not looping.
- **Route & filter transitions:** React `<ViewTransition>` — `PageTransition` in each page (fade out 120ms / fade-rise in), catalogue cards glide/scale on filter changes, card photo morphs into the game page hero (`gameImageTransitionName`). The header is excluded so it never moves.
- **Game geometry:** per-category glyphs (`CategoryGlyph`) move once on hover/focus; the hero "bank shot" draws once on desktop only (its properties can't be composited).
- **Reduced motion:** `globals.css` zeroes durations *and delays*; `motion.css` additionally removes scroll-driven and transform-based movement and view-transition animation. The game picker skips its shuffle.
- **Don'ts:** no infinite loops, no scroll hijacking, no cursor effects, no animating layout properties.
