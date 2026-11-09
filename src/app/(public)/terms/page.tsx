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
            This website describes the games and recreation available at The Gents Games &amp; Entertainment, lets you
            send us an enquiry, and sells tickets to our events. Submitting an enquiry does not create a reservation or
            booking — it is a request that our team will follow up on.
          </p>

          <h2>Age requirement</h2>
          <p>
            The Gents Games &amp; Entertainment is an 18+ venue. Entry is restricted to guests aged 18 and over, and
            valid photo ID is required at the door. This applies to every visitor, including those attending as
            part of a group.
          </p>

          <h2>Facility information</h2>
          <p>
            We aim to keep facility availability, pricing, and event details accurate and up to date. Where a facility
            is marked &quot;coming soon&quot; or &quot;unavailable,&quot; it is not currently available to play,
            regardless of any other content on the page.
          </p>

          <h2>Payments</h2>
          <p>
            The only payments taken on this site are for event tickets. Other rates shown, including games and
            membership, are informational and are not paid for here.
          </p>

          <h2 id="tickets">Event tickets</h2>
          <ul>
            <li>
              Each ticket admits one person to the event shown on it. Tickets carry a unique ID and QR code, and only the
              first scan at the door is accepted.
            </li>
            <li>
              Keep your QR code private and treat it like cash. We can&apos;t admit a second person on a ticket that has
              already been scanned, including where someone else used a copy of it. If you think a ticket has leaked
              before it&apos;s used, contact us and we can cancel it and issue a new one.
            </li>
            <li>
              Tickets are non-refundable unless the event is cancelled, in which case we&apos;ll refund the amount you paid.
              Refunds are arranged by our team and aren&apos;t instant.
            </li>
            <li>The name on a ticket can be any name you choose, and doesn&apos;t need to match an ID.</li>
            <li>
              Your tickets are held for 15 minutes during checkout. Payments are processed by Paystack. We never see your
              card or M-Pesa PIN.
            </li>
            <li>The venue&apos;s age requirement above applies to every event.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent through our <Link href="/visit">enquiry form</Link>.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
