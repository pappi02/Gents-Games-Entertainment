// Sentry client-side init. Runs in the browser. See docs/ARCHITECTURE_AND_DATA.md §11
// (operational monitoring) and docs/PHASE_1_STATUS.md.
//
// Requires a free Sentry.io account + project; set NEXT_PUBLIC_SENTRY_DSN in
// .env.local. Safe to leave unset in local dev — Sentry.init no-ops without a DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
