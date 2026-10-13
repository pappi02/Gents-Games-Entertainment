import Link from "next/link";

export function NotFoundContent() {
  return (
    <main className="theme-light">
      <div className="container status-page">
        <p className="code">Error 404</p>
        <h1 className="display display-xl">
          Off <span className="accent-serif">the</span> table
        </h1>
        <p className="lede">
          We couldn&apos;t find that page. It may have moved, or the game or event may no longer be listed.
        </p>
        <div className="btn-row btn-row-stack">
          <Link href="/games" className="btn btn-primary">
            Explore games
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
