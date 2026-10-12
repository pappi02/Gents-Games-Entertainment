# Phase 0 — Discovery & Business Verification (Sign-Off Record)

Status of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 0, as confirmed by the business owner on 2026-10-12. This record is the source of truth for seeding `venue_settings` and the initial game/category inventory in [DATABASE.md](DATABASE.md).

## 1. Brand & Relationship

- Name: **The Gents Games & Entertainment**
- Relationship: sister brand to The Gents Playhouse, same physical location, own identity (confirmed in original brand brief).
- Domain/hosting: **not decided yet** — deferred to later phase. Build/run on local + staging until a domain is chosen (does not block Phase 1).

## 2. Venue Location & Contact (confirmed)

- **Address:** 275 Nyeri Close, Kileleshwa Estate, Moi Avenue area, Nairobi, 00100, Kenya
- **Plus code:** PQ9H+2M Nairobi
- **Map link:** https://maps.app.goo.gl/N6E1E5T2CtdDc3GGA
- **Location pin reference (shared premises):** listed on Google Maps under "Executive Hideaway Barber and Spa" — this is the building/location identifier, not the games & entertainment brand name. Confirm with owner before deciding whether this business name should be mentioned anywhere on the site (e.g. "located within ...") or omitted entirely.
- **Phone:** +254 719 506 995 (call or **WhatsApp**), +254 111 500 150 (call)
- **Email:** none at launch — phone-only contact for v1. `venue_settings.contact_email` stays null; enquiry form and "Visit Us" page offer phone/WhatsApp (and the enquiry form itself) as the contact channels, no email link rendered.
- **Opening hours:** **Open 24/7, every day.** Confirmed — safe to publish and to include in `LocalBusiness` structured data and the "Visit Us" page.
- **Location listing note:** the venue's map pin is shared with "Executive Hideaway Barber and Spa" at the same physical address. **Do not reference, name, or link that business anywhere on the site.** Use only the raw address/plus-code/map coordinates — never the shared listing's business name — when displaying location or embedding the map.

> `venue_settings` can now be fully seeded and published: address, map link (coordinates only, not the named listing), phone numbers, and 24/7 hours.

## 3. Facilities Inventory (confirmed available now)

| Category | Status | Notes |
|---|---|---|
| Cue sports (pool, etc.) | **Available** | Exact table count/type still to be itemized per game before publishing individual pages |
| Board & card games | **Available** | Exact game list (chess, dominoes, cards, etc.) still to be itemized |
| Table tennis / darts / other indoor sports | **Available** | Exact equipment list still to be itemized |
| Video & console gaming | **Excluded for now** | Not currently available — leave out of the catalogue entirely at launch, not even as "coming soon" |
| Social & group entertainment / events / tournaments | **Confirmed offered** | Real events can be published in MVP |

**Decision: no exact itemization for now.** Each confirmed category ships at launch as a small set of representative, category-typical `games` records (e.g. "Pool," "Chess," "Table Tennis") with general descriptions, **without** claiming an exact table/equipment count. Copy must avoid specific-but-unverified numbers (e.g. don't write "4 pool tables" — write "pool tables available" or similar, consistent with [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) facility-accuracy rule: unverified specifics are omitted, not invented). Exact counts/equipment lists can be added later without restructuring the catalogue.

## 4. Pricing Model (confirmed)

- **Enquiry-only at launch** — no public prices displayed. Visitors ask; staff respond with rates. Matches [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §9 and [DATABASE.md](DATABASE.md) §6 default behavior (no `pricing_options` record needs to be finalized before launch).

## 5. Media / Photography (confirmed)

- Real venue photography exists but is **not used at launch**.
- MVP launches with **free/stock images** sourced from the internet as visual placeholders for games/categories.
- These must be clearly tagged as stock/placeholder in the CMS (e.g. an `is_placeholder` flag or equivalent on `game_media`) so they can be swapped for the owner's real photography later without a content audit from scratch.
- Licensing requirement: only use images explicitly licensed for commercial/web use (e.g. Unsplash/Pexels license terms) — never unlicensed scraped images.

## 6. Tech Stack (confirmed)

- **Next.js + TypeScript**, confirmed per [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §2 default.
- **Database/backend:** Supabase (Postgres) — either standalone Supabase or Vercel's built-in Supabase integration — in place of self-managed PostgreSQL.
  - This changes a few implementation details from the generic spec, carried forward into Phase 1/2:
    - Supabase Auth can serve as the admin-session mechanism in place of a hand-rolled session store ([SECURITY.md](SECURITY.md) §1), provided role-based authorization is still enforced server-side per-request.
    - Supabase Storage can serve as the object storage layer for `game_media`/`media_assets` in place of a separate provider.
    - Row-level security (RLS) policies in Supabase must still enforce the deny-by-default authorization matrix from [SECURITY.md](SECURITY.md) §2 — RLS is the server-side enforcement layer here, not a convenience feature to skip.
    - Migrations run through Supabase's migration tooling; same discipline as [CODE_STYLE.md](CODE_STYLE.md) §4 (version-controlled, no manual prod schema edits).

## 7. Phase 0 Status: CLOSED

All items resolved as of 2026-10-12:

| Item | Resolution |
|---|---|
| Venue email | None — phone-only contact for v1 |
| Opening hours | 24/7, every day — confirmed, publishable |
| Shared location listing ("Executive Hideaway Barber and Spa") | Not referenced anywhere on site; address/coordinates only |
| Itemized game counts/equipment | Not itemized for v1 — category-typical representative games ship without specific unverified counts |
| Hosting/DB pairing | Next.js + TypeScript + Supabase confirmed; Vercel vs. standalone Supabase hosting deferred to Phase 1/9, doesn't block |

**Exit condition met.** Proceeding to Phase 1 — Technical Foundation.
