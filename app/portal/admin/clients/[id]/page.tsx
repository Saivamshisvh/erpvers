import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/portal/ActionForm";
import Dashboard from "@/components/portal/Dashboard";
import TaskCard from "@/components/portal/TaskCard";
import { Field, Panel, TextArea, inputClass } from "@/components/portal/fields";
import {
  addChangeRequestAction,
  addDomainAction,
  addEntryAction,
  addMemberAction,
  addPurchaseAction,
  createTaskAction,
  deleteChangeRequestAction,
  deleteEntryAction,
  deletePurchaseAction,
  deleteTaskAction,
  markChangeApprovedAction,
  sendChangesToClientAction,
  sendHoursToClientAction,
  setClientRatesAction,
  removeDomainAction,
  removeInviteAction,
  resendClientInviteAction,
  removeMemberAction,
  updateClientAction,
  updateTaskAction,
} from "@/lib/portal/actions";
import {
  getClientAccess,
  getClientEmailState,
  getClientMoney,
  getDashboardData,
  getFreelancers,
  getReadyToSend,
  getReviewQueue,
  requireAdmin,
  type ClientMoney,
  type Task,
} from "@/lib/portal/data";
import { CURRENCIES, formatHours, formatMoney, todayIso } from "@/lib/portal/format";
import { PREPAID_TIERS } from "@/lib/prepaid";

export const metadata: Metadata = { title: "Manage client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FreelancerOption = { user_id: string; full_name: string; default_rate_inr: number | null };

function AssigneeChecks({
  freelancers,
  selected = [],
}: {
  freelancers: FreelancerOption[];
  selected?: { user_id: string; hourly_rate_inr: number | null }[];
}) {
  if (freelancers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No freelancers yet. <Link href="/portal/admin/freelancers" className="font-semibold text-blue-600">Invite one</Link> to assign tasks.
      </p>
    );
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Assign to, with their rate for this task</legend>
      <div className="grid gap-2">
        {freelancers.map((f) => {
          const current = selected.find((a) => a.user_id === f.user_id);
          const rate = current ? current.hourly_rate_inr : f.default_rate_inr;
          return (
            <div key={f.user_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-1.5 text-sm has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50">
              <label className="inline-flex min-w-40 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" name="assignees" value={f.user_id} defaultChecked={Boolean(current)} className="accent-blue-600" />
                {f.full_name}
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                ₹/h
                <input name={`rate_${f.user_id}`} type="number" min="0" step="1" defaultValue={rate ?? ""} placeholder="Rate" className={`${inputClass} w-24 py-1`} />
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">The freelancer sees only their own rate. Clients never see it.</p>
    </fieldset>
  );
}

function TaskAdmin({ task, clientId, freelancers }: { task: Task; clientId: string; freelancers: FreelancerOption[] }) {
  const hidden = (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="taskId" value={task.id} />
    </>
  );
  return (
    <div className="grid gap-3">
      <details className="group rounded-xl border border-slate-200 open:bg-slate-50/60">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Add change request</summary>
        <div className="px-4 pb-4">
          <ActionForm action={addChangeRequestAction} submitLabel="Add change request" pendingLabel="Adding…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_6rem_9.5rem]">
              <Field label="What changed" name="title" required maxLength={160} placeholder="e.g. Add approval step" />
              <Field label="Extra hours" name="hours" type="number" required min="0.25" step="0.25" />
              <Field label="Requested on" name="requestedOn" type="date" required defaultValue={todayIso()} />
            </div>
            <TextArea label="Details (optional, the client sees this)" name="description" maxLength={2000} rows={2} />
            <fieldset className="grid gap-1.5 text-sm text-slate-600">
              <legend className="mb-1 text-sm font-semibold text-slate-700">Then</legend>
              <label className="flex items-start gap-2">
                <input type="radio" name="next" value="hold" defaultChecked className="mt-1 accent-blue-600" />
                Keep it as approved by me, and send it to the client later
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="next" value="send" className="mt-1 accent-blue-600" />
                Send it to the client now for their approval
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="next" value="agreed" className="mt-1 accent-blue-600" />
                The client has already agreed (add the hours now, no email)
              </label>
            </fieldset>
          </ActionForm>
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 open:bg-slate-50/60">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Edit task, estimate or assignees</summary>
        <div className="grid gap-5 px-4 pb-4">
          <ActionForm action={updateTaskAction} submitLabel="Save task" resetOnSuccess={false}>
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem_8rem]">
              <Field label="Title" name="title" required maxLength={160} defaultValue={task.title} />
              <Field label="Estimate (h)" name="estimateHours" type="number" required min="0" step="0.25" defaultValue={task.estimate_hours} />
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select name="status" defaultValue={task.status} className={inputClass}>
                  <option value="open">In progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
            </div>
            <TextArea label="Description" name="description" maxLength={2000} rows={2} defaultValue={task.description ?? ""} />
            <AssigneeChecks freelancers={freelancers} selected={task.assignees} />
          </ActionForm>

          {task.changeRequests.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Change requests</p>
              <ul className="mt-2 grid gap-1.5">
                {task.changeRequests.map((cr) => (
                  <li key={cr.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                    <span>
                      {cr.title} (+{formatHours(cr.hours)} h)
                    </span>
                    {cr.status === "reviewed" && (
                      <ActionForm action={sendChangesToClientAction} variant="subtle" submitLabel="Send to client" pendingLabel="Sending…">
                        <input type="hidden" name="clientId" value={clientId} />
                        <input type="hidden" name="id" value={cr.id} />
                      </ActionForm>
                    )}
                    {(cr.status === "pending_client" || cr.status === "reviewed") && (
                      <ActionForm
                        action={markChangeApprovedAction}
                        variant="subtle"
                        submitLabel={cr.status === "reviewed" ? "Approve without client" : "Mark approved"}
                        pendingLabel="Saving…"
                        confirmMessage={
                          cr.status === "reviewed"
                            ? `Add ${formatHours(cr.hours)} h for "${cr.title}" without asking the client?`
                            : `Mark "${cr.title}" as approved by the client (for example, they agreed by email)?`
                        }
                      >
                        <input type="hidden" name="clientId" value={clientId} />
                        <input type="hidden" name="id" value={cr.id} />
                      </ActionForm>
                    )}
                    <ActionForm action={deleteChangeRequestAction} variant="subtle" submitLabel="Delete" pendingLabel="Deleting…" confirmMessage={`Delete change request "${cr.title}"?`}>
                      <input type="hidden" name="clientId" value={clientId} />
                      <input type="hidden" name="id" value={cr.id} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ActionForm action={deleteTaskAction} variant="subtle" submitLabel="Delete this task" pendingLabel="Deleting…" confirmMessage={`Delete "${task.title}"?`}>
            {hidden}
          </ActionForm>
        </div>
      </details>
    </div>
  );
}

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [data, access, { freelancers }, queue, emailState, readyAll] = await Promise.all([
    getDashboardData(id),
    getClientAccess(id),
    getFreelancers(),
    getReviewQueue(),
    getClientEmailState(id),
    getReadyToSend(),
  ]);
  if (!data) notFound();
  const money = await getClientMoney(id, data.purchases, data.tasks);

  const { client, members, tasks } = data;
  const activeFreelancers = freelancers.filter((f) => f.active);
  const waiting = queue.filter((e) => e.client_id === client.id);
  const ready = readyAll.filter((e) => e.client_id === client.id);
  const readyHours = ready.reduce((s, e) => s + e.hours, 0);
  const hidden = <input type="hidden" name="clientId" value={client.id} />;
  const tiers = [...PREPAID_TIERS].reverse().map((t) => `${t.label}: ${t.discountPct}%`).join(" · ");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <Link href="/portal/admin" className="text-sm font-semibold text-slate-500 hover:text-blue-600">
        ← All clients
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">{client.name}</h1>
        {waiting.length > 0 && (
          <Link href="/portal/admin/review" className="text-sm font-semibold text-amber-700 hover:text-amber-900">
            {waiting.length} {waiting.length === 1 ? "entry" : "entries"} waiting for your review →
          </Link>
        )}
      </div>

      {ready.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-emerald-950">
            <span className="font-semibold">Approved, not sent yet:</span> {ready.length} {ready.length === 1 ? "entry" : "entries"},{" "}
            {formatHours(readyHours)} h. {client.name} can&apos;t see these until you send them.
          </p>
          <ActionForm
            action={sendHoursToClientAction}
            submitLabel={`Send to client (${formatHours(readyHours)} h)`}
            pendingLabel="Sending…"
            confirmMessage={`Send ${formatHours(readyHours)} hours to ${client.name} to approve? They get one email.`}
          >
            {hidden}
          </ActionForm>
        </div>
      )}

      {/* Tasks */}
      <section className="mt-8" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="text-xl font-bold tracking-tight text-slate-950">Tasks</h2>
        <p className="mt-1 text-sm text-slate-600">
          Freelancers can only log hours on tasks assigned to them, up to the estimate plus change requests the client has approved. Only you can change estimates.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showPending showAssignees>
              <TaskAdmin task={task} clientId={client.id} freelancers={activeFreelancers} />
            </TaskCard>
          ))}
          <Panel title="New task" description="One requirement from the client, with your hour estimate.">
            <ActionForm action={createTaskAction} submitLabel="Create task" pendingLabel="Creating…">
              {hidden}
              <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                <Field label="Title" name="title" required maxLength={160} placeholder="e.g. Supplier portal login" />
                <Field label="Estimate (h)" name="estimateHours" type="number" required min="0" step="0.25" placeholder="40" />
              </div>
              <TextArea label="Description (optional)" name="description" maxLength={2000} rows={2} />
              <AssigneeChecks freelancers={activeFreelancers} />
            </ActionForm>
          </Panel>
        </div>
      </section>

      <MoneyPanel clientId={client.id} money={money} />

      <div className="mt-10 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Log hours yourself" description="Hours you log count as approved by you. Send them to the client now, or later with the rest.">
          <ActionForm action={addEntryAction} submitLabel="Log hours" pendingLabel="Logging…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
              <Field label="Date" name="workDate" type="date" required defaultValue={todayIso()} />
              <Field label="Consultant" name="consultant" required maxLength={120} placeholder="Name" />
              <Field label="Hours" name="hours" type="number" required min="0.25" max="24" step="0.25" placeholder="2.5" />
            </div>
            {tasks.length > 0 && (
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">Task</span>
                <select name="taskId" defaultValue="" className={inputClass}>
                  <option value="">No specific task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <TextArea label="Work done" name="description" required maxLength={1000} rows={3} placeholder="What was done, in words the client will understand" />
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" name="sendNow" value="yes" className="mt-1 accent-blue-600" />
              Send to the client now (they get an email)
            </label>
          </ActionForm>
        </Panel>

        <Panel title="Record a prepaid purchase" description="No discount is applied unless you enter one or tick the prepaid tier discount.">
          <ActionForm action={addPurchaseAction} submitLabel="Record purchase" pendingLabel="Recording…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hours" name="hours" type="number" required min="1" step="0.5" placeholder="100" />
              <Field label="Discount %" name="discountPct" type="number" min="0" max="100" step="0.5" placeholder="0" hint="Leave empty for no discount." />
              <Field
                label={`Rate per hour (${money.rates.currency})`}
                name="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                placeholder={money.rates.hourly_rate != null ? String(money.rates.hourly_rate) : "Set a client rate"}
                hint="Before discount. Empty uses the client's rate."
              />
              <Field label="Date" name="purchasedOn" type="date" required defaultValue={todayIso()} />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" name="applyTier" value="yes" className="mt-1 accent-blue-600" />
              <span>
                Apply the prepaid tier discount <span className="text-slate-400">({tiers})</span>
              </span>
            </label>
            <Field label="Reference" name="reference" maxLength={120} placeholder="Invoice or PO number (optional)" />
          </ActionForm>
        </Panel>

        <Panel title="Who can see this dashboard" description="Add the company's email domain once and its people join automatically after confirming their email.">
          <div className="grid gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700">Company email domains</p>
              <ul className="mt-2 grid gap-2">
                {access.domains.length === 0 && <li className="text-sm text-slate-500">None yet.</li>}
                {access.domains.map((d) => (
                  <li key={d} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <span className="text-sm text-slate-800">@{d}</span>
                    <ActionForm action={removeDomainAction} variant="subtle" submitLabel="Remove" pendingLabel="Removing…" confirmMessage={`Stop @${d} accounts from joining ${client.name} automatically?`}>
                      {hidden}
                      <input type="hidden" name="domain" value={d} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <ActionForm action={addDomainAction} submitLabel="Add domain" pendingLabel="Adding…">
                  {hidden}
                  <Field label="Domain" name="domain" required placeholder="acme-mfg.com" hint="Personal providers like gmail.com can't be used. Invite those people by email below." />
                </ActionForm>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">People with access</p>
              <ul className="mt-2 grid gap-2">
                {members.length === 0 && access.invites.length === 0 && <li className="text-sm text-slate-500">Nobody yet.</li>}
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <span className="break-all text-sm text-slate-800">{m.email}</span>
                    <ActionForm action={removeMemberAction} variant="subtle" submitLabel="Remove" pendingLabel="Removing…" confirmMessage={`Remove ${m.email}'s access to ${client.name}?`}>
                      {hidden}
                      <input type="hidden" name="userId" value={m.user_id} />
                    </ActionForm>
                  </li>
                ))}
                {access.invites.map((email) => (
                  <li key={email} className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 px-3.5 py-2.5">
                    <span className="break-all text-sm text-slate-600">
                      {email} <span className="text-xs text-slate-400">· invited, not registered yet</span>
                    </span>
                    <div className="flex items-center gap-4">
                      <ActionForm action={resendClientInviteAction} variant="subtle" submitLabel="Resend email" pendingLabel="Sending…">
                        {hidden}
                        <input type="hidden" name="email" value={email} />
                      </ActionForm>
                      <ActionForm action={removeInviteAction} variant="subtle" submitLabel="Cancel" pendingLabel="Removing…">
                        {hidden}
                        <input type="hidden" name="email" value={email} />
                      </ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <ActionForm action={addMemberAction} submitLabel="Give access" pendingLabel="Adding…">
                  {hidden}
                  <Field label="Email" name="email" type="email" required placeholder="name@client.com" hint="We email them a link. If they haven't registered yet, they get access as soon as they do." />
                </ActionForm>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Settings">
          <ActionForm action={updateClientAction} submitLabel="Save" resetOnSuccess={false}>
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem] sm:items-start">
              <Field label="Company name" name="name" required maxLength={120} defaultValue={client.name} />
              <Field label="Low-balance alert" name="lowBalanceHours" type="number" required min="0" step="1" defaultValue={client.low_balance_hours} hint="Hours left" />
            </div>
          </ActionForm>
        </Panel>
      </div>

      <h2 className="mb-5 mt-14 text-xl font-bold tracking-tight text-slate-950">What {client.name} sees</h2>
      <Dashboard
        data={data}
        mode="admin"
        emailState={emailState}
        entryAction={(entry) => (
          <ActionForm action={deleteEntryAction} variant="subtle" submitLabel="Delete" pendingLabel="Deleting…" confirmMessage="Delete this time entry?">
            {hidden}
            <input type="hidden" name="id" value={entry.id} />
          </ActionForm>
        )}
        purchaseAction={(purchase) => (
          <ActionForm action={deletePurchaseAction} variant="subtle" submitLabel="Delete" pendingLabel="Deleting…" confirmMessage="Delete this purchase?">
            {hidden}
            <input type="hidden" name="id" value={purchase.id} />
          </ActionForm>
        )}
      />
    </div>
  );
}

function MoneyPanel({ clientId, money }: { clientId: string; money: ClientMoney }) {
  const { rates, totals } = money;
  const cur = rates.currency;
  const inr = (n: number | null) => (n == null ? "-" : formatMoney(n, "INR"));
  const needsFx = cur !== "INR" && rates.inr_per_unit == null;
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white" aria-labelledby="money-heading">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
        <h2 id="money-heading" className="text-base font-bold tracking-tight text-slate-950">Rates and profit</h2>
        <p className="mt-1 text-sm text-slate-500">Only you see this. Clients never see freelancer rates or your margin; freelancers never see the client&apos;s rate.</p>
      </div>
      <div className="grid gap-6 px-5 py-5 sm:px-7 lg:grid-cols-[18rem_1fr] [&>*]:min-w-0">
        <ActionForm action={setClientRatesAction} submitLabel="Save rates" resetOnSuccess={false}>
          <input type="hidden" name="clientId" value={clientId} />
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Client currency</span>
            <select name="currency" defaultValue={cur} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="Hourly rate (before discount)" name="hourlyRate" type="number" min="0" step="0.01" defaultValue={rates.hourly_rate ?? ""} placeholder="e.g. 40" />
          <Field
            label="1 unit of client currency = ? INR"
            name="inrPerUnit"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={rates.inr_per_unit ?? ""}
            placeholder="e.g. 84"
            hint="Used to show your margin in INR. Ignored for INR clients."
          />
        </ActionForm>

        <div className="min-w-0">
          <dl className="grid gap-3 sm:grid-cols-4">
            <Stat label="Prepaid received" value={money.prepaidAmount == null ? "-" : formatMoney(money.prepaidAmount, cur)} hint={money.netRate == null ? "Set a rate" : `${formatMoney(money.netRate, cur)}/h after discounts`} />
            <Stat label="Billed so far" value={totals.clientAmount == null ? "-" : formatMoney(totals.clientAmount, cur)} hint={`${formatHours(totals.billedHours)} h sent to the client${totals.clientAmountInr != null && cur !== "INR" ? `, ${inr(totals.clientAmountInr)}` : ""}`} />
            <Stat label="Freelancer cost" value={inr(totals.freelancerCostInr)} hint={totals.unratedHours > 0 ? `${formatHours(totals.unratedHours)} h without a rate` : "For the same hours"} />
            <Stat label="Your margin" value={inr(totals.marginInr)} hint={needsFx ? "Add the INR exchange rate" : totals.clientAmountInr ? `${Math.round(((totals.marginInr ?? 0) / totals.clientAmountInr) * 100)}% of billed` : ""} strong />
          </dl>

          {money.tasks.length > 0 && (
            <div className="relative mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Task</th>
                    <th scope="col" className="px-3 py-2 text-right">Hours billed</th>
                    <th scope="col" className="px-3 py-2 text-right">Client amount</th>
                    <th scope="col" className="px-3 py-2 text-right">Freelancer cost</th>
                    <th scope="col" className="py-2 pl-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {money.tasks.map((t) => (
                    <tr key={t.task_id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{t.title}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatHours(t.billedHours)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{t.clientAmount == null ? "-" : formatMoney(t.clientAmount, cur)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {inr(t.freelancerCostInr)}
                        {t.unratedHours > 0 && <span className="block text-xs text-amber-700">{formatHours(t.unratedHours)} h no rate</span>}
                      </td>
                      <td className={`py-2.5 pl-3 text-right font-semibold tabular-nums ${t.marginInr != null && t.marginInr < 0 ? "text-red-600" : "text-slate-950"}`}>{inr(t.marginInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Billed hours are hours sent to the client (waiting for approval or approved). Client amount uses the average rate the client
            paid across purchases, after discounts. Freelancer cost uses each freelancer&apos;s current rate on the task; hours you log yourself
            have no freelancer cost.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint, strong = false }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${strong ? "bg-emerald-50" : "bg-slate-50"}`}>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-bold tabular-nums ${strong ? "text-emerald-800" : "text-slate-950"}`}>{value}</dd>
      {hint && <dd className="text-xs text-slate-500">{hint}</dd>}
    </div>
  );
}
