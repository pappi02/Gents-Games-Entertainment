export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/events", label: "Events" },
  { href: "/venue", label: "The Venue" },
  { href: "/groups", label: "Groups" },
  { href: "/visit", label: "Visit Us" },
] as const;

export const LEGAL_ITEMS = [
  { href: "/privacy", label: "Privacy Notice" },
  { href: "/terms", label: "Website Terms" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

/** Sister brand — a separate, adults-only (18+) site. Linked discreetly from
 *  the footer only, per docs/PRODUCT_REQUIREMENTS.md §10; never in the main nav. */
export const SISTER_BRAND = { name: "The Gents Playhouse", href: "https://www.thegentsplayhouse.com" } as const;

export function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
