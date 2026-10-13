import "../public.css";
import "../motion.css";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/** Shared page chrome — used by the (public) layout and by the root not-found page, which sits outside this route group. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site theme-light">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      {/* The skip-link target lives here, in the persistent shell, not on each
          page's <main>: Next keeps recently visited pages mounted (hidden) for
          back/forward, so a per-page id would be duplicated in the DOM. */}
      <div id="main-content" tabIndex={-1} className="page-root">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
