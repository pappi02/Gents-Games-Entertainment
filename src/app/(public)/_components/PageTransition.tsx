import { ViewTransition } from "react";

/**
 * Wraps a page's content so route changes cross-fade (old page out fast,
 * new page in with a short rise). It lives in each page, not the layout:
 * layouts persist across navigations, so enter/exit would never fire there.
 * Same-route updates (search/filter changes) don't animate the whole page —
 * `default="none"` — only the pieces that opt in.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
