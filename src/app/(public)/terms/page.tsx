import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Terms",
  description: "Terms of use for the Gents Games & Entertainment website.",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1>Website Terms</h1>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Draft — pending legal review. See docs/SECURITY.md §8.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>What this site is for</h2>
        <p style={{ marginTop: "0.5rem" }}>
          This website describes the games and recreation available at The Gents Games &amp; Entertainment and lets
          you send us an enquiry. Submitting an enquiry does not create a reservation or booking — it is a request
          that our team will follow up on.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>Facility information</h2>
        <p style={{ marginTop: "0.5rem" }}>
          We aim to keep facility availability, pricing, and event details accurate and up to date. Where a
          facility is marked &quot;coming soon&quot; or &quot;unavailable,&quot; it is not currently available to
          play, regardless of any other content on the page.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>No online payments</h2>
        <p style={{ marginTop: "0.5rem" }}>
          This site does not process payments, deposits, or refunds. Any rates shown are informational.
        </p>

        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>Contact</h2>
        <p style={{ marginTop: "0.5rem" }}>
          Questions about these terms can be sent through our <a href="/visit" style={{ textDecoration: "underline" }}>enquiry form</a>.
        </p>
      </div>
    </main>
  );
}
