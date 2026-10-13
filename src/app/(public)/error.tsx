"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="theme-light">
      <div className="container status-page">
        <p className="code">Something went wrong</p>
        <h1 className="display display-lg">We couldn&apos;t load this page</h1>
        <p className="lede">
          This is usually temporary. Try again, or contact the venue directly by phone or WhatsApp.
        </p>
        <div className="btn-row btn-row-stack">
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/visit" className="btn btn-secondary">
            Contact details
          </Link>
        </div>
      </div>
    </main>
  );
}
