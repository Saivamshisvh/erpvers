import "server-only";

/**
 * Supabase settings for the client portal. Everything is read on the server;
 * no key is ever sent to the browser. The NEXT_PUBLIC_* names are accepted so
 * the Vercel <-> Supabase integration works without renaming variables.
 */
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isPortalConfigured() {
  return getSupabaseConfig() !== null;
}
