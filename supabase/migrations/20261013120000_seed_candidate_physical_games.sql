-- Candidate physical games — proposed additions, NOT confirmed facilities.
--
-- Data-only migration (no schema change). Adds the physical/tabletop games
-- from the catalogue-expansion candidate list that aren't already in the
-- catalogue, so an admin can review, complete and publish each one from
-- /admin/games once the owner confirms it — without a code change.
--
-- Facility-accuracy rule (docs/CLAUDE.md, docs/DATABASE.md §8): every row
-- here is publication_status = 'draft' AND facility_status = 'unverified'.
-- RLS hides drafts from the public site, the public queries also drop
-- unverified rows (src/lib/public/queries.ts), and the admin save action
-- refuses to publish an unverified game. Nothing below claims the venue owns
-- the equipment:
--   * no typical_players / typical_duration / equipment_notes — those are
--     venue facts the owner fills in when confirming;
--   * no pricing_options, no media, not featured;
--   * descriptions describe the game itself, never what's on site.
--
-- Deliberately NOT added:
--   * Pool variants (eight-ball, nine-ball) as separate records — they're
--     formats of the existing published `pool` record. Once the owner
--     confirms which are played, add them to that record's rules text.
--   * Standard playing cards — already the published `cards` record.
--   * Chess, Table Tennis, Darts, Pool — already published and confirmed.
--   * Any video, console, PC, mobile or online game — out of scope.
--
-- Idempotent: re-running never overwrites a row an admin has since edited.

-- A fourth category for social/party tabletop games. Draft: the public site
-- only lists categories that are published AND hold a published game, so
-- this stays invisible until the owner confirms at least one game in it.
insert into public.game_categories (name, slug, description, sort_order, publication_status)
values (
    'Cards & Social Games',
    'cards-social-games',
    'Quick-to-learn tabletop games for groups — easy to start, easy to laugh over.',
    4,
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
    -- Cue sports
    (
        'cue-sports', 'Snooker', 'snooker',
        'Long tables, small pockets, patient break-building.',
        'Snooker is a cue sport played on a large table with fifteen reds and six colours. Players score by potting a red, then a colour, in turn — building a "break" — and use safety shots to leave their opponent without an easy pot. It rewards accuracy, cue-ball control and planning several shots ahead.'
    ),
    -- Strategy & board games
    (
        'strategy-board-games', 'Draughts (Checkers)', 'draughts',
        'Diagonal moves, forced captures, kings in the back row.',
        'Draughts, also known as checkers, is a two-player strategy game played on a chequered board. Pieces move diagonally, capture by jumping, and are crowned as kings when they reach the far side. Quick to learn, with plenty of depth for players who want to think ahead.'
    ),
    (
        'strategy-board-games', 'Ludo', 'ludo',
        'Roll, race your pieces home, and send rivals back to start.',
        'Ludo is a race game for two to four players. Roll the die to move your pieces around the board and into your home column — landing on an opponent''s piece sends it back to start. Simple rules, plenty of luck, and a good dose of friendly rivalry.'
    ),
    (
        'strategy-board-games', 'Scrabble', 'scrabble',
        'Build words, chase the premium squares.',
        'Scrabble is a word game in which players draw letter tiles and place them on the board to form connected words, scoring points for each letter and for premium squares. Vocabulary helps, but so does knowing when to hold a good tile back.'
    ),
    (
        'strategy-board-games', 'Backgammon', 'backgammon',
        'Dice, tactics, and a race to bear off first.',
        'Backgammon is one of the oldest board games: two players race their fifteen checkers around the board according to the roll of two dice, hitting exposed opponent pieces and building blocking points along the way. Luck sets each turn, but tactics decide the game.'
    ),
    (
        'strategy-board-games', 'Monopoly', 'monopoly',
        'Buy, trade and build your way around the board.',
        'Monopoly is a property-trading board game: players move around the board buying properties, collecting rent and building houses and hotels, while negotiating trades with each other. Play money only — a long-form game for a relaxed group session.'
    ),
    -- Table & indoor sports
    (
        'table-indoor-sports', 'Foosball (Table Football)', 'foosball',
        'Spin the rods, score the goal — table football, head to head.',
        'Foosball, or table football, is a tabletop version of football. Players turn rods fitted with figures to pass, block and shoot a ball into the opposing goal. It can be played one against one or in pairs, and rewards quick wrists and quicker reactions.'
    ),
    (
        'table-indoor-sports', 'Air Hockey', 'air-hockey',
        'A puck on a cushion of air, and very little time to react.',
        'Air hockey is a fast two-player table game. A thin layer of air lets the puck glide almost without friction, and each player uses a handheld striker to defend their goal and shoot at the opponent''s. Short, loud, and highly competitive.'
    ),
    -- Cards & social games
    (
        'cards-social-games', 'UNO', 'uno',
        'Match colours or numbers and be first to empty your hand.',
        'UNO is a card game for groups: match the top card of the discard pile by colour or number, use action cards to skip, reverse or make others draw, and remember to call "UNO" when you''re down to your last card. Easy to pick up mid-evening.'
    ),
    (
        'cards-social-games', 'Dominoes', 'dominoes',
        'Match the ends, block the table, play out your tiles.',
        'Dominoes is a tile game in which players take turns laying tiles end to end, matching the number of pips on each touching end. Depending on the variation, the aim is to play out all your tiles first or to score points from the open ends of the line.'
    ),
    (
        'cards-social-games', 'Jenga', 'jenga',
        'Pull a block, stack it on top, and hope the tower holds.',
        'Jenga is a stacking game of steady hands: players take turns removing a block from the tower and placing it on top. The tower grows taller and less stable with every move — whoever makes it fall loses the round.'
    ),
    (
        'cards-social-games', 'Connect Four', 'connect-four',
        'Drop your discs and line up four before your opponent does.',
        'Connect Four is a two-player game played on an upright grid. Players take turns dropping coloured discs into the columns, aiming to be first to line up four of their own in a row — across, down or diagonally — while blocking their opponent.'
    )
) as g(category_slug, name, slug, short_description, description)
join public.game_categories c on c.slug = g.category_slug
on conflict (slug) do nothing;
