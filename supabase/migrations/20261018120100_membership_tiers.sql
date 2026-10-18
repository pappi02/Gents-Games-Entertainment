-- Membership tiers + membership enquiries.
--
-- The venue wants to grow towards a members' club model (joining fee +
-- recurring subscription, with each tier unlocking access to certain game
-- categories). v1 still has no public user accounts and no online payments
-- (docs/PRODUCT_REQUIREMENTS.md §5), so this adds only:
--   1. membership_tiers — what each tier is, what it costs, what it includes;
--   2. membership_tier_categories — which game categories a tier unlocks;
--   3. a 'membership' enquiry type, so interest is captured through the
--      existing enquiry pipeline (staff follow up and enrol members offline).
--
-- Facility-accuracy rule applies to fees exactly as it does to game prices:
-- a tier only shows publicly once published, and its fees only show once
-- fees_confirmed = true (set by a super_admin after the owner approves the
-- amounts). Seeded tiers below are drafts with no fees.

-- ============================================================================
-- 1. membership_tiers
-- ============================================================================

create table public.membership_tiers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    summary text not null,
    description text,
    -- One benefit per line; rendered as a list. Free text so the owner can
    -- phrase perks (guest passes, member nights, …) without a schema change.
    benefits text,
    currency text not null default 'KES',
    -- Integer minor units (cents), never a float — docs/CODE_STYLE.md §2.
    subscription_minor_units bigint check (subscription_minor_units >= 0),
    billing_period text not null default 'annual'
        check (billing_period in ('monthly', 'quarterly', 'annual')),
    joining_fee_minor_units bigint check (joining_fee_minor_units >= 0),
    fees_confirmed boolean not null default false,
    sort_order integer not null default 0,
    publication_status text not null default 'draft'
        check (publication_status in ('draft', 'published', 'archived')),
    created_by uuid references public.admin_profiles (id),
    updated_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Confirming fees with no subscription amount would render an empty price.
    check (not fees_confirmed or subscription_minor_units is not null)
);

comment on table public.membership_tiers is
    'Membership tiers. Public only when published; fees public only when fees_confirmed. No accounts or payments — interest comes in as enquiries (enquiry_type = membership).';

create index membership_tiers_public_idx
    on public.membership_tiers (publication_status, sort_order);

create trigger set_updated_at before update on public.membership_tiers
    for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. membership_tier_categories — the "certain games access" for each tier
-- ============================================================================

create table public.membership_tier_categories (
    tier_id uuid not null references public.membership_tiers (id) on delete cascade,
    category_id uuid not null references public.game_categories (id) on delete cascade,
    primary key (tier_id, category_id)
);

create index membership_tier_categories_category_idx
    on public.membership_tier_categories (category_id);

-- ============================================================================
-- 3. RLS — public reads published tiers only; super_admin writes (fees are
--    pricing, and pricing is super_admin-only — see pricing_options policy).
-- ============================================================================

alter table public.membership_tiers enable row level security;
alter table public.membership_tier_categories enable row level security;

create policy membership_tiers_public_select on public.membership_tiers
    for select using (publication_status = 'published');
create policy membership_tiers_editor_select on public.membership_tiers
    for select using (public.current_admin_role() in ('super_admin', 'content_editor'));
create policy membership_tiers_super_admin_all on public.membership_tiers
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

-- A link row is public only when its tier is published. The category itself
-- is still filtered by game_categories' own RLS (published only), so an
-- unpublished category never appears as a tier inclusion.
create policy membership_tier_categories_public_select on public.membership_tier_categories
    for select using (
        exists (
            select 1 from public.membership_tiers t
            where t.id = membership_tier_categories.tier_id
              and t.publication_status = 'published'
        )
    );
create policy membership_tier_categories_editor_select on public.membership_tier_categories
    for select using (public.current_admin_role() in ('super_admin', 'content_editor'));
create policy membership_tier_categories_super_admin_all on public.membership_tier_categories
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

grant select on public.membership_tiers, public.membership_tier_categories to anon, authenticated;
grant insert, update, delete on public.membership_tiers, public.membership_tier_categories to authenticated;
grant select, insert, update, delete on public.membership_tiers, public.membership_tier_categories to service_role;

-- ============================================================================
-- 4. 'membership' enquiry type
-- ============================================================================

alter table public.enquiries drop constraint enquiries_enquiry_type_check;
alter table public.enquiries add constraint enquiries_enquiry_type_check
    check (enquiry_type in ('game', 'event', 'group', 'general', 'membership'));

-- ============================================================================
-- 5. Proposed tiers — drafts, no fees. Modelled on the members' club pattern
--    (joining fee + subscription, tiers by access level). Names, perks, fees
--    and inclusions are all for the owner to confirm or rewrite.
-- ============================================================================

insert into public.membership_tiers (name, slug, summary, description, benefits, billing_period, sort_order)
values
    (
        'Games Member',
        'games',
        'Regular access to the games floor.',
        'For regulars who come for the tables.',
        E'Access to the games floor\nMember-only league nights\nPriority when tables are busy',
        'monthly',
        1
    ),
    (
        'Social Member',
        'social',
        'The games floor plus live entertainment nights.',
        'Everything in Games, plus the social side of the club.',
        E'Everything in Games Member\nLive entertainment nights\nGuest passes for friends',
        'annual',
        2
    ),
    (
        'Full Club Member',
        'full-club',
        'The whole club — games, leisure facilities and entertainment.',
        'Full access to everything the club offers.',
        E'Everything in Social Member\nInvitations to members'' events\nMember rates for private group bookings',
        'annual',
        3
    )
on conflict (slug) do nothing;

insert into public.membership_tier_categories (tier_id, category_id)
select t.id, c.id
from (values
    ('games', 'cue-sports'), ('games', 'strategy-board-games'), ('games', 'table-indoor-sports'),
    ('social', 'cue-sports'), ('social', 'strategy-board-games'), ('social', 'table-indoor-sports'),
    ('social', 'cards-social-games'), ('social', 'live-entertainment'),
    ('full-club', 'cue-sports'), ('full-club', 'strategy-board-games'), ('full-club', 'table-indoor-sports'),
    ('full-club', 'cards-social-games'), ('full-club', 'live-entertainment'),
    ('full-club', 'outdoor-leisure'), ('full-club', 'casino-style-games')
) as m(tier_slug, category_slug)
join public.membership_tiers t on t.slug = m.tier_slug
join public.game_categories c on c.slug = m.category_slug
on conflict do nothing;
