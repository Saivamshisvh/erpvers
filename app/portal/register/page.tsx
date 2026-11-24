import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/shared/Icon";
import AuthCard from "@/components/portal/AuthCard";
import AuthForm from "@/components/portal/AuthForm";
import { Field } from "@/components/portal/fields";
import { register } from "@/lib/portal/actions";
import { getCurrentUser, LOGIN_PATHS } from "@/lib/portal/data";

export const metadata: Metadata = { title: "Create an account" };

const steps = ["Create your account", "Confirm your email", "See your dashboard: straight away if your company or ERP VERS has given your email access, otherwise once we link you"];
const employeeSteps = ["Create your account with the email ERP VERS invited", "Confirm your email", "Sign in on the Employee login page to see your tasks"];

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string; as?: string }> }) {
  if (await getCurrentUser()) redirect("/portal");
  const { email: invited, as } = await searchParams;
  const employee = as === "employee";
  const prefill = typeof invited === "string" && invited.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invited) ? invited : undefined;

  return (
    <AuthCard
      eyebrow={employee ? "Employee portal" : "Client portal"}
      title={employee ? "Create your employee account" : "Create your client account"}
      description={
        <ol className="mt-3 grid gap-2">
          {(employee ? employeeSteps : steps).map((step, i) => (
            <li key={step} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      }
      footer={
        <>
          Already registered?{" "}
          <Link href={employee ? LOGIN_PATHS.employee : LOGIN_PATHS.client} className="font-semibold text-blue-600 hover:text-blue-800">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm action={register} submitLabel="Create account" pendingLabel="Creating account…" successTitle="Almost there">
        <Field label="Full name" name="fullName" required maxLength={120} autoComplete="name" />
        {!employee && <Field label="Company (optional)" name="company" maxLength={120} autoComplete="organization" />}
        <Field
          label={employee ? "Email" : "Work email"}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={employee ? "The email ERP VERS invited" : "you@company.com"}
          defaultValue={prefill}
        />
        <Field label="Password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" hint="At least 8 characters." />
        <Field label="Confirm password" name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </AuthForm>
      <p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500">
        <Icon name="lock" className="mt-0.5 size-3.5 shrink-0" />
        Registering on its own shows you no data. You only see a company&apos;s dashboard if your confirmed email belongs to it.
      </p>
    </AuthCard>
  );
}
