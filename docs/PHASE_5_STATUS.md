# Phase 5 — Events, Groups & Enquiry Flow (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 5. Built and verified against the real Supabase project.

## Seed data: enriched, imaged, and published

Per your instruction to implement realistic seed data with free images:

- **Content enrichment** (`supabase/migrations/20261012141126_enrich_and_publish_seed_content.sql`): added typical duration, equipment notes, and beginner notes to all 5 seeded games; marked Pool, Chess, and Table Tennis as featured.
- **Real photos**, not boxes: 5 licensed stock photos downloaded from Wikimedia Commons (CC0/public-domain/CC-BY-SA, all free for commercial use), uploaded to the `game-media` Storage bucket, and linked via `media_assets`/`game_media`. Full source/license/attribution record in [supabase/seed-assets/LICENSES.md](../supabase/seed-assets/LICENSES.md); re-runnable via `scripts/seed-media.mjs` (idempotent — skips games that already have media).
- **Published**: the 3 confirmed categories and all 5 games are now `publication_status = 'published'`. This is a deliberate, explicit exception to the normal Phase 8 content-approval gate — done because you (acting as the business owner in this session) directed it directly. No price was published (enquiry-only stays in force), and video/console gaming remains entirely unseeded, per your earlier instruction.
- Verified live: `/games` now lists all 5 games, home's featured section shows the 3 flagged ones, and a real image URL (`.../storage/v1/object/public/game-media/<id>/seed-pool.jpg`) returns `200 image/jpeg` when fetched directly.

## New public pages

- **`/visit`**: now the canonical contact + enquiry destination — address, map, hours, call/WhatsApp buttons (unchanged from Phase 4), plus the real enquiry form.
- **`/venue`**: trimmed to atmosphere/facilities overview, links to `/visit` for contact details (content moved rather than duplicated).
- **`/events`**: lists published events with an "Enquire" link into `/visit?event=<slug>`; accessible empty state when none are published.
- **`/groups`**: static copy on group/private-event enquiries, links to `/visit?type=group`.
- **`/privacy`, `/terms`, `/accessibility`**: draft content, each explicitly labeled "pending legal review" / "pending full audit" per [SECURITY.md](SECURITY.md) §8 and [TESTING.md](TESTING.md) §1 — nothing here claims compliance that hasn't actually been verified.
- Game detail pages now show `equipment_notes`/`beginner_notes` (populated by the enrichment migration) and link to `/visit?game=<slug>` for a contextual enquiry, alongside the existing direct call/WhatsApp buttons.
- Nav/footer updated: Events, Groups, Visit Us added; footer gained Privacy/Terms/Accessibility links.

## The enquiry flow itself

- `src/app/(public)/visit/actions.ts`: server-side validation (name required, phone-or-email required, message required, enquiry type/contact method validated against the DB's allowed values) before calling the `submit_enquiry` RPC built in Phase 2.
- Context (which game/event the enquiry is about) is passed through as a slug in both the form and the error-redirect path, then resolved server-side — never trusted as a raw ID from the client beyond what RLS already allows.
- Success path shows the real reference number and an explicit "this confirms we have your message, not a booking" line, matching [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §9.

## Verified against the real database

- All new pages return 200.
- **Could not test the Server Action via plain `curl`** (Next.js Server Actions use an internal POST encoding, not a plain form POST) — so instead verified the exact underlying call it makes: called `submit_enquiry` as the anon role with a real published game (`pool`) attached, got back a real reference (`ENQ-000003`), confirmed via the service-role admin view that it landed correctly (`enquiry_type: "game"`, correct `related_game_id`, `status: "new"`), then deleted the test row. This is the same verification pattern used in Phases 2–4, and it covers the actual security/logic-critical path — the Server Action itself is a thin, already lint/type-checked FormData→RPC bridge.

## Known gaps / deferred

- The not-recommended-but-harmless HTTP-200-instead-of-404 PPR quirk from Phase 4 still applies to `/games/[slug]`.
- No automated test actually drove the HTML form through a browser (would need a headless browser tool not set up in this environment) — the RPC-level verification above is the practical substitute.
- Legal pages are drafts; real legal review is still a pre-launch requirement per [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 0/7 notes.

## Exit condition (per IMPLEMENTATION_PLAN.md)

> "A real end-to-end enquiry submitted on the public site appears correctly in `/admin/enquiries` with a working status workflow, survives a simulated email-provider failure, and is rate-limited against rapid resubmission."

**Partially met.** The enquiry pipeline itself is verified end-to-end (submission → DB → correct admin-side shape) and the status workflow already existed from Phase 3. **Not yet done:** no email provider is configured at all yet (so there's nothing to simulate a failure of), and no rate-limiting has been added to the public form. Both are real gaps, not glossed over — tracked for before launch.
