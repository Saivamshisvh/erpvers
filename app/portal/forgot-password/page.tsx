import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/portal/AuthCard";
import AuthForm from "@/components/portal/AuthForm";
import { Field } from "@/components/portal/fields";
import { requestPasswordReset } from "@/lib/portal/actions";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a link to set a new password."
      footer={
        <Link href="/portal/login" className="font-semibold text-blue-600 hover:text-blue-800">
          Back to sign in
        </Link>
      }
    >
      <AuthForm action={requestPasswordReset} submitLabel="Send reset link" pendingLabel="Sending…">
        <Field label="Work email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </AuthForm>
    </AuthCard>
  );
}
