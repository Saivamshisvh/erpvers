import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import Icon from "@/components/shared/Icon";
import Logo from "@/components/shared/Logo";
import { signOut } from "@/lib/portal/actions";
import { getCurrentUser, getIsAdmin, getPendingRegistrations } from "@/lib/portal/data";
import { isPortalConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s | ERP VERS client portal" },
  description: "Sign in to see your prepaid hours and work log with ERP VERS.",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Private, per-person pages: render on every request, never at build time.
  await connection();
  const configured = isPortalConfigured();
  const user = configured ? await getCurrentUser() : null;
  const isAdmin = user ? await getIsAdmin() : false;
  const pendingCount = isAdmin ? (await getPendingRegistrations()).length : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
            <Link href="/portal" className="hidden text-sm font-semibold text-slate-700 hover:text-blue-600 sm:block">
              Client portal
            </Link>
          </div>
          {user && (
            <div className="flex items-center gap-3 sm:gap-5">
              {isAdmin && (
                <Link href="/portal/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Admin
                  {pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800" aria-label={`${pendingCount} waiting for approval`}>
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href="/portal/reset-password"
                title="Change password"
                className="hidden max-w-[16rem] truncate text-sm text-slate-500 hover:text-slate-800 md:block"
              >
                {user.email}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <Icon name="logout" className="size-4" /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main id="main" className="flex-1">
        {configured ? (
          children
        ) : (
          <div className="mx-auto max-w-lg px-5 py-24 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">The client portal is being set up</h1>
            <p className="mt-3 text-slate-600">
              Please check back soon, or email <a className="font-semibold text-blue-600" href="mailto:support@erpvers.com">support@erpvers.com</a> for your latest hours.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p className="inline-flex items-center gap-1.5">
            <Icon name="lock" className="size-3.5" /> Private to your company and the ERP VERS team.
          </p>
          <Link href="/" className="hover:text-slate-800">
            Back to erpvers.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
