import type { Metadata } from "next";
import ActionForm from "@/components/portal/ActionForm";
import StatusBadge from "@/components/portal/StatusBadge";
import TaskCard from "@/components/portal/TaskCard";
import { Field, TextArea, inputClass } from "@/components/portal/fields";
import { deleteMyEntryAction, logHoursAction } from "@/lib/portal/actions";
import { getFreelancerWork, requireFreelancer } from "@/lib/portal/data";
import { formatDate, formatHours, todayIso } from "@/lib/portal/format";

export const metadata: Metadata = { title: "My work" };

export default async function FreelancerWorkPage() {
  const profile = await requireFreelancer();
  const { tasks, entries } = await getFreelancerWork();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const pendingTotal = entries.filter((e) => e.status === "pending").reduce((s, e) => s + e.hours, 0);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Freelancer</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{profile.full_name}&apos;s tasks</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Log your hours against each task. Hours are reviewed by ERP VERS before the client sees them. If a task needs
        more hours than estimated, ask ERP VERS to add a change request.
      </p>

      {open.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
          No open tasks assigned to you right now.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          {open.map((task) => {
            const remaining = Math.max(task.totalEstimate - task.approvedHours - task.pendingHours, 0);
            return (
              <TaskCard key={task.id} task={task} eyebrow={task.client_name} showPending>
                {remaining <= 0 ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    The estimate for this task is used up. Ask ERP VERS to add a change request before logging more.
                  </p>
                ) : (
                  <ActionForm action={logHoursAction} submitLabel="Log hours" pendingLabel="Logging…">
                    <input type="hidden" name="taskId" value={task.id} />
                    <div className="grid gap-4 sm:grid-cols-[1fr_7rem] sm:items-start">
                      <Field label="Date" name="workDate" type="date" required defaultValue={todayIso()} max={todayIso()} />
                      <Field
                        label="Hours"
                        name="hours"
                        type="number"
                        required
                        min="0.25"
                        max={Math.min(24, remaining)}
                        step="0.25"
                        placeholder="2"
                        hint={`${formatHours(remaining)} left`}
                      />
                    </div>
                    {task.changeRequests.length > 0 && (
                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">Work for</span>
                        <select name="changeRequestId" defaultValue="" className={inputClass}>
                          <option value="">Original scope</option>
                          {task.changeRequests.map((cr) => (
                            <option key={cr.id} value={cr.id}>
                              Change request: {cr.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <TextArea label="What you did" name="description" required maxLength={1000} rows={2} placeholder="In words the client will understand" />
                  </ActionForm>
                )}
              </TaskCard>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">Finished tasks ({done.length})</summary>
          <div className="mt-5 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {done.map((task) => (
              <TaskCard key={task.id} task={task} eyebrow={task.client_name} showPending />
            ))}
          </div>
        </details>
      )}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="text-base font-bold tracking-tight text-slate-950">My hours</h2>
          {pendingTotal > 0 && <p className="text-sm text-amber-700">{formatHours(pendingTotal)} h waiting review</p>}
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-7">You haven&apos;t logged any hours yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 sm:px-7">Date</th>
                  <th scope="col" className="px-3 py-3">Task</th>
                  <th scope="col" className="px-3 py-3">Work done</th>
                  <th scope="col" className="px-3 py-3 text-right">Hours</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 sm:px-7"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 sm:px-7">{formatDate(e.work_date)}</td>
                    <td className="px-3 py-3.5 font-medium text-slate-900">
                      {e.task_title ?? "-"}
                      {e.change_request_title && <span className="block text-xs font-normal text-slate-500">Change: {e.change_request_title}</span>}
                    </td>
                    <td className="px-3 py-3.5 leading-6 text-slate-600">
                      {e.description}
                      {e.status === "rejected" && e.review_note && (
                        <span className="mt-1 block text-xs text-red-700">Reason: {e.review_note}</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">{formatHours(e.hours)}</td>
                    <td className="px-3 py-3.5"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3.5 text-right sm:px-7">
                      {e.status === "pending" && (
                        <ActionForm action={deleteMyEntryAction} variant="subtle" submitLabel="Delete" pendingLabel="Deleting…" confirmMessage="Delete this entry?">
                          <input type="hidden" name="id" value={e.id} />
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
