import { facilityStatus } from "@/lib/public/status";

/**
 * Facility status — always a text label plus a distinct glyph per state,
 * so it never relies on colour alone (docs/DESIGN_SYSTEM.md §9).
 */
export function StatusBadge({ status, pill = false }: { status: string | null | undefined; pill?: boolean }) {
  const s = facilityStatus(status);
  return (
    <span className={`status status--${s.key}${pill ? " status-pill" : ""}`}>
      <StatusGlyph status={s.key} />
      <span>
        <span className="visually-hidden">Status: </span>
        {s.label}
      </span>
    </span>
  );
}

function StatusGlyph({ status }: { status: string }) {
  const common = {
    viewBox: "0 0 16 16",
    className: "status-icon",
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
  switch (status) {
    case "available":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="m4.8 8.2 2.1 2.1 4.3-4.4" fill="none" stroke="var(--surface-raised, #fff)" strokeWidth="1.8" />
        </svg>
      );
    case "coming_soon":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 4.6V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "unavailable":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.8 12.2 12.2 3.8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2" />
        </svg>
      );
  }
}
