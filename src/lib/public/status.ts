/**
 * Single source of truth for how a facility_status is presented publicly.
 * Every card, badge, and detail page reads from here so the same game can
 * never be labelled differently in two places (docs/CLAUDE.md — facility
 * accuracy). `publication_status` is enforced by RLS, not here.
 */
export type FacilityStatus = "available" | "coming_soon" | "unavailable" | "unverified";

const STATUS: Record<FacilityStatus, { label: string; detail: string }> = {
  available: {
    label: "Available",
    detail: "Available at the venue. Table and equipment availability on the day isn't guaranteed — call ahead if you want to be sure.",
  },
  coming_soon: {
    label: "Coming soon",
    detail: "Not playable yet. This activity is planned but not currently available at the venue.",
  },
  unavailable: {
    label: "Currently unavailable",
    detail: "Temporarily unavailable at the venue. Ask us when it's expected back.",
  },
  unverified: {
    label: "Ask to confirm",
    detail: "We haven't confirmed this activity's availability yet — please ask before you visit.",
  },
};

export function facilityStatus(value: string | null | undefined) {
  const key = (value && value in STATUS ? value : "unverified") as FacilityStatus;
  return { key, ...STATUS[key] };
}

/**
 * True only for a game visitors can actually play now. Anything that lists
 * games without a status badge beside each name (ticker, picker, "for
 * example …" copy) must filter with this, so a coming-soon or unavailable
 * game is never read as playable.
 */
export function isAvailableNow(value: string | null | undefined) {
  return value === "available";
}
