/**
 * Demo mode: the real ticketing flow with a simulated payment and no email, for
 * presenting the system. It can never switch on in Vercel's Production
 * environment, whatever the flag says, and it only ever applies to rows flagged
 * is_demo. See docs/EVENT_TICKETING.md §10.
 */
export function demoModeEnabled(env: Record<string, string | undefined> = process.env) {
  return env.TICKET_DEMO_MODE === "true" && env.VERCEL_ENV !== "production";
}
