# Public Site Redesign (Status)

October 2026 visual and structural redesign of the public routes. Admin, database schema, RLS, and cache-tag invalidation are unchanged. Design-system details: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) §11.

## Defects found and fixed

| Defect | Cause | Fix |
|---|---|---|
| No navigation at all below 768px | `.site-nav` was `display:none` on mobile and no mobile menu was rendered | `MainNav` disclosure menu (Escape/outside-click/route-change close, focus moved in and returned) |
| Broken page scrolling model | `html, body { overflow-x: hidden }` + `html { height: 100% }` made `body` the scroll container | `body { overflow-x: clip }`, no fixed html height |
| Homepage said "our full enquiry form is coming soon" | Stale copy — the form on `/visit` already worked | Copy removed; CTAs link to `/visit#enquiry` |
| Related-game cards had no status badge | `getRelatedGames` didn't select `facility_status` | One shared `GAME_CARD_SELECT` for every card query |
| Raw enum text as status ("coming soon", "unverified") | No label mapping | `src/lib/public/status.ts` — one label + explanation per state |
| "Available" badge failed AA contrast on dark cards | Fixed green on graphite | Per-surface status tokens |
| Search matched name only; `%`/`_` acted as wildcards | `ilike("name", "%q%")` | In-memory, case-insensitive match on name, short description, and category over the cached published catalogue |
| Enquiry error wiped everything the visitor typed | Errors returned via `redirect(?error=)` | `useActionState`: field-level errors, `aria-invalid`, focused error summary, values kept, pending state |
| Event dates in server timezone | `toLocaleString()` | `Intl.DateTimeFormat` in `Africa/Nairobi` (`src/lib/public/format.ts`) |
| Prices formatted with float division | `amount / 100` | Integer-only `formatMoney` |
| Past events stayed listed | No date filter | `getPublishedEvents` drops finished events |
| Internal doc references shown on legal pages | "See docs/SECURITY.md §8" in visible copy | Public wording; references moved to code comments |
| Footer link targets under 24px (axe `target-size`) | Inline 0.4rem gaps | 36px min-height list links |
| No 404/error pages with site chrome; no Open Graph | Missing files | `not-found.tsx` (both), `(public)/error.tsx`, `opengraph-image.tsx`, `src/lib/public/seo.ts` |

New: `/events/[slug]` (with Event JSON-LD from the published record only), breadcrumbs with BreadcrumbList JSON-LD on detail pages, events in the sitemap.

## Verification (local production build, `next start`)

- `npm run lint`, `npx tsc --noEmit`, `npm run build` — pass.
- Playwright + axe-core (WCAG 2 A/AA, 2.1 AA, 2.2 AA tags) over 17 URLs × 8 widths (320–1440): **0 axe violations, 0 horizontal overflow, 0 console errors**. Baseline had contrast and target-size violations on every page.
- 37 scripted interaction checks pass: mobile menu keyboard/focus behaviour, skip link, search + category combinations, back/reload state, literal `%` search, unknown category, card-vs-detail status consistency for all 5 games, enquiry validation (focus, `aria-invalid`, retained values), context fields, success state, tel/wa.me links, not-found UI, per-page titles/canonicals/OG images, sitemap.
- **Not tested end-to-end:** a valid enquiry submission (would write a real row to the production Supabase project). The RPC call itself is unchanged.
- Lighthouse (mobile, simulated throttling) on this machine was too noisy to state a Core Web Vitals verdict — the unchanged baseline alone ranged 35–87 performance across runs. Consistent findings: accessibility 100 (baseline 90–96), CLS 0 on every run (baseline hit 0.081 and 0.187 on some runs), LCP element is the priority-loaded 21 KB hero image. Measure on a Vercel preview before claiming the TESTING.md §2 targets.

## Motion & interaction pass

Added on top of the redesign (details in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) § Motion):

- **Home:** staged hero entrance; a one-shot pool "bank shot" (desktop); a scroll-linked ticker of the real game list; category rows with a glyph per category; a spotlight-led featured layout; a "Let the table decide" picker (random pick from published games only, links to the real page); separate group-play and events sections. The events section has a designed empty state.
- **Catalogue:** live search (debounced, `router.replace`, so the URL stays shareable and Back isn't flooded; still a plain GET form without JS); filter chips with glyphs and pending feedback; a category banner; cards glide/scale between filter states.
- **Game pages:** card photo morphs into the hero; staged summary; a sticky mobile action bar (Ask / Call / WhatsApp) that parks above the footer.
- **Feedback everywhere:** button lift/press, card lift + red accent bar (hover, keyboard focus, and touch press), mobile-menu stagger.
- **Fixed along the way:** the skip-link target moved to the persistent shell — Next keeps recently visited pages mounted (hidden) for back/forward, which had duplicated `id="main-content"`.

Verification on the local production build: 34 motion checks pass. They cover:

- entrances settle fully visible, and the CTA is done within ~950ms
- nothing is left invisible after scrolling, client navigation or Back
- view transitions fire on navigation and filtering
- live search: URL sync without history spam, focus retained, shared URLs restored
- the picker lands on a real game and announces it
- the mobile action bar never covers the footer
- reduced motion: no running time-based or scroll-driven animations, content visible immediately
- no console or hydration errors

The 37 earlier interaction checks still pass. There's no horizontal overflow at any of the 8 widths. Axe reports contrast only on elements caught mid-reveal; every one passes once revealed, and there are 0 under reduced motion. Lighthouse on mobile reports 0 non-composited animations (2 on desktop: the bank shot). Page weight grew 6–21 KB per page. Performance scores stayed within the same noise band as before, so measure on a Vercel preview.

## Still open

- **HTTP 200 for unknown `/games/[slug]` and `/events/[slug]`** — same Partial Prerendering limitation documented in [PHASE_6_STATUS.md](PHASE_6_STATUS.md). Unmatched top-level URLs do return 404.
- **Image provenance** — owner-supplied images still need commercial-use confirmation ([LICENSES.md](../supabase/seed-assets/LICENSES.md)); all are labelled "Illustrative" on the site until `is_placeholder` is set to `false` for real venue photography.
- **Owner decisions:** sister-brand link URL for The Gents Playhouse (currently text only); whether group enquiries should capture a structured preferred date (needs an RPC/schema change — today it's prompted in the message hint).
