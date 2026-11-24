import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/portal/ActionForm";
import AdminNav from "@/components/portal/AdminNav";
import { inputClass } from "@/components/portal/fields";
import {
  approveAllForClientAction,
  declineHourRequestAction,
  grantHourRequestAction,
  markChangeApprovedAction,
  reviewChangeRequestAction,
  reviewEntryAction,
  sendChangesToClientAction,
  sendHoursToClientAction,
} from "@/lib/portal/actions";
import {
  getChangeRequestQueue,
  getChangesReadyToSend,
  getHourRequestQueue,
  getPendingRegistrations,
  getReadyToSend,
  getReviewQueue,
  requireAdmin,
  type ChangeRequestReview,
  type ReviewEntry,
} from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";

export const metadata: Metadata = { title: "To review" };

export default async function ReviewPage() {
  await requireAdmin();
  const [queue, registrations, changes, readyHours, readyChanges, hourRequests] = await Promise.all([
    getReviewQueue(),
    getPendingRegistrations(),
    getChangeRequestQueue(),
    getReadyToSend(),
    getChangesReadyToSend(),
    getHourRequestQueue(),
  ]);

  // Approved but not sent yet, one group per client.
  const ready = new Map<string, { name: string; entries: ReviewEntry[]; changes: ChangeRequestReview[] }>();
  const readyGroup = (id: string, name: string) => {
    const g = ready.get(id) ?? { name, entries: [], changes: [] };
    ready.set(id, g);
    return g;
  };
  for (const e of readyHours) readyGroup(e.client_id, e.client_name).entries.push(e);
  for (const c of readyChanges) readyGroup(c.client_id, c.client_name).changes.push(c);

  const groups = new Map<string, { name: string; entries: ReviewEntry[] }>();
  for (const e of queue) {
    const g = groups.get(e.client_id) ?? { name: e.client_name, entries: [] };
    g.entries.push(e);
    groups.set(e.client_id, g);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">To review</h1>
      <AdminNav current="review" reviewCount={queue.length} registrationCount={registrations.length} />

      {hourRequests.length > 0 && (
        <section aria-labelledby="hour-requests-heading" className="mt-8">
          <h2 id="hour-requests-heading" className="text-lg font-bold tracking-tight text-slate-950">Freelancers asking for more hours</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Only you see these. Give hours from the task&apos;s reserve, or decline. If the reserve isn&apos;t enough, add a change
            request on the task for the client to approve, then come back and give the hours.
          </p>
          <ul className="mt-4 grid gap-3">
            {hourRequests.map((r) => (
              <li key={r.id} className="grid gap-4 rounded-2xl border border-amber-200 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">
                    <Link href={`/portal/admin/clients/${r.client_id}`} className="font-semibold hover:text-blue-600">{r.client_name}</Link> · {r.task_title}
                  </p>
                  <p className="mt-1.5 font-semibold text-slate-950">
                    {r.freelancer_name} asks for {formatHours(r.hours)} more hours
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{r.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Has {formatHours(r.allocated)} h now · your reserve on this task: {formatHours(r.reserve)} h · asked {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                  <ActionForm action={grantHourRequestAction} submitLabel="Give from reserve" pendingLabel="Saving…" className="w-full sm:w-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">Hours to give</span>
                      <input
                        name="hours"
                        type="number"
                        min="0.25"
                        step="0.25"
                        defaultValue={Math.max(Math.min(r.hours, r.reserve), 0.25)}
                        className={`${inputClass} w-28`}
                      />
                    </label>
                  </ActionForm>
                  <details className="w-full sm:w-64">
                    <summary className="cursor-pointer py-2 text-sm font-semibold text-slate-500 hover:text-red-600">Decline…</summary>
                    <div className="mt-2">
                      <ActionForm action={declineHourRequestAction} submitLabel="Decline" pendingLabel="Saving…">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="grid gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Reason (the freelancer sees this)</span>
                          <input name="note" required maxLength={500} className={inputClass} placeholder="e.g. Should fit in the hours given" />
                        </label>
                      </ActionForm>
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {changes.length > 0 && (
        <section aria-labelledby="changes-heading" className="mt-8">
          <h2 id="changes-heading" className="text-lg font-bold tracking-tight text-slate-950">Extra hours requested</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Approving does not email the client. Approved requests move to &quot;Approved, not sent yet&quot; below, where you send them to the client or approve them without the client.
          </p>
          <ul className="mt-4 grid gap-3">
            {changes.map((c) => (
              <li key={c.id} className="grid gap-4 rounded-2xl border border-amber-200 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">
                    <Link href={`/portal/admin/clients/${c.client_id}`} className="font-semibold hover:text-blue-600">{c.client_name}</Link> · {c.task_title}
                  </p>
                  <p className="mt-1.5 font-semibold text-slate-950">
                    {c.requested_by_name ?? "Freelancer"} asks for +{formatHours(c.hours)} h: {c.title}
                  </p>
                  {c.description && <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{c.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">Requested {formatDate(c.requested_on)}</p>
                </div>
                <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                  <ActionForm action={reviewChangeRequestAction} submitLabel="Approve" pendingLabel="Approving…" className="w-full sm:w-auto">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">Title the client sees</span>
                      <input name="title" required maxLength={160} defaultValue={c.title} className={`${inputClass} sm:w-64`} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">Extra hours</span>
                      <input name="hours" type="number" min="0.25" step="0.25" defaultValue={c.hours} className={`${inputClass} w-28`} />
                    </label>
                  </ActionForm>
                  <details className="w-full sm:w-64">
                    <summary className="cursor-pointer py-2 text-sm font-semibold text-slate-500 hover:text-red-600">Decline…</summary>
                    <div className="mt-2">
                      <ActionForm action={reviewChangeRequestAction} submitLabel="Decline" pendingLabel="Saving…">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <label className="grid gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Reason (the freelancer sees this)</span>
                          <input name="note" required maxLength={500} className={inputClass} placeholder="e.g. Covered by the original estimate" />
                        </label>
                      </ActionForm>
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {queue.length === 0 ? (
        changes.length === 0 &&
        ready.size === 0 &&
        hourRequests.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
            Nothing waiting. Freelancer hours and requests for more hours appear here.
          </p>
        )
      ) : (
        <>
          <h2 className="mt-10 text-lg font-bold tracking-tight text-slate-950">Hours logged</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Approving is final: the hours go into the client&apos;s work log and count against the task&apos;s approved hours (and
            any prepaid balance). The client doesn&apos;t approve each entry. Reject anything that looks wrong.
          </p>
          <div className="mt-6 grid gap-8">
            {[...groups.entries()].map(([clientId, group]) => {
              const total = group.entries.reduce((s, e) => s + e.hours, 0);
              return (
                <section key={clientId} aria-labelledby={`client-${clientId}`}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 id={`client-${clientId}`} className="text-lg font-bold tracking-tight text-slate-950">
                        <Link href={`/portal/admin/clients/${clientId}`} className="hover:text-blue-600">{group.name}</Link>
                      </h2>
                      <p className="text-sm text-slate-500">
                        {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}, {formatHours(total)}{" "}hours
                      </p>
                    </div>
                    {group.entries.length > 1 && (
                      <ActionForm
                        action={approveAllForClientAction}
                        submitLabel={`Approve all (${formatHours(total)} h)`}
                        pendingLabel="Approving…"
                        confirmMessage={`Approve all ${group.entries.length} entries as logged? They go into ${group.name}'s work log.`}
                      >
                        <input type="hidden" name="clientId" value={clientId} />
                      </ActionForm>
                    )}
                  </div>
                  <ul className="mt-4 grid gap-3">
                    {group.entries.map((e) => (
                      <li key={e.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-500">
                            {e.task_title ?? "No task"}
                            {e.change_request_title && <> · Change: {e.change_request_title}</>}
                          </p>
                          <p className="mt-1.5 font-semibold text-slate-950">
                            {e.consultant} · {formatHours(e.hours)} h on {formatDate(e.work_date)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{e.description}</p>
                        </div>
                        <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                          <ActionForm action={reviewEntryAction} submitLabel="Approve" pendingLabel="Approving…" className="w-full sm:w-auto">
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <label className="grid gap-1.5">
                              <span className="text-xs font-semibold text-slate-600">Hours to approve</span>
                              <input name="hours" type="number" min="0.25" max="24" step="0.25" defaultValue={e.hours} className={`${inputClass} w-28`} />
                            </label>
                          </ActionForm>
                          <details className="w-full sm:w-64">
                            <summary className="cursor-pointer py-2 text-sm font-semibold text-slate-500 hover:text-red-600">Reject…</summary>
                            <div className="mt-2">
                              <ActionForm action={reviewEntryAction} submitLabel="Reject" pendingLabel="Rejecting…">
                                <input type="hidden" name="id" value={e.id} />
                                <input type="hidden" name="decision" value="reject" />
                                <label className="grid gap-1.5">
                                  <span className="text-xs font-semibold text-slate-600">Reason (the freelancer sees this)</span>
                                  <input name="note" required maxLength={500} className={inputClass} placeholder="e.g. Logged twice" />
                                </label>
                              </ActionForm>
                            </div>
                          </details>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      {ready.size > 0 && (
        <section aria-labelledby="ready-heading" className="mt-12">
          <h2 id="ready-heading" className="text-lg font-bold tracking-tight text-slate-950">Approved, not sent yet</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            You approved these. The client can&apos;t see them yet. Send them to the client when you&apos;re ready: they get
            one email from your support address and approve in the portal.
          </p>
          <div className="mt-6 grid gap-8">
            {[...ready.entries()].map(([clientId, group]) => {
              const hours = group.entries.reduce((s, e) => s + e.hours, 0);
              return (
                <section key={clientId} aria-labelledby={`ready-${clientId}`} className="rounded-2xl border border-emerald-200 bg-white p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h3 id={`ready-${clientId}`} className="text-base font-bold tracking-tight text-slate-950">
                      <Link href={`/portal/admin/clients/${clientId}`} className="hover:text-blue-600">{group.name}</Link>
                    </h3>
                  </div>

                  {group.changes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Extra hours</p>
                      <ul className="mt-2 grid gap-3">
                        {group.changes.map((c) => (
                          <li key={c.id} className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 text-sm">
                              <p className="text-slate-500">{c.task_title}</p>
                              <p className="mt-0.5 font-semibold text-slate-950">+{formatHours(c.hours)} h: {c.title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <ActionForm action={sendChangesToClientAction} submitLabel="Send to client" pendingLabel="Sending…">
                                <input type="hidden" name="clientId" value={clientId} />
                                <input type="hidden" name="id" value={c.id} />
                              </ActionForm>
                              <ActionForm
                                action={markChangeApprovedAction}
                                variant="subtle"
                                submitLabel="Approve without client"
                                pendingLabel="Saving…"
                                confirmMessage={`Add ${formatHours(c.hours)} h to "${c.task_title}" without asking ${group.name}?`}
                              >
                                <input type="hidden" name="clientId" value={clientId} />
                                <input type="hidden" name="id" value={c.id} />
                              </ActionForm>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {group.entries.length > 0 && (
                    <div className="mt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          Hours: {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}, {formatHours(hours)} h
                        </p>
                        <ActionForm
                          action={sendHoursToClientAction}
                          submitLabel={`Send hours to client (${formatHours(hours)} h)`}
                          pendingLabel="Sending…"
                          confirmMessage={`Send ${formatHours(hours)} hours to ${group.name} to approve? They get one email.`}
                        >
                          <input type="hidden" name="clientId" value={clientId} />
                        </ActionForm>
                      </div>
                      <ul className="mt-2 grid gap-2">
                        {group.entries.map((e) => (
                          <li key={e.id} className="border-t border-slate-100 pt-2 text-sm">
                            <p className="text-slate-500">
                              {e.task_title ?? "No task"}
                              {e.change_request_title && <> · Change: {e.change_request_title}</>}
                            </p>
                            <p className="mt-0.5 text-slate-900">
                              <span className="font-semibold">{e.consultant} · {formatHours(e.hours)} h on {formatDate(e.work_date)}</span>
                              <span className="text-slate-600">: {e.description}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
