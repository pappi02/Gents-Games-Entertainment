# CLAUDE.md — The Gents Games & Entertainment

Instructions for any AI coding agent working in this repository. Read this first, then the referenced docs as needed for the area you're touching.

## Project Summary

A standalone, mobile-first website for **The Gents Games & Entertainment** — a sister brand to The Gents Playhouse — advertising the games and recreation available at a physical venue in Nairobi, Kenya, and converting visitors into physical visits and group enquiries. It is **not** an online booking or payment platform in v1: visitor interaction is enquiry-based only.

Full specs:
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — scope, catalogue, site structure, admin requirements
- [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) — stack, routes, lifecycle logic, performance targets
- [DATABASE.md](DATABASE.md) — schema, entities, pricing model, seed policy
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — brand, colour tokens, layout, breakpoints
- [SECURITY.md](SECURITY.md) — auth, authorization, upload safety, abuse protection
- [CODE_STYLE.md](CODE_STYLE.md) — coding conventions for this repo
- [TESTING.md](TESTING.md) — accessibility, performance, security, and pre-launch checklists

## The One Rule That Overrides Everything Else

**Facility accuracy.** Never present a game, price, event, or booking slot as available unless it has verified, owner-confirmed data behind it.

- New catalogue content defaults to `publication_status = draft`, `facility_status = unverified`.
- Never hardcode a price in UI or copy — always source from `pricing_options`, and never render a price with no active verified record.
- `coming_soon` activities must never look currently playable or bookable.
- When in doubt about whether something is confirmed, treat it as unconfirmed and keep it unpublished — do not guess content into existence to make a page look complete.

## Working Agreements

- Don't assume a tech stack is already chosen — check the repo state before scaffolding; [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) §2 is a suggested default, not a mandate.
- Out of scope for v1 (do not build unless explicitly asked): online payments, guaranteed/auto-confirmed bookings, public user accounts, real-time occupancy tracking, gambling/wagering functionality, unverified testimonials/ratings/awards.
- Admin mutations are always server-authorized — never rely on hiding a UI element as an access control.
- Any change touching pricing, facility status, enquiry data, or admin auth gets checked against [SECURITY.md](SECURITY.md) before being considered done.
- Respect `prefers-reduced-motion`; never encode status by colour alone.
- Follow [CODE_STYLE.md](CODE_STYLE.md) for money handling (no floats), timestamp handling (UTC storage, Africa/Nairobi display pending confirmation), and migration discipline.

## When Starting a New Task

1. Check which doc governs the area you're touching (table above) and read it fully before writing code.
2. If a requirement is ambiguous or depends on business facts not yet verified (address, hours, real prices, which games physically exist), stop and surface the question rather than inventing a plausible-sounding answer.
3. Keep placeholder content/images clearly labelled as placeholders in code/data, never presented as real venue photography or confirmed facts.
