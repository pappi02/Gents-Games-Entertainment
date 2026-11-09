/**
 * Transactional email through Resend's HTTP API. A failure is returned, never
 * thrown, so a provider outage can't lose a paid order: the tickets already
 * exist, the failure is shown to staff, and they can resend.
 *
 * Ticket emails carry a private link, deliberately not the QR code, so fewer
 * copies of a working ticket exist.
 */

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function send(to: string, subject: string, html: string, text: string): Promise<string | null> {
  const key = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!key || !from) return "Email isn't configured yet.";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok ? null : `Email provider returned HTTP ${response.status}.`;
  } catch {
    return "Couldn't reach the email provider.";
  }
}

function layout(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:520px;margin:0 auto;padding:24px">
<p style="font-weight:700;letter-spacing:.04em;margin:0 0 20px">THE GENTS GAMES &amp; ENTERTAINMENT</p>
${body}
</div>`;
}

export function sendTicketEmail(input: {
  to: string;
  name: string;
  eventTitle: string;
  eventWhen: string;
  quantity: number;
  link: string;
}) {
  const noun = input.quantity === 1 ? "ticket" : "tickets";
  const html = layout(`
<h1 style="font-size:22px;margin:0 0 12px">Your ${noun} for ${escapeHtml(input.eventTitle)}</h1>
<p>Hi ${escapeHtml(input.name)}, your payment is confirmed. You have ${input.quantity} ${noun}.</p>
<p><strong>${escapeHtml(input.eventWhen)}</strong> (Nairobi time)</p>
<p style="margin:24px 0"><a href="${escapeHtml(input.link)}" style="background:#b8202e;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:700">View and download ${noun}</a></p>
<p><strong>Keep your QR code private and treat it like cash.</strong> Each ticket admits one person and only the first scan gets in, so anyone holding a copy could use it before you.</p>
<p style="color:#57524a;font-size:13px">If you open this link on a new device, we'll email you a one-time code first.</p>`);
  const text = `Your ${noun} for ${input.eventTitle}\n\nHi ${input.name}, your payment is confirmed. You have ${input.quantity} ${noun}.\n${input.eventWhen} (Nairobi time)\n\nView and download: ${input.link}\n\nKeep your QR code private and treat it like cash. Each ticket admits one person and only the first scan gets in.`;
  return send(input.to, `Your ${noun}: ${input.eventTitle}`, html, text);
}

export function sendAccessCodeEmail(input: { to: string; code: string; eventTitle: string }) {
  const html = layout(`
<p>Your one-time code to open your tickets for ${escapeHtml(input.eventTitle)}:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:.2em;margin:16px 0">${escapeHtml(input.code)}</p>
<p>It expires in 10 minutes. If you didn't ask for this, someone may have your ticket link. Don't share the code.</p>`);
  const text = `Your one-time code to open your tickets for ${input.eventTitle}: ${input.code}\n\nIt expires in 10 minutes. If you didn't ask for this, don't share the code.`;
  return send(input.to, `${input.code} is your ticket access code`, html, text);
}
