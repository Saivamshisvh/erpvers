import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Called once a day by .github/workflows/keepalive.yml. Supabase pauses free
 * projects after a week without activity; this tiny query counts as activity.
 * It reads nothing private.
 */
export async function GET() {
  await connection();
  const config = getSupabaseConfig();
  if (!config) return Response.json({ ok: false, reason: "not configured" }, { status: 503 });

  const supabase = createClient(config.url, config.anonKey, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("ping");
  return Response.json({ ok: !error }, { status: error ? 502 : 200, headers: { "Cache-Control": "no-store" } });
}
