# Phase 6 — SEO, Accessibility & Performance Pass (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 6. Verified against the real Supabase project and a real production build/server.

## SEO

- **`robots.ts`**: allows everything except `/admin` (a courtesy to crawlers — not the security boundary, which is Supabase Auth + RLS). Points to `/sitemap.xml`. Verified live.
- **`sitemap.ts`**: dynamically built from the real `games` table, filtered by the same RLS that governs the public site (a draft game can never appear in it). Verified live — correctly lists all static routes plus the 5 published games, and deliberately **excludes** events, since no individual `/events/[slug]` canonical page exists yet (a gap carried over from Phase 5 — see below).
- **Canonical URLs**: added to `/games` (collapses every `?category=`/`?q=` filter combination to one canonical page, per [TESTING.md](TESTING.md) §6) and `/games/[slug]`.
- **`metadataBase`**: set from `NEXT_SITE_URL` so relative canonical/OG URLs resolve correctly once a real domain is set.
- **Structured data**: `LocalBusiness` JSON-LD on the home page, built only from already-verified `venue_settings` fields (name, address, map link, phone) — deliberately omits opening hours, since the venue's "Open 24/7" free-text note isn't safe to encode as schema.org's structured `openingHoursSpecification` without real structure behind it.
- **Known gap carried over, not newly introduced**: `/games/[slug]` for a draft or nonexistent slug returns the correct "not found" page content but **HTTP 200 instead of 404**. Investigated properly this time (see "What I actually tried" below) — root cause confirmed as a genuine Next.js 16 Cache Components / Partial Prerendering limitation, not something fixable from application code without disabling PPR globally. Documented rather than silently left for someone else to discover.
- **No individual `/events/[slug]` page** — only the `/events` list exists (Phase 5 scope gap). Noted so it isn't mistaken for a Phase 6 regression.

### What I actually tried on the 404 status code (and why it's not fixed)

- Added `export const instant = false` to `games/[slug]/page.tsx`, based on an official Next.js error message that listed it as a fix option for a *different* (build-time) error.
- It did not change the runtime status-code behavior. Read Next's own `instant` documentation directly: `instant` is a **dev-time navigation-validation toggle** (whether Next warns you in the dev overlay about non-instant navigations) — it has no effect on whether a route is served via Partial Prerendering in production. The build-time error it *did* fix earlier (in Phase 3/4, on `/admin` and other pages) was coincidental: that error was about Cache Components refusing to produce a static shell at all, and `instant = false` opts a route out of that specific validation, which happened to be the right fix there — but it was never the mechanism that controls the shell-then-stream response behavior causing this 404-becomes-200 issue.
- Confirmed via live response headers (`x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`) that the route is still served as a static shell + streamed dynamic hole, with the HTTP status locked in at the shell stage — before the streamed `notFound()` call can change it.
- Left the `instant = false` export in place (harmless) but corrected the code comment to say plainly that it does not fix this, rather than leave a comment claiming a fix that isn't real.
- **Real fix options**, not implemented here: disable `cacheComponents` globally (loses PPR's benefits everywhere, a bigger tradeoff), or wait for a future Next.js release addressing this for dynamic-segment routes with `notFound()`. Neither is a quick, safe change to make unilaterally — flagging for a deliberate decision rather than making it silently.

## Accessibility

- Skip-to-content link (`.skip-link`, visually hidden until focused) added to the public layout; `id="main-content"` added to every public page's `<main>` as its target. Verified live.
- Visible `:focus-visible` outline enforced in CSS for links, buttons, and form fields — never left to inconsistent browser defaults.
- Enquiry form's success/error messages now carry `role="status"` / `role="alert"` so screen readers announce them without a page reload being mistaken for silence.
- Primary nav labeled `aria-label="Primary"`.
- Carried over from Phase 4 (already correct, re-confirmed): status badges always pair text with color, images have real `alt` text sourced from `game_media.alt_text`, forms have visible `<label>` elements tied to inputs.
- **Not done**: no automated accessibility audit tool (e.g. axe, Lighthouse) was run — this environment has no headless browser available. Manual review only. No `aria-current` on the active nav link (would need a client component for `usePathname`; judged lower priority than the fixes above for this pass).

## Performance

- **Image optimization**: game photos now go through `next/image` (configured via `next.config.ts` `images.remotePatterns` for the Supabase Storage hostname) instead of a plain `<img>`. Verified live: the same Pool photo that's 275KB as the original Wikimedia file serves at 34KB through `/_next/image` at a mobile width — a real, measured improvement, not just a config claim.
- First gallery image on a game page marked `priority` (eager-loaded, since it's likely above the fold); the rest lazy-load by `next/image` default.
- **Not done**: no Lighthouse/Core Web Vitals run — this environment has no browser automation available, so the specific LCP/INP/CLS numeric targets in [TESTING.md](TESTING.md) §2 are unverified, not claimed as met. The optimizations above (responsive images, correct `sizes`, lazy-loading) are the standard levers for those metrics, but the actual numbers need a real browser-based run (e.g. via Vercel's deployed preview + PageSpeed Insights) once there's a live URL — tracked for Phase 9.

### Addendum: real caching implemented (superseding the note above)

A real dev-mode warning the user hit directly prompted fixing this properly rather than leaving it deferred. Public reads in `src/lib/public/queries.ts` are now `"use cache"` Server Functions, tagged by entity (`games`, `categories`, `events`, `venue-settings`) via `cacheTag()`, with `cacheLife("hours")`. Every admin mutation that touches that entity calls `updateTag(...)` with the matching tag name (verified by direct grep — no typos between the two sides) for immediate, non-stale invalidation (`updateTag`, not `revalidateTag`, since these are Server Actions needing read-your-own-writes correctness, not stale-while-revalidate — matters for facility-accuracy: an unpublish must never be visible-with-a-delay).

This required switching public reads from the cookie-aware Supabase client to a plain anon client (`src/lib/supabase/public.ts`), because `"use cache"` forbids reading cookies inside the cached scope. **Behavior change, not a regression**: a signed-in admin browsing the public site no longer incidentally previews drafts (this was never a designed feature, just a side effect noted in [PHASE_4_STATUS.md](PHASE_4_STATUS.md)).

Measured result: `/`, `/events`, and `/venue` went from fully dynamic (`ƒ`, rendered per request) to genuinely static (`○`, 1-hour revalidate / 1-day expire window) in the production build output. `/games` and `/visit` remain dynamic by necessity (they read `searchParams`, which is inherently per-request). I also caught and fixed my own regression along the way: an earlier attempt to add venue data to the shared layout for structured data had accidentally forced every page dynamic (including static legal pages) — caught by comparing build output before/after, fixed by moving that fetch to the one page that needed it.

Not independently live-tested end-to-end (would need a real browser session to publish something and watch it appear with zero delay) — the verification here is build-output-based (dynamic → static) plus a manual tag-name cross-check, not a full browser-driven cache-invalidation test.

## Exit condition

This phase's implementation-plan entry is a checklist, not a single pass/fail condition. Status against each item:

| Item | Status |
|---|---|
| Per-page titles/canonical/sitemap/robots | ✅ Done, verified live |
| Structured data for verified facts only | ✅ Done (LocalBusiness) |
| Accessibility: keyboard nav, focus, labels, no color-only status | ✅ Done, re-confirmed |
| Automated + manual accessibility audit | ⚠️ Manual only — no audit tooling available here |
| Responsive/optimized images | ✅ Done, measured improvement |
| Lighthouse/Core Web Vitals numeric targets | ❌ Not run — no browser automation in this environment; deferred to a real deployed URL |
| 404 status-code correctness for bad slugs | ❌ Investigated, root-caused, not fixed — genuine framework limitation, documented rather than hidden |

Two items are honestly incomplete rather than claimed done: the numeric performance targets need a real deployed environment to measure, and the 404 status code needs either a Next.js fix upstream or a deliberate architectural tradeoff (disabling Cache Components) that's worth discussing with you before making.
