import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Privacy Notice",
  alternates: { canonical: "/privacy" },
  description: "How The Gents Games & Entertainment handles the information you share with us.",
};

export default function PrivacyPage() {
  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow prose">
          <p className="eyebrow">Legal &amp; policies</p>
          <h1 className="display display-lg">Privacy Notice</h1>
          <p className="subtle">
            {/* Draft status tracked in docs/SECURITY.md §8. */}
            This notice is pending legal review and may be updated.
          </p>

          <h2>What we collect</h2>
          <p>
            When you send us an enquiry, we collect your name, the contact details you provide (phone and/or email),
            your message, and any details you share about the activity, event, or group visit you&apos;re asking about.
            We do not require you to create an account, and we do not collect payment or identity-document information
            through this site.
          </p>

          <h2>Why we collect it</h2>
          <p>
            Solely to respond to your enquiry — to get back to you about facilities, pricing, availability, or group and
            event arrangements.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We retain enquiry records for as long as reasonably needed to handle your request and for our own records. A
            formal retention schedule is still being finalized.
          </p>

          <h2>Who can see it</h2>
          <p>
            Only authorized staff who need it to respond to enquiries. We do not sell or share your information with
            third parties for marketing purposes.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this notice can be sent through our <Link href="/visit">enquiry form</Link>.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
