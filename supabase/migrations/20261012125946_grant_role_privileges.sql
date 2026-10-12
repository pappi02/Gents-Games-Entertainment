-- Table-level privilege grants for the anon/authenticated roles.
--
-- RLS policies (previous migration) only take effect once a role already
-- has the underlying table-level GRANT — without this, Postgres returns
-- "permission denied for table" before RLS is even consulted. This migration
-- is the coarse gate; the RLS policies remain the fine-grained enforcement
-- per docs/SECURITY.md §2 (deny-by-default, nothing here widens what a role
-- can actually see/change beyond what its RLS policies allow).

grant usage on schema public to anon, authenticated;

-- Publicly-readable content tables (RLS still restricts to published/active
-- rows only for anon).
grant select on
    public.game_categories,
    public.games,
    public.game_media,
    public.media_assets,
    public.pricing_options,
    public.events,
    public.venue_settings
to anon, authenticated;

-- Anonymous visitors may only INSERT an enquiry — RLS has no select policy
-- for anon on this table, so this grant alone does not expose read access.
grant insert on public.enquiries to anon, authenticated;
grant usage, select on sequence public.enquiry_reference_seq to anon, authenticated;

-- Authenticated (admin) users get the full CRUD surface at the grant level;
-- RLS policies from the previous migration narrow this per-role
-- (super_admin / content_editor / enquiry_staff) and per-row.
grant select, insert, update, delete on
    public.admin_profiles,
    public.game_categories,
    public.games,
    public.game_media,
    public.media_assets,
    public.pricing_options,
    public.events,
    public.enquiries,
    public.enquiry_notes,
    public.enquiry_status_history,
    public.venue_settings,
    public.audit_logs
to authenticated;
