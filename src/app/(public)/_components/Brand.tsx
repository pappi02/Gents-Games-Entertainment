import Link from "next/link";

/** Monogram: a "G" cut from a square with a single red rule — distinct from the sister brand. */
export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="34.5" height="34.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M25 12.2A8 8 0 1 0 26 20h-7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
      <rect x="18.5" y="28.5" width="11" height="2.5" fill="#b8202e" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="The Gents Games & Entertainment — home">
      <BrandMark />
      <span className="brand-text" aria-hidden="true">
        <span className="brand-name">The Gents</span>
        <span className="brand-sub">Games &amp; Entertainment</span>
      </span>
    </Link>
  );
}
