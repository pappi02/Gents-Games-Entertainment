"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { NAV_ITEMS, isActive } from "./nav";

/**
 * Primary navigation: inline links on desktop, a disclosure menu below 1024px.
 * Menu closes on Escape (returning focus to the toggle), on outside click,
 * and on navigation. Rendered inside <Suspense> by SiteHeader because
 * usePathname suspends during prerender on dynamic-param routes.
 */
export function MainNav() {
  return <NavInner pathname={usePathname()} />;
}

/** Same markup without reading the URL — the Suspense fallback. */
export function StaticNav() {
  return <NavInner pathname={null} />;
}

function NavInner({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when the route changes (adjusting state during render, not in an effect).
  if (open && pathname !== openedAt) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <nav className="nav-desktop" aria-label="Primary">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link href="/games" className="btn btn-primary btn-sm header-cta">
        Explore games
      </Link>

      <button
        ref={buttonRef}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((v) => !v);
        }}
      >
        <Icon name={open ? "close" : "menu"} />
        <span>{open ? "Close" : "Menu"}</span>
      </button>

      <div ref={menuRef} id="mobile-menu" className="mobile-menu theme-dark" hidden={!open}>
        <nav className="container" aria-label="Primary">
          <ul>
            {NAV_ITEMS.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                  <Icon name="chevronRight" className="status-icon" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/games" className="btn btn-primary" onClick={() => setOpen(false)}>
            Explore games
          </Link>
        </nav>
      </div>
    </>
  );
}
