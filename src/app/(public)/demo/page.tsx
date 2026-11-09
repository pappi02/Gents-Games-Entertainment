import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { demoModeEnabled } from "@/lib/tickets/demo";
import { PageTransition } from "../_components/PageTransition";

export const instant = false;

export const metadata: Metadata = {
  title: "Ticketing demo",
  robots: { index: false, follow: false },
};

export default async function DemoGuidePage() {
  await connection();
  if (!demoModeEnabled()) notFound();

  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow prose">
          <p className="eyebrow">Presenter guide</p>
          <h1 className="display display-lg">Ticketing demo</h1>
          <p className="demo-banner" role="note">
            Everything here is real except the payment and the email, which are simulated. Sample data is hidden from the
            public site.
          </p>

          <h2>1. Buy a ticket</h2>
          <ul>
            <li>
              Open the <Link href="/events/sample-masquerade-night">sample event</Link> and choose 2 tickets.
            </li>
            <li>
              Enter any name and email, then apply discount code <strong>SAMPLE10</strong> (10% off) or{" "}
              <strong>SAMPLE500</strong> (KES 500 off).
            </li>
            <li>Continue to payment and choose <em>Simulate successful payment</em>.</li>
          </ul>

          <h2>2. Show the ticket</h2>
          <ul>
            <li>Each ticket has its own unique ID and signed QR code.</li>
            <li>Download the PDF. It&apos;s marked as a sample.</li>
          </ul>

          <h2>3. Check in at the door</h2>
          <ul>
            <li>Click <em>Simulate scanning this QR code</em> on the ticket, or scan it with a phone, then tap <em>Admit guest</em>. You must be signed in to the admin.</li>
            <li>Scan the same ticket again to show that it&apos;s refused.</li>
            <li>
              Or use <Link href="/admin/check-in">Door Check-in</Link> and type the ticket ID.
            </li>
            <li>Change a character in the QR link to show that a forged ticket is rejected.</li>
          </ul>

          <h2>4. Show the admin side</h2>
          <ul>
            <li>
              <Link href="/admin/events">Events &amp; Tickets</Link>: create an event with a poster and tickets, publish it,
              then open sales. Events created here are marked as samples.
            </li>
            <li>Open <em>Sales</em> on the sample event to see the order, revenue and CSV export.</li>
            <li>
              <Link href="/admin/discount-codes">Discount Codes</Link>: create a percentage or fixed-amount code.
            </li>
          </ul>

          <h2>5. Reset</h2>
          <p>
            Use <em>Reset demo data</em> on <Link href="/admin/events">Events &amp; Tickets</Link> to clear all sample orders.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
