-- Seed data from the confirmed Phase 0 discovery record
-- (docs/PHASE_0_DISCOVERY.md). Everything here reflects only verified facts:
--
--   * venue_settings: real address/phone/hours, confirmed 2026-10-12.
--   * game_categories / games: the three confirmed-available categories,
--     seeded as publication_status = 'draft' (content/imagery still needs
--     owner review per docs/IMPLEMENTATION_PLAN.md Phase 8) but
--     facility_status = 'available' (the facility itself is real, per
--     docs/PHASE_0_DISCOVERY.md §3). No exact equipment counts, per the
--     owner's explicit instruction not to itemize yet.
--   * Video/console gaming is deliberately NOT seeded — excluded entirely,
--     not even as a draft or "coming soon" row.
--   * No pricing_options rows — enquiry-only at launch, no price to seed.
--   * No events rows — real events are confirmed offered, but no specific
--     event has been itemized yet to seed.

-- ============================================================================
-- venue_settings
-- ============================================================================

insert into public.venue_settings (
    id, brand_name, address, plus_code, map_url,
    phone_primary, phone_primary_channels,
    phone_secondary, phone_secondary_channels,
    contact_email, hours_note, timezone
) values (
    true,
    'The Gents Games & Entertainment',
    '275 Nyeri Close, Kileleshwa Estate, Nairobi, 00100, Kenya',
    'PQ9H+2M Nairobi',
    'https://maps.app.goo.gl/N6E1E5T2CtdDc3GGA',
    '+254719506995', array['call', 'whatsapp']::text[],
    '+254111500150', array['call']::text[],
    null,
    'Open 24/7, every day',
    'Africa/Nairobi'
)
on conflict (id) do update set
    brand_name = excluded.brand_name,
    address = excluded.address,
    plus_code = excluded.plus_code,
    map_url = excluded.map_url,
    phone_primary = excluded.phone_primary,
    phone_primary_channels = excluded.phone_primary_channels,
    phone_secondary = excluded.phone_secondary,
    phone_secondary_channels = excluded.phone_secondary_channels,
    contact_email = excluded.contact_email,
    hours_note = excluded.hours_note,
    timezone = excluded.timezone;

-- ============================================================================
-- game_categories (confirmed-available only — console gaming excluded)
-- ============================================================================

insert into public.game_categories (name, slug, description, sort_order, publication_status)
values
    ('Cue Sports', 'cue-sports', 'Precision, strategy, and friendly competition around the table.', 1, 'draft'),
    ('Strategy & Board Games', 'strategy-board-games', 'Thinking games and classic card games for casual or competitive play.', 2, 'draft'),
    ('Table & Indoor Sports', 'table-indoor-sports', 'Reflexes and head-to-head action across our indoor table games.', 3, 'draft');

-- ============================================================================
-- games — representative entries per category, no exact equipment counts
-- ============================================================================

insert into public.games (
    category_id, name, slug, short_description, description,
    typical_players, facility_status, publication_status
)
select
    c.id,
    g.name, g.slug, g.short_description, g.description,
    g.typical_players, 'available', 'draft'
from (values
    (
        'cue-sports', 'Pool', 'pool',
        'Precision meets competition at the table.',
        'Step up to the table, line up your shot, and challenge your friends to a game of pool. Whether you''re learning the basics or refining your technique, pool combines concentration, positioning, and tactical thinking. Pool tables are available on-site — ask our team about current availability when you visit.',
        'Typically 2 (or teams in doubles play)'
    ),
    (
        'strategy-board-games', 'Chess', 'chess',
        'Think ahead, plan your attack, outplay your opponent.',
        'Chess is a two-player strategy game built around planning, pattern recognition, and anticipating your opponent''s next move. A game can be a relaxed introduction to strategy or a serious test of concentration between experienced players. Beginners can learn how the pieces move and build confidence one move at a time.',
        '2'
    ),
    (
        'strategy-board-games', 'Cards', 'cards',
        'Casual, social, group-friendly card games.',
        'Enjoy a range of casual recreational card games with friends — a relaxed way to spend time together between other activities. Ask our team which card games are available during your visit.',
        '2 or more'
    ),
    (
        'table-indoor-sports', 'Table Tennis', 'table-tennis',
        'Fast reflexes, head-to-head rallies.',
        'Table tennis brings fast-paced, competitive fun for singles or doubles play. Whether you''re knocking the ball around casually or playing a serious rally, it''s a great way to get moving and challenge a friend.',
        '2 (singles) or 4 (doubles)'
    ),
    (
        'table-indoor-sports', 'Darts', 'darts',
        'Steady aim, friendly rivalry.',
        'Darts is a classic pub-style game of precision and focus — easy to pick up, satisfying to master. Great for casual play or a running rivalry with friends.',
        '2 or more'
    )
) as g(category_slug, name, slug, short_description, description, typical_players)
join public.game_categories c on c.slug = g.category_slug;
