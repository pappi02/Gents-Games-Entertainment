/** Pure helpers shared by admin forms, exports and tests. No secrets, no floats. */

const NAIROBI_OFFSET = "+03:00"; // Kenya has no daylight saving.

/** "2026-12-24T19:00" typed by staff means Nairobi time, wherever the server runs. */
export function nairobiInputToUtc(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${NAIROBI_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function utcToNairobiInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** "1,500" or "1500.50" to minor units, using string parts only. Null if it isn't a money amount. */
export function kesToMinorUnits(input: string): number | null {
  const cleaned = input.replaceAll(",", "").trim();
  const match = cleaned.match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function minorUnitsToKesInput(minor: number | null | undefined): string {
  if (minor == null) return "";
  const cents = minor % 100;
  return cents ? `${Math.trunc(minor / 100)}.${String(cents).padStart(2, "0")}` : String(minor / 100);
}

/**
 * Names are whatever a buyer typed, and spreadsheets execute cells starting with
 * = + - @, so those get a leading apostrophe to stay plain text.
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
