# Phase 2 — Data Layer (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 2 against what's actually been applied to the real Supabase project.

## Migrations applied (in order)

1. `20261012124846_init_schema.sql` — full schema: `admin_profiles`, `game_categories`, `games`, `media_assets` + `game_media`, `pricing_options`, `events`, `enquiries` + `enquiry_notes` + `enquiry_status_history`, `venue_settings` (singleton), `audit_logs`; `updated_at` triggers; RLS enabled on every table with explicit allow-only policies (deny-by-default per [SECURITY.md](SECURITY.md) §2).
2. `20261012125024_seed_initial_content.sql` — seeds `venue_settings` with the confirmed Phase 0 facts, and 3 confirmed-available categories (Cue Sports, Strategy & Board Games, Table & Indoor Sports) with 5 representative `games` rows — all `publication_status = 'draft'` pending content/image review (Phase 8), `facility_status = 'available'` since the facility itself is real. **Console/video gaming was not seeded at all**, per your explicit instruction to exclude it entirely.
3. `20261012125946_grant_role_privileges.sql` — table-level `GRANT` statements for `anon`/`authenticated`. Required because Postgres checks the coarse table grant before RLS is even consulted; without this every query returned "permission denied" regardless of RLS policy correctness.
4. `20261012130136_submit_enquiry_rpc.sql` — `public.submit_enquiry(...)` RPC: lets an anonymous visitor submit an enquiry and get back only their `public_reference`, without ever granting `anon` table-level `SELECT` on `enquiries`. Needed because a plain PostgREST insert with `RETURNING` requires a `SELECT` grant that anon must never have.
5. `20261012130252_cleanup_connectivity_test_rows.sql` — removes the automated test rows created while verifying the above (data cleanup, not a schema change).

## Verified live, with real queries against the real project

- `venue_settings` is publicly readable via the anon client and matches the confirmed Phase 0 facts exactly (address, plus code, map link, both phone numbers with correct per-number channels — `call`+`whatsapp` on the primary 0719 number, `call`-only on the 0111 number, 24/7 hours note).
- **Facility-accuracy enforced at the database layer, not just app logic:** `game_categories` and `games` are seeded but return `[]` to the anon client, because they're `draft` — RLS hides them regardless of what any future UI bug might try to render.
- `enquiries`: anon can `INSERT` directly (no `RETURNING`) and can call `submit_enquiry()` to get a reference back (tested: returned `ENQ-000002`), but a direct `SELECT` as anon is still correctly denied — confirmed after adding the RPC, not just before.

## Open items carried forward

- No `pricing_options` or `events` rows seeded — correct per Phase 0 (enquiry-only pricing; no specific event itemized yet). These get added through the admin dashboard once it exists (Phase 3) or the owner provides specifics.
- `admin_profiles` has no rows yet — no admin user exists until Phase 3 creates the first Supabase Auth user and links a profile.
- The git-repo-root issue (flagged in [PHASE_1_STATUS.md](PHASE_1_STATUS.md)) is still unresolved.
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is still blank — not needed yet, will be needed for Phase 3 admin-side server actions that must bypass RLS deliberately (e.g. bootstrapping the first super_admin).

## Exit condition (per IMPLEMENTATION_PLAN.md)

> "Schema is migrated in all environments; seed data loads correctly with everything defaulting to unpublished/unverified; a reviewer can confirm no record is publicly visible yet."

**Met**, for the one environment that exists (the real Supabase project — no separate staging/dev project has been created yet, that's a Phase 1/9 hosting detail, not a schema gap). Confirmed live: seed data loaded correctly, and the facility-accuracy rule holds — draft catalogue content is genuinely invisible to the public client, not just hidden by UI convention.
