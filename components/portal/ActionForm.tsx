"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/portal/actions";

type ActionFormProps = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  /** "primary" is a full button; "subtle" is a small text button for row actions like Delete. */
  variant?: "primary" | "subtle";
  /** Asks the person to confirm before submitting (used for deletes). */
  confirmMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
};

export default function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  variant = "primary",
  confirmMessage,
  resetOnSuccess = true,
  className = "",
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  // Submit through a transition so a failed save keeps what was typed;
  // the form is cleared only after a successful save (see effect above).
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  if (variant === "subtle") {
    return (
      <form ref={formRef} action={formAction} onSubmit={handleSubmit} className={className}>
        {children}
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {state && !state.ok && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {state.message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className={`grid gap-4 ${className}`}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
