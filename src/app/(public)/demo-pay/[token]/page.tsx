import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { formatMoney } from "@/lib/public/format";
import { accessCookieName, parseOrderLinkToken, verifyAccessSession } from "@/lib/tickets/crypto";
import { demoModeEnabled } from "@/lib/tickets/demo";
import { getOrder, getOrderEvent } from "@/lib/tickets/server";
import { PageTransition } from "../../_components/PageTransition";
import { approveDemoPayment, cancelDemoPayment } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Simulated payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function DemoPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderId = demoModeEnabled() ? parseOrderLinkToken(token) : null;
  if (!orderId) notFound();

  const session = (await cookies()).get(accessCookieName(orderId))?.value;
  const order = verifyAccessSession(orderId, session) ? await getOrder(orderId) : null;
  const event = order ? await getOrderEvent(order.event_id) : null;
  if (!order || !event?.is_demo) notFound();
  if (order.status !== "pending") redirect(`/tickets/${token}`);

  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow stack-lg">
          <p className="demo-banner" role="note">
            <strong>Simulated payment.</strong> No money moves and nothing is sent to Paystack or M-Pesa. In the live system,
            this step is Paystack&apos;s secure payment page.
          </p>
          <div>
            <p className="eyebrow">Pay for your tickets</p>
            <h1 className="display display-lg">{formatMoney(Number(order.total_minor_units), order.currency)}</h1>
            <p className="muted">
              {order.quantity} {order.quantity === 1 ? "ticket" : "tickets"} for {event.title}
            </p>
          </div>

          <form action={approveDemoPayment.bind(null, token)} className="form">
            <fieldset className="demo-pay-methods">
              <legend className="field-label">Payment method</legend>
              <label>
                <input type="radio" name="method" value="mpesa" defaultChecked /> M-Pesa
              </label>
              <label>
                <input type="radio" name="method" value="card" /> Card
              </label>
            </fieldset>
            <div className="btn-row">
              <button type="submit" className="btn btn-primary">
                Simulate successful payment
              </button>
            </div>
          </form>
          <form action={cancelDemoPayment.bind(null, token)}>
            <button type="submit" className="btn btn-secondary">
              Cancel and release tickets
            </button>
          </form>
        </div>
      </main>
    </PageTransition>
  );
}
