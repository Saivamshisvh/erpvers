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
  removeDomainAction,
  removeInviteAction,
  removeMemberAction,
  updateClientAction,
  updateTaskAction,
} from "@/lib/portal/actions";
import { getClientAccess, getDashboardData, getFreelancers, getReviewQueue, requireAdmin, type Task } from "@/lib/portal/data";
import { formatHours, todayIso } from "@/lib/portal/format";
import { PREPAID_TIERS } from "@/lib/prepaid";

export const metadata: Metadata = { title: "Manage client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FreelancerOption = { user_id: string; full_name: string };

function AssigneeChecks({ freelancers, selected = [] }: { freelancers: FreelancerOption[]; selected?: string[] }) {
  if (freelancers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No freelancers yet. <Link href="/portal/admin/freelancers" className="font-semibold text-blue-600">Invite one</Link> to assign tasks.
      </p>
    );
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Assign to</legend>
      <div className="flex flex-wrap gap-2">
        {freelancers.map((f) => (
          <label key={f.user_id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50">
            <input type="checkbox" name="assignees" value={f.user_id} defaultChecked={selected.includes(f.user_id)} className="accent-blue-600" />
            {f.full_name}
          </label>
        ))}
      </div>
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
          <ActionForm action={addChangeRequestAction} submitLabel="Add hours to this task" pendingLabel="Adding…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_6rem_9.5rem]">
              <Field label="What changed" name="title" required maxLength={160} placeholder="e.g. Add approval step" />
              <Field label="Extra hours" name="hours" type="number" required min="0.25" step="0.25" />
              <Field label="Requested on" name="requestedOn" type="date" required defaultValue={todayIso()} />
            </div>
            <TextArea label="Details (optional)" name="description" maxLength={2000} rows={2} />
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
            <AssigneeChecks freelancers={freelancers} selected={task.assignees.map((a) => a.user_id)} />
          </ActionForm>

          {task.changeRequests.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Remove a change request</p>
              <ul className="mt-2 grid gap-1.5">
                {task.changeRequests.map((cr) => (
                  <li key={cr.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                    <span>
                      {cr.title} (+{formatHours(cr.hours)} h)
                    </span>
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
  const [data, access, { freelancers }, queue] = await Promise.all([getDashboardData(id), getClientAccess(id), getFreelancers(), getReviewQueue()]);
  if (!data) notFound();

  const { client, members, tasks } = data;
  const activeFreelancers = freelancers.filter((f) => f.active);
  const waiting = queue.filter((e) => e.client_id === client.id);
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

      {/* Tasks */}
      <section className="mt-8" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="text-xl font-bold tracking-tight text-slate-950">Tasks</h2>
        <p className="mt-1 text-sm text-slate-600">
          Freelancers can only log hours on tasks assigned to them, up to the estimate plus change requests. Only you can change estimates.
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

      <div className="mt-10 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Log hours yourself" description="Hours you log are approved straight away.">
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

        <Panel title="Record a prepaid purchase" description={`Leave discount empty to apply the tier automatically. ${tiers}.`}>
          <ActionForm action={addPurchaseAction} submitLabel="Record purchase" pendingLabel="Recording…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Hours" name="hours" type="number" required min="1" step="0.5" placeholder="100" />
              <Field label="Discount %" name="discountPct" type="number" min="0" max="100" step="0.5" placeholder="Auto" />
              <Field label="Date" name="purchasedOn" type="date" required defaultValue={todayIso()} />
            </div>
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
                    <ActionForm action={removeInviteAction} variant="subtle" submitLabel="Cancel" pendingLabel="Removing…">
                      {hidden}
                      <input type="hidden" name="email" value={email} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <ActionForm action={addMemberAction} submitLabel="Give access" pendingLabel="Adding…">
                  {hidden}
                  <Field label="Email" name="email" type="email" required placeholder="name@client.com" hint="If they haven't registered yet, they get access as soon as they do." />
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
