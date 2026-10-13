# Physical Games Catalogue Expansion (Status)

October 2026. This expands the catalogue to cover a wider range of physical, in-venue tabletop and table games. Every new game is a **proposed addition**: nothing new is public until the owner confirms it. No digital, console, PC, mobile or online games were added.

## What's live vs proposed

**Live (unchanged, owner-confirmed in [PHASE_0_DISCOVERY.md](PHASE_0_DISCOVERY.md) §3):** Pool, Chess, Cards, Table Tennis, Darts. All are published and `available`.

**Proposed additions** come from migration `20261013120000_seed_candidate_physical_games.sql`. All of them are `publication_status = draft`, `facility_status = unverified`, not featured, and have no media or prices:

| Category | Game | Slug |
|---|---|---|
| Cue Sports | Snooker | `snooker` |
| Strategy & Board Games | Draughts (Checkers), Ludo, Scrabble, Backgammon, Monopoly | `draughts`, `ludo`, `scrabble`, `backgammon`, `monopoly` |
| Table & Indoor Sports | Foosball (Table Football), Air Hockey | `foosball`, `air-hockey` |
| Cards & Social Games *(new category, draft)* | UNO, Dominoes, Jenga, Connect Four | `uno`, `dominoes`, `jenga`, `connect-four` |

Descriptions explain the game itself only. Players, duration and equipment are left blank because they're venue facts for the owner to supply.

**Not added as records:**
- **Pool variants** (eight-ball, nine-ball). These are formats of the existing `pool` record. Once the owner confirms which are played, add them to its "How to play" text.
- **Standard playing cards.** This is the existing `cards` record.

## Safeguards

- **Admin save actions** ([games/actions.ts](../src/app/admin/(protected)/games/actions.ts)) refuse to publish or feature an `unverified` game. The check runs server-side.
- **Public reads** ([queries.ts](../src/lib/public/queries.ts)) add defence in depth on top of RLS. They drop `unverified` games and any game whose category isn't published (`game_categories!inner`). Categories with no public game are never listed.
- **Unbadged name lists** (home ticker, "Let the table decide", the groups "for example" copy) use only `available` games. Category name lists mark any other status in words, e.g. "Air Hockey · Coming soon".
- **Facility-status changes** are now written to the audit log, alongside publication changes.

## Admin changes (no schema change)

- `/admin/games` lists proposed additions separately from the live catalogue. Each row has an "On public site" column that explains why a game is or isn't visible.
- The game form now edits `beginner_notes` and `equipment_notes`. Both columns already existed and are shown on the public page, but couldn't be edited before. Rules are relabelled "How to play".
- On edit, the form shows the page address (the slug) and states that it stays stable when the name changes.

## Launching a proposed game

1. Confirm with the owner that the equipment physically exists.
2. In `/admin/games`, edit the game. Set its facility status, fill in only confirmed details, and publish.
3. Upload an image under **Media** with its licence noted. Leave **Illustrative** on for stock imagery.
4. For UNO, Dominoes, Jenga or Connect Four, also publish **Cards & Social Games** in `/admin/categories`. Consider moving `cards` into it at the same time. Its URL won't change.

## Outstanding decisions

- **Which candidates the venue actually has.** None are confirmed.
- **Category for `cards`.** It's currently in Strategy & Board Games. Moving it to Cards & Social Games only makes sense once that category has other confirmed games.
- **Trademarked names** (UNO, Monopoly, Scrabble, Jenga, Connect Four). Using a name to describe the game played is fine. Imagery must not use the brands' logos or box art without permission. If the venue's sets are generic, rename the records (e.g. "Four in a Row", "Stacking Blocks") before publishing.
- **Imagery.** No new images were added. Upload licensed or owner-provided photos per [LICENSES.md](../supabase/seed-assets/LICENSES.md) when a game is confirmed.
