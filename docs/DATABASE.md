# Database — The Gents Games & Entertainment

See [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) for how this data is served, and [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) for the catalogue/pricing/enquiry behaviour this schema supports.

## 1. Technology

Use the existing project's database technology if integrating into one. If starting fresh, **PostgreSQL** is the suggested default for relational data and transactional enquiry handling — do not add a new database merely to follow this doc.

## 2. Core Entities

- **admin_users** — id, email, password hash / external identity, display name, role, active status, last login, created/updated timestamps.
- **game_categories** — id, name, slug, description, sort order, publication status, SEO fields, timestamps.
- **games** — id, category_id, name, slug, summaries, descriptions, facility_status, publication_status, player limits, duration, rules, equipment, featured flag, SEO fields, creator/updater IDs, timestamps.
- **game_media** — id, game_id, media asset ID/storage key, alt text, caption, sort order, media type, optional poster/video metadata.
- **pricing_options** — id, game_id (or related service), currency, amount, billing unit, duration, conditions, effective dates, active status.
- **events** — id, slug, title, description, start/end time, timezone, event status, registration instructions, capacity (if confirmed), price (if applicable), SEO fields.
- **ticket_types, discount_codes, ticket_orders, tickets** and support tables — see [EVENT_TICKETING.md](EVENT_TICKETING.md) and the `event_ticketing` migration. `ticket_types`, not `events.price_minor_units`, is the source of truth for a ticketed event's price.
- **enquiries** — id, public reference, contact name, email, phone, enquiry type, related game/event, requested visit time, party size, message, status, assignee, timestamps.
- **venue_settings** — verified address, map link, contact channels, timezone, opening hours, holiday notices, social links, brand details, configuration metadata.
- **media_assets** — managed media metadata and file ownership.
- **audit_logs** — administrative actor, action, affected record, timestamp, redacted change summary.

## 3. Additional Entities (add only when the feature needs them)

- `promotions` + promotion eligibility/rules
- `game_tags` + `game_tag_assignments`
- `game_relationships` (related/alternative activities)
- `enquiry_status_history`, `enquiry_notes`
- `admin_sessions` (if required by the chosen auth implementation)
- `redirects` (for changed published slugs)
- `venue_hours` (if opening hours need weekday-specific configuration)

## 4. Constraints & Indexing

- Primary keys on all entities.
- Foreign keys for category, media, pricing, event, and admin relationships.
- Unique constraints on public slugs and enquiry references.
- Check constraints for non-negative prices, valid time ranges, and supported status enum values.
- Indexes on: publication status, slug, category, event date, enquiry status, created_at.
- Explicit timezone handling for events and enquiries — store timestamps in **UTC**, render in the venue's configured timezone (expected **Africa/Nairobi**, pending confirmation).
- Prefer soft deletion/archival over hard deletes where history/auditability matters.
- Store money with appropriate precision — **never use floating-point arithmetic for financial values.**

## 5. Facility & Publication Lifecycle

Two independent status axes enforced at the data layer:

| facility_status | Meaning |
|---|---|
| `unverified` | Default for new records — never shown publicly |
| `available` | Owner-confirmed operational — visitors may enquire |
| `coming_soon` | Approved planned activity — never shown as currently playable |
| `unavailable` | Exists but temporarily can't be used — hide enquiry action or explain restriction |

| publication_status | Meaning |
|---|---|
| `draft` | Not publicly listed |
| `published` | Visible in catalogue, search, sitemap, nav |
| `archived` | Not publicly listed, retained for history |

## 6. Pricing Model

Each `pricing_options` record supports:

- Currency (initially **KES**).
- Amount — precise decimal/integer in the smallest practical accounting unit.
- Billing unit: per game / per table / per person / per hour / per session / other explicit unit.
- Optional duration, minimum charge, applicable conditions.
- Effective start/end dates (for scheduled price changes).
- Active/inactive flag.
- Optional short explanation of inclusions/exclusions.

Prices are never hardcoded in UI/marketing copy — always sourced from this table, and never published until the amount and unit are owner-verified.

## 7. Example Schema (illustrative, not a complete migration)

```sql
CREATE TABLE game_categories (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE games (
    id uuid PRIMARY KEY,
    category_id uuid NOT NULL
        REFERENCES game_categories(id),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    short_description text NOT NULL,
    description text NOT NULL,
    facility_status text NOT NULL DEFAULT 'unverified'
        CHECK (facility_status IN (
            'unverified', 'available', 'coming_soon', 'unavailable'
        )),
    publication_status text NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN (
            'draft', 'published', 'archived'
        )),
    featured boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_public_catalogue_idx
    ON games (category_id, publication_status, facility_status);
```

Production migrations must also cover the remaining entities, audit controls, suitable constraints, grants/permissions, and rollback/recovery procedures. **Never store database credentials in source code** — see [SECURITY.md](SECURITY.md).

## 8. Seed Data Policy

New category and game records seed with safe defaults:

- `publication_status = draft`
- `facility_status = unverified`
- No public price until verified by the owner.

This keeps unverified catalogue content invisible to the public by default — content only becomes visible after an explicit, deliberate publish action once facility accuracy has been confirmed (see [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §2).
