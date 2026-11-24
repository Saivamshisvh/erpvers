import type { Metadata } from "next";
import ActionForm from "@/components/portal/ActionForm";
import StatusBadge from "@/components/portal/StatusBadge";
import TaskCard from "@/components/portal/TaskCard";
import { Field, TextArea } from "@/components/portal/fields";
import { deleteMyEntryAction, logHoursAction, requestHoursAction } from "@/lib/portal/actions";
import { getFreelancerWork, requireFreelancer, type FreelancerTask, type HourRequest } from "@/lib/portal/data";
import { formatDate, formatHours, formatMoney, todayIso } from "@/lib/portal/format";

export const metadata: Metadata = { title: "My work" };

export default async function FreelancerWorkPage() {
  const profile = await requireFreelancer();
  const { tasks, entries, earnings, hourRequests } = await getFreelancerWork();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const pendingTotal = entries.filter((e) => e.status === "pending").reduce((s, e) => s + e.hours, 0);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Freelancer</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{profile.full_name}&apos;s tasks</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Log your hours against each task, up to the hours ERP VERS gave you. They show here straight away, and ERP VERS
        reviews them. If you need more hours on a task, ask on the task.
      </p>

      <section aria-label="Your earnings" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Earned</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-950">{formatMoney(earnings.earnedInr, "INR")}</p>
          <p className="mt-1 text-xs text-slate-500">Hours ERP VERS has accepted, at your rate for each task.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Waiting review</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-amber-700">{formatMoney(earnings.waitingInr, "INR")}</p>
          <p className="mt-1 text-xs text-slate-500">Added to Earned once ERP VERS accepts the hours.</p>
        </div>
        {earnings.missingRate && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Some of your tasks don&apos;t have a rate yet, so their amount isn&apos;t shown. ERP VERS will add it.
          </div>
        )}
      </section>

      {open.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
          No open tasks assigned to you right now.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          {open.map((task) => {
            const remaining = task.myRemainingHours;
            const requests = hourRequests.filter((r) => r.task_id === task.id);
            return (
              <TaskCard key={task.id} task={task} eyebrow={task.client_name} hideBudget>
                <MyHours task={task} />
                <TaskEarnings task={task} />
                {task.budget_status !== "approved" ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Waiting for the client to approve the estimate. You can log hours once it&apos;s approved.
                  </p>
                ) : remaining <= 0 ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    You&apos;ve used the hours ERP VERS gave you on this task. Ask for more hours below.
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
                    <TextArea label="What you did" name="description" required maxLength={1000} rows={2} placeholder="In words the client will understand" />
                  </ActionForm>
                )}
                {requests.length > 0 && <MyRequests requests={requests} />}
                {task.budget_status === "approved" && (
                  <details className="mt-4 rounded-xl border border-slate-200 open:bg-slate-50/60" open={remaining <= 0}>
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Ask for more hours</summary>
                    <div className="px-4 pb-4">
                      <ActionForm action={requestHoursAction} submitLabel="Send to ERP VERS" pendingLabel="Sending…">
                        <input type="hidden" name="taskId" value={task.id} />
                        <Field label="Hours needed" name="hours" type="number" required min="0.25" step="0.25" />
                        <TextArea label="Why you need them" name="reason" required maxLength={2000} rows={2} placeholder="What's left to do, and why it needs more time" />
                      </ActionForm>
                    </div>
                  </details>
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
              <TaskCard key={task.id} task={task} eyebrow={task.client_name} hideBudget>
                <MyHours task={task} />
              </TaskCard>
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
                    <td className="px-3 py-3.5"><StatusBadge status={e.status} audience="freelancer" /></td>
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

function MyHours({ task }: { task: FreelancerTask }) {
  return (
    <dl className="mb-4 grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt className="text-xs font-semibold text-slate-500">Your hours</dt>
        <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">{formatHours(task.myAllocatedHours)} h</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Logged</dt>
        <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">{formatHours(task.myAcceptedHours + task.myWaitingHours)} h</dd>
        {task.myWaitingHours > 0 && <dd className="text-xs text-amber-700">{formatHours(task.myWaitingHours)} waiting review</dd>}
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Left</dt>
        <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">{formatHours(task.myRemainingHours)} h</dd>
      </div>
    </dl>
  );
}

const REQUEST_STATUS: Record<HourRequest["status"], { label: string; className: string }> = {
  requested: { label: "Waiting for ERP VERS", className: "bg-amber-50 text-amber-800" },
  granted: { label: "Given", className: "bg-emerald-50 text-emerald-700" },
  declined: { label: "Declined", className: "bg-red-50 text-red-700" },
};

function MyRequests({ requests }: { requests: HourRequest[] }) {
  return (
    <ul className="mt-4 grid gap-2">
      {requests.map((r) => (
        <li key={r.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
          <p className="font-semibold text-slate-900">
            Asked for {formatHours(r.hours)} h{" "}
            <span className={`ml-1 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${REQUEST_STATUS[r.status].className}`}>
              {REQUEST_STATUS[r.status].label}
              {r.status === "granted" && r.granted_hours != null && `: ${formatHours(r.granted_hours)} h`}
            </span>
          </p>
          <p className="mt-0.5 text-slate-600">{r.reason}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDate(r.created_at)}</p>
          {r.review_note && <p className="mt-0.5 text-xs text-slate-700">ERP VERS: {r.review_note}</p>}
        </li>
      ))}
    </ul>
  );
}

function TaskEarnings({ task }: { task: FreelancerTask }) {
  if (task.rateInr == null) {
    return <p className="mb-4 text-sm text-slate-500">Your rate for this task isn&apos;t set yet.</p>;
  }
  return (
    <dl className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
      <div>
        <dt className="text-xs font-semibold text-slate-500">Your rate</dt>
        <dd className="mt-0.5 font-bold tabular-nums text-slate-950">{formatMoney(task.rateInr, "INR")}/h</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Earned</dt>
        <dd className="mt-0.5 font-bold tabular-nums text-slate-950">{formatMoney(task.earnedInr ?? 0, "INR")}</dd>
        <dd className="text-xs text-slate-500">{formatHours(task.myAcceptedHours)} h accepted</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">Waiting review</dt>
        <dd className="mt-0.5 font-bold tabular-nums text-amber-700">{formatMoney(task.waitingInr ?? 0, "INR")}</dd>
        <dd className="text-xs text-slate-500">{formatHours(task.myWaitingHours)} h</dd>
      </div>
    </dl>
  );
}
