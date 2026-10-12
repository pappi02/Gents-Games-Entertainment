# Phase 1 — Technical Foundation (Status)

Tracks [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) Phase 1 against what's actually been done in this repo vs. what still needs an account/decision from you.

## Done in this repo

- Next.js 16 + TypeScript app scaffolded at the project root (App Router, `src/` layout, ESLint configured).
- `package.json` name fixed to `gents-games-and-entertainment`.
- Supabase client libraries installed (`@supabase/supabase-js`, `@supabase/ssr`) and three helper modules added:
  - [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) — browser client (anon key only).
  - [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) — server client for Server Components/Actions/Route Handlers (enforces RLS per-request, per [SECURITY.md](SECURITY.md) §2).
  - [src/lib/supabase/proxy.ts](../src/lib/supabase/proxy.ts) — session-refresh helper used by `src/proxy.ts` (Next.js 16's renamed `middleware` convention).
- Supabase CLI initialized (`supabase/config.toml`, `supabase/migrations/` ready for Phase 2 schema work).
- `.env.example` added documenting every required variable; `.gitignore` updated so `.env.example` is tracked while real `.env*` files stay ignored.
- GitHub Actions CI workflow ([.github/workflows/ci.yml](../.github/workflows/ci.yml)): lint → type-check → build on every push/PR.
- Verified locally: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
- README rewritten with real project context and setup steps.

- **Real Supabase project connected.** `.env.local` (gitignored) holds the real project URL + anon/publishable key; connectivity verified live — a query against a non-existent table returned Supabase's expected "table not found" error (`PGRST205`), confirming the URL/key pair is valid and the API is reachable. No schema exists yet — that's correct, it's created in Phase 2.
- `SUPABASE_SERVICE_ROLE_KEY` not yet provided — not needed until server-side admin operations are built (Phase 3+).
- A DB password was also provided and stored as `SUPABASE_DB_PASSWORD` in `.env.local`, for direct Postgres/CLI linking later — **please confirm this is actually the DB password** (inferred from context, not explicitly labeled when given).

- **Error tracking: Sentry (free tier) wired in code.** `@sentry/nextjs` installed; [src/instrumentation.ts](../src/instrumentation.ts) (server + edge), [src/instrumentation-client.ts](../src/instrumentation-client.ts) (browser), and [src/app/global-error.tsx](../src/app/global-error.tsx) (root error boundary) are in place. `next.config.ts` wraps the config with `withSentryConfig` from the `@sentry/nextjs/config` subpath. All Sentry calls `enabled: false` unless a DSN env var is actually set and `NODE_ENV === "production"` — so local dev and CI builds pass with zero Sentry configuration. **Still needs you:** create a free project at sentry.io and fill `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` in `.env.local` (and later as Vercel/CI secrets) — see `.env.example`.
- **Hosting: Vercel confirmed.** Natural fit for Next.js + Supabase. No Vercel project created yet — that happens in Phase 9 (or sooner, to get a staging URL going).

## Still needs you (external accounts/decisions — not blocked on code)

- [x] Create the actual Supabase project — **done**, connectivity verified.
- [x] Choose an error-tracking tool — **Sentry (free tier)**, wired in code, DSN pending.
- [x] Choose the host — **Vercel**, project not yet created.
- [ ] **Choose a transactional email provider** for enquiry notifications (e.g. Resend, Postmark) and get an API key — needed before Phase 5 enquiry flow, not Phase 1 itself.
- [ ] **Create the Sentry project** and drop its DSN/org/project/auth-token into `.env.local`.
- [ ] **Create the Vercel project**, connect this repo, and add the Supabase + Sentry env vars as Vercel project secrets.
- [ ] **Add CI secrets** (`NEXT_SUPABASE_URL`, `NEXT_SUPABASE_ANON_KEY`) in the GitHub repo settings so the CI build step can run against real values.
- [ ] **Fix the git repository scope** — `git rev-parse --show-toplevel` currently resolves to the whole Windows user profile (`C:\Users\cent$`), not this project folder. Flagged separately; needs a decision before any commit happens (and before a Vercel/GitHub connection is wired up).

## Exit condition (per IMPLEMENTATION_PLAN.md)

> "A 'hello world' deploy reaches staging through the real pipeline, with DB connectivity, email sandbox, and error tracking all verified working."

**Partially met:** DB connectivity to the real Supabase project is verified live. Error tracking and hosting are now decided and code-ready (Sentry SDK wired, builds clean with or without a DSN). Still missing: the actual Sentry project/DSN, the actual Vercel project/deploy, and the email provider. None of these block Phase 2 (schema) — reasonable to proceed there now and come back to close out the staging deploy once there's real content worth deploying.
