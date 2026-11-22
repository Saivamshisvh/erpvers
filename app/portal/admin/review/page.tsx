import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/portal/ActionForm";
import AdminNav from "@/components/portal/AdminNav";
import { inputClass } from "@/components/portal/fields";
import { reviewEntryAction } from "@/lib/portal/actions";
import { getPendingRegistrations, getReviewQueue, requireAdmin } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";

export const metadata: Metadata = { title: "Hours to review" };

export default async function ReviewPage() {
  await requireAdmin();
  const [queue, registrations] = await Promise.all([getReviewQueue(), getPendingRegistrations()]);
  const total = queue.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Hours to review</h1>
      <AdminNav current="review" reviewCount={queue.length} registrationCount={registrations.length} />

      {queue.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
          Nothing waiting. Freelancer hours appear here as they&apos;re logged.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">
            {queue.length} {queue.length === 1 ? "entry" : "entries"}, {formatHours(total)}{" "}hours. Approved hours appear on
            the client&apos;s dashboard and count against their prepaid balance.
          </p>
          <ul className="mt-5 grid gap-3">
            {queue.map((e) => (
              <li key={e.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">
                    <Link href={`/portal/admin/clients/${e.client_id}`} className="font-semibold text-slate-700 hover:text-blue-600">
                      {e.client_name}
                    </Link>
                    {" · "}
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
        </>
      )}
    </div>
  );
}
