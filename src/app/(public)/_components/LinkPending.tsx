"use client";

import { useLinkStatus } from "next/link";

/** Inline spinner shown inside a <Link> while its navigation is pending. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="spinner" aria-hidden="true" /> : null;
}
