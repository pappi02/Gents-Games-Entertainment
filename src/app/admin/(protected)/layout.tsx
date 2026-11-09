import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/BrandMark";
import { getAdminProfile } from "@/lib/admin/session";
import { signOut } from "../actions";
import "../admin.css";

// The entire admin area is per-user and cookie-authenticated — never static.
// See docs/ARCHITECTURE_AND_DATA.md §4 (admin routes must never be cached
// publicly). `instant = false` is the Cache-Components-compatible escape
// hatch for a fully blocking (never prerendered) route; cascades to every
// page under this route group.
export const instant = false;

/**
 * Server-side route guard for everything under /admin except /admin/login.
 * This is a UX convenience (avoids flashing admin UI then redirecting) —
 * the real authorization boundary is Postgres RLS on every table, per
 * docs/SECURITY.md §2. A bug in this layout can at most show the wrong nav
 * item, never grant data access that RLS wouldn't already allow.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/admin/login");
  }

  const profile = await getAdminProfile();
  if (!profile) {
    // Signed in but no active admin_profiles row — not an admin.
    redirect("/admin/login?error=invalid");
  }

  const navItems: { href: string; label: string; roles: string[] }[] = [
    { href: "/admin", label: "Dashboard", roles: ["super_admin", "content_editor", "enquiry_staff"] },
    { href: "/admin/categories", label: "Categories", roles: ["super_admin", "content_editor"] },
    { href: "/admin/games", label: "Games", roles: ["super_admin", "content_editor"] },
    { href: "/admin/events", label: "Events & Tickets", roles: ["super_admin", "content_editor"] },
    // Discounts directly affect revenue, so they are super_admin-only (RLS).
    { href: "/admin/discount-codes", label: "Discount Codes", roles: ["super_admin"] },
    { href: "/admin/check-in", label: "Door Check-in", roles: ["super_admin", "content_editor", "enquiry_staff"] },
    // Fees are pricing, so membership writes are super_admin-only (RLS).
    { href: "/admin/membership", label: "Membership", roles: ["super_admin"] },
    { href: "/admin/enquiries", label: "Enquiries", roles: ["super_admin", "content_editor", "enquiry_staff"] },
    { href: "/admin/venue-settings", label: "Venue Settings", roles: ["super_admin"] },
    { href: "/admin/users", label: "Admin Users", roles: ["super_admin"] },
    { href: "/admin/audit-log", label: "Audit Log", roles: ["super_admin"] },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <BrandMark className="admin-brand-mark" />
          <span>Gents Games &amp; Entertainment</span>
        </div>
        <nav>
          {navItems
            .filter((item) => item.roles.includes(profile.role))
            .map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
        </nav>
        <div className="admin-user">
          <div>{profile.display_name}</div>
          <div className="admin-role">{profile.role.replace("_", " ")}</div>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
