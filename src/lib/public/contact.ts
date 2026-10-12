/** Builds tel:/wa.me links from a phone number + its supported channels. */
export function contactLinks(phone: string | null, channels: string[] | null) {
  if (!phone) return { call: null, whatsapp: null };
  const digits = phone.replace(/[^\d+]/g, "");
  const waDigits = digits.replace(/^\+/, "");
  return {
    call: channels?.includes("call") ? `tel:${digits}` : null,
    whatsapp: channels?.includes("whatsapp") ? `https://wa.me/${waDigits}` : null,
  };
}
