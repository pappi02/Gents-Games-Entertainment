import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "Our approach to accessibility on the Gents Games & Entertainment website.",
};

export default function AccessibilityPage() {
  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1>Accessibility Statement</h1>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Draft — reflects current implementation; full audit still pending. See docs/TESTING.md §1.
        </p>

        <p style={{ marginTop: "1rem" }}>
          We aim to meet WCAG 2.2 Level AA as our target for this website. We&apos;ve built it with semantic HTML,
          keyboard-navigable menus and forms, visible focus states, and status indicators that don&apos;t rely on
          color alone. We also respect your device&apos;s reduced-motion preference.
        </p>
        <p style={{ marginTop: "1rem" }}>
          This statement reflects our current implementation, not a completed third-party audit. If you run into an
          accessibility barrier using this site, please let us know through our{" "}
          <a href="/visit" style={{ textDecoration: "underline" }}>
            enquiry form
          </a>{" "}
          or by phone, and we&apos;ll do our best to help and to fix the underlying issue.
        </p>
      </div>
    </main>
  );
}
