# Phase 3 — Admin Dashboard (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 3. Built and verified against the real Supabase project — not just locally.

## What's built

- **Auth**: `/admin/login` (Supabase Auth email/password via Server Action), server-side route guard in `src/app/admin/(protected)/layout.tsx` redirecting anyone without an active `admin_profiles` row.
- **Role-based nav**: sidebar filters links by role (super_admin / content_editor / enquiry_staff) — a UX convenience; RLS remains the real enforcement per [SECURITY.md](SECURITY.md) §2.
- **`/admin/categories`**: list, create, edit, publish/unpublish/archive.
- **`/admin/games`**: list, create, edit (category, descriptions, rules, facility status, publication status, featured flag).
- **`/admin/games/[id]/media`**: upload to the `game-media` Supabase Storage bucket (5 MB limit, JPEG/PNG/WebP only, server-generated storage paths, placeholder flag per [PHASE_0_DISCOVERY.md](PHASE_0_DISCOVERY.md) §5), list/remove.
- **`/admin/games/[id]/pricing`**: add/activate/deactivate/delete prices (stored as integer minor units, never floats, per [CODE_STYLE.md](CODE_STYLE.md) §2).
- **`/admin/events`**: list, create (draft), publish/unpublish.
- **`/admin/enquiries`**: list/filter by status, status workflow, internal notes.
- **`/admin/venue-settings`**: edit the singleton row (phone channels, hours, address, etc.).
- **`/admin/users`** (super_admin only): list admin users, create new ones via the Supabase Admin API (service-role key, server-only — see `src/lib/supabase/admin.ts`), activate/deactivate.
- **`/admin/audit-log`** (super_admin only): read-only log, written to by the most sensitive actions (admin user create/activate/deactivate, venue settings changes, category/game publish-state changes).

## First super-admin

Created and verified: `pappi@gmail.com`, role `super_admin`, linked to `admin_profiles`.

## Verified live against the real database (not assumed)

Ran the actual Phase 3 exit-condition sequence as the real super-admin, then checked public visibility, then cleaned up:

1. Signed in as super_admin — OK
2. Created a category (defaulted to draft) — OK
3. Published it — OK
4. Created a game under it — OK
5. Uploaded an image to Storage, linked via `media_assets`/`game_media` — OK
6. Added a price, activated it — OK
7. Published the game — OK
8. **Public (anonymous) client could then see**: category ✅, game ✅, price ✅, media ✅

Also ran negative tests as an **unauthenticated** client: category insert, venue_settings update, and admin_profiles read were all correctly rejected with "permission denied" — confirming deny-by-default holds, not just for drafts (Phase 2) but for every write surface this phase added.

## Known gaps / deferred

- UI does not yet hide forms a given role can't actually use (e.g. a content_editor still sees the pricing-activation buttons, which RLS will silently reject). Not a security issue — RLS is the real gate — but a UX polish item for later.
- Audit logging is not yet wired into every mutation (e.g. game media upload/delete, pricing changes, enquiry status changes aren't logged yet) — the most sensitive actions are covered; broader coverage can be added incrementally without a schema change.
- No password-reset flow built yet for admin users (not required for Phase 3's exit condition; add before relying on this for real staff onboarding).
- Vercel project still not created — this dashboard has only been run/tested locally and via direct Supabase queries, not deployed anywhere yet.

## Exit condition (per IMPLEMENTATION_PLAN.md)

> "A super admin can log in, create a category and game end-to-end, upload media, set a price, and publish it — with every mutation authorized server-side and logged to the audit trail."

**Met**, with one caveat: audit-trail coverage is partial (sensitive actions only, not yet exhaustive) — flagged above as a deferred item rather than silently claimed complete.
