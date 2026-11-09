import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { signatureFingerprint } from "./crypto";

export type PdfTicket = {
  ticketCode: string;
  holderName: string;
  ticketTypeName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string | null;
  verifyUrl: string;
  /** The signed token inside verifyUrl, used for the printed fingerprint. */
  token: string;
  /** Sample tickets are visibly marked as not valid for entry. */
  sample?: boolean;
};

const INK = rgb(0.078, 0.078, 0.078);
const PAPER = rgb(0.957, 0.945, 0.918);
const RED = rgb(0.722, 0.125, 0.18);
const MUTED = rgb(0.34, 0.32, 0.29);

/**
 * The standard PDF fonts only cover WinAnsi. Buyers can type any name, so
 * anything outside that range prints as "?" rather than crashing the download.
 * Display only: the signature always covers the name as stored.
 */
export function pdfSafeText(value: string) {
  return value.normalize("NFC").replace(/[^\x20-\x7E -ÿ]/gu, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function brandMark(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "brand", "gents-mark.png"));
    return await pdf.embedPng(bytes);
  } catch {
    return null; // A missing logo must never block a ticket download.
  }
}

function drawLabelled(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  maxWidth: number,
) {
  page.drawText(label.toUpperCase(), { x, y, size: 7.5, font: fonts.bold, color: MUTED });
  wrap(pdfSafeText(value), fonts.bold, 11, maxWidth)
    .slice(0, 2)
    .forEach((line, index) => {
      page.drawText(line, { x, y: y - 14 - index * 13, size: 11, font: fonts.bold, color: INK });
    });
}

export async function buildTicketPdf(tickets: PdfTicket[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(tickets.length === 1 ? `Ticket ${tickets[0].ticketCode}` : "Event tickets");
  pdf.setAuthor("The Gents Games & Entertainment");
  pdf.setProducer("The Gents Games & Entertainment");
  pdf.setCreator("The Gents Games & Entertainment");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.CourierBold);
  const mark = await brandMark(pdf);
  const fonts = { regular, bold };

  const WIDTH = 420;
  const HEIGHT = 680;
  const MARGIN = 28;
  const CONTENT = WIDTH - MARGIN * 2;

  for (const ticket of tickets) {
    const page = pdf.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: PAPER });
    // Drawn first, so the QR code sits on top of it and still scans cleanly.
    if (ticket.sample) {
      page.drawText("SAMPLE", { x: 62, y: 170, size: 96, font: bold, color: RED, opacity: 0.14, rotate: degrees(45) });
    }

    page.drawRectangle({ x: 0, y: HEIGHT - 68, width: WIDTH, height: 68, color: INK });
    page.drawRectangle({ x: 0, y: HEIGHT - 72, width: WIDTH, height: 4, color: RED });
    const textX = mark ? MARGIN + 46 : MARGIN;
    if (mark) page.drawImage(mark, { x: MARGIN, y: HEIGHT - 57, width: 36, height: 36 });
    page.drawText("THE GENTS", { x: textX, y: HEIGHT - 36, size: 15, font: bold, color: PAPER });
    page.drawText("GAMES & ENTERTAINMENT", { x: textX, y: HEIGHT - 50, size: 8, font: regular, color: PAPER });

    let y = HEIGHT - 104;
    for (const line of wrap(pdfSafeText(ticket.eventTitle), bold, 20, CONTENT).slice(0, 3)) {
      page.drawText(line, { x: MARGIN, y, size: 20, font: bold, color: INK });
      y -= 24;
    }

    y -= 8;
    drawLabelled(page, "Date", ticket.eventDate, MARGIN, y, fonts, CONTENT);
    y -= 34;
    drawLabelled(page, "Time (Nairobi)", ticket.eventTime, MARGIN, y, fonts, CONTENT / 2 - 6);
    drawLabelled(page, "Ticket", ticket.ticketTypeName, MARGIN + CONTENT / 2 + 6, y, fonts, CONTENT / 2 - 6);
    y -= 34;
    drawLabelled(page, "Name", ticket.holderName, MARGIN, y, fonts, CONTENT / 2 - 6);
    drawLabelled(page, "Venue", ticket.location ?? "The Gents Games & Entertainment", MARGIN + CONTENT / 2 + 6, y, fonts, CONTENT / 2 - 6);
    y -= 40;

    const qrSize = 196;
    const qrBytes = await QRCode.toBuffer(ticket.verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 720,
      color: { dark: "#141414", light: "#FFFFFF" },
    });
    const qr = await pdf.embedPng(qrBytes);
    y -= qrSize;
    page.drawImage(qr, { x: (WIDTH - qrSize) / 2, y, width: qrSize, height: qrSize });

    y -= 22;
    const code = ticket.ticketCode;
    page.drawText(code, {
      x: (WIDTH - mono.widthOfTextAtSize(code, 15)) / 2,
      y,
      size: 15,
      font: mono,
      color: INK,
    });

    y -= 22;
    page.drawLine({ start: { x: MARGIN, y: y + 8 }, end: { x: WIDTH - MARGIN, y: y + 8 }, thickness: 0.5, color: MUTED });
    page.drawText("Electronically signed by The Gents Games & Entertainment", { x: MARGIN, y: y - 4, size: 8, font: bold, color: INK });
    page.drawText(`Ed25519 signature fingerprint: ${signatureFingerprint(ticket.token)}`, {
      x: MARGIN,
      y: y - 15,
      size: 7.5,
      font: regular,
      color: MUTED,
    });

    y -= 32;
    const notes = [
      "Admits one person. Only the first scan is accepted, so keep this QR code private and treat it like cash.",
      "Scan the QR code to confirm this ticket is genuine. Valid only for the event shown. 18+ venue.",
    ];
    for (const note of notes) {
      for (const line of wrap(note, regular, 7.5, CONTENT)) {
        page.drawText(line, { x: MARGIN, y, size: 7.5, font: regular, color: MUTED });
        y -= 10;
      }
    }

    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: 6, color: RED });

    if (ticket.sample) {
      const banner = "SAMPLE TICKET - NOT VALID FOR ENTRY";
      page.drawRectangle({ x: 0, y: 6, width: WIDTH, height: 24, color: RED });
      page.drawText(banner, { x: (WIDTH - bold.widthOfTextAtSize(banner, 11)) / 2, y: 14, size: 11, font: bold, color: PAPER });
    }
  }

  return pdf.save();
}
