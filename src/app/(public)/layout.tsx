import { PublicShell } from "./_components/PublicShell";

// The footer reads venue_settings through a "use cache" function (no
// cookies), so this layout stays static and doesn't force leaf pages like
// privacy/terms dynamic. See docs/PHASE_6_STATUS.md.
export const instant = false;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
