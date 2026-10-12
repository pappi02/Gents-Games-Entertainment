import Link from "next/link";
import "./public.css";

// This layout intentionally does NOT fetch from Supabase — several leaf
// pages (privacy/terms/accessibility/groups) have no DB dependency of their
// own and currently build fully static; a cookie-based fetch here would
// force the entire subtree dynamic regardless of each page's own needs.
// LocalBusiness structured data lives on the home page instead, which
// already fetches venue settings for its own content. See docs/PHASE_6_STATUS.md.
export const instant = false;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/games", label: "Games" },
    { href: "/events", label: "Events" },
    { href: "/venue", label: "The Venue" },
    { href: "/groups", label: "Groups" },
    { href: "/visit", label: "Visit Us" },
  ];

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand">
            The Gents Games &amp; Entertainment
          </Link>
          <nav className="site-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <div className="site-brand" style={{ marginBottom: "0.75rem" }}>
              The Gents Games &amp; Entertainment
            </div>
            <p>A sister brand of The Gents Playhouse.</p>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <Link href="/privacy">Privacy Notice</Link>
            <Link href="/terms">Website Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
          </nav>
        </div>
        <p className="footer-note">
          {/* Static year, not new Date() — a dynamic clock read would force
              this otherwise-static layout to render per-request under
              Next.js 16 Cache Components. Update by hand yearly. */}
          © 2026 The Gents Games &amp; Entertainment. All facility information reflects what has been verified by
          the venue — see /venue for current details.
        </p>
      </footer>
    </>
  );
}
