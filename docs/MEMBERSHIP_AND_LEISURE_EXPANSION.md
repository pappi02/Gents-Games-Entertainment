# Membership, Leisure, Entertainment & Casino-Style Expansion (Status)

October 2026. This is the first step towards a members' club model, along the lines of established Nairobi clubs such as Muthaiga Country Club: a joining fee plus a recurring subscription, tiers by level of access, and leisure facilities alongside the games. It adds new proposed activities and a membership section. **Nothing new is public until the owner confirms it.** The facility-accuracy rule in [CLAUDE.md](CLAUDE.md) applies to every activity, tier and fee here.

## Proposed activities

These come from migration `20261018120000_seed_leisure_entertainment_casino_games.sql`. Every row is `draft` / `unverified`, not featured, with no players, duration, equipment or prices. All three categories are drafts.

| Category | Activity | Slug | Image (illustrative, draft-only) |
|---|---|---|---|
| Outdoor & Leisure | Mini Golf | `mini-golf` | `mini-golf.webp` |
| Outdoor & Leisure | Swimming Pool | `swimming-pool` | `swimming-pool.webp` |
| Live Entertainment | Live Band & Salsa Dancers | `live-band-salsa` | `live-band-salsa.webp`, `salsa-dancers.webp` |
| Casino-Style Games | Roulette | `roulette` | `roulette.webp` |
| Casino-Style Games | Blackjack | `blackjack` | `blackjack.webp` |
| Casino-Style Games | Poker (Texas Hold'em) | `poker` | `poker.webp` |

The images are freely licensed Wikimedia Commons photos. Sources, licences and credits are in [LICENSES.md](../supabase/seed-assets/LICENSES.md). `scripts/seed-media.mjs` uploads them with the credit as the caption and `is_placeholder = true`. RLS only exposes media on published games, so they stay private until each game goes live.

- **Live Band & Salsa Dancers** is the standing "what is it" page. Dated performance nights go in **Events**.
- **Swimming Pool / Mini Golf** descriptions deliberately leave out depth, supervision, hours and capacity. Those are safety-relevant owner facts. Fill them in, along with pool rules, before publishing.

## Casino-style games: recreation only

Wagering and real-money gaming remain **out of scope** ([PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §5). The three casino-style games are described as played with play chips that have no cash value, with no buy-ins and no prizes. Before publishing any of them:

1. **Get legal advice on Kenyan gaming law.** That means the Betting Control and Licensing Board regime and any successor gambling legislation. The question is whether running roulette, blackjack or poker tables needs a licence even without cash stakes, and whether a membership fee that unlocks them could count as consideration.
2. Confirm that chips can't be exchanged for cash, credit, drinks or prizes, and that the venue's house rules say so.
3. Keep the "play chips only" wording in the public description.

## Membership

Migration `20261018120100_membership_tiers.sql` adds:

- **`membership_tiers`**: name, summary, description, benefits (one per line), subscription and optional joining fee in integer minor units, billing period, `fees_confirmed`, sort order and publication status.
- **`membership_tier_categories`**: which game categories each tier unlocks ("a certain fee for certain games access").
- A **`membership` enquiry type**.

RLS lets the public read published tiers only. Content editors can read everything, but only a super admin can write, since fees count as pricing (the same rule as `pricing_options`).

**Public page `/membership`** (in the main nav):
- Shows published tiers only. If none are published, it shows a "tiers are being finalised, register your interest" panel.
- Fees show only when `fees_confirmed` is ticked. Otherwise a tier says "Fees on enquiry".
- "Includes access to" lists only categories that are published *and* hold a public game. A tier can't advertise an unconfirmed facility even when it's linked to one.
- Every call to action goes to the enquiry form (`/visit?type=membership[&tier=slug]`). The server action re-resolves the tier from published data and prefixes the message `[Membership: <tier>]` for staff.

**Admin `/admin/membership`** (super admin): create, edit, publish, unpublish and archive tiers, set fees and their confirmation, and choose included categories. Fee changes and status changes are written to the audit log.

**Still out of scope:** member accounts or logins, online sign-up, online payment, membership cards and visit tracking. Members are enrolled in person by staff. A future phase could add a member register or check-in, if demand from these enquiries justifies it.

### Proposed tiers (drafts, no fees)

| Tier | Billing | Includes |
|---|---|---|
| Games Member | monthly | Cue Sports, Strategy & Board Games, Table & Indoor Sports |
| Social Member | annual | the above + Cards & Social Games, Live Entertainment |
| Full Club Member | annual | everything, including Outdoor & Leisure and Casino-Style Games |

Names, perks, billing periods and inclusions are suggestions for the owner to confirm or rewrite.

## Launch checklist

1. Apply both migrations, then run `node scripts/seed-media.mjs mini-golf swimming-pool live-band-salsa roulette blackjack poker`.
2. For each activity the venue actually has, follow "Launching a proposed game" in [CATALOGUE_EXPANSION.md](CATALOGUE_EXPANSION.md), and publish its category.
3. Casino-style games: complete the legal steps above first.
4. Membership: agree tiers and fees with the owner. Enter the fees, tick "Owner has confirmed these fees", then publish.
5. Replace the illustrative photos with real venue photography as each facility is built.

## Outstanding decisions

- Which of these facilities exist, or are planned firmly enough to publish as **Coming soon**. None are confirmed.
- The outcome of the legal review for casino-style games.
- Tier structure and fees, and whether couple, family or corporate tiers are wanted. Established clubs commonly offer single, couple, junior, social and sport-specific categories.
- Whether joining should need a proposer or nomination from an existing member, as at traditional members' clubs. That would change the enquiry wording only, not the schema.
