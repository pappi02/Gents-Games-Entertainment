import { createHash, createHmac, createPrivateKey, createPublicKey, sign, timingSafeEqual, verify } from "node:crypto";
import type { KeyObject } from "node:crypto";

/**
 * Ticket signatures and access tokens. Server-only: this file reads secrets and
 * must never be imported from a Client Component. Standard primitives from
 * Node's crypto module only (Ed25519, HMAC-SHA-256), nothing home-made.
 *
 * Ticket token format, carried in the QR code:
 *   1.<keyId>.<ticket code without dashes>.<Ed25519 signature, base64url>
 *
 * The token holds only a lookup code and a signature. The signed message is
 * rebuilt from the database record at verification time, so a changed name or
 * event in the database makes the signature fail, and no personal data is in
 * the QR code. Signatures are never stored: a database leak yields no working
 * QR codes, and creating a valid one requires the private key.
 *
 * See docs/EVENT_TICKETING.md.
 */

const TOKEN_VERSION = "1";

export type SignableTicket = {
  id: string;
  ticket_code: string;
  event_id: string;
  ticket_type_id: string;
  holder_name: string;
  issued_at: string;
};

export function ticketingSecretsConfigured() {
  return Boolean(
    process.env.TICKET_SIGNING_PRIVATE_KEY && process.env.TICKET_SIGNING_KEY_ID && process.env.TICKET_ACCESS_SECRET,
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function signingKey(): { keyId: string; privateKey: KeyObject } {
  return {
    keyId: requireEnv("TICKET_SIGNING_KEY_ID"),
    privateKey: createPrivateKey({
      key: Buffer.from(requireEnv("TICKET_SIGNING_PRIVATE_KEY"), "base64"),
      format: "der",
      type: "pkcs8",
    }),
  };
}

/** The current key's public half, plus any retired public keys still honoured (`id:base64,id:base64`). */
function verificationKey(keyId: string): KeyObject | null {
  if (keyId === process.env.TICKET_SIGNING_KEY_ID && process.env.TICKET_SIGNING_PRIVATE_KEY) {
    return createPublicKey(signingKey().privateKey);
  }
  for (const entry of (process.env.TICKET_SIGNING_RETIRED_PUBLIC_KEYS ?? "").split(",")) {
    const [id, key] = entry.trim().split(":");
    if (id === keyId && key) {
      return createPublicKey({ key: Buffer.from(key, "base64"), format: "der", type: "spki" });
    }
  }
  return null;
}

/** JSON array, so a name containing any separator character can't shift fields. */
function signedMessage(keyId: string, ticket: SignableTicket) {
  return Buffer.from(
    JSON.stringify([
      "gents-ticket",
      TOKEN_VERSION,
      keyId,
      ticket.id,
      ticket.ticket_code,
      ticket.event_id,
      ticket.ticket_type_id,
      ticket.holder_name,
      new Date(ticket.issued_at).toISOString(),
    ]),
    "utf8",
  );
}

export function compactTicketCode(code: string) {
  return code.replaceAll("-", "");
}

export function expandTicketCode(compact: string) {
  return `GG-${compact.slice(2, 6)}-${compact.slice(6, 10)}-${compact.slice(10, 14)}`;
}

/** Accepts what a person types: any case, spaces, and the look-alikes O/I/L. Null if it can't be a ticket code. */
export function normalizeTypedTicketCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/^GG/, "")
    .replaceAll("O", "0")
    .replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{12}$/.test(cleaned)) return null;
  return expandTicketCode(`GG${cleaned}`);
}

export function signTicket(ticket: SignableTicket): string {
  const { keyId, privateKey } = signingKey();
  const signature = sign(null, signedMessage(keyId, ticket), privateKey).toString("base64url");
  return [TOKEN_VERSION, keyId, compactTicketCode(ticket.ticket_code), signature].join(".");
}

export type ParsedTicketToken = { keyId: string; ticketCode: string; signature: Buffer };

/** Shape check only. Proves nothing until verifyTicketSignature passes against the database record. */
export function parseTicketToken(token: string): ParsedTicketToken | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return null;
  const [, keyId, compact, signature] = parts;
  if (!/^[a-zA-Z0-9_-]{1,16}$/.test(keyId)) return null;
  if (!/^GG[0-9A-HJKMNP-TV-Z]{12}$/.test(compact)) return null;
  if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return null;
  return { keyId, ticketCode: expandTicketCode(compact), signature: Buffer.from(signature, "base64url") };
}

export function verifyTicketSignature(parsed: ParsedTicketToken, ticket: SignableTicket): boolean {
  if (parsed.ticketCode !== ticket.ticket_code) return false;
  try {
    const key = verificationKey(parsed.keyId);
    if (!key) return false;
    return verify(null, signedMessage(parsed.keyId, ticket), key, parsed.signature);
  } catch {
    return false;
  }
}

/** Short human-readable fingerprint printed on the PDF. Decorative: the QR scan is the real check. */
export function signatureFingerprint(token: string) {
  const signature = token.split(".")[3] ?? "";
  const hex = createHash("sha256").update(signature).digest("hex").slice(0, 16).toUpperCase();
  return hex.match(/.{4}/g)!.join(" ");
}

// --- HMAC tokens for buyer access. Each purpose has its own domain, so a value
// made for one purpose can never be replayed as another. ---

function hmac(purpose: string, value: string) {
  return createHmac("sha256", requireEnv("TICKET_ACCESS_SECRET")).update(`${purpose}\n${value}`).digest();
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

function uuidToBase64Url(uuid: string) {
  return Buffer.from(uuid.replaceAll("-", ""), "hex").toString("base64url");
}

function base64UrlToUuid(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;
  const hex = Buffer.from(value, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The private link emailed to the buyer. Alone it reveals no ticket: access needs a session too. */
export function orderLinkToken(orderId: string) {
  return `${uuidToBase64Url(orderId)}.${hmac("order-link", orderId).subarray(0, 16).toString("base64url")}`;
}

export function parseOrderLinkToken(token: string): string | null {
  const [id, mac, extra] = token.split(".");
  if (!id || !mac || extra !== undefined) return null;
  const orderId = base64UrlToUuid(id);
  if (!orderId) return null;
  const expected = hmac("order-link", orderId).subarray(0, 16);
  return safeEqual(Buffer.from(mac, "base64url"), expected) ? orderId : null;
}

export function accessCookieName(orderId: string) {
  return `gga_${orderId.replaceAll("-", "")}`;
}

export function createAccessSession(orderId: string, now = Date.now(), ttlMs = 12 * 60 * 60 * 1000) {
  const expires = now + ttlMs;
  const mac = hmac("access-session", `${orderId}.${expires}`).toString("base64url");
  return `${expires}.${mac}`;
}

export function verifyAccessSession(orderId: string, value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const [expires, mac, extra] = value.split(".");
  if (!expires || !mac || extra !== undefined || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= now) return false;
  return safeEqual(Buffer.from(mac, "base64url"), hmac("access-session", `${orderId}.${expires}`));
}

export function hashAccessCode(orderId: string, code: string) {
  return hmac("access-code", `${orderId}.${code}`).toString("hex");
}

/** Keyed hash, so stored values can't be reversed to an IP address by trying them all. */
export function hashIp(ip: string) {
  return hmac("ip", ip).subarray(0, 16).toString("hex");
}
