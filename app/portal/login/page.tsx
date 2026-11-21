import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/portal/AuthCard";
import AuthForm from "@/components/portal/AuthForm";
import { Field } from "@/components/portal/fields";
import { signIn } from "@/lib/portal/actions";
import { getCurrentUser } from "@/lib/portal/data";

export const metadata: Metadata = { title: "Sign in" };

const notices: Record<string, string> = {
  link: "That link has expired or was already used. Sign in below, or request a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/portal");
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Sign in to see your hours"
      description="Your prepaid balance, monthly usage, and work log, any time you need them."
      footer={
        <>
          New to the portal?{" "}
          <Link href="/portal/register" className="font-semibold text-blue-600 hover:text-blue-800">
            Create an account
          </Link>
        </>
      }
    >
      {error && notices[error] && (
        <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notices[error]}
        </p>
      )}
      <AuthForm action={signIn} submitLabel="Sign in" pendingLabel="Signing in…">
        <Field label="Work email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        <div className="grid gap-1.5">
          <Field label="Password" name="password" type="password" required autoComplete="current-password" />
          <Link href="/portal/forgot-password" className="justify-self-end text-sm font-semibold text-blue-600 hover:text-blue-800">
            Forgot password?
          </Link>
        </div>
      </AuthForm>
    </AuthCard>
  );
}
