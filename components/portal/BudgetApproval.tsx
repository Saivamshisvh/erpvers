import Icon from "@/components/shared/Icon";
import ActionForm from "@/components/portal/ActionForm";
import { clientApproveBudgetsAction, markBudgetAgreedAction, remindBudgetAction } from "@/lib/portal/actions";
import type { Task } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

type Props = {
  clientId: string;
  tasks: Task[];
  /** "client" shows Approve buttons. "admin" shows the reminder email and "client agreed". */
  mode: "client" | "admin";
};

/** Task estimates ERP VERS has sent and that are waiting for the client's approval. */
export default function BudgetApproval({ clientId, tasks, mode }: Props) {
  const items = tasks.filter((t) => t.budget_status === "pending_client");
  if (items.length === 0) return null;
  const total = items.reduce((s, t) => s + t.totalEstimate, 0);
  const isClient = mode === "client";
  const hidden = <input type="hidden" name="clientId" value={clientId} />;

  return (
    <section aria-labelledby="budgets-heading" className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm shadow-amber-950/5">
      <div className="flex flex-col gap-4 border-b border-amber-100 bg-amber-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 id="budgets-heading" className="text-base font-bold tracking-tight text-slate-950">
            {isClient ? "Estimates for your approval" : "Estimates waiting for the client"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {items.length} {items.length === 1 ? "estimate" : "estimates"}, {formatHours(total)} {total === 1 ? "hour" : "hours"}.
            {isClient && " The work starts once you approve."}
          </p>
        </div>
        {isClient ? (
          items.length > 1 && (
            <ActionForm action={clientApproveBudgetsAction} submitLabel={`Approve all (${formatHours(total)} h)`} pendingLabel="Approving…" className="shrink-0">
              {hidden}
            </ActionForm>
          )
        ) : (
          <ActionForm action={remindBudgetAction} submitLabel="Send reminder email" pendingLabel="Sending…" className="shrink-0">
            {hidden}
          </ActionForm>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 whitespace-pre-line text-sm leading-6 text-slate-600">{t.description}</p>}
              {!isClient && (
                <p className="mt-0.5 text-xs text-slate-500">{t.budget_notified_at ? `Emailed ${formatDate(t.budget_notified_at)}` : "Not emailed yet"}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
              <p className="text-sm font-bold tabular-nums text-slate-950">{formatHours(t.totalEstimate)} h</p>
              {isClient ? (
                <ActionForm action={clientApproveBudgetsAction} variant="compact" submitLabel="Approve" pendingLabel="Approving…">
                  {hidden}
                  <input type="hidden" name="taskId" value={t.id} />
                </ActionForm>
              ) : (
                <ActionForm
                  action={markBudgetAgreedAction}
                  variant="subtle"
                  submitLabel="Client agreed"
                  pendingLabel="Saving…"
                  confirmMessage={`Record that the client agreed to ${formatHours(t.totalEstimate)} hours for "${t.title}" (for example, on a call)?`}
                >
                  {hidden}
                  <input type="hidden" name="taskId" value={t.id} />
                </ActionForm>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isClient && (
        <div className="flex gap-3 border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600 sm:px-7">
          <Icon name="chat" className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p>
            Not sure about an estimate? Please don&apos;t approve it. Email{" "}
            <a className="font-semibold text-blue-600" href="mailto:support@erpvers.com">support@erpvers.com</a> or{" "}
            <a className="font-semibold text-blue-600" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>{" "}
            and we&apos;ll talk it through.
          </p>
        </div>
      )}
    </section>
  );
}
