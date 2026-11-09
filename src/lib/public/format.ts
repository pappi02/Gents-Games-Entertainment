/**
 * Display formatting for public pages. Money stays in integer minor units
 * end to end (docs/CODE_STYLE.md §2) — only integer arithmetic here.
 * Timestamps are stored UTC and rendered in the venue's timezone.
 */
export const VENUE_TIMEZONE = "Africa/Nairobi";

export function formatMoney(minorUnits: number, currency: string) {
  const major = Math.trunc(minorUnits / 100);
  const minor = Math.abs(minorUnits % 100);
  const whole = major.toLocaleString("en-KE");
  return `${currency} ${minor ? `${whole}.${String(minor).padStart(2, "0")}` : whole}`;
}

export function formatBillingUnit(unit: string) {
  return unit.replaceAll("_", " ");
}

function parts(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-KE", { timeZone, ...options }).format(new Date(iso));
}

export function formatEventDate(iso: string, timeZone = VENUE_TIMEZONE) {
  return {
    weekday: parts(iso, timeZone, { weekday: "short" }),
    day: parts(iso, timeZone, { day: "numeric" }),
    month: parts(iso, timeZone, { month: "short" }),
    full: parts(iso, timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: parts(iso, timeZone, { hour: "numeric", minute: "2-digit" }),
  };
}

/** Phone numbers stored as E.164 (+254719506995) shown as +254 719 506 995. */
export function formatPhone(phone: string) {
  const m = phone.replace(/\s+/g, "").match(/^\+(254)(\d{3})(\d{3})(\d{3})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Whether an event has finished, judged against the request time. */
export function hasEnded(event: { start_at: string; end_at: string | null }) {
  return new Date(event.end_at ?? event.start_at).getTime() < Date.now();
}

/** Whether a timestamp has passed, judged against the request time. */
export function isPast(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

/** A UTC timestamp the given number of days before the request time. */
export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
