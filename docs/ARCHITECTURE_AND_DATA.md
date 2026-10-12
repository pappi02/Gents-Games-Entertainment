# Architecture & Data — The Gents Games & Entertainment

See [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) for scope, [DATABASE.md](DATABASE.md) for full schema, and [SECURITY.md](SECURITY.md) for auth/authorization detail.

## 1. Technical Discovery First

The framework, hosting environment, database, and deployment method are **not yet fixed**. Do not assume a stack is already in place — confirm with a brief discovery pass before committing to dependencies.

## 2. Suggested Stack (greenfield default, not a mandate)

| Layer | Suggested option |
|---|---|
| Web application | Next.js + TypeScript |
| UI | React, project's established styling approach |
| Database | PostgreSQL |
| Data access | A maintained ORM or typed DB client |
| Admin auth | Secure server-managed sessions, or an established identity provider |
| Media | Object storage with controlled uploads + image optimisation |
| Email | Configured transactional email provider |
| Hosting | A supported production platform compatible with the chosen stack |
| Monitoring | Error tracking, structured server logs, uptime monitoring |

Verify current compatibility/supported versions before selecting dependencies. Avoid unnecessary microservices, queues, or duplicated abstractions — keep it modular but not over-engineered for a v1.

## 3. Architecture Principles

- Separate public read operations from privileged admin operations.
- Fetch public catalogue content through a controlled server-side data layer.
- Centralise input validation and business rules — never trust client-side validation alone.
- Use database transactions where multiple related writes must succeed together (e.g. enquiry + status history).
- Cache published content where appropriate; invalidate on administrative changes.
- Keep secret-bearing operations server-side only.
- Use schema migrations and version control for all DB changes.

## 4. Content Caching & Consistency

Public game/category pages are cacheable (primarily informational), but:

- Drafts must never appear in public caches.
- Publishing, unpublishing, facility-status changes, and price updates must invalidate affected cached pages.
- Admin routes, enquiry records, and private responses must never be cached publicly.
- Never label cached facility info as real-time availability.
- If a notification (e.g. email) fails, the enquiry record is still retained and the delivery failure is surfaced to staff — a dependency outage must never silently lose a visitor's enquiry.

## 5. Public Site Routes

- `/` — Home: hero, featured activities, venue atmosphere, visit CTA.
- `/games` — Explore Games: searchable/filterable catalogue.
- `/games/[slug]` — Game detail: rules, players, duration, facility status, pricing, enquiry CTA.
- `/events`, `/events/[slug]` — Tournaments & Events.
- `/venue` — The Venue: real photography, facilities, atmosphere.
- `/groups` — Groups & Private Events.
- `/visit` — Visit Us: address, map, hours, contacts, directions.
- `/privacy`, `/terms`, `/accessibility`.

Use stable slugs. If a published slug changes, add a redirect from the old URL. Return genuine 404s for nonexistent games/events (see `redirects` entity in [DATABASE.md](DATABASE.md)).

## 6. Admin Routes

- `/admin/login`
- `/admin` (dashboard summary)
- `/admin/games`
- `/admin/categories`
- `/admin/pricing`
- `/admin/events`
- `/admin/promotions`
- `/admin/gallery`
- `/admin/enquiries`
- `/admin/venue-settings`
- `/admin/users`
- `/admin/audit-log`

Implement a route only once its functionality is actually delivered — no empty screens implying a capability that doesn't exist.

## 7. Catalogue Lifecycle Logic

Two independent axes, both enforced server-side:

**Publication status:** `draft` → `published` → `archived`
**Facility status:** `unverified` / `available` / `coming_soon` / `unavailable`

- Drafts/archived are excluded from public APIs, search, navigation, sitemaps, and recommendations.
- A published activity can be temporarily `unavailable`; a `coming_soon` activity is shown with an explicit label and must never appear as currently playable or bookable.

## 8. Search & Filtering (catalogue)

- Search by name, category, keywords — case-insensitive, safe with empty input/punctuation/special characters.
- Filters: category, facility status, optionally player count/price range.
- Sort: A–Z, featured.
- Pagination or incremental loading once catalogue grows.
- URL-persisted filters (shareable filtered links).
- Accessible empty states and result counts.
- Related activities surfaced via category/explicit relationships.

## 9. Enquiry Flow (architecture-level)

1. Visitor selects a game/event → "Enquire" (preselected context).
2. Submits form (server-validated, not just client-validated).
3. Write happens inside a DB transaction; a unique public reference is generated.
4. Acknowledgement is returned **only after** durable write succeeds.
5. Notification email is sent through the configured provider — failure here is logged separately and never rolls back the stored enquiry.
6. Idempotency control to reduce duplicate submissions; rate limiting/anti-spam applied (see [SECURITY.md](SECURITY.md)).
7. Staff manage the enquiry through status workflow: `new → in_progress → awaiting_response → resolved` / `spam`.

## 10. Performance Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint | ≤ 2.5s |
| Interaction to Next Paint | ≤ 200ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Lighthouse performance (public pages) | 90+ |

Implementation notes: responsive images, lazy-load below-the-fold, reserve media dimensions to prevent layout shift, paginate admin tables and large catalogues, index DB queries by access pattern, minimise unnecessary client JS.

## 11. Operational Monitoring

- Health checks for the app and critical dependencies.
- Structured server-side error logs.
- Monitoring for enquiry-submission and notification-delivery failures.
- Alerts for repeated authentication abuse.
- Backup status + periodic restore testing.
- Basic uptime/performance monitoring.

Set retention periods and alert thresholds deliberately — never retain personal data in logs purely for convenience.
