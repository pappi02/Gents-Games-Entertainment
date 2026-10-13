import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  alternates: { canonical: "/accessibility" },
  description: "Our approach to accessibility on the Gents Games & Entertainment website.",
};

export default function AccessibilityPage() {
  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow prose">
          <p className="eyebrow">Legal &amp; policies</p>
          <h1 className="display display-lg">Accessibility Statement</h1>
          <p className="subtle">
            {/* Audit status tracked in docs/TESTING.md §1. */}
            This statement describes the current site; a full independent audit is still to come.
          </p>

          <p>
            We aim to meet WCAG 2.2 Level AA as our target for this website. We&apos;ve built it with semantic HTML,
            keyboard-navigable menus and forms, visible focus states, and status indicators that don&apos;t rely on
            color alone. We also respect your device&apos;s reduced-motion preference.
          </p>
          <p>
            This statement reflects our current implementation, not a completed third-party audit. If you run into an
            accessibility barrier using this site, please let us know through our{" "}
            <Link href="/visit">enquiry form</Link> or by phone, and we&apos;ll do our best to help and to fix the
            underlying issue.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
