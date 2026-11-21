"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { resendConfirmation, type ActionState } from "@/lib/portal/actions";

type AuthFormProps = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
  /** Title of the panel that replaces the form after a successful submit. */
  successTitle?: string;
};

export default function AuthForm({ action, submitLabel, pendingLabel, children, successTitle = "Check your inbox" }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  // Submit through a transition instead of letting React reset the form, so a
  // typo in one field doesn't wipe everything the person typed.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  if (state?.ok) return <SuccessPanel title={successTitle} message={state.message} />;

  return (
    <div className="grid gap-4">
      <form action={formAction} onSubmit={handleSubmit} className="grid gap-4">
        {children}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {state && !state.ok && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {state.message}
          </p>
        )}
      </form>
      {state?.email && <ResendConfirmation email={state.email} />}
    </div>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resendConfirmation, null);
  if (state?.ok) return <p role="status" className="text-sm text-emerald-700">{state.message}</p>;
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <input type="hidden" name="email" value={email} />
      Didn&apos;t get it?
      <button type="submit" disabled={pending} className="cursor-pointer font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60">
        {pending ? "Sending…" : "Send the confirmation email again"}
      </button>
      {state && !state.ok && <span className="w-full text-red-600">{state.message}</span>}
    </form>
  );
}

function SuccessPanel({ title, message }: { title: string; message: string }) {
  return (
    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
