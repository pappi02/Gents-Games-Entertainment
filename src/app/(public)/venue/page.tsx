import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCategoriesWithGameCounts } from "@/lib/public/queries";
import venueLounge from "@/assets/venue-lounge.webp";

export const metadata: Metadata = {
  title: "The Venue",
  description: "The atmosphere, facilities, and recreation spaces at The Gents Games & Entertainment.",
};

export default async function VenuePage() {
  const categories = await getCategoriesWithGameCounts();

  return (
    <main id="main-content">
      <div style={{ position: "relative", aspectRatio: "16/7", width: "100%" }}>
        <Image
          src={venueLounge}
          placeholder="blur"
          alt="A warmly lit lounge seating area, part of the atmosphere we're building toward at the venue."
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className="section section-light">
        <div className="container" style={{ maxWidth: 680 }}>
          <h1>The Venue</h1>
          <p style={{ marginTop: "1rem" }}>
            The Gents Games &amp; Entertainment is built for good company and friendly competition — a space to
            bring friends, challenge colleagues, or settle in for a relaxed game. The images here reflect the style
            and atmosphere we&apos;re building toward; real photography of the venue itself is on its way.
          </p>

          {categories.length > 0 && (
            <>
              <h2 style={{ marginTop: "2rem", fontSize: "1.1rem" }}>What&apos;s available</h2>
              <ul style={{ marginTop: "0.75rem", paddingLeft: "1.2rem" }}>
                {categories.map((c) => (
                  <li key={c.id} style={{ marginBottom: "0.4rem" }}>
                    <Link href={`/games?category=${c.slug}`} style={{ textDecoration: "underline" }}>
                      {c.name}
                    </Link>
                    {c.description ? ` — ${c.description}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p style={{ marginTop: "2rem" }}>
            Ready to come by, or have a question first?{" "}
            <Link href="/visit" style={{ textDecoration: "underline" }}>
              Visit us for directions, hours, and contact details
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
