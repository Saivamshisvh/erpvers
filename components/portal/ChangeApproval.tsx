import Icon from "@/components/shared/Icon";
import ActionForm from "@/components/portal/ActionForm";
import { clientApproveChangesAction, emailClientChangesAction, markChangeApprovedAction } from "@/lib/portal/actions";
import type { ChangeRequest, Task } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

type Props = {
  clientId: string;
  tasks: Task[];
  /** "client" shows Approve buttons. "admin" shows the email button and mark-approved. */
  mode: "client" | "admin";
};

/** Change requests ERP VERS has sent to the client and that are waiting for their approval. */
export default function ChangeApproval({ clientId, tasks, mode }: Props) {
  const items: (ChangeRequest & { task_title: string })[] = tasks.flatMap((t) =>
    t.changeRequests.filter((c) => c.status === "pending_client").map((c) => ({ ...c, task_title: t.title })),
  );
  if (items.length === 0) return null;
  const total = items.reduce((s, c) => s + c.hours, 0);
  const isClient = mode === "client";
  const hidden = <input type="hidden" name="clientId" value={clientId} />;

  return (
    <section aria-labelledby="changes-heading" className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm shadow-violet-950/5">
      <div className="flex flex-col gap-4 border-b border-violet-100 bg-violet-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 id="changes-heading" className="text-base font-bold tracking-tight text-slate-950">
            {isClient ? "Change requests for your approval" : "Change requests waiting for the client"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {items.length} {items.length === 1 ? "request" : "requests"}, +{formatHours(total)} {total === 1 ? "hour" : "hours"}.
            {isClient && " The extra work starts once you approve."}
          </p>
        </div>
        {isClient ? (
          items.length > 1 && (
            <ActionForm action={clientApproveChangesAction} submitLabel={`Approve all (+${formatHours(total)} h)`} pendingLabel="Approving…" className="shrink-0">
              {hidden}
            </ActionForm>
          )
        ) : (
          <ActionForm action={emailClientChangesAction} submitLabel={items.some((c) => !c.client_notified_at) ? "Email client" : "Send reminder email"} pendingLabel="Sending…" className="shrink-0">
            {hidden}
          </ActionForm>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{c.title}</p>
              {c.description && <p className="mt-0.5 whitespace-pre-line text-sm leading-6 text-slate-600">{c.description}</p>}
              <p className="mt-0.5 text-xs text-slate-500">
                Task: {c.task_title} · {formatDate(c.requested_on)}
                {!isClient && (c.client_notified_at ? ` · emailed ${formatDate(c.client_notified_at)}` : " · not emailed yet")}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
              <p className="text-sm font-bold tabular-nums text-slate-950">+{formatHours(c.hours)} h</p>
              {isClient ? (
                <ActionForm action={clientApproveChangesAction} variant="compact" submitLabel="Approve" pendingLabel="Approving…">
                  {hidden}
                  <input type="hidden" name="changeId" value={c.id} />
                </ActionForm>
              ) : (
                <ActionForm
                  action={markChangeApprovedAction}
                  variant="subtle"
                  submitLabel="Mark approved"
                  pendingLabel="Saving…"
                  confirmMessage="Mark this change request as approved by the client (for example, they agreed by email)?"
                >
                  {hidden}
                  <input type="hidden" name="id" value={c.id} />
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
            Not sure about a change? Please don&apos;t approve it. Email{" "}
            <a className="font-semibold text-blue-600" href="mailto:support@erpvers.com">support@erpvers.com</a> or{" "}
            <a className="font-semibold text-blue-600" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>{" "}
            and we&apos;ll talk it through.
          </p>
        </div>
      )}
    </section>
  );
}
