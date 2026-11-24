import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/portal/AuthCard";
import AuthForm from "@/components/portal/AuthForm";
import { Field } from "@/components/portal/fields";
import { signIn } from "@/lib/portal/actions";
import { getCurrentUser, LOGIN_PATHS, type LoginAudience } from "@/lib/portal/data";

const notices: Record<string, string> = {
  link: "That link has expired or was already used. Sign in below, or request a new one.",
};

const copy: Record<LoginAudience, { eyebrow: string; title: string; description: string; emailLabel: string; placeholder: string }> = {
  client: {
    eyebrow: "Client login",
    title: "Sign in to see your hours",
    description: "Your prepaid balance, monthly usage, and work log, any time you need them.",
    emailLabel: "Work email",
    placeholder: "you@company.com",
  },
  employee: {
    eyebrow: "Employee login",
    title: "Sign in to your tasks",
    description: "For ERP VERS freelancers and employees: see the tasks assigned to you and log your hours.",
    emailLabel: "Email",
    placeholder: "The email ERP VERS invited",
  },
  admin: {
    eyebrow: "Admin login",
    title: "ERP VERS admin",
    description: "Clients, tasks, hours to review and prepaid purchases.",
    emailLabel: "Email",
    placeholder: "you@erpvers.com",
  },
};

/** The sign-in page for one kind of account. Each kind has its own page and is sent to the right one. */
export default async function LoginPanel({ audience, error }: { audience: LoginAudience; error?: string }) {
  if (await getCurrentUser()) redirect("/portal");
  const c = copy[audience];

  return (
    <AuthCard
      eyebrow={c.eyebrow}
      title={c.title}
      description={c.description}
      footer={
        audience === "admin" ? null : (
          <div className="grid gap-2">
            <p>
              {audience === "client" ? "New to the portal?" : "First time here?"}{" "}
              <Link
                href={audience === "client" ? "/portal/register" : "/portal/register?as=employee"}
                className="font-semibold text-blue-600 hover:text-blue-800"
              >
                Create an account
              </Link>
            </p>
            <p>
              {audience === "client" ? "Work for ERP VERS? " : "A client? "}
              <Link
                href={audience === "client" ? LOGIN_PATHS.employee : LOGIN_PATHS.client}
                className="font-semibold text-blue-600 hover:text-blue-800"
              >
                {audience === "client" ? "Employee login" : "Client login"}
              </Link>
            </p>
          </div>
        )
      }
    >
      {error && notices[error] && (
        <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notices[error]}
        </p>
      )}
      <AuthForm action={signIn} submitLabel="Sign in" pendingLabel="Signing in…">
        <input type="hidden" name="audience" value={audience} />
        <Field label={c.emailLabel} name="email" type="email" required autoComplete="email" placeholder={c.placeholder} />
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
