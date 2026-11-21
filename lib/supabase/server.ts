import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Supabase client that acts as the signed-in user. Every query it makes is
 * checked by the database's row level security, so it can only ever see the
 * rows that user is allowed to see.
 */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Client portal is not configured: SUPABASE_URL and SUPABASE_ANON_KEY are missing.");

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session cookies on every portal request.
        }
      },
    },
  });
}
