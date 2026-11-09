"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/session";
import { createClient } from "@/lib/supabase/server";
import { deliverTickets, getOrder, syncOrderPayment } from "@/lib/tickets/server";

const STAFF = ["super_admin", "content_editor"] as const;

function done(eventId: string, message: string, kind: "error" | "notice" = "notice"): never {
  revalidatePath(`/admin/events/${eventId}/sales`);
  redirect(`/admin/events/${eventId}/sales?${kind}=${encodeURIComponent(message)}`);
}

/** Asks Paystack for the real status, for when a payment notification was missed. */
export async function recheckPayment(eventId: string, orderId: string) {
  await requireRole([...STAFF]);
  const order = await getOrder(orderId);
  if (!order || order.event_id !== eventId) done(eventId, "Order not found.", "error");
  let outcome: string;
  try {
    outcome = await syncOrderPayment(order.reference);
  } catch {
    done(eventId, "Couldn't reach Paystack. Try again shortly.", "error");
  }
  const messages: Record<string, string> = {
    issued: "Payment confirmed and tickets issued.",
    already_paid: "This order was already paid.",
    review: "This payment needs review. See the order's reason.",
    refunded: "This order has been refunded.",
    unpaid: "Paystack has no successful payment for this order.",
    not_found: "Order not found.",
  };
  done(eventId, messages[outcome] ?? "Checked.");
}

export async function resendTicketEmail(eventId: string, orderId: string) {
  await requireRole([...STAFF]);
  const order = await getOrder(orderId);
  if (!order || order.event_id !== eventId) done(eventId, "Order not found.", "error");
  const error = await deliverTickets(orderId);
  if (error) done(eventId, `Email not sent: ${error}`, "error");
  done(eventId, `Ticket email sent to ${order.buyer_email}.`);
}

export async function replaceTicket(eventId: string, ticketId: string, formData: FormData) {
  await requireRole(["super_admin"]);
  const reason = String(formData.get("reason") ?? "").trim() || "Reported leaked or lost";
  const supabase = await createClient();
  const { data: ticket } = await supabase.from("tickets").select("order_id").eq("id", ticketId).eq("event_id", eventId).maybeSingle();
  if (!ticket) done(eventId, "Ticket not found.", "error");

  const { data: newCode, error } = await supabase.rpc("admin_replace_ticket", { p_ticket_id: ticketId, p_reason: reason });
  if (error) done(eventId, error.message, "error");

  const emailError = await deliverTickets(ticket.order_id);
  done(
    eventId,
    emailError
      ? `Replaced with ${newCode}, but the email failed: ${emailError}`
      : `Old QR code cancelled. New ticket ${newCode} is ready and the buyer has been emailed.`,
  );
}

export async function recordRefund(eventId: string, orderId: string, formData: FormData) {
  await requireRole(["super_admin"]);
  const note = String(formData.get("note") ?? "").trim();
  if (!note) done(eventId, "Add a note with the Paystack refund reference.", "error");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_refund", { p_order_id: orderId, p_note: note });
  if (error) done(eventId, error.message, "error");
  done(eventId, "Refund recorded and the order's unused tickets cancelled.");
}

export async function correctOrderEmail(eventId: string, orderId: string, formData: FormData) {
  await requireRole(["super_admin"]);
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) done(eventId, "Enter a valid email address.", "error");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_order_email", { p_order_id: orderId, p_email: email });
  if (error) done(eventId, error.message, "error");
  const emailError = await deliverTickets(orderId);
  done(eventId, emailError ? `Email updated, but sending failed: ${emailError}` : `Email updated and tickets sent to ${email}.`);
}
