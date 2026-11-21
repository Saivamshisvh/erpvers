import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Shown under the card, e.g. "Don't have an account? Register". */
  footer?: ReactNode;
};

export default function AuthCard({ eyebrow = "Client portal", title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto grid max-w-md gap-6 px-5 py-14 sm:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description && <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="px-1 text-center text-sm text-slate-600">{footer}</div>}
    </div>
  );
}
