import { isValidWebhookSignature } from "@/lib/tickets/paystack";
import { syncOrderPayment } from "@/lib/tickets/server";

/**
 * Paystack payment notifications. The signature proves the sender, and
 * syncOrderPayment then asks Paystack again rather than trusting the body's
 * amount. A non-200 makes Paystack retry, which is safe because confirmation is
 * idempotent: a repeat creates no tickets and sends no email.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: unknown } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  const reference = payload.data?.reference;
  if (payload.event !== "charge.success" || typeof reference !== "string" || !reference.startsWith("GGO-")) {
    return new Response("Ignored", { status: 200 });
  }

  try {
    await syncOrderPayment(reference);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Paystack webhook processing failed", error instanceof Error ? error.message : "unknown");
    return new Response("Retry", { status: 500 });
  }
}
