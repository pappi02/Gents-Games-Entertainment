import Link from "next/link";
import { getVenueSettings } from "@/lib/public/queries";
import { contactLinks } from "@/lib/public/contact";
import { formatPhone } from "@/lib/public/format";
import { BrandMark } from "./Brand";
import { LEGAL_ITEMS, NAV_ITEMS } from "./nav";

// Venue details come from the cached, tag-invalidated venue_settings read —
// safe in the shared layout because "use cache" doesn't read cookies, so it
// doesn't force static pages dynamic (see docs/PHASE_6_STATUS.md).
export async function SiteFooter() {
  const venue = await getVenueSettings();
  const primary = contactLinks(venue?.phone_primary ?? null, venue?.phone_primary_channels ?? null);
  const secondary = contactLinks(venue?.phone_secondary ?? null, venue?.phone_secondary_channels ?? null);

  return (
    <footer className="site-footer theme-dark">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" aria-label="The Gents Games & Entertainment — home">
              <BrandMark />
              <span className="brand-text" aria-hidden="true">
                <span className="brand-name">The Gents</span>
                <span className="brand-sub">Games &amp; Entertainment</span>
              </span>
            </Link>
            <p>Games, recreation and good company. A sister brand of The Gents Playhouse.</p>
          </div>

          <nav aria-label="Footer">
            <h2 className="footer-heading">Explore</h2>
            <ul className="footer-list">
              {NAV_ITEMS.filter((i) => i.href !== "/").map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {venue && (
            <div>
              <h2 className="footer-heading">Visit</h2>
              <address className="footer-contact">
                <span>{venue.address}</span>
                {venue.hours_note && <span>{venue.hours_note}</span>}
                {venue.map_url && (
                  <a href={venue.map_url} target="_blank" rel="noopener noreferrer" className="text-link">
                    Get directions<span className="visually-hidden"> (opens Google Maps)</span>
                  </a>
                )}
              </address>
            </div>
          )}

          {venue && (primary.call || primary.whatsapp || secondary.call) && (
            <div>
              <h2 className="footer-heading">Contact</h2>
              <ul className="footer-list">
                {primary.call && (
                  <li>
                    <a href={primary.call}>Call {formatPhone(venue.phone_primary)}</a>
                  </li>
                )}
                {primary.whatsapp && (
                  <li>
                    <a href={primary.whatsapp} target="_blank" rel="noopener noreferrer">
                      WhatsApp {formatPhone(venue.phone_primary)}
                    </a>
                  </li>
                )}
                {secondary.call && (
                  <li>
                    <a href={secondary.call}>Call {formatPhone(venue.phone_secondary)}</a>
                  </li>
                )}
                <li>
                  <Link href="/visit#enquiry">Send an enquiry</Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="footer-bottom">
          {/* Static year, not new Date() — a dynamic clock read would force
              this otherwise-static layout to render per-request under
              Next.js 16 Cache Components. Update by hand yearly. */}
          <p>© 2026 The Gents Games &amp; Entertainment. Facility details reflect what the venue has confirmed.</p>
          <nav aria-label="Legal">
            <ul className="footer-list footer-legal">
              {LEGAL_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
