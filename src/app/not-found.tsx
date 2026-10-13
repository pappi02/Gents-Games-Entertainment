import type { Metadata } from "next";
import { PublicShell } from "./(public)/_components/PublicShell";
import { NotFoundContent } from "./(public)/_components/NotFoundContent";

// Unmatched URLs render here, outside the (public) route group, so the
// shared shell is applied explicitly.
export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
