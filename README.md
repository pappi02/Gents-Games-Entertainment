# The Gents Games & Entertainment

Website for The Gents Games & Entertainment — a sister brand to The Gents Playhouse — advertising the games and recreation available at the physical venue and converting visitors into enquiries and visits.

Full specs, decisions, and the implementation plan live in [docs/](docs/) — start with [docs/CLAUDE.md](docs/CLAUDE.md) and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Supabase](https://supabase.com) (Postgres, Auth, Storage)

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL/anon key (and later the service-role key and email provider key — see comments in the file).
2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check only

## Database / Migrations

Schema migrations live in `supabase/migrations/` and are applied via the [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase ...`). See [docs/DATABASE.md](docs/DATABASE.md) for the schema and [docs/PHASE_0_DISCOVERY.md](docs/PHASE_0_DISCOVERY.md) for confirmed seed data.

## One Rule That Overrides Everything Else

**Facility accuracy.** Never present a game, price, event, or booking slot as available unless it has verified, owner-confirmed data behind it. See [docs/CLAUDE.md](docs/CLAUDE.md).
