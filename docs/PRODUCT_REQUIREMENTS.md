# Product Requirements Document — The Gents Games & Entertainment

**Project type:** Production-ready entertainment venue website
**Brand relationship:** Sister brand to The Gents Playhouse (same physical location, own identity)
**Market:** Nairobi, Kenya
**Primary objective:** Convert online visitors into physical venue visits and group enquiries

## 1. Vision

The Gents Games & Entertainment is a dedicated entertainment and recreation brand connected to The Gents Playhouse, with its own identity and purpose. The website should feel like the digital presence of a real, premium gentlemen's recreation club — not a generic games-listing site.

Visitors should be able to see what they can play, understand the available facilities, feel the atmosphere, and be motivated to visit the physical venue.

**Brand line:** "Play your game. Own the moment."
**Tagline style:** "Your Game. Your People. Your Space."

## 2. Core Implementation Principle — Facility Accuracy

Some activities already exist at the venue; others are planned. The website **must distinguish confirmed facilities from planned, unavailable, and unpublished activities.** It must never imply that a game, price, event, or booking slot is available without verified information from the business owner.

- Confirmed facilities → shown as "Available."
- Approved future facilities → shown as "Coming soon," never as currently playable.
- Facilities that exist but are down → "Temporarily unavailable."
- Anything unverified → kept as a draft, never shown publicly.

## 3. Primary Outcomes

1. **Discoverability** — Visitors can browse games, understand activities, discover events, and find the venue.
2. **Enquiries** — Visitors can ask about availability, prices, group visits, and events without a full online booking engine.
3. **Independent content management** — Authorised staff manage games, categories, prices, images, events, promotions, and venue information from a new admin dashboard.
4. **Production readiness** — Secure administration, accessible interfaces, reliable enquiry handling, SEO, and measurable performance.

## 4. In Scope (v1)

- Public marketing website and activity catalogue.
- Search, category filtering, and individual game detail pages.
- Configurable pricing and facility status (via admin — no hardcoded prices).
- Events, tournaments, and group entertainment information.
- Enquiry forms with clear contact/directions actions (no online payment).
- Event ticket sales with online payment, added at the owner's request. See [EVENT_TICKETING.md](EVENT_TICKETING.md).
- New authenticated admin dashboard with role-based access.
- Database, media management, validation, and auditability.
- SEO, accessibility (WCAG 2.2 AA target), analytics readiness, security, automated tests, deployment docs.

## 5. Out of Scope (v1)

- Online payments, deposits and refunds, other than event tickets.
- Guaranteed/auto-confirmed reservations (enquiry only, not booking).
- Public user accounts, online membership sign-up, or membership payments. (Membership tiers can be shown and enquired about; see [MEMBERSHIP_AND_LEISURE_EXPANSION.md](MEMBERSHIP_AND_LEISURE_EXPANSION.md).)
- Real-time equipment scheduling or occupancy tracking.
- Gambling, wagering, or real-money gaming functionality.
- Unverified testimonials, ratings, awards, or visitor-number claims.

These may be reconsidered in later phases once the business validates demand.

## 6. Game & Entertainment Catalogue (Candidate Taxonomy)

These are **candidate** catalogue entries, not a claim that all are currently installed. Owner must verify via the facilities inventory before publishing any as "Available."

| Category | Candidate activities |
|---|---|
| Cue Sports | Eight-ball pool, nine-ball pool, snooker (if facilities permit) |
| Strategy & Board Games | Chess, checkers/draughts, Ludo, Scrabble, dominoes, backgammon |
| Table & Indoor Sports | Table tennis, foosball, darts, air hockey, indoor putting |
| Cards & Table Games | Rummy, whist, UNO, recreational poker-style games, dominoes |
| Video & Console Gaming | Football (e.g. EA SPORTS FC), fighting, racing, multiplayer party games |
| Social & Group Entertainment | Live sports viewing, game nights, group competitions, private group entertainment, special events |
| Outdoor & Leisure | Mini golf, swimming pool |
| Live Entertainment | Live band with salsa dancers |
| Casino-Style Games | Roulette, blackjack, poker (play chips only, with no cash value and no prizes; pending legal review) |

Each category/game page must explain: what the game is, how to participate, player count/format, difficulty/beginner guidance, and facility status. Casual recreational card games must be clearly distinguished from anything involving money or prizes; wagering is out of scope until legally reviewed.

## 7. Site Structure (Public Routes)

- `/` — Home
- `/games` — Explore Games (searchable, filterable catalogue)
- `/games/[slug]` — Game detail page
- `/events`, `/events/[slug]` — Tournaments & Events
- `/venue` — The Venue (real photography, facilities, atmosphere)
- `/groups` — Groups & Private Events
- `/membership` — Membership tiers and register-interest (enquiry only)
- `/visit` — Visit Us (address, map, hours, contacts, directions)
- `/privacy`, `/terms`, `/accessibility`

## 8. Admin Dashboard Requirements

A new admin dashboard (not reused from another system) must let staff:

- Create/edit/publish/unpublish/archive games and activities.
- Add/reorder categories.
- Upload cover images, galleries, optional demo videos.
- Edit rules, instructions, benefits, descriptions.
- Mark facility status: available / coming soon / unavailable.
- Configure pricing (rate, unit, conditions) — admin-only, never hardcoded.
- Manage events: schedules, registration details, results.
- Publish promotions with start/end dates.
- Update venue info: contacts, hours, address, directions.
- Configure SEO: titles, descriptions, slugs, social images.
- View/manage enquiries with status workflow and internal notes.

**Rule:** the public site only ever displays published content. Prices and availability are never fabricated or presented as live without a verified source of truth.

## 9. Visitor Interaction Model

- v1 interaction = **enquiry only** (not online booking).
- Visitor journey: discover activity → "Enquire" → submit contact details + question + optional date/group size → acknowledgement (not a booking confirmation) → staff follow-up.
- No account creation required. No collection of ID documents or payment details.

## 10. Relationship to The Gents Playhouse

- Treated as a **sister brand**: own domain/subdomain, own visual identity, own navigation and SEO.
- Shares verified venue location/contact details where appropriate.
- Discreet cross-promotion link between the two sites.
- The Playhouse is an adults-only (18+) platform: the link lives in the footer only (never the main nav), is labelled 18+, opens in a new tab with `rel="nofollow"`, and no Playhouse services, hosts or staff are described or promoted on this site.

## 11. Pre-Launch Verification Checklist

- [ ] Confirm official brand name, logo, visual identity.
- [ ] Verify physical address, directions, contacts, opening hours.
- [ ] Inventory all existing games/facilities.
- [ ] Identify planned, unavailable, and discontinued activities.
- [ ] Approve actual rates and charging unit per priced activity.
- [ ] Approve game descriptions, rules, restrictions, imagery.
- [ ] Confirm whether group events/tournaments are offered.
- [ ] Configure admin accounts, permissions, email, media storage.
- [ ] Review privacy, terms, and applicable legal requirements.
- [ ] Complete security, accessibility, mobile, and production tests.

See [DATABASE.md](DATABASE.md) for the seed-data policy (new records default to `draft` / `unverified`, no public price until verified).
