import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How The Gents Games & Entertainment handles the information you share with us.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1>Privacy Notice</h1>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Draft — pending legal review. See docs/SECURITY.md §8.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>What we collect</h2>
        <p style={{ marginTop: "0.5rem" }}>
          When you send us an enquiry, we collect your name, the contact details you provide (phone and/or email),
          your message, and any details you share about the activity, event, or group visit you&apos;re asking
          about. We do not require you to create an account, and we do not collect payment or identity-document
          information through this site.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>Why we collect it</h2>
        <p style={{ marginTop: "0.5rem" }}>
          Solely to respond to your enquiry — to get back to you about facilities, pricing, availability, or group
          and event arrangements.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>How long we keep it</h2>
        <p style={{ marginTop: "0.5rem" }}>
          We retain enquiry records for as long as reasonably needed to handle your request and for our own
          records. A formal retention schedule is still being finalized.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>Who can see it</h2>
        <p style={{ marginTop: "0.5rem" }}>
          Only authorized staff who need it to respond to enquiries. We do not sell or share your information with
          third parties for marketing purposes.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>Contact</h2>
        <p style={{ marginTop: "0.5rem" }}>
          Questions about this notice can be sent through our <a href="/visit" style={{ textDecoration: "underline" }}>enquiry form</a>.
        </p>
      </div>
    </main>
  );
}
