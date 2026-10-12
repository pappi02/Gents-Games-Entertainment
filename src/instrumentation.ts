// Next.js instrumentation hook — runs once per server/edge runtime startup.
// Registers Sentry for server and edge so errors in Server Components,
// Route Handlers, Server Actions, and proxy.ts are captured too.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled:
        process.env.NODE_ENV === "production" &&
        !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled:
        process.env.NODE_ENV === "production" &&
        !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
