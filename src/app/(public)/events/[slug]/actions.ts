"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessCookieName, createAccessSession } from "@/lib/tickets/crypto";
import { initializeTransaction } from "@/lib/tickets/paystack";
import { clientIpHash, orderLink, ticketingReady, withinRateLimit } from "@/lib/tickets/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Quote = {
  error: string | null;
  discount: number;
  total: number;
  code: string | null;
};

/**
 * Price preview for the form. The figure shown here is never what gets charged:
 * reserve_ticket_order recalculates everything from the database at checkout.
 */
export async function quoteTickets(ticketTypeId: string, quantity: number, code: string): Promise<Quote> {
  const empty = { discount: 0, total: 0, code: null };
  if (!UUID.test(ticketTypeId) || !Number.isInteger(quantity) || code.length > 32) {
    return { ...empty, error: "That code isn't valid for this order." };
  }
  // Limits code guessing without penalising a venue-wide shared connection much.
  if (!(await withinRateLimit(`quote:${await clientIpHash()}`, 30, 600))) {
    return { ...empty, error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const { data, error } = await createAdminClient().rpc("quote_ticket_order", {
    p_ticket_type_id: ticketTypeId,
    p_quantity: quantity,
    p_code: code,
  });
  const row = data?.[0];
  if (error || !row) return { ...empty, error: "We couldn't check that code. Please try again." };
  if (row.error) return { ...empty, error: row.error };
  return { error: null, discount: Number(row.discount_minor_units), total: Number(row.total_minor_units), code: row.discount_code };
}

export type CheckoutField = "quantity" | "buyer_name" | "buyer_email" | "age_confirm";

export type CheckoutState = {
  error: string | null;
  fieldErrors: Partial<Record<CheckoutField, string>>;
};

/**
 * Holds the tickets, creates the Paystack payment and sends the buyer there. No
 * ticket exists until Paystack itself confirms payment. See syncOrderPayment.
 */
export async function startTicketCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const ticketTypeId = text("ticket_type_id");
  const slug = text("slug");
  const quantity = Number(text("quantity"));
  const buyerName = text("buyer_name").replace(/\p{Cc}/gu, "");
  const buyerEmail = text("buyer_email").toLowerCase();
  const code = text("discount_code");

  // Honeypot: real visitors never see this field.
  if (text("company")) return { error: "Something went wrong. Please reload the page and try again.", fieldErrors: {} };

  const fieldErrors: CheckoutState["fieldErrors"] = {};
  if (!Number.isInteger(quantity) || quantity < 1) fieldErrors.quantity = "Choose how many tickets you'd like.";
  if (!buyerName) fieldErrors.buyer_name = "Enter a name for your tickets. Any name is fine.";
  if (buyerName.length > 80) fieldErrors.buyer_name = "Please keep the name under 80 characters.";
  if (!EMAIL.test(buyerEmail) || buyerEmail.length > 254) {
    fieldErrors.buyer_email = "Enter a valid email address. Your tickets are sent here.";
  }
  if (formData.get("age_confirm") !== "on") fieldErrors.age_confirm = "Please confirm you're 18 or over. This is an 18+ venue.";
  if (!UUID.test(ticketTypeId) || !/^[a-z0-9-]+$/.test(slug) || code.length > 32) {
    return { error: "Something about this form was invalid. Please reload the page and try again.", fieldErrors };
  }
  if (Object.keys(fieldErrors).length > 0) return { error: "Please check the highlighted fields.", fieldErrors };

  if (!ticketingReady()) return { error: "Tickets aren't on sale right now. Please check back soon.", fieldErrors: {} };

  const ipHash = await clientIpHash();
  const allowed =
    (await withinRateLimit(`checkout-ip:${ipHash}`, 20, 600)) &&
    (await withinRateLimit(`checkout-email:${buyerEmail}`, 5, 600));
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again.", fieldErrors: {} };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_ticket_order", {
    p_ticket_type_id: ticketTypeId,
    p_quantity: quantity,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_code: code,
    p_ip_hash: ipHash,
  });
  const reservation = data?.[0];
  if (error || !reservation) return { error: "We couldn't start your order. Please try again.", fieldErrors: {} };
  if (reservation.error) return { error: reservation.error, fieldErrors: {} };

  let authorizationUrl: string;
  try {
    ({ authorizationUrl } = await initializeTransaction({
      email: buyerEmail,
      amountMinorUnits: Number(reservation.total_minor_units),
      currency: reservation.currency,
      reference: reservation.reference,
      callbackUrl: `${orderLink(reservation.order_id)}?from=payment`,
      metadata: { event_slug: slug },
    }));
  } catch {
    await admin.rpc("release_ticket_order", { p_order_id: reservation.order_id });
    return { error: "We couldn't reach the payment service. You haven't been charged. Please try again.", fieldErrors: {} };
  }

  // This browser started the order, so it can open the tickets without an
  // emailed code. HttpOnly, so page scripts can't read it.
  (await cookies()).set(accessCookieName(reservation.order_id), createAccessSession(reservation.order_id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/tickets",
    maxAge: 12 * 60 * 60,
  });

  redirect(authorizationUrl);
}
