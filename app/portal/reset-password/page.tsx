import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/portal/AuthCard";
import AuthForm from "@/components/portal/AuthForm";
import { Field } from "@/components/portal/fields";
import { updatePassword } from "@/lib/portal/actions";
import { getCurrentUser } from "@/lib/portal/data";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // Reached from the reset email link, which signs the person in first.
  if (!(await getCurrentUser())) redirect("/portal/login?error=link");

  return (
    <AuthCard title="Set a new password">
      <AuthForm action={updatePassword} submitLabel="Save new password" pendingLabel="Saving…">
        <Field label="New password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" hint="At least 8 characters." />
        <Field label="Confirm new password" name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </AuthForm>
    </AuthCard>
  );
}
