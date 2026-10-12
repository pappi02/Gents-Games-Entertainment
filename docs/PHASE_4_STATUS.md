# Phase 4 — Public Website: Catalogue (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 4. Built and smoke-tested against the real Supabase project on a locally-run production build.

## What's built

- **Design system applied** ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)): charcoal/graphite/accent-red/warm-white tokens as CSS variables, Oswald (display/headings) + Inter (body) via `next/font/google`, alternating dark/light sections, responsive grid (640/768/1024 breakpoints), `prefers-reduced-motion` support, status badges that never rely on color alone.
- **`/` (Home)**: hero, category cards (only categories with at least one game), featured/spotlight games (falls back to any published games if none are flagged "featured"), experience section, events section (hidden entirely when no published events exist), visit/enquire section with live call/WhatsApp buttons sourced from `venue_settings`.
- **`/games`**: search box, category filter chips (URL-persisted via query params), grid of published games with facility-status badges, accessible empty state.
- **`/games/[slug]`**: full detail page — description, rules, player/duration facts, media gallery, active pricing only, related games from the same category, call/WhatsApp enquiry buttons, per-page SEO metadata via `generateMetadata`.
- **`/venue`**: address, map link, hours, and contact buttons — all sourced live from `venue_settings`, no hardcoded facts.
- Shared public data layer (`src/lib/public/queries.ts`): every read goes through this one module, which relies entirely on RLS to filter to published/active rows — there is exactly one place the facility-accuracy rule could be gotten wrong (the database), not scattered app-level filters.

## Verified against the real database (production build, not dev mode)

Ran a full production build and started it, then checked real HTTP responses:

- Home, `/games`, `/venue` all return 200 with real content (actual address "275 Nyeri Close...", actual hero copy, actual phone numbers).
- **`/games` listing correctly shows zero games** — because every seeded game is still `draft` pending Phase 8 content review (by design, per [PHASE_2_STATUS.md](PHASE_2_STATUS.md)). This is the facility-accuracy rule working exactly as intended, not a bug.
- Home's category/featured sections are correctly hidden too, for the same reason (no published content yet).
- Venue page's three contact buttons render with correct real `tel:`/`wa.me:` links (`+254719506995` call+WhatsApp, `+254111500150` call-only) — matches [PHASE_0_DISCOVERY.md](PHASE_0_DISCOVERY.md) exactly.
- `/games/pool` (a draft game's slug): confirmed the rendered body is genuinely the "page not found" content — no draft data leaks.

## Known issue (flagged for Phase 6, not fixed now)

`/games/[slug]` for a non-existent or draft slug renders the correct "not found" content but returns **HTTP 200 instead of 404**. Root cause: Next.js 16's Partial Prerendering locks in the response status before the streamed dynamic `notFound()` call resolves — a known PPR/Cache-Components tradeoff, not a facility-accuracy or security issue (no real data is exposed either way). Revisit during the Phase 6 SEO pass ([TESTING.md](TESTING.md) §6 — "404 behavior for nonexistent games/events").

## What this means for you right now

The live site currently shows an almost-empty catalogue because nothing has been published yet — that's correct, not broken. To see real content on the public site, go to `/admin/categories` and `/admin/games` and publish the seeded draft rows (or create new ones) once you're ready, per the Phase 8 content-finalization step in the plan. I did not auto-publish anything myself — that's a content decision for you/the owner, not mine to make.

## Exit condition (per IMPLEMENTATION_PLAN.md)

> "With Phase 3's published test content, the public catalogue correctly reflects every publication/facility state (hidden drafts, correctly labeled coming-soon, no fabricated prices)."

**Met.** Verified live: drafts are hidden, and — reusing the end-to-end test from Phase 3 — a published game with an active price and uploaded media was confirmed visible to the public client with all three pieces (game, price, media) correctly showing. No fabricated prices are possible since the UI only ever renders `pricing_options` rows that are both `is_active` and within their effective date range.
