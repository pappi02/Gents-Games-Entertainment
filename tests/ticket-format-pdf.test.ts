import { generateKeyPairSync } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { signTicket } from "@/lib/tickets/crypto";
import { escapeHtml } from "@/lib/tickets/email";
import { csvCell, kesToMinorUnits, minorUnitsToKesInput, nairobiInputToUtc, utcToNairobiInput } from "@/lib/tickets/format";
import { buildTicketPdf, pdfSafeText } from "@/lib/tickets/pdf";

describe("event times", () => {
  it("reads a typed time as Nairobi time, whatever the server timezone", () => {
    expect(nairobiInputToUtc("2026-12-24T19:00")).toBe("2026-12-24T16:00:00.000Z");
    expect(utcToNairobiInput("2026-12-24T16:00:00.000Z")).toBe("2026-12-24T19:00");
  });

  it("rejects malformed times", () => {
    expect(nairobiInputToUtc("tomorrow")).toBeNull();
    expect(nairobiInputToUtc("2026-13-45T99:00")).toBeNull();
  });
});

describe("money", () => {
  it("converts KES to minor units without floats", () => {
    expect(kesToMinorUnits("1,500")).toBe(150000);
    expect(kesToMinorUnits("19.99")).toBe(1999);
    expect(kesToMinorUnits("0.07")).toBe(7);
    expect(kesToMinorUnits("1.1")).toBe(110);
    expect(minorUnitsToKesInput(150050)).toBe("1500.50");
    expect(minorUnitsToKesInput(150000)).toBe("1500");
  });

  it("rejects anything that isn't a plain amount", () => {
    for (const bad of ["", "-5", "1e5", "12.345", "abc", "1.2.3"]) expect(kesToMinorUnits(bad)).toBeNull();
  });
});

describe("untrusted buyer names", () => {
  it("stops spreadsheet formulas in CSV exports", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+254700")).toBe('"\'+254700"');
    expect(csvCell("@cmd")).toBe('"\'@cmd"');
    expect(csvCell("Plain Name")).toBe('"Plain Name"');
    expect(csvCell(null)).toBe('""');
  });

  it("escapes HTML in emails", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe("&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  });

  it("makes any name printable in a PDF", () => {
    expect(pdfSafeText("José")).toBe("José");
    expect(pdfSafeText("名前 🎉")).toBe("?? ?");
  });
});

describe("PDF ticket", () => {
  beforeAll(() => {
    process.env.TICKET_SIGNING_PRIVATE_KEY = generateKeyPairSync("ed25519")
      .privateKey.export({ format: "der", type: "pkcs8" })
      .toString("base64");
    process.env.TICKET_SIGNING_KEY_ID = "k1";
  });

  const pdfTicket = (holderName: string, eventTitle = "Masquerade Night") => {
    const token = signTicket({
      id: "7b0f7f0e-7f2a-4c11-9d4e-0d3c8f0a1b2c",
      ticket_code: "GG-7K4M-X92Q-TR8D",
      event_id: "1c9e6f40-1111-4222-8333-444455556666",
      ticket_type_id: "2d8f7a51-2222-4333-8444-555566667777",
      holder_name: holderName,
      issued_at: "2026-11-09T10:00:00.000Z",
    });
    return {
      ticketCode: "GG-7K4M-X92Q-TR8D",
      holderName,
      ticketTypeName: "Gentleman Experience",
      eventTitle,
      eventDate: "Thursday, 24 December 2026",
      eventTime: "7:00 pm",
      location: null,
      verifyUrl: `https://example.com/verify/${token}`,
      token,
    };
  };

  it("creates one page per ticket", async () => {
    const bytes = await buildTicketPdf([pdfTicket("Night Owl"), pdfTicket("Night Owl")]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Event tickets");
  });

  it("doesn't crash on emoji names or very long titles", async () => {
    const bytes = await buildTicketPdf([pdfTicket("名前 🎉", "A ".repeat(200) + "Supercalifragilistic".repeat(10))]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
