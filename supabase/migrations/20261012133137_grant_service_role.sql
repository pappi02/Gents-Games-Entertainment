-- Explicit grants for the service_role (server-only, bypasses RLS via
-- BYPASSRLS, but still needs the coarse table-level grant first — same
-- reason anon/authenticated needed theirs in the earlier grants migration).
-- service_role is never used from the browser; see docs/SECURITY.md §5.

grant usage on schema public to service_role;

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
to service_role;

grant usage, select on sequence public.enquiry_reference_seq to service_role;
