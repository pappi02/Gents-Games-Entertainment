# Seed media licenses

Stock photos used to seed the catalogue at launch (per [docs/PHASE_0_DISCOVERY.md](../../docs/PHASE_0_DISCOVERY.md) §5 — real venue photography isn't ready yet). All sourced from Wikimedia Commons under licenses that permit commercial reuse. Each is uploaded with `media_assets.is_placeholder = true` and should be swapped for real venue photography once available (see `scripts/seed-media.mjs` for how to re-run/replace).

| File | Game | Source | License | Attribution |
|---|---|---|---|---|
| `darts.webp` | Darts | [Darts in a dartboard.jpg](https://commons.wikimedia.org/wiki/File:Darts_in_a_dartboard.jpg) | Public domain | PeterPan23 |

**Retired** (replaced by owner-provided images below; files deleted from the repo and from Storage): Pool — [Billiards table 4.jpg](https://commons.wikimedia.org/wiki/File:Billiards_table_4.jpg) (CC0, Kurt Kaiser); Chess — [Chess Set in Elista.jpg](https://commons.wikimedia.org/wiki/File:Chess_Set_in_Elista.jpg) (public domain, Buzava); Cards — [Cards -Deck Playing.jpg](https://commons.wikimedia.org/wiki/File:Cards_-Deck_Playing.jpg) (CC0 via Pixabay); Table Tennis — [Table tennis table 007.JPG](https://commons.wikimedia.org/wiki/File:Table_tennis_table_007.JPG) (CC BY-SA 3.0 / GFDL, Karol Głąb). Listed so the history stays traceable.

All images in this folder are stored as compressed WebP (max 1600px wide, metadata stripped) — see `scripts/optimize-images.mjs`.

## Owner-provided images (October 2026)

The business owner supplied 7 additional images directly (`owner-provided/` subfolder, plus `src/assets/venue-lounge.webp`), which replaced or supplemented the stock photos above for Pool, Chess, Cards, and Table Tennis, plus a venue/hero image used on the homepage and `/venue` page.

| File | Used for |
|---|---|
| `owner-provided/pool-room.webp` | Pool — primary |
| `owner-provided/pool-bar.webp` | Pool — secondary |
| `owner-provided/chess-lounge.webp` | Chess — primary |
| `owner-provided/chess-room.webp` | Chess — secondary |
| `owner-provided/games-spread.webp` | Cards — primary |
| `owner-provided/table-tennis-clean.webp` | Table Tennis — primary (replaces the Phase 5 Wikimedia photo) |
| `src/assets/venue-lounge.webp` (static site asset, not in Storage) | Home hero / `/venue` atmosphere image |

**Provenance/license not independently verified.** These were provided directly rather than sourced with a documented license trail the way the Wikimedia images above were. Several have the visual characteristics of AI-generated interior renders or stock/catalog photography (e.g. a furniture retailer's product listing), which commonly carry usage restrictions even when freely viewable. **Before any public launch, confirm the owner has the right to use these commercially** — either they were generated/taken by the owner (no issue), licensed from a stock provider with a commercial license, or otherwise cleared. `media_assets.license_note` on each of these rows flags this explicitly so it surfaces in the admin media view, not just here.

Darts intentionally kept its existing Wikimedia photo (`darts.webp`) — no replacement was supplied, and the existing one already matches the visual quality bar.
