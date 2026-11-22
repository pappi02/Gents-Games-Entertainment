-- Badminton on the garden lawn, confirmed by the owner (22 November 2026,
-- with footage of games on the lawn), in the Outdoor & Leisure category.
--
-- Facility-accuracy rule (docs/CLAUDE.md): Badminton is published and
-- 'available' because the owner confirmed it. No pricing: prices stay
-- enquiry-only. In production the category was already published (admin),
-- with Mini Golf and Swimming Pool listed as coming soon, so the category
-- update below is a no-op there; it only applies to a fresh database where
-- the category is still a draft.
--
-- Photos are seeded separately: node scripts/seed-media.mjs badminton darts
--
-- Idempotent: re-running never overwrites a row an admin has since edited.

update public.game_categories
set description = 'Time away from the tables, out on the garden lawn.',
    publication_status = 'published'
where slug = 'outdoor-leisure'
  and publication_status = 'draft';

insert into public.games (
    category_id, name, slug, short_description, description, rules, beginner_notes,
    typical_players, typical_duration, equipment_notes,
    facility_status, publication_status, featured
)
select
    c.id,
    'Badminton',
    'badminton',
    'Rallies on the lawn, out in the open air.',
    'Badminton is a racket game played by hitting a shuttlecock back and forth over a net. At the venue it''s played outdoors on the garden lawn under the trees: a relaxed knock-up between drinks, or a proper rally if you''re competitive.',
    'Serve diagonally, underarm, and keep the shuttlecock off the ground on your side. A rally is won when the shuttle lands in your opponent''s court or they hit it out or into the net. Casual games usually play to 11 or 21 points.',
    'No experience needed. Hold the racket loosely, watch the shuttle rather than your opponent, and keep the rallies going before worrying about the score. Best in daylight and dry weather.',
    '2 (singles) or 4 (doubles)',
    'Casual games run 15–30 minutes',
    'Rackets and shuttlecocks provided on-site.',
    'available',
    'published',
    false
from public.game_categories c
where c.slug = 'outdoor-leisure'
on conflict (slug) do nothing;
