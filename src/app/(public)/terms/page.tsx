import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Website Terms",
  alternates: { canonical: "/terms" },
  description: "Terms of use for the Gents Games & Entertainment website.",
};

export default function TermsPage() {
  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow prose">
          <p className="eyebrow">Legal &amp; policies</p>
          <h1 className="display display-lg">Website Terms</h1>
          <p className="subtle">
            {/* Draft status tracked in docs/SECURITY.md §8. */}
            These terms are pending legal review and may be updated.
          </p>

          <h2>What this site is for</h2>
          <p>
            This website describes the games and recreation available at The Gents Games &amp; Entertainment and lets
            you send us an enquiry. Submitting an enquiry does not create a reservation or booking — it is a request
            that our team will follow up on.
          </p>

          <h2>Facility information</h2>
          <p>
            We aim to keep facility availability, pricing, and event details accurate and up to date. Where a facility
            is marked &quot;coming soon&quot; or &quot;unavailable,&quot; it is not currently available to play,
            regardless of any other content on the page.
          </p>

          <h2>No online payments</h2>
          <p>This site does not process payments, deposits, or refunds. Any rates shown are informational.</p>

          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent through our <Link href="/visit">enquiry form</Link>.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
