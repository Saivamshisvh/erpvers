import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Landing point for the sign-in link in the email. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/portal";
  // Only ever send people somewhere inside the portal.
  const next = nextParam.startsWith("/portal") && !nextParam.startsWith("//") ? nextParam : "/portal";

  const failed = NextResponse.redirect(new URL("/portal/login?error=link", origin));
  if (!isPortalConfigured()) return failed;

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    // Works even if the link is opened in a different browser from the one that requested it.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    // Fallback for Supabase's default email template (same browser only).
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  return ok ? NextResponse.redirect(new URL(next, origin)) : failed;
}
