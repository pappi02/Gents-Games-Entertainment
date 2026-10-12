import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Groups & Private Events",
  description: "Group visits, friendly competitions, and private event enquiries at The Gents Games & Entertainment.",
};

export default function GroupsPage() {
  return (
    <main id="main-content" className="section section-light">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1>Groups &amp; Private Events</h1>
        <p style={{ marginTop: "1rem" }}>
          Bring your group for a relaxed evening of games, a friendly tournament, or a private get-together.
          Whether it&apos;s a birthday, a work outing, or just a standing group that likes to play, let us know what
          you have in mind and our team will help you plan it.
        </p>
        <p style={{ marginTop: "1rem" }}>
          Tell us your preferred date, group size, and which activities you&apos;re interested in, and we&apos;ll get
          back to you with what&apos;s possible.
        </p>
        <div className="cta-row" style={{ marginTop: "1.5rem", justifyContent: "flex-start" }}>
          <Link href="/visit?type=group" className="btn btn-primary">
            Enquire about a group visit
          </Link>
        </div>
      </div>
    </main>
  );
}
