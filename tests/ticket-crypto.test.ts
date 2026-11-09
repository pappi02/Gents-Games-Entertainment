import { createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  accessCookieName,
  createAccessSession,
  hashAccessCode,
  normalizeTypedTicketCode,
  orderLinkToken,
  parseOrderLinkToken,
  parseTicketToken,
  signTicket,
  verifyAccessSession,
  verifyTicketSignature,
} from "@/lib/tickets/crypto";
import { isValidWebhookSignature } from "@/lib/tickets/paystack";

function der(privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"]) {
  return (privateKey as import("node:crypto").KeyObject).export({ format: "der", type: "pkcs8" }).toString("base64");
}

const ticket = {
  id: "7b0f7f0e-7f2a-4c11-9d4e-0d3c8f0a1b2c",
  ticket_code: "GG-7K4M-X92Q-TR8D",
  event_id: "1c9e6f40-1111-4222-8333-444455556666",
  ticket_type_id: "2d8f7a51-2222-4333-8444-555566667777",
  holder_name: "Any Name | With \"separators\", at all",
  issued_at: "2026-11-09T10:00:00.000Z",
};

beforeAll(() => {
  const { privateKey } = generateKeyPairSync("ed25519");
  process.env.TICKET_SIGNING_PRIVATE_KEY = der(privateKey);
  process.env.TICKET_SIGNING_KEY_ID = "k1";
  process.env.TICKET_ACCESS_SECRET = randomBytes(32).toString("base64");
  delete process.env.TICKET_SIGNING_RETIRED_PUBLIC_KEYS;
});

describe("ticket signatures", () => {
  it("accepts a ticket we signed", () => {
    const parsed = parseTicketToken(signTicket(ticket))!;
    expect(parsed.ticketCode).toBe(ticket.ticket_code);
    expect(verifyTicketSignature(parsed, ticket)).toBe(true);
  });

  it("puts no personal data in the QR token", () => {
    expect(signTicket(ticket)).not.toContain("Name");
    expect(Buffer.from(signTicket(ticket).split(".")[3], "base64url").toString("latin1")).not.toContain("Name");
  });

  it.each([
    ["holder name", { holder_name: "Someone Else" }],
    ["event", { event_id: "1c9e6f40-1111-4222-8333-444455550000" }],
    ["ticket type", { ticket_type_id: "2d8f7a51-2222-4333-8444-555566660000" }],
    ["internal id", { id: "7b0f7f0e-7f2a-4c11-9d4e-0d3c8f0a0000" }],
    ["issue time", { issued_at: "2026-11-09T10:00:01.000Z" }],
  ])("rejects a ticket whose %s was changed after signing", (_label, change) => {
    expect(verifyTicketSignature(parseTicketToken(signTicket(ticket))!, { ...ticket, ...change })).toBe(false);
  });

  it("rejects a QR code moved onto a different ticket ID", () => {
    const token = signTicket(ticket).split(".");
    token[2] = "GG7K4MX92QTR8E";
    const parsed = parseTicketToken(token.join("."))!;
    expect(verifyTicketSignature(parsed, { ...ticket, ticket_code: "GG-7K4M-X92Q-TR8E" })).toBe(false);
  });

  it("rejects a forged QR code signed with an attacker's own key", () => {
    const genuine = signTicket(ticket);
    const realKey = process.env.TICKET_SIGNING_PRIVATE_KEY;
    process.env.TICKET_SIGNING_PRIVATE_KEY = der(generateKeyPairSync("ed25519").privateKey);
    const forged = signTicket(ticket);
    process.env.TICKET_SIGNING_PRIVATE_KEY = realKey;

    expect(forged).not.toBe(genuine);
    expect(verifyTicketSignature(parseTicketToken(forged)!, ticket)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = signTicket(ticket);
    const flipped = token.slice(0, -2) + (token.endsWith("AA") ? "BA" : "AA");
    const parsed = parseTicketToken(flipped);
    expect(parsed === null || !verifyTicketSignature(parsed, ticket)).toBe(true);
  });

  it("rejects an unknown signing key and malformed tokens", () => {
    const token = signTicket(ticket).split(".");
    token[1] = "k9";
    expect(verifyTicketSignature(parseTicketToken(token.join("."))!, ticket)).toBe(false);
    for (const bad of ["", "abc", "1.k1.GG7K4MX92QTR8D", "2.k1.GG7K4MX92QTR8D." + "A".repeat(86), "1.k1.nope." + "A".repeat(86)]) {
      expect(parseTicketToken(bad)).toBeNull();
    }
  });

  it("still accepts tickets signed with a retired key after rotation", () => {
    const oldToken = signTicket(ticket);
    const oldPublic = createPublicKey(
      createPrivateKey({ key: Buffer.from(process.env.TICKET_SIGNING_PRIVATE_KEY!, "base64"), format: "der", type: "pkcs8" }),
    )
      .export({ format: "der", type: "spki" })
      .toString("base64");
    const saved = { key: process.env.TICKET_SIGNING_PRIVATE_KEY, id: process.env.TICKET_SIGNING_KEY_ID };
    process.env.TICKET_SIGNING_PRIVATE_KEY = der(generateKeyPairSync("ed25519").privateKey);
    process.env.TICKET_SIGNING_KEY_ID = "k2";

    expect(verifyTicketSignature(parseTicketToken(oldToken)!, ticket)).toBe(false);
    process.env.TICKET_SIGNING_RETIRED_PUBLIC_KEYS = `k1:${oldPublic}`;
    expect(verifyTicketSignature(parseTicketToken(oldToken)!, ticket)).toBe(true);

    delete process.env.TICKET_SIGNING_RETIRED_PUBLIC_KEYS;
    process.env.TICKET_SIGNING_PRIVATE_KEY = saved.key;
    process.env.TICKET_SIGNING_KEY_ID = saved.id;
  });
});

describe("buyer access", () => {
  const orderId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("round-trips the private order link and rejects a guessed one", () => {
    const token = orderLinkToken(orderId);
    expect(parseOrderLinkToken(token)).toBe(orderId);
    const otherOrder = orderLinkToken("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0");
    expect(parseOrderLinkToken(`${token.split(".")[0]}.${otherOrder.split(".")[1]}`)).toBeNull();
    expect(parseOrderLinkToken(token.split(".")[0])).toBeNull();
    expect(parseOrderLinkToken("garbage")).toBeNull();
  });

  it("accepts a session only for its own order and only until it expires", () => {
    const now = 1_000_000;
    const session = createAccessSession(orderId, now, 1000);
    expect(verifyAccessSession(orderId, session, now + 999)).toBe(true);
    expect(verifyAccessSession(orderId, session, now + 1000)).toBe(false);
    expect(verifyAccessSession("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0", session, now)).toBe(false);
    expect(verifyAccessSession(orderId, undefined, now)).toBe(false);
  });

  it("rejects a session whose expiry was extended", () => {
    const now = 1_000_000;
    const [, mac] = createAccessSession(orderId, now, 1000).split(".");
    expect(verifyAccessSession(orderId, `${now + 999_999}.${mac}`, now)).toBe(false);
  });

  it("can't replay a value from one purpose as another", () => {
    const link = orderLinkToken(orderId).split(".")[1];
    expect(verifyAccessSession(orderId, `${Date.now() + 1000}.${link}`)).toBe(false);
    expect(hashAccessCode(orderId, "123456")).not.toBe(hashAccessCode("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0", "123456"));
    expect(accessCookieName(orderId)).not.toContain("-");
  });
});

describe("typed ticket IDs", () => {
  it("normalises what people actually type", () => {
    expect(normalizeTypedTicketCode("gg-7k4m-x92q-tr8d")).toBe("GG-7K4M-X92Q-TR8D");
    expect(normalizeTypedTicketCode(" 7K4M X92Q TR8D ")).toBe("GG-7K4M-X92Q-TR8D");
    expect(normalizeTypedTicketCode("GG-OK4M-X92Q-TR8L")).toBe("GG-0K4M-X92Q-TR81");
  });

  it("refuses anything that can't be a ticket ID", () => {
    for (const bad of ["", "GG-123", "GG-7K4M-X92Q-TR8D-EXTRA", "'; drop table tickets;--"]) {
      expect(normalizeTypedTicketCode(bad)).toBeNull();
    }
  });
});

describe("Paystack webhook signature", () => {
  const secret = "sk_test_example";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "GGO-1" } });
  const signature = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts Paystack's signature over the exact raw body", () => {
    expect(isValidWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects missing, wrong and body-altered signatures", () => {
    expect(isValidWebhookSignature(body, null, secret)).toBe(false);
    expect(isValidWebhookSignature(body, "abcd", secret)).toBe(false);
    expect(isValidWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(isValidWebhookSignature(body, signature, "sk_test_other")).toBe(false);
    expect(isValidWebhookSignature(body, signature, "")).toBe(false);
  });
});
