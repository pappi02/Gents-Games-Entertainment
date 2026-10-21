# Seed media licenses

Stock photos used to seed the catalogue at launch (per [docs/PHASE_0_DISCOVERY.md](../../docs/PHASE_0_DISCOVERY.md) §5 — real venue photography isn't ready yet). All sourced from Wikimedia Commons under licenses that permit commercial reuse. Each is uploaded with `media_assets.is_placeholder = true` and should be swapped for real venue photography once available (see `scripts/seed-media.mjs` for how to re-run/replace).

| File | Game | Source | License | Attribution |
|---|---|---|---|---|
| `darts.webp` | Darts | [Darts in a dartboard.jpg](https://commons.wikimedia.org/wiki/File:Darts_in_a_dartboard.jpg) | Public domain | PeterPan23 |
| `mini-golf.webp` | Mini Golf *(draft)* | [15-21-202, miniature golf - panoramio.jpg](https://commons.wikimedia.org/wiki/File:15-21-202,_miniature_golf_-_panoramio.jpg) | CC BY-SA 3.0 | David Dugan |
| `swimming-pool.webp` | Swimming Pool *(draft)* | [Swimming pool at Hotel Terra Barichara.jpg](https://commons.wikimedia.org/wiki/File:Swimming_pool_at_Hotel_Terra_Barichara.jpg) | CC BY-SA 4.0 | Bernard Gagnon |
| `live-band-salsa.webp` | Live Band & Salsa Dancers *(draft)* — primary | [Salsa band and salsa dancing - Fatacil … (1469449571).jpg](https://commons.wikimedia.org/wiki/File:Salsa_band_and_salsa_dancing_-_Fatacil_Agriculture_and_Tourism_Fair_-_Lagoa_-_The_Algarve,_Portugal_(1469449571).jpg) | CC BY 2.0 | Glen Bowman |
| `salsa-dancers.webp` | Live Band & Salsa Dancers *(draft)* — secondary | [Salsa en Cali.jpg](https://commons.wikimedia.org/wiki/File:Salsa_en_Cali.jpg) | CC BY 2.0 | Hilcias Salazar |
| `roulette.webp` | Roulette *(draft)* | [Roulette table (5276343477).jpg](https://commons.wikimedia.org/wiki/File:Roulette_table_(5276343477).jpg) | CC BY 2.0 | Håkan Dahlström |
| `blackjack.webp` | Blackjack *(draft)* | [Blackjack game 1.JPG](https://commons.wikimedia.org/wiki/File:Blackjack_game_1.JPG) | CC0 | Scott Nazelrod |
| `poker.webp` | Poker (Texas Hold'em) *(draft)* | [Poker chips 2.jpg](https://commons.wikimedia.org/wiki/File:Poker_chips_2.jpg) | CC0 | Jismab |

The *(draft)* rows (October 2026) illustrate proposed activities that are not confirmed at the venue. They're attached to draft games, so RLS keeps them private until each game is confirmed and published. CC BY / CC BY-SA images need the attribution above wherever they're shown, so `scripts/seed-media.mjs` writes it into each image's caption, which the game page prints under the photo. Keep the caption if you edit the image in **Media**.

**Retired** (replaced by owner-provided images below; files deleted from the repo and from Storage): Pool — [Billiards table 4.jpg](https://commons.wikimedia.org/wiki/File:Billiards_table_4.jpg) (CC0, Kurt Kaiser); Chess — [Chess Set in Elista.jpg](https://commons.wikimedia.org/wiki/File:Chess_Set_in_Elista.jpg) (public domain, Buzava); Cards — [Cards -Deck Playing.jpg](https://commons.wikimedia.org/wiki/File:Cards_-Deck_Playing.jpg) (CC0 via Pixabay); Table Tennis — [Table tennis table 007.JPG](https://commons.wikimedia.org/wiki/File:Table_tennis_table_007.JPG) (CC BY-SA 3.0 / GFDL, Karol Głąb). Listed so the history stays traceable.

All images in this folder are stored as compressed WebP (max 1600px wide, metadata stripped) — see `scripts/optimize-images.mjs`.

## Owner-provided images (October 2026)

The business owner supplied 7 additional images directly (`owner-provided/` subfolder), which replaced or supplemented the stock photos above for Cards and Table Tennis. The Pool, Chess and lounge images from that batch have since been replaced by real venue photos (next section) and deleted.

| File | Used for |
|---|---|
| `owner-provided/games-spread.webp` | Cards — primary |
| `owner-provided/table-tennis-clean.webp` | Table Tennis — primary (replaces the Phase 5 Wikimedia photo) |

**Provenance/license not independently verified.** These were provided directly rather than sourced with a documented license trail the way the Wikimedia images above were. Several have the visual characteristics of AI-generated interior renders or stock/catalog photography (e.g. a furniture retailer's product listing), which commonly carry usage restrictions even when freely viewable. **Before any public launch, confirm the owner has the right to use these commercially** — either they were generated/taken by the owner (no issue), licensed from a stock provider with a commercial license, or otherwise cleared. `media_assets.license_note` on each of these rows flags this explicitly so it surfaces in the admin media view, not just here.

Darts intentionally kept its existing Wikimedia photo (`darts.webp`) — no replacement was supplied, and the existing one already matches the visual quality bar.

## Venue photography (October 2026)

Real photos taken at the venue and supplied by the owner (`venue/` subfolder). Seeded with `media_assets.is_placeholder = false`, so the site shows them without an "Illustrative" label.

| File | Used for |
|---|---|
| `venue/pool-table.webp` | Pool — primary |
| `venue/pool-rack.webp` | Pool — secondary |
| `venue/pool-table-lounge.webp` | Pool — third; same photo as `src/assets/venue-pool-room.webp` (static asset: home hero, `/venue` lead image, `/membership`) |
| `venue/chess-board.webp` | Chess — primary |
| `venue/chess-lounge-table.webp` | Chess — secondary |
| `venue/chess-board-side.webp` | Chess — third |

**Retired** with this batch (deleted from the repo; Storage objects replaced by `scripts/seed-media.mjs pool chess`): `owner-provided/pool-room.webp`, `owner-provided/pool-bar.webp`, `owner-provided/chess-lounge.webp`, `owner-provided/chess-room.webp`, `src/assets/venue-lounge.webp`.
