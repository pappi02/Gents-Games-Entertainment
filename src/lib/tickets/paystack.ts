import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack hosted checkout. Card and M-Pesa details are entered on Paystack's
 * page and never touch this site. Amounts are integer minor units both ways.
 */

const API_BASE = "https://api.paystack.co";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

export async function initializeTransaction(input: {
  email: string;
  amountMinorUnits: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string }> {
  const response = await fetch(`${API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinorUnits,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "mobile_money"],
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  const url = body?.data?.authorization_url;
  if (!response.ok || !body?.status || typeof url !== "string") {
    throw new Error(`Paystack initialize failed with HTTP ${response.status}.`);
  }
  return { authorizationUrl: url };
}

export type VerifiedTransaction = {
  status: string;
  amountMinorUnits: number;
  currency: string;
  transactionId: string;
};

/** Asks Paystack directly. This, never a browser redirect, is the source of truth for payment. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const response = await fetch(`${API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data) {
    // Paystack reports a never-attempted reference as an error body, not a transaction.
    if (body?.status === false && response.status === 400) return null;
    throw new Error(`Paystack verify failed with HTTP ${response.status}.`);
  }
  if (body.data.reference !== reference) throw new Error("Paystack verify returned a different reference.");
  return {
    status: String(body.data.status),
    amountMinorUnits: Number(body.data.amount),
    currency: String(body.data.currency),
    transactionId: String(body.data.id),
  };
}

/** HMAC-SHA512 of the exact raw request body, compared in constant time. */
export function isValidWebhookSignature(rawBody: string, signature: string | null, secret = process.env.PAYSTACK_SECRET_KEY) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
