import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses only the public anon key — safe to
 * bundle client-side. Never import the service-role key here.
 *
 * See docs/SECURITY.md §2 and §5: authorization is enforced server-side
 * (RLS policies + server checks), never by what the client can or can't see.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
