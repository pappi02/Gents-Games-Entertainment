-- The Gents Games & Entertainment — initial schema
-- See docs/DATABASE.md for the design this implements, docs/SECURITY.md §2
-- for the authorization matrix enforced below via RLS, and
-- docs/PHASE_0_DISCOVERY.md for the confirmed venue facts seeded at the end.
--
-- Facility-accuracy rule (docs/PRODUCT_REQUIREMENTS.md §2): every table that
-- feeds the public site carries an explicit publication/facility status, and
-- RLS denies public SELECT on anything not published. There is no implicit
-- "visible by default" state anywhere in this schema.

-- ============================================================================
-- 1. admin_profiles — extends Supabase auth.users with role + status
-- ============================================================================

create table public.admin_profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    role text not null check (role in ('super_admin', 'content_editor', 'enquiry_staff')),
    is_active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.admin_profiles is
    'Role/status for an authenticated admin user. One row per auth.users row that should have dashboard access.';

-- Security-definer helper so RLS policies elsewhere can check the caller's
-- role without needing their own SELECT policy on admin_profiles (which would
-- otherwise create a circular RLS dependency). Locked search_path per
-- Supabase's documented pattern for this kind of helper function.
create or replace function public.current_admin_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
    select role
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true;
$$;

comment on function public.current_admin_role() is
    'Returns the active admin role for the current auth.uid(), or null if not an active admin. Used by RLS policies below.';

-- ============================================================================
-- 2. game_categories
-- ============================================================================

create table public.game_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    description text,
    sort_order integer not null default 0,
    publication_status text not null default 'draft'
        check (publication_status in ('draft', 'published', 'archived')),
    seo_title text,
    seo_description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index game_categories_public_idx
    on public.game_categories (publication_status, sort_order);

-- ============================================================================
-- 3. games
-- ============================================================================

create table public.games (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.game_categories (id) on delete restrict,
    name text not null,
    slug text not null unique,
    short_description text not null,
    description text not null,
    rules text,
    beginner_notes text,
    typical_players text,
    typical_duration text,
    equipment_notes text,
    facility_status text not null default 'unverified'
        check (facility_status in ('unverified', 'available', 'coming_soon', 'unavailable')),
    publication_status text not null default 'draft'
        check (publication_status in ('draft', 'published', 'archived')),
    featured boolean not null default false,
    seo_title text,
    seo_description text,
    created_by uuid references public.admin_profiles (id),
    updated_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index games_public_catalogue_idx
    on public.games (category_id, publication_status, facility_status);

create index games_featured_idx
    on public.games (featured) where featured = true;

-- ============================================================================
-- 4. media_assets + game_media
-- ============================================================================

create table public.media_assets (
    id uuid primary key default gen_random_uuid(),
    storage_bucket text not null,
    storage_path text not null,
    mime_type text,
    size_bytes bigint,
    -- Per docs/PHASE_0_DISCOVERY.md §5: MVP launches with free/stock images.
    -- This flag lets the catalogue be audited and swapped to real venue
    -- photography later without hunting through content for which is which.
    is_placeholder boolean not null default true,
    license_note text,
    uploaded_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    unique (storage_bucket, storage_path)
);

create table public.game_media (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    media_asset_id uuid not null references public.media_assets (id) on delete restrict,
    media_type text not null default 'image' check (media_type in ('image', 'video')),
    alt_text text,
    caption text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index game_media_game_idx on public.game_media (game_id, sort_order);

-- ============================================================================
-- 5. pricing_options
-- ============================================================================

create table public.pricing_options (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null references public.games (id) on delete cascade,
    currency text not null default 'KES',
    -- Stored as integer minor units (cents) — never a float. See
    -- docs/CODE_STYLE.md §2.
    amount_minor_units bigint not null check (amount_minor_units >= 0),
    billing_unit text not null
        check (billing_unit in ('per_game', 'per_table', 'per_person', 'per_hour', 'per_session', 'other')),
    duration_minutes integer,
    minimum_charge_minor_units bigint check (minimum_charge_minor_units >= 0),
    conditions text,
    effective_start date,
    effective_end date,
    is_active boolean not null default false,
    created_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (effective_end is null or effective_start is null or effective_end >= effective_start)
);

create index pricing_options_game_idx
    on public.pricing_options (game_id, is_active);

-- ============================================================================
-- 6. events
-- ============================================================================

create table public.events (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    description text not null,
    start_at timestamptz not null,
    end_at timestamptz,
    timezone text not null default 'Africa/Nairobi',
    registration_instructions text,
    capacity integer,
    price_minor_units bigint check (price_minor_units >= 0),
    currency text default 'KES',
    publication_status text not null default 'draft'
        check (publication_status in ('draft', 'published', 'archived')),
    seo_title text,
    seo_description text,
    created_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (end_at is null or end_at >= start_at)
);

create index events_public_idx
    on public.events (publication_status, start_at);

-- ============================================================================
-- 7. enquiries + status history
-- ============================================================================

create sequence public.enquiry_reference_seq;

create table public.enquiries (
    id uuid primary key default gen_random_uuid(),
    public_reference text not null unique
        default ('ENQ-' || lpad(nextval('public.enquiry_reference_seq')::text, 6, '0')),
    contact_name text not null,
    contact_phone text,
    contact_email text,
    preferred_contact_method text
        check (preferred_contact_method in ('call', 'whatsapp', 'either')),
    enquiry_type text not null
        check (enquiry_type in ('game', 'event', 'group', 'general')),
    related_game_id uuid references public.games (id) on delete set null,
    related_event_id uuid references public.events (id) on delete set null,
    message text not null,
    requested_visit_at timestamptz,
    party_size integer,
    status text not null default 'new'
        check (status in ('new', 'in_progress', 'awaiting_response', 'resolved', 'spam')),
    assignee_id uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (contact_phone is not null or contact_email is not null)
);

alter sequence public.enquiry_reference_seq owned by public.enquiries.id;

create index enquiries_status_idx on public.enquiries (status, created_at);

create table public.enquiry_notes (
    id uuid primary key default gen_random_uuid(),
    enquiry_id uuid not null references public.enquiries (id) on delete cascade,
    admin_id uuid references public.admin_profiles (id),
    note text not null,
    created_at timestamptz not null default now()
);

create table public.enquiry_status_history (
    id uuid primary key default gen_random_uuid(),
    enquiry_id uuid not null references public.enquiries (id) on delete cascade,
    old_status text,
    new_status text not null,
    changed_by uuid references public.admin_profiles (id),
    changed_at timestamptz not null default now()
);

-- ============================================================================
-- 8. venue_settings — singleton row
-- ============================================================================

create table public.venue_settings (
    id boolean primary key default true check (id),
    brand_name text not null default 'The Gents Games & Entertainment',
    address text not null,
    plus_code text,
    map_url text,
    -- Each phone number carries its own supported contact channels, e.g.
    -- {"call","whatsapp"} for the primary line vs {"call"} only for a line
    -- that doesn't support WhatsApp. See docs/PHASE_0_DISCOVERY.md §2.
    phone_primary text,
    phone_primary_channels text[] not null default array['call']::text[],
    phone_secondary text,
    phone_secondary_channels text[] not null default array['call']::text[],
    contact_email text,
    hours_note text,
    timezone text not null default 'Africa/Nairobi',
    social_links jsonb not null default '{}'::jsonb,
    updated_by uuid references public.admin_profiles (id),
    updated_at timestamptz not null default now()
);

comment on table public.venue_settings is
    'Singleton table (id is always true) holding venue contact/location facts. Never fabricate a value here — see docs/PRODUCT_REQUIREMENTS.md §2.';

-- ============================================================================
-- 9. audit_logs
-- ============================================================================

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.admin_profiles (id),
    action text not null,
    entity_type text not null,
    entity_id uuid,
    summary text,
    created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ============================================================================
-- 10. updated_at triggers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_updated_at before update on public.admin_profiles
    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.game_categories
    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.games
    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pricing_options
    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.enquiries
    for each row execute function public.set_updated_at();

-- ============================================================================
-- 11. Row-Level Security — deny-by-default, explicit allow policies only
-- ============================================================================

alter table public.admin_profiles enable row level security;
alter table public.game_categories enable row level security;
alter table public.games enable row level security;
alter table public.media_assets enable row level security;
alter table public.game_media enable row level security;
alter table public.pricing_options enable row level security;
alter table public.events enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.enquiry_status_history enable row level security;
alter table public.venue_settings enable row level security;
alter table public.audit_logs enable row level security;

-- admin_profiles: self-read, super_admin full access
create policy admin_profiles_self_select on public.admin_profiles
    for select using (id = auth.uid());
create policy admin_profiles_super_admin_all on public.admin_profiles
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

-- game_categories: public reads published only; editors+ write
create policy game_categories_public_select on public.game_categories
    for select using (publication_status = 'published');
create policy game_categories_admin_all on public.game_categories
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

-- games: public reads published only; editors+ write
create policy games_public_select on public.games
    for select using (publication_status = 'published');
create policy games_admin_all on public.games
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

-- media_assets / game_media: public reads only media attached to a published
-- game; editors+ write.
create policy game_media_public_select on public.game_media
    for select using (
        exists (
            select 1 from public.games g
            where g.id = game_media.game_id
              and g.publication_status = 'published'
        )
    );
create policy game_media_admin_all on public.game_media
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

create policy media_assets_public_select on public.media_assets
    for select using (
        exists (
            select 1 from public.game_media gm
            join public.games g on g.id = gm.game_id
            where gm.media_asset_id = media_assets.id
              and g.publication_status = 'published'
        )
    );
create policy media_assets_admin_all on public.media_assets
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

-- pricing_options: public reads only active prices on published games;
-- super_admin writes always, content_editor only if explicitly granted
-- (kept simple here as super_admin-only; revisit if content_editor pricing
-- access is needed later per docs/SECURITY.md §2's "optional configurable
-- permission").
create policy pricing_options_public_select on public.pricing_options
    for select using (
        is_active = true
        and (effective_start is null or effective_start <= current_date)
        and (effective_end is null or effective_end >= current_date)
        and exists (
            select 1 from public.games g
            where g.id = pricing_options.game_id
              and g.publication_status = 'published'
        )
    );
create policy pricing_options_super_admin_all on public.pricing_options
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

-- events: public reads published only; editors+ write
create policy events_public_select on public.events
    for select using (publication_status = 'published');
create policy events_admin_all on public.events
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

-- enquiries: anonymous/public may INSERT only (submit an enquiry) — never
-- select or update their own or anyone else's. Staff can read/update.
create policy enquiries_public_insert on public.enquiries
    for insert with check (true);
create policy enquiries_staff_select on public.enquiries
    for select using (public.current_admin_role() in ('super_admin', 'content_editor', 'enquiry_staff'));
create policy enquiries_staff_update on public.enquiries
    for update using (public.current_admin_role() in ('super_admin', 'enquiry_staff'))
    with check (public.current_admin_role() in ('super_admin', 'enquiry_staff'));

create policy enquiry_notes_staff_all on public.enquiry_notes
    for all using (public.current_admin_role() in ('super_admin', 'enquiry_staff'))
    with check (public.current_admin_role() in ('super_admin', 'enquiry_staff'));

create policy enquiry_status_history_staff_select on public.enquiry_status_history
    for select using (public.current_admin_role() in ('super_admin', 'enquiry_staff'));
create policy enquiry_status_history_staff_insert on public.enquiry_status_history
    for insert with check (public.current_admin_role() in ('super_admin', 'enquiry_staff'));

-- venue_settings: public can read the single row; only super_admin writes.
create policy venue_settings_public_select on public.venue_settings
    for select using (true);
create policy venue_settings_super_admin_write on public.venue_settings
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

-- audit_logs: super_admin only, insert-only from app code (no update/delete
-- policy exists, so audit rows are immutable once written).
create policy audit_logs_super_admin_select on public.audit_logs
    for select using (public.current_admin_role() = 'super_admin');
create policy audit_logs_admin_insert on public.audit_logs
    for insert with check (public.current_admin_role() in ('super_admin', 'content_editor', 'enquiry_staff'));
