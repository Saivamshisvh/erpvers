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
  markBudgetAgreedAction,
  markChangeApprovedAction,
  sendBudgetAction,
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
  selected?: { user_id: string; hourly_rate_inr: number | null; allocated_hours: number }[];
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
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Assign to, with their hours and rate for this task</legend>
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
                Hours
                <input name={`hours_${f.user_id}`} type="number" min="0" step="0.25" defaultValue={current ? current.allocated_hours : ""} placeholder="0" className={`${inputClass} w-24 py-1`} />
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                ₹/h
                <input name={`rate_${f.user_id}`} type="number" min="0" step="1" defaultValue={rate ?? ""} placeholder="Rate" className={`${inputClass} w-24 py-1`} />
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Each freelancer can log only the hours you give them. Hours you don&apos;t give out stay with you as your reserve. A
        freelancer sees only their own hours and rate; clients see neither.
      </p>
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
  const locked = task.budget_status === "approved";
  return (
    <div className="grid gap-3">
      {task.budget_status !== "approved" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-amber-950">
            {task.budget_status === "draft"
              ? "Draft: the client can't see this estimate yet, and freelancers can't log hours."
              : "Sent to the client. Freelancers can log hours once they approve."}
          </p>
          {task.budget_status === "draft" && (
            <ActionForm action={sendBudgetAction} variant="compact" submitLabel="Send estimate to client" pendingLabel="Sending…">
              {hidden}
            </ActionForm>
          )}
          <ActionForm
            action={markBudgetAgreedAction}
            variant="subtle"
            submitLabel="Client agreed on a call"
            pendingLabel="Saving…"
            confirmMessage={`Record that the client agreed to ${formatHours(task.totalEstimate)} hours for "${task.title}"? No email is sent.`}
          >
            {hidden}
          </ActionForm>
        </div>
      )}
      <details className="group rounded-xl border border-slate-200 open:bg-slate-50/60">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Add change request (more hours from the client)</summary>
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
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Edit task, freelancers and their hours</summary>
        <div className="grid gap-5 px-4 pb-4">
          <ActionForm action={updateTaskAction} submitLabel="Save task" resetOnSuccess={false}>
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem_8rem]">
              <Field label="Title" name="title" required maxLength={160} defaultValue={task.title} />
              <Field
                label="Estimate (h)"
                name="estimateHours"
                type="number"
                required
                min="0"
                step="0.25"
                defaultValue={task.estimate_hours}
                readOnly={locked}
                hint={locked ? "Approved by the client. Use a change request for more." : undefined}
              />
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
  const drafts = tasks.filter((t) => t.budget_status === "draft");
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

      {drafts.length > 1 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-950">
            <span className="font-semibold">{drafts.length} draft estimates</span> ({formatHours(drafts.reduce((s, t) => s + t.totalEstimate, 0))} h) not sent
            to {client.name} yet.
          </p>
          <ActionForm action={sendBudgetAction} submitLabel="Send all to client in one email" pendingLabel="Sending…">
            {hidden}
          </ActionForm>
        </div>
      )}

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
          The client approves each task&apos;s estimate. You decide how many of those hours each freelancer gets; the rest is your reserve.
          Freelancers can only log the hours you give them.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showPending showAssignees>
              <TaskAdmin task={task} clientId={client.id} freelancers={activeFreelancers} />
            </TaskCard>
          ))}
          <Panel title="New task" description="One requirement from the client, with your hour estimate. Freelancers can log hours once the client approves it.">
            <ActionForm action={createTaskAction} submitLabel="Create task" pendingLabel="Creating…">
              {hidden}
              <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                <Field label="Title" name="title" required maxLength={160} placeholder="e.g. Supplier portal login" />
                <Field label="Estimate (h)" name="estimateHours" type="number" required min="0" step="0.25" placeholder="40" />
              </div>
              <TextArea label="Description (optional, the client sees this)" name="description" maxLength={2000} rows={2} />
              <AssigneeChecks freelancers={activeFreelancers} />
              <fieldset className="grid gap-1.5 text-sm text-slate-600">
                <legend className="mb-1 text-sm font-semibold text-slate-700">Estimate</legend>
                <label className="flex items-start gap-2">
                  <input type="radio" name="budget" value="draft" defaultChecked className="mt-1 accent-blue-600" />
                  Save as a draft, and send it to the client later
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="budget" value="send" className="mt-1 accent-blue-600" />
                  Send the estimate to the client now for their approval
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="budget" value="agreed" className="mt-1 accent-blue-600" />
                  The client already agreed on a call (approve it now, no email)
                </label>
              </fieldset>
            </ActionForm>
          </Panel>
        </div>
      </section>

      <MoneyPanel clientId={client.id} money={money} />

      <div className="mt-10 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Log hours yourself" description="Hours you log go straight into the client's work log.">
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
  const byBudget = rates.billing_basis === "budget";
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white" aria-labelledby="money-heading">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
        <h2 id="money-heading" className="text-base font-bold tracking-tight text-slate-950">Rates and profit</h2>
        <p className="mt-1 text-sm text-slate-500">Only you see this. Clients never see freelancer rates or your profit; freelancers never see the client&apos;s rate.</p>
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
          <Field label="Hourly rate (before discount)" name="hourlyRate" type="number" min="0" step="0.01" defaultValue={rates.hourly_rate ?? ""} placeholder="e.g. 1000" />
          <Field
            label="1 unit of client currency = ? INR"
            name="inrPerUnit"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={rates.inr_per_unit ?? ""}
            placeholder="e.g. 2.6"
            hint="Used to show your profit in INR. Ignored for INR clients."
          />
          <Field label="TDS deducted (%)" name="tdsPct" type="number" min="0" max="100" step="0.01" defaultValue={rates.tds_pct} hint="For example 10. Use 0 if no TDS is deducted." />
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-700">The client pays for</span>
            <select name="billingBasis" defaultValue={rates.billing_basis} className={inputClass}>
              <option value="budget">The approved budget (fixed hours per task)</option>
              <option value="logged">Hours logged (for example, prepaid hours)</option>
            </select>
          </label>
        </ActionForm>

        <div className="min-w-0">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={byBudget ? "Client pays (approved budget)" : "Client pays (hours logged)"}
              value={totals.clientAmount == null ? "-" : formatMoney(totals.clientAmount, cur)}
              hint={
                money.netRate == null
                  ? "Set a rate"
                  : `${formatHours(totals.billedHours)} h at ${formatMoney(money.netRate, cur)}/h${totals.clientAmountInr != null && cur !== "INR" ? `, ${inr(totals.clientAmountInr)}` : ""}`
              }
            />
            <Stat label={`TDS (${formatHours(rates.tds_pct)}%)`} value={inr(totals.tdsInr)} hint="Deducted before you're paid" />
            <Stat
              label="Freelancer cost"
              value={inr(totals.freelancerCostInr)}
              hint={totals.unratedHours > 0 ? `${formatHours(totals.unratedHours)} h without a rate` : `${formatHours(totals.freelancerHours)} h approved`}
            />
            <Stat
              label="Your profit so far"
              value={inr(totals.profitInr)}
              hint={needsFx ? "Add the INR exchange rate" : totals.clientAmountInr ? `${Math.round(((totals.profitInr ?? 0) / totals.clientAmountInr) * 100)}% of what the client pays` : ""}
              strong
            />
          </dl>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Budget given to freelancers" value={`${formatHours(totals.allocatedHours)} h`} hint={`of ${formatHours(totals.budgetHours)} h in all tasks`} />
            <Stat label="Your reserve" value={`${formatHours(totals.reserveHours)} h`} hint="Budget hours you haven't given out" />
            <Stat label="Expected profit when finished" value={inr(totals.expectedProfitInr)} hint="Whole budget paid, freelancers use all their hours" strong />
          </dl>

          {money.tasks.length > 0 && (
            <div className="relative mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Task</th>
                    <th scope="col" className="px-3 py-2 text-right">Budget</th>
                    <th scope="col" className="px-3 py-2 text-right">Given out</th>
                    <th scope="col" className="px-3 py-2 text-right">Reserve</th>
                    <th scope="col" className="px-3 py-2 text-right">Client pays</th>
                    <th scope="col" className="px-3 py-2 text-right">TDS</th>
                    <th scope="col" className="px-3 py-2 text-right">Freelancer cost</th>
                    <th scope="col" className="px-3 py-2 text-right">Profit so far</th>
                    <th scope="col" className="py-2 pl-3 text-right">Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {money.tasks.map((t) => (
                    <tr key={t.task_id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-900">
                        {t.title}
                        {t.budgetStatus && t.budgetStatus !== "approved" && (
                          <span className="block text-xs font-normal text-amber-700">{t.budgetStatus === "draft" ? "Draft estimate" : "Waiting for the client"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatHours(t.budgetHours)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatHours(t.allocatedHours)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${t.reserveHours < 0 ? "text-red-600" : "text-slate-700"}`}>{formatHours(t.reserveHours)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {t.clientAmount == null ? "-" : formatMoney(t.clientAmount, cur)}
                        <span className="block text-xs text-slate-500">{formatHours(t.billedHours)} h</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{inr(t.tdsInr)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {inr(t.freelancerCostInr)}
                        <span className="block text-xs text-slate-500">{formatHours(t.freelancerHours)} h</span>
                        {t.unratedHours > 0 && <span className="block text-xs text-amber-700">{formatHours(t.unratedHours)} h no rate</span>}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${t.profitInr != null && t.profitInr < 0 ? "text-red-600" : "text-slate-950"}`}>{inr(t.profitInr)}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-emerald-800">{inr(t.expectedProfitInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {byBudget
              ? "The client pays for each task's approved budget, whatever the freelancers use. "
              : "The client pays for hours you approve. "}
            Profit = what the client pays, minus TDS, minus freelancer cost. Client rate is the average the client paid across prepaid
            purchases after discounts, or the hourly rate if there are none. Freelancer cost is approved hours at each freelancer&apos;s
            rate on the task; hours you log yourself cost nothing. Expected profit assumes the whole budget is paid and each freelancer
            uses all the hours you gave them.
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
