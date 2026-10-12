-- Enquiry submission RPC.
--
-- Anon has INSERT on public.enquiries but deliberately no SELECT (RLS has no
-- public select policy on that table either — see previous migrations), so
-- a plain PostgREST insert cannot return the row via `Prefer: return=
-- representation`. But the visitor needs their public_reference back per
-- docs/ARCHITECTURE_AND_DATA.md §9 ("Generate a unique reference number" /
-- "acknowledgement only after the enquiry has been durably accepted").
--
-- This SECURITY DEFINER function is the narrow, intentional exception: it
-- inserts and hands back only the new reference — never the full row, never
-- any other enquiry's data. The app's server-side validation
-- (docs/ARCHITECTURE_AND_DATA.md §9 step 2) still runs before calling this;
-- the NOT NULL / CHECK constraints on public.enquiries are the last line of
-- defense, not the first.

create or replace function public.submit_enquiry(
    p_contact_name text,
    p_message text,
    p_enquiry_type text,
    p_contact_phone text default null,
    p_contact_email text default null,
    p_preferred_contact_method text default null,
    p_related_game_id uuid default null,
    p_related_event_id uuid default null,
    p_requested_visit_at timestamptz default null,
    p_party_size integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reference text;
begin
    insert into public.enquiries (
        contact_name, contact_phone, contact_email, preferred_contact_method,
        enquiry_type, related_game_id, related_event_id, message,
        requested_visit_at, party_size
    ) values (
        p_contact_name, p_contact_phone, p_contact_email, p_preferred_contact_method,
        p_enquiry_type, p_related_game_id, p_related_event_id, p_message,
        p_requested_visit_at, p_party_size
    )
    returning public_reference into v_reference;

    return v_reference;
end;
$$;

comment on function public.submit_enquiry is
    'Public entry point for enquiry submission. Returns only the new public_reference — never exposes table SELECT to anon. See docs/ARCHITECTURE_AND_DATA.md §9.';

grant execute on function public.submit_enquiry(
    text, text, text, text, text, text, uuid, uuid, timestamptz, integer
) to anon, authenticated;
