"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessCookieName, createAccessSession, hashAccessCode, parseOrderLinkToken } from "@/lib/tickets/crypto";
import { demoModeEnabled } from "@/lib/tickets/demo";
import { sendAccessCodeEmail } from "@/lib/tickets/email";
import { clientIpHash, getOrder, getOrderEvent, logAccess, withinRateLimit } from "@/lib/tickets/server";

export type AccessState = { sent: boolean; error: string | null; demoCode?: string };

/** The address is never taken from the visitor: a code only ever goes to the buyer's email on the order. */
export async function requestAccessCode(token: string): Promise<AccessState> {
  const orderId = parseOrderLinkToken(token);
  const order = orderId ? await getOrder(orderId) : null;
  if (!order || order.status !== "paid") return { sent: false, error: "These tickets aren't available." };

  const allowed =
    (await withinRateLimit(`code-order:${order.id}`, 3, 900)) &&
    (await withinRateLimit(`code-ip:${await clientIpHash()}`, 10, 900));
  if (!allowed) return { sent: false, error: "Too many codes requested. Please wait 15 minutes and try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_ticket_access_code", {
    p_order_id: order.id,
    p_code_hash: hashAccessCode(order.id, code),
  });
  if (error) return { sent: false, error: "We couldn't create a code. Please try again." };

  const event = await getOrderEvent(order.event_id);
  // A demo sends no email, so the code is shown on screen. Only ever for sample events in demo mode.
  if (event?.is_demo && demoModeEnabled()) {
    await logAccess(order.id, null, "access_code_sent", "demo");
    return { sent: true, error: null, demoCode: code };
  }
  const sendError = await sendAccessCodeEmail({ to: order.buyer_email, code, eventTitle: event?.title ?? "your event" });
  await logAccess(order.id, null, "access_code_sent", sendError ?? undefined);
  if (sendError) return { sent: false, error: "We couldn't send the code. Please try again or contact us." };
  return { sent: true, error: null };
}

export async function verifyAccessCode(token: string, _prev: AccessState, formData: FormData): Promise<AccessState> {
  const orderId = parseOrderLinkToken(token);
  if (!orderId) return { sent: true, error: "That code isn't right or has expired." };

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { sent: true, error: "Enter the 6-digit code from your email." };

  if (!(await withinRateLimit(`code-verify-ip:${await clientIpHash()}`, 20, 900))) {
    return { sent: true, error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const { data } = await createAdminClient().rpc("consume_ticket_access_code", {
    p_order_id: orderId,
    p_code_hash: hashAccessCode(orderId, code),
  });
  await logAccess(orderId, null, data === true ? "access_code_accepted" : "access_code_rejected");
  if (data !== true) return { sent: true, error: "That code isn't right or has expired." };

  (await cookies()).set(accessCookieName(orderId), createAccessSession(orderId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  redirect(`/tickets/${token}`);
}
