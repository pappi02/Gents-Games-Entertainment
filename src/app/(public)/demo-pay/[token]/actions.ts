"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessCookieName, parseOrderLinkToken, verifyAccessSession } from "@/lib/tickets/crypto";
import { demoModeEnabled } from "@/lib/tickets/demo";
import { getOrder, getOrderEvent } from "@/lib/tickets/server";

/**
 * Stands in for Paystack on sample events only. Every guard is rechecked here
 * because Server Actions can be called directly: demo mode must be on, the event
 * must be flagged as a demo, and the caller must be the browser that started
 * the order. It can't confirm a payment for a real event.
 */
async function demoOrderOrRedirect(token: string) {
  const orderId = demoModeEnabled() ? parseOrderLinkToken(token) : null;
  if (!orderId) redirect("/events");

  const session = (await cookies()).get(accessCookieName(orderId))?.value;
  const order = verifyAccessSession(orderId, session) ? await getOrder(orderId) : null;
  const event = order ? await getOrderEvent(order.event_id) : null;
  if (!order || !event?.is_demo) redirect("/events");
  return { order, event };
}

export async function approveDemoPayment(token: string) {
  const { order } = await demoOrderOrRedirect(token);
  const admin = createAdminClient();
  const { error } = await admin.rpc("confirm_ticket_payment", {
    p_reference: order.reference,
    p_amount_minor_units: order.total_minor_units,
    p_currency: order.currency,
    p_provider_transaction_id: `DEMO-${order.reference}`,
  });
  if (error) throw new Error("Demo payment failed.");
  await admin.rpc("record_ticket_email", { p_order_id: order.id, p_error: "Demo mode: no email sent." });
  redirect(`/tickets/${token}`);
}

export async function cancelDemoPayment(token: string) {
  const { order, event } = await demoOrderOrRedirect(token);
  await createAdminClient().rpc("release_ticket_order", { p_order_id: order.id });
  redirect(`/events/${event.slug}#tickets`);
}
