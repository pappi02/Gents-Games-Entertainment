import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client with no cookie/session binding — safe to call from
 * inside a "use cache" scope, which forbids reading cookies/headers
 * (Next.js requires reading those outside cached scopes and passing values
 * in as arguments instead).
 *
 * This always sees exactly what a signed-out visitor sees — published/
 * active rows only, enforced by RLS regardless of this client having no
 * session. That intentionally drops the previous incidental behavior where
 * a signed-in admin browsing the public site could preview drafts (noted
 * in docs/PHASE_4_STATUS.md) in exchange for real server-side caching with
 * tag-based invalidation on publish — docs/ARCHITECTURE_AND_DATA.md §4.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
