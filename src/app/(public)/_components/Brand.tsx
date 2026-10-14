import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

/** Horizontal lockup (mark + wordmark) — mirrors public/brand/gents-logo-reverse.svg. */
export function Brand({ className = "brand" }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="The Gents Games & Entertainment — home">
      <BrandMark />
      <span className="brand-text" aria-hidden="true">
        <span className="brand-name">The Gents</span>
        <span className="brand-sub">Games &amp; Entertainment</span>
      </span>
    </Link>
  );
}
