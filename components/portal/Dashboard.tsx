import type { ReactNode } from "react";
import Icon from "@/components/shared/Icon";
import AwaitingApproval, { type EmailState } from "@/components/portal/AwaitingApproval";
import BudgetApproval from "@/components/portal/BudgetApproval";
import ChangeApproval from "@/components/portal/ChangeApproval";
import StatusBadge from "@/components/portal/StatusBadge";
import TaskCard from "@/components/portal/TaskCard";
import UsageChart from "@/components/portal/UsageChart";
import type { DashboardData, Purchase, TimeEntry } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";

type DashboardProps = {
  data: DashboardData;
  /** Admin-only extra cell per row (e.g. a Delete button). Clients never get this. */
  entryAction?: (entry: TimeEntry) => ReactNode;
  purchaseAction?: (purchase: Purchase) => ReactNode;
  /** "client" (default) lets the viewer approve hours; "admin" shows email controls instead. */
  mode?: "client" | "admin";
  emailState?: EmailState;
};

export default function Dashboard({ data, entryAction, purchaseAction, mode = "client", emailState }: DashboardProps) {
  const { client, summary, entries, purchases, members, monthly, tasks, awaiting, budget } = data;
  const hasPrepaid = purchases.length > 0;
  // Draft estimates are never shown to the client (the admin preview mirrors what they see).
  const visibleTasks = tasks.filter((t) => t.budget_status !== "draft");

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      {awaiting.length > 0 && (
        <AwaitingApproval clientId={client.id} entries={awaiting} totalHours={summary.awaitingHours} mode={mode} emailState={emailState} />
      )}
      <BudgetApproval clientId={client.id} tasks={tasks} mode={mode} />
      <ChangeApproval clientId={client.id} tasks={tasks} mode={mode} />
      {hasPrepaid && summary.isOverdrawn && (
        <Alert tone="critical" title={`${formatHours(Math.abs(summary.remaining))} hours over your prepaid balance`}>
          Hours logged are now more than the hours purchased. Get in touch to top up your prepaid block.
        </Alert>
      )}
      {hasPrepaid && summary.isLow && (
        <Alert tone="warning" title={`Only ${formatHours(summary.remaining)} hours left`}>
          Your balance is at or below your alert level of {formatHours(client.low_balance_hours)} hours. Top up to keep work
          running without a pause.
        </Alert>
      )}

      {/* Approved budget */}
      {(budget.approved > 0 || budget.waiting > 0) && (
        <section aria-label="Approved hours" className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="rounded-2xl bg-slate-950 p-6 text-white sm:p-7">
            <p className="text-sm font-semibold text-slate-400">Approved hours left</p>
            <p className="mt-2 text-5xl font-bold tracking-tight tabular-nums">{formatHours(budget.remaining)}</p>
            <div
              className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={`${formatHours(budget.used)} of ${formatHours(budget.approved)} approved hours used`}
            >
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${budget.approved > 0 ? Math.min(100, (budget.used / budget.approved) * 100) : 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {formatHours(budget.used)} of {formatHours(budget.approved)} approved hours used
            </p>
          </div>
          <Stat
            label="Total approved hours"
            value={formatHours(budget.approved)}
            note={`Across ${budget.tasks} ${budget.tasks === 1 ? "task" : "tasks"}${budget.waiting > 0 ? `, plus ${formatHours(budget.waiting)} h waiting for your approval` : ""}`}
          />
          <Stat label="Hours used" value={formatHours(budget.used)} note={summary.lastEntryDate ? `Last logged ${formatDate(summary.lastEntryDate)}` : "Nothing logged yet"} />
        </section>
      )}

      {/* Balance */}
      {hasPrepaid && (
      <section aria-label="Prepaid balance" className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="rounded-2xl bg-slate-950 p-6 text-white sm:p-7">
          <p className="text-sm font-semibold text-slate-400">Hours remaining</p>
          <p className="mt-2 text-5xl font-bold tracking-tight tabular-nums">{formatHours(summary.remaining)}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${summary.usedPct}% of purchased hours used`}>
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${summary.usedPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{summary.usedPct}% of purchased hours used</p>
        </div>
        <Stat label="Hours purchased" value={formatHours(summary.purchased)} note={`${purchases.length} prepaid ${purchases.length === 1 ? "block" : "blocks"}`} />
        <Stat
          label="Hours used"
          value={formatHours(summary.used)}
          note={summary.lastEntryDate ? `Last logged ${formatDate(summary.lastEntryDate)}` : "Nothing logged yet"}
        />
      </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <UsageChart data={monthly} />
      </section>

      {visibleTasks.length > 0 && (
        <section aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className="text-base font-bold tracking-tight text-slate-950">Where the hours go</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">Each task&apos;s approved hours, and how many have been used.</p>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* Work log */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="text-base font-bold tracking-tight text-slate-950">Work log</h2>
          <p className="text-sm text-slate-500">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-7">No hours have been logged yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 sm:px-7">Date</th>
                  <th scope="col" className="px-3 py-3">Consultant</th>
                  <th scope="col" className="px-3 py-3">Work done</th>
                  <th scope="col" className="px-3 py-3 text-right">Hours</th>
                  <th scope="col" className="px-5 py-3 sm:px-7">Status</th>
                  {entryAction && <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 sm:px-7">{formatDate(entry.work_date)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-medium text-slate-900">{entry.consultant}</td>
                    <td className="px-3 py-3.5 leading-6 text-slate-600">
                      {entry.description}
                      {entry.task_title && (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {entry.task_title}
                          {entry.change_request_title && ` · Change: ${entry.change_request_title}`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">{formatHours(entry.hours)}</td>
                    <td className="px-5 py-3.5 sm:px-7">
                      <StatusBadge status={entry.status} audience={mode === "admin" ? "admin" : "client"} />
                    </td>
                    {entryAction && <td className="px-5 py-3.5 text-right">{entryAction(entry)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        {/* Purchases */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-4 text-base font-bold tracking-tight text-slate-950 sm:px-7">Prepaid purchases</h2>
          {purchases.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-7">No prepaid hours recorded yet.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 sm:px-7">Date</th>
                    <th scope="col" className="px-3 py-3 text-right">Hours</th>
                    <th scope="col" className="px-3 py-3 text-right">Discount</th>
                    <th scope="col" className="px-5 py-3 sm:px-7">Reference</th>
                    {purchaseAction && <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 sm:px-7">{formatDate(p.purchased_on)}</td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-slate-900">{formatHours(p.hours)}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-slate-600">{formatHours(p.discount_pct)}%</td>
                      <td className="px-5 py-3.5 text-slate-600 sm:px-7">{p.reference ?? "-"}</td>
                      {purchaseAction && <td className="px-5 py-3.5 text-right">{purchaseAction(p)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Access */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Icon name="lock" className="size-4" />
            </span>
            <h2 className="text-base font-bold tracking-tight text-slate-950">Who can see this dashboard</h2>
          </div>
          <ul className="mt-5 grid gap-2.5 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="break-all text-slate-700">{m.email}</li>
            ))}
            <li className="text-slate-500">The ERP VERS team</li>
          </ul>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            No one else can see these numbers. To add or remove someone, email support@erpvers.com.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-slate-950">{value}</p>
      <p className="mt-6 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Alert({ tone, title, children }: { tone: "warning" | "critical"; title: string; children: ReactNode }) {
  const styles =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-900 [&_svg]:text-red-600"
      : "border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-600";
  return (
    <div role="status" className={`flex gap-3 rounded-2xl border px-5 py-4 ${styles}`}>
      <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-sm leading-6 opacity-90">{children}</p>
      </div>
    </div>
  );
}
