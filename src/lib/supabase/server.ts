import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions). Uses the anon key + the request's auth cookies, so RLS policies
 * apply based on the signed-in user — this is the primary authorization
 * enforcement point described in docs/SECURITY.md §2.
 *
 * Never import this from a Client Component.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies can't be set;
            // safe to ignore if middleware is refreshing the session.
          }
        },
      },
    },
  );
}
