import type { ReactNode } from "react";
import type { Task } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";

type TaskCardProps = {
  task: Task;
  /** Show hours still waiting for review (admins and freelancers only, never clients). */
  showPending?: boolean;
  showAssignees?: boolean;
  eyebrow?: string;
  children?: ReactNode;
};

export default function TaskCard({ task, showPending = false, showAssignees = false, eyebrow, children }: TaskCardProps) {
  const pending = showPending ? task.pendingHours : 0;
  const used = task.approvedHours + pending;
  const remaining = Math.max(task.totalEstimate - used, 0);
  const over = used > task.totalEstimate;
  const pct = (h: number) => (task.totalEstimate > 0 ? Math.min(100, (h / task.totalEstimate) * 100) : 0);
  const crHours = task.changeRequests.reduce((s, c) => s + c.hours, 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>}
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{task.title}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            task.status === "done" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          {task.status === "done" ? "Done" : "In progress"}
        </span>
      </div>
      {task.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{task.description}</p>}

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Estimate</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">{formatHours(task.totalEstimate)} h</dd>
          {crHours > 0 && (
            <dd className="text-xs text-slate-500">
              {formatHours(task.estimate_hours)} + {formatHours(crHours)} changes
            </dd>
          )}
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Used</dt>
          <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-950">{formatHours(used)} h</dd>
          {pending > 0 && <dd className="text-xs text-amber-700">{formatHours(pending)} waiting review</dd>}
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">{over ? "Over by" : "Remaining"}</dt>
          <dd className={`mt-0.5 text-lg font-bold tabular-nums ${over ? "text-red-600" : "text-slate-950"}`}>
            {formatHours(over ? used - task.totalEstimate : remaining)} h
          </dd>
        </div>
      </dl>

      <div
        className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${formatHours(used)} of ${formatHours(task.totalEstimate)} estimated hours used`}
      >
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct(task.approvedHours)}%` }} />
        {pending > 0 && <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct(pending)}%` }} />}
      </div>
      {pending > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600" /> Approved</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Waiting review</span>
        </p>
      )}

      {task.changeRequests.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Change requests</p>
          <ul className="mt-2 grid gap-2">
            {task.changeRequests.map((cr) => (
              <li key={cr.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{cr.title}</p>
                  {cr.description && <p className="mt-0.5 text-slate-600">{cr.description}</p>}
                  <p className="mt-0.5 text-xs text-slate-500">Requested {formatDate(cr.requested_on)}</p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">+{formatHours(cr.hours)} h</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAssignees && (
        <p className="mt-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Assigned: </span>
          {task.assignees.length ? task.assignees.map((a) => a.full_name).join(", ") : "Nobody yet"}
        </p>
      )}

      {children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
    </article>
  );
}
