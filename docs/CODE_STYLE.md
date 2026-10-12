# Code Style — The Gents Games & Entertainment

General coding conventions for this repo. Pairs with [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) for structural decisions and [CLAUDE.md](CLAUDE.md) for agent-specific working rules.

## 1. Guiding Principles

- Keep the architecture modular enough for future additions without over-engineering the first release.
- Avoid unnecessary microservices, queues, state-management libraries, or duplicated abstractions.
- Centralise input validation and business rules rather than scattering checks across routes/components.
- Prefer explicit, typed schemas over ad-hoc validation.

## 2. Data & Money Handling

- **Never use floating-point arithmetic for financial values.** Store/compute money as integer minor units or precise decimals.
- Store timestamps in UTC; render in the venue's configured timezone (expected Africa/Nairobi, pending confirmation).
- Treat `publication_status` and `facility_status` as two independent enums — never conflate "visible" with "available" in code (see [DATABASE.md](DATABASE.md) §5).

## 3. Server/Client Boundary

- Public read paths and privileged admin paths are structurally separate — never let an admin mutation be reachable from a public-facing code path without server-side authorization checks.
- Validation and authorization live on the server; client-side checks are UX sugar only, never the source of truth.
- Secret-bearing operations (DB credentials, email provider keys, storage credentials) never execute or get bundled into client code.

## 4. Database Changes

- All schema changes go through migrations, checked into version control — no manual production schema edits.
- New catalogue records seed as `draft` / `unverified` by default (see [DATABASE.md](DATABASE.md) §8) — never default new content to published/available.

## 5. Caching Discipline

- Any code path that publishes, unpublishes, or changes facility status/pricing must also invalidate the relevant cache — treat this as part of the same change, not a follow-up.
- Never cache admin routes, enquiry records, or private responses.

## 6. Accessibility & Motion in Code

- Respect `prefers-reduced-motion` in all animation code — never rely on animation alone to convey state changes.
- Never encode status using colour alone in components (text/icon/label required alongside colour).

## 7. Naming & Structure Conventions

- Use stable, descriptive slugs for games/events; changing a published slug requires adding a redirect entry, not a silent rename.
- Keep admin-only routes/components clearly namespaced (e.g. under `/admin`) to make server-side authorization boundaries easy to audit.

## 8. Commit & Review Expectations

- Treat facility-accuracy logic (draft/published, unverified/available/coming_soon/unavailable) as safety-critical — changes here warrant extra review, since a bug could make the site falsely advertise an unavailable facility.
- Flag any change that touches pricing, enquiry data handling, or admin authorization for explicit review against [SECURITY.md](SECURITY.md).
