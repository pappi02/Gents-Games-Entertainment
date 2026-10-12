# Implementation Plan — The Gents Games & Entertainment

Phase-by-phase path from project start to MVP deployment. References: [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md), [DATABASE.md](DATABASE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SECURITY.md](SECURITY.md), [CODE_STYLE.md](CODE_STYLE.md), [TESTING.md](TESTING.md).

Each phase lists its goal, deliverables, and an exit condition. Do not start a phase until the previous one's exit condition is met — facility-accuracy and security phases in particular are blocking, not optional.

---

## Phase 0 — Discovery & Business Verification

**Goal:** Replace every unverified assumption with a confirmed fact before any code depends on it.

- Confirm official brand name, logo, and visual identity direction with the owner.
- Verify physical address, directions, contact numbers/email, opening hours (including holidays).
- Inventory actual existing games/facilities at the venue (what's real today).
- Separate that inventory into: available now / planned ("coming soon") / temporarily unavailable / not pursuing.
- Confirm whether group events, tournaments, and private sessions are actually offered.
- Confirm pricing approach: rates configurable in admin (per [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — no public prices until verified).
- Confirm relationship presentation with The Gents Playhouse (domain/subdomain, cross-link placement).
- Technical discovery: confirm hosting provider, domain registrar access, and whether any existing backend/dashboard should be reused (decision: new admin dashboard, per spec).

**Exit condition:** Owner has signed off on a facilities inventory, verified contact/location details, and the pricing/interaction model (enquiry-only). No "TBD" items remain for what ships in MVP.

---

## Phase 1 — Technical Foundation

**Goal:** Stand up the repo, stack, and environments before any feature work.

- Initialize the project with the chosen stack (default suggestion: Next.js + TypeScript + PostgreSQL — see [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §2).
- Set up version control branching convention and environment separation (dev / staging / production), each with its own secrets.
- Provision the database and apply the initial migration framework.
- Set up object storage for media (dev + prod buckets/containers).
- Configure a transactional email provider (sandbox mode for dev).
- Set up error tracking and structured logging from day one.
- Set up CI (lint, type-check, test run) on every push.

**Exit condition:** A "hello world" deploy reaches staging through the real pipeline, with DB connectivity, email sandbox, and error tracking all verified working.

---

## Phase 2 — Data Layer

**Goal:** Implement the schema and lifecycle rules that everything else depends on.

- Implement core entities: `admin_users`, `game_categories`, `games`, `game_media`, `pricing_options`, `events`, `enquiries`, `venue_settings`, `media_assets`, `audit_logs` (see [DATABASE.md](DATABASE.md) §2).
- Enforce `publication_status` (`draft`/`published`/`archived`) and `facility_status` (`unverified`/`available`/`coming_soon`/`unavailable`) as independent, constrained enums.
- Apply constraints/indexes per [DATABASE.md](DATABASE.md) §4 (unique slugs, non-negative prices, valid time ranges, UTC timestamps).
- Seed categories and candidate games from the Phase 0 inventory — all defaulting to `draft` / `unverified` (never pre-published).
- Write and test rollback for every migration.

**Exit condition:** Schema is migrated in all environments; seed data loads correctly with everything defaulting to unpublished/unverified; a reviewer can confirm no record is publicly visible yet.

---

## Phase 3 — Admin Dashboard (Core)

**Goal:** Give staff the ability to turn verified facts into published content, before the public site needs to show anything real.

- Build admin authentication (secure sessions, no default credentials) per [SECURITY.md](SECURITY.md) §1.
- Implement role-based authorization server-side: super admin / content editor / enquiry staff (matrix in [SECURITY.md](SECURITY.md) §2).
- Build `/admin/games` and `/admin/categories`: create/edit/publish/unpublish/archive, reorder categories.
- Build `/admin/pricing`: configure rate, unit, conditions, effective dates per activity.
- Build `/admin/gallery`: media upload with validation (format allowlist, size limits, generated storage names) per [SECURITY.md](SECURITY.md) §4.
- Build `/admin/venue-settings`: address, hours, contacts, directions, social links.
- Build `/admin/users` and `/admin/audit-log` (super admin only).
- Enforce deny-by-default authorization on every admin route/API — test unauthenticated and cross-role access explicitly.

**Exit condition:** A super admin can log in, create a category and game end-to-end, upload media, set a price, and publish it — with every mutation authorized server-side and logged to the audit trail.

---

## Phase 4 — Public Website: Catalogue

**Goal:** Make the verified, published catalogue visible and navigable to visitors.

- Build `/` (Home) sections per [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) §8: hero, categories, featured activities, experience, events (conditional), visit/enquire.
- Build `/games` with search, category/status filters, sort, pagination, URL-persisted filters (per [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §8).
- Build `/games/[slug]` detail pages: description, rules, players, duration, facility status, pricing (only if an active verified price exists), related activities, enquiry CTA.
- Build `/venue` with real or clearly labelled placeholder photography.
- Implement the design system: colour tokens, typography, responsive breakpoints, reduced-motion support (per [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).
- Verify only `published` + appropriately `facility_status`-flagged content ever renders publicly — test `draft` and `coming_soon` states explicitly.

**Exit condition:** With Phase 3's published test content, the public catalogue correctly reflects every publication/facility state (hidden drafts, correctly labeled coming-soon, no fabricated prices).

---

## Phase 5 — Events, Groups & Enquiry Flow

**Goal:** Complete the remaining public routes and the enquiry pipeline that turns visits into business leads.

- Build `/events` and `/events/[slug]`, conditionally hidden when no published events exist.
- Build `/groups` and `/visit` (address, map, hours, directions, contacts).
- Build `/admin/events` and `/admin/promotions`.
- Implement the enquiry form (fields per [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §6): server-side validation, DB-transactional write, unique public reference, acknowledgement only after durable write.
- Wire email notifications through the configured provider; confirm an email outage never loses the stored enquiry (per [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §4, §9).
- Apply rate limiting, honeypot/anti-spam measures per [SECURITY.md](SECURITY.md) §6.
- Build `/admin/enquiries`: list, filter, assign, status workflow (`new → in_progress → awaiting_response → resolved/spam`), internal notes.
- Build `/privacy`, `/terms`, `/accessibility` pages (draft content, pending legal review).

**Exit condition:** A real end-to-end enquiry submitted on the public site appears correctly in `/admin/enquiries` with a working status workflow, survives a simulated email-provider failure, and is rate-limited against rapid resubmission.

---

## Phase 6 — SEO, Accessibility & Performance Pass

**Goal:** Meet the measurable bars defined in [TESTING.md](TESTING.md) before anything goes live publicly.

- Implement per-page titles/meta descriptions, canonical URLs, sitemap (published pages only), `robots.txt` excluding admin routes.
- Add structured data only for verified facts (Organization, LocalBusiness, Event, BreadcrumbList).
- Run and fix an accessibility pass: keyboard navigation, focus management, contrast, alt text, no colour-only status, reduced-motion ([TESTING.md](TESTING.md) §1).
- Run a performance pass against targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, Lighthouse 90+ ([TESTING.md](TESTING.md) §2).
- Verify caching invalidation on publish/unpublish/price-change actions ([ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §4).

**Exit condition:** Automated + manual accessibility checks pass on representative pages; performance budgets are met in a staging environment that mirrors production.

---

## Phase 7 — Security Hardening & Test Pass

**Goal:** Close out the full security checklist before exposing the site publicly.

- Run every item in [SECURITY.md](SECURITY.md) §7: unauthenticated admin access attempts, cross-admin record access, privilege escalation, session invalidation, SQL injection, XSS, CSRF, malicious uploads, rate-limit enforcement, secrets-leakage check, dependency vulnerability scan, backup restoration test.
- Record actual results and any unresolved risks — do not mark complete without evidence.
- Confirm privacy notice and terms draft are ready for legal review (not blocking technical launch, but tracked).

**Exit condition:** Security checklist completed with documented results; no unresolved high-severity findings; backups tested and restorable.

---

## Phase 8 — Content Finalization

**Goal:** Replace all placeholder/test content with owner-approved real content.

- Owner reviews and approves final game/category descriptions, rules, imagery, and facility statuses against the Phase 0 inventory.
- Owner approves final pricing records (amount + unit) for anything to be shown publicly.
- Confirm final venue details (address, hours, contacts) match what's live in `/admin/venue-settings`.
- Replace all placeholder images with real venue photography, or leave those sections correctly hidden/labeled if photography isn't ready.
- Final pass: nothing in production is a draft or unverified pretending to be real.

**Exit condition:** Owner sign-off that every publicly visible piece of content is accurate and approved.

---

## Phase 9 — MVP Deployment

**Goal:** Ship to production.

- Point the production domain/subdomain at the hosting environment; confirm DNS, SSL/TLS.
- Run full environment parity check (secrets, email provider, storage, DB) between staging and production.
- Smoke-test the production deployment: homepage, catalogue, a game detail page, enquiry submission end-to-end, admin login.
- Enable uptime and error monitoring/alerts on production.
- Confirm backup schedule is active in production.
- Soft-launch: verify with a real test enquiry that the full pipeline (form → DB → email → admin dashboard) works in production.

**Exit condition:** MVP is live at the production URL, a real enquiry has been successfully submitted and handled end-to-end in production, and monitoring/alerts/backups are confirmed active.

---

## Post-MVP (not part of this plan, tracked separately)

Online payments/booking, public accounts, real-time occupancy, analytics rollout, prize competitions/wagering (pending legal review) — see [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §5 for the full out-of-scope list.
