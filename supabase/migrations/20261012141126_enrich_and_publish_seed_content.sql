-- Enrich the Phase 2 seed content with fuller detail, and publish it.
--
-- Publishing here is a deliberate, explicit exception to the normal Phase 8
-- content-finalization gate (docs/IMPLEMENTATION_PLAN.md): the business
-- owner directed this directly in-session ("implement the seed data...
-- realistic data") for the 3 categories and 5 games already confirmed
-- available in docs/PHASE_0_DISCOVERY.md §3. No price is published — per
-- §4, pricing stays enquiry-only — and video/console gaming remains
-- entirely unseeded, per the owner's explicit exclusion.

update public.game_categories set publication_status = 'published'
where slug in ('cue-sports', 'strategy-board-games', 'table-indoor-sports');

update public.games set
    typical_duration = '30–60 minutes per game',
    equipment_notes = 'Cues and balls provided on-site.',
    publication_status = 'published'
where slug = 'pool';

update public.games set
    typical_duration = 'Variable — casual games run 15–45 minutes',
    beginner_notes = 'New to chess? Our team can walk you through how the pieces move before you start.',
    equipment_notes = 'Boards and sets provided on-site.',
    publication_status = 'published'
where slug = 'chess';

update public.games set
    typical_duration = 'Varies by game chosen',
    equipment_notes = 'Standard decks provided on-site.',
    publication_status = 'published'
where slug = 'cards';

update public.games set
    typical_duration = 'Single games run 10–20 minutes',
    equipment_notes = 'Paddles and balls provided on-site.',
    publication_status = 'published'
where slug = 'table-tennis';

update public.games set
    typical_duration = 'Single games run 10–15 minutes',
    equipment_notes = 'Darts provided on-site.',
    publication_status = 'published'
where slug = 'darts';

-- Mark one game per category as featured for the homepage spotlight.
update public.games set featured = true where slug in ('pool', 'chess', 'table-tennis');
