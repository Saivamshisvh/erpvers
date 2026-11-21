import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/portal/ActionForm";
import Dashboard from "@/components/portal/Dashboard";
import { Field, Panel, TextArea } from "@/components/portal/fields";
import {
  addEntryAction,
  addMemberAction,
  addPurchaseAction,
  deleteEntryAction,
  deletePurchaseAction,
  removeMemberAction,
  updateClientAction,
} from "@/lib/portal/actions";
import { getDashboardData, requireAdmin } from "@/lib/portal/data";
import { todayIso } from "@/lib/portal/format";
import { PREPAID_TIERS } from "@/lib/prepaid";

export const metadata: Metadata = { title: "Manage client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await getDashboardData(id);
  if (!data) notFound();

  const { client, members } = data;
  const hidden = <input type="hidden" name="clientId" value={client.id} />;
  const tiers = [...PREPAID_TIERS].reverse().map((t) => `${t.label}: ${t.discountPct}%`).join(" · ");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <Link href="/portal/admin" className="text-sm font-semibold text-slate-500 hover:text-blue-600">
        ← All clients
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{client.name}</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Log hours" description="Clients see each entry in their work log.">
          <ActionForm action={addEntryAction} submitLabel="Log hours" pendingLabel="Logging…">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
              <Field label="Date" name="workDate" type="date" required defaultValue={todayIso()} />
              <Field label="Consultant" name="consultant" required maxLength={120} placeholder="Name" />
              <Field label="Hours" name="hours" type="number" required min="0.25" max="24" step="0.25" placeholder="2.5" />
            </div>
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

        <Panel title="People with access" description="Each person signs in with their own email. Removing someone takes effect on their next page load.">
          <ul className="mb-5 grid gap-2">
            {members.length === 0 && <li className="text-sm text-slate-500">Nobody yet.</li>}
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <span className="break-all text-sm text-slate-800">{m.email}</span>
                <ActionForm
                  action={removeMemberAction}
                  variant="subtle"
                  submitLabel="Remove"
                  pendingLabel="Removing…"
                  confirmMessage={`Remove ${m.email}'s access to ${client.name}?`}
                >
                  {hidden}
                  <input type="hidden" name="userId" value={m.user_id} />
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={addMemberAction} submitLabel="Give access" pendingLabel="Adding…">
            {hidden}
            <Field label="Email" name="email" type="email" required placeholder="name@client.com" hint="They can sign in straight away at erpvers.com/portal." />
          </ActionForm>
        </Panel>

        <Panel title="Settings">
          <ActionForm action={updateClientAction} submitLabel="Save" resetOnSuccess={false}>
            {hidden}
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem] sm:items-start">
              <Field label="Company name" name="name" required maxLength={120} defaultValue={client.name} />
              <Field
                label="Low-balance alert"
                name="lowBalanceHours"
                type="number"
                required
                min="0"
                step="1"
                defaultValue={client.low_balance_hours}
                hint="Hours left"
              />
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
