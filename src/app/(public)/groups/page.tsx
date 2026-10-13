import type { Metadata } from "next";
import { pageOpenGraph } from "@/lib/public/seo";
import Link from "next/link";
import { getCategoriesWithGameCounts, getVenueSettings } from "@/lib/public/queries";
import { isAvailableNow } from "@/lib/public/status";
import { PageIntro } from "../_components/PageIntro";
import { ContactActions } from "../_components/ContactActions";
import { Icon } from "../_components/Icon";
import { PageTransition } from "../_components/PageTransition";

export const metadata: Metadata = {
  title: "Groups & Private Events",
  description: "Group visits, friendly competitions, and private event enquiries at The Gents Games & Entertainment.",
  alternates: { canonical: "/groups" },
  openGraph: pageOpenGraph("Groups & Private Events", "/groups"),
};

// Group visits are enquiry-only (docs/PRODUCT_REQUIREMENTS.md) — no packages,
// capacities, discounts, or guaranteed availability are advertised here.
export default async function GroupsPage() {
  const [categories, venue] = await Promise.all([getCategoriesWithGameCounts(), getVenueSettings()]);
  const gameNames = categories.flatMap((c) => c.games.filter((g) => isAvailableNow(g.facility_status)).map((g) => g.name));

  return (
    <PageTransition>
      <main>
        <PageIntro
          eyebrow="Groups"
          title={
            <>
              Bring <span className="accent-serif">the whole</span> crew
            </>
          }
          lede="A relaxed evening of games, a friendly tournament, or a private get-together. Tell us what you have in mind and the team will help you plan it."
        >
          <div className="btn-row btn-row-stack">
            <Link href="/visit?type=group#enquiry" className="btn btn-primary">
              Enquire about a group visit
            </Link>
            <ContactActions venue={venue} />
          </div>
        </PageIntro>

        <section className="section theme-light" aria-labelledby="how-title">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">How it works</p>
                <h2 id="how-title" className="display display-lg">
                  Three simple steps
                </h2>
              </div>
            </div>
            <ol className="steps reveal-group">
              <li>
                <strong>Tell us your plans</strong>
                <span>Send an enquiry, call, or message us on WhatsApp with the details below.</span>
              </li>
              <li>
                <strong>We check what&apos;s possible</strong>
                <span>
                  The team reviews your date and group and gets back to you. An enquiry isn&apos;t a confirmed booking
                  until we&apos;ve replied.
                </span>
              </li>
              <li>
                <strong>Come and play</strong>
                <span>Arrive with your group and enjoy the games you&apos;ve arranged.</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="section theme-paper" aria-labelledby="include-title">
          <div className="container split split-top">
            <div className="stack">
              <p className="eyebrow">Your enquiry</p>
              <h2 id="include-title" className="display display-lg">
                What to include
              </h2>
              <p className="lede">The more we know up front, the faster we can come back with a useful answer.</p>
            </div>
            <div className="panel reveal">
              <ul className="checklist">
                <li>
                  <Icon name="calendar" />
                  <span>
                    <strong>Preferred date and time</strong> — and whether you&apos;re flexible.
                  </span>
                </li>
                <li>
                  <Icon name="users" />
                  <span>
                    <strong>Group size</strong> — roughly how many people are coming.
                  </span>
                </li>
                <li>
                  <Icon name="target" />
                  <span>
                    <strong>Activities of interest</strong>
                    {gameNames.length > 0 ? ` — for example ${gameNames.slice(0, 4).join(", ")}.` : "."}
                  </span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>
                    <strong>The occasion</strong> — a birthday, work outing, friendly tournament, or just a night out.
                  </span>
                </li>
                <li>
                  <Icon name="phone" />
                  <span>
                    <strong>How to reach you</strong> — call or WhatsApp, and the best number.
                  </span>
                </li>
              </ul>
              <div className="btn-row">
                <Link href="/visit?type=group#enquiry" className="btn btn-primary">
                  Start a group enquiry
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
