import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only, never
 * import from a Client Component or anything bundled to the browser.
 *
 * Used only for operations that genuinely require bypassing RLS, such as
 * creating a new Supabase Auth user via the Admin API (docs/SECURITY.md
 * §1–§2). Every call site using this client must apply its own authorization
 * check first (e.g. "is the caller already a super_admin?") since RLS is not
 * doing that job here.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createSupabaseClient(
    process.env.NEXT_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
