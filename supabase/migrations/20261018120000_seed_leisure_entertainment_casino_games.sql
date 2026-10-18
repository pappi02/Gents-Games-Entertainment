-- Leisure, live entertainment and casino-style games — proposed additions,
-- NOT confirmed facilities.
--
-- Data-only migration (no schema change). Same pattern as
-- 20261013120000_seed_candidate_physical_games.sql: every row is
-- publication_status = 'draft' AND facility_status = 'unverified', with no
-- typical_players / typical_duration / equipment_notes, no pricing_options,
-- no media rows, not featured. The admin save action refuses to publish an
-- unverified game, and the public queries drop unverified rows, so nothing
-- below reaches the public site until the owner confirms it in /admin/games.
--
-- Scope notes (docs/PRODUCT_REQUIREMENTS.md §5–6):
--   * Casino-style games are recreational only — play chips with no cash
--     value, no buy-ins, no prizes. Real-money gaming and wagering stay out of
--     scope; the descriptions say so explicitly so the distinction survives
--     into the public copy. Legal review is still required before any of
--     these is published (see docs/MEMBERSHIP_AND_LEISURE_EXPANSION.md).
--   * The swimming pool and mini golf course are facilities that would be
--     new construction; their pages describe the activity, never depth,
--     lifeguard cover, opening times or capacity — those are owner facts.
--   * The live band and salsa dancers are a recurring entertainment
--     programme. Individual dated nights belong in public.events; this record
--     is the standing "what is it" page those events can point to.
--
-- Idempotent: re-running never overwrites a row an admin has since edited.

insert into public.game_categories (name, slug, description, sort_order, publication_status)
values
    (
        'Outdoor & Leisure',
        'outdoor-leisure',
        'Time away from the tables — a putting course and a pool to unwind by.',
        5,
        'draft'
    ),
    (
        'Live Entertainment',
        'live-entertainment',
        'Live music and dance performances to set the mood for the evening.',
        6,
        'draft'
    ),
    (
        'Casino-Style Games',
        'casino-style-games',
        'Classic casino table games played for fun with play chips only — no cash, no wagering, no prizes.',
        7,
        'draft'
    )
on conflict (slug) do nothing;

insert into public.games (
    category_id, name, slug, short_description, description,
    facility_status, publication_status, featured
)
select
    c.id, g.name, g.slug, g.short_description, g.description,
    'unverified', 'draft', false
from (values
    -- Outdoor & leisure
    (
        'outdoor-leisure', 'Mini Golf', 'mini-golf',
        'A short putting course with ramps, bends and a few tricky holes.',
        'Mini golf, or crazy golf, is a putting-only version of golf played over a series of short holes, each with its own obstacles — slopes, bends, bridges and narrow gaps. Players take turns putting towards the hole and count their strokes; the lowest total wins. No experience needed, and it works as well for a pair as for a group.'
    ),
    (
        'outdoor-leisure', 'Swimming Pool', 'swimming-pool',
        'A pool to swim, cool off and relax beside between games.',
        'A swimming pool for a few lengths, a cool-down after a long session, or an afternoon lounging on the pool deck. Pool rules, depth and supervision arrangements are set by the venue and shown here once confirmed.'
    ),
    -- Live entertainment
    (
        'live-entertainment', 'Live Band & Salsa Dancers', 'live-band-salsa',
        'A live band on stage with salsa dancers leading the floor.',
        'A live band plays Latin and dance-floor favourites while professional salsa dancers perform and invite guests to join in. Come to watch, come to learn a few steps, or just enjoy the music with your drink. Specific nights and performers are listed under Events once they are scheduled.'
    ),
    -- Casino-style games (play chips only)
    (
        'casino-style-games', 'Roulette', 'roulette',
        'Call your numbers and watch the wheel — played with play chips only.',
        'Roulette is a table game built around a spinning wheel and a small ball. Players place play chips on numbers, colours or groups of numbers on the table layout, the wheel is spun, and the pocket the ball lands in decides which positions win. Played here for fun only: chips have no cash value and there are no prizes.'
    ),
    (
        'casino-style-games', 'Blackjack', 'blackjack',
        'Beat the dealer to 21 without going over — for fun, not for money.',
        'Blackjack is a card game played against the dealer. Each player aims for a hand totalling closer to 21 than the dealer''s without going over, choosing to "hit" for another card or "stand" on what they have. Simple to learn, with real decisions on every hand. Played with play chips only — no cash value, no prizes.'
    ),
    (
        'casino-style-games', 'Poker (Texas Hold''em)', 'poker',
        'Two cards each, five on the table, and a lot of reading the room.',
        'Texas Hold''em is the most widely played form of poker. Each player is dealt two private cards and shares five community cards dealt face up in stages, betting play chips between rounds. The best five-card hand — or the last player left in — takes the pot. Played socially with play chips that have no cash value; no buy-ins and no prizes.'
    )
) as g(category_slug, name, slug, short_description, description)
join public.game_categories c on c.slug = g.category_slug
on conflict (slug) do nothing;
