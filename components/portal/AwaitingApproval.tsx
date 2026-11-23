import Icon from "@/components/shared/Icon";
import ActionForm from "@/components/portal/ActionForm";
import { clientApproveAction, emailClientAction, markClientApprovedAction } from "@/lib/portal/actions";
import type { TimeEntry } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

export type EmailState = { awaitingCount: number; unsentCount: number; unsentHours: number; lastSentAt: string | null };

type Props = {
  clientId: string;
  entries: TimeEntry[];
  totalHours: number;
  /** "client" shows Approve buttons. "admin" shows email controls and mark-approved. */
  mode: "client" | "admin";
  emailState?: EmailState;
};

export default function AwaitingApproval({ clientId, entries, totalHours, mode, emailState }: Props) {
  const hidden = <input type="hidden" name="clientId" value={clientId} />;
  const isClient = mode === "client";

  return (
    <section aria-labelledby="awaiting-heading" className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm shadow-blue-950/5">
      <div className="flex flex-col gap-4 border-b border-blue-100 bg-blue-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h2 id="awaiting-heading" className="text-base font-bold tracking-tight text-slate-950">
            {isClient ? "Hours awaiting your approval" : "Awaiting the client's approval"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}, {formatHours(totalHours)}{" "}
            {totalHours === 1 ? "hour" : "hours"}.
            {isClient && " These already count towards your prepaid balance."}
          </p>
        </div>
        {isClient ? (
          <ActionForm action={clientApproveAction} submitLabel={`Approve all (${formatHours(totalHours)} h)`} pendingLabel="Approving…" className="shrink-0">
            {hidden}
          </ActionForm>
        ) : (
          <div className="flex shrink-0 flex-wrap items-start gap-3">
            <ActionForm
              action={emailClientAction}
              submitLabel={emailState && emailState.unsentCount > 0 ? `Email client (${emailState.unsentCount} new)` : "Send reminder email"}
              pendingLabel="Sending…"
            >
              {hidden}
            </ActionForm>
          </div>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-7">
            <p className="shrink-0 text-sm text-slate-500 sm:w-28 sm:pt-0.5">{formatDate(e.work_date)}</p>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-slate-800">{e.description}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {e.consultant}
                {e.task_title && ` · ${e.task_title}`}
                {e.change_request_title && ` · Change: ${e.change_request_title}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
              <p className="text-sm font-bold tabular-nums text-slate-950">{formatHours(e.hours)} h</p>
              {isClient ? (
                <ActionForm action={clientApproveAction} variant="compact" submitLabel="Approve" pendingLabel="Approving…">
                  {hidden}
                  <input type="hidden" name="entryId" value={e.id} />
                </ActionForm>
              ) : (
                <ActionForm
                  action={markClientApprovedAction}
                  variant="subtle"
                  submitLabel="Mark approved"
                  pendingLabel="Saving…"
                  confirmMessage="Mark this entry as approved by the client (for example, they confirmed by email)?"
                >
                  {hidden}
                  <input type="hidden" name="id" value={e.id} />
                </ActionForm>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-3 border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600 sm:px-7">
        <Icon name="chat" className="mt-0.5 size-4 shrink-0 text-slate-400" />
        {isClient ? (
          <p>
            Something doesn&apos;t look right? Please don&apos;t approve it. Email{" "}
            <a className="font-semibold text-blue-600" href="mailto:support@erpvers.com">support@erpvers.com</a> or{" "}
            <a className="font-semibold text-blue-600" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>{" "}
            and we&apos;ll sort it out with you.
          </p>
        ) : (
          <p>
            {emailState?.unsentCount
              ? `${emailState.unsentCount} ${emailState.unsentCount === 1 ? "entry hasn't" : "entries haven't"} been emailed yet (${formatHours(emailState.unsentHours)} h).`
              : emailState?.lastSentAt
                ? `Last emailed ${formatDate(emailState.lastSentAt)}.`
                : "Not emailed yet."}{" "}
            Clients can only approve. If they dispute something they&apos;ll contact you; fix or delete the entry below and it drops off this list.
          </p>
        )}
      </div>
    </section>
  );
}
