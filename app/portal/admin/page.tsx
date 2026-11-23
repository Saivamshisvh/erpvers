import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/portal/ActionForm";
import AdminNav from "@/components/portal/AdminNav";
import { Field, Panel, inputClass } from "@/components/portal/fields";
import { approveRegistrationAction, createClientAction, declineRegistrationAction } from "@/lib/portal/actions";
import { getAdminOverview, getPendingRegistrations, getReviewQueue, requireAdmin } from "@/lib/portal/data";
import { formatDate, formatHours } from "@/lib/portal/format";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireAdmin();
  const [clients, pending, queue] = await Promise.all([getAdminOverview(), getPendingRegistrations(), getReviewQueue()]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Clients</h1>
      <AdminNav current="clients" reviewCount={queue.length} registrationCount={pending.length} />

      {pending.length > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6" aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-base font-bold tracking-tight text-slate-950">
            Not linked yet <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-800">{pending.length}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            These accounts didn&apos;t match any company domain or invite. Link each one to a client or make them a freelancer. They see nothing until you do.
          </p>
          <ul className="mt-5 grid gap-3">
            {pending.map((r) => {
              const match = clients.find((c) => r.company && c.name.toLowerCase() === r.company.toLowerCase());
              return (
                <li key={r.user_id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {r.full_name ?? "No name given"}
                      {r.company && <span className="font-normal text-slate-500"> · {r.company}</span>}
                    </p>
                    <p className="mt-0.5 break-all text-sm text-slate-600">{r.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Registered {formatDate(r.registered_at)}
                      {r.email_confirmed ? " · Email confirmed" : " · Email not confirmed yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-3">
                    <ActionForm action={approveRegistrationAction} submitLabel="Approve" pendingLabel="Approving…" className="w-full sm:w-auto">
                      <input type="hidden" name="userId" value={r.user_id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Link to</span>
                          <select name="target" defaultValue={match?.id ?? "new"} className={inputClass}>
                            <option value="new">New client</option>
                            <option value="freelancer">Freelancer (not a client)</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Name, if new client</span>
                          <input name="newClientName" defaultValue={r.company ?? ""} maxLength={120} className={inputClass} />
                        </label>
                      </div>
                    </ActionForm>
                    <ActionForm
                      action={declineRegistrationAction}
                      variant="subtle"
                      submitLabel="Decline"
                      pendingLabel="Declining…"
                      confirmMessage={`Decline ${r.email}? Their account will be deleted.`}
                      className="sm:mt-7"
                    >
                      <input type="hidden" name="userId" value={r.user_id} />
                    </ActionForm>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start [&>*]:min-w-0">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clients.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No clients yet. Add your first one.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">Client</th>
                    <th scope="col" className="px-3 py-3 text-right">Purchased</th>
                    <th scope="col" className="px-3 py-3 text-right">Used</th>
                    <th scope="col" className="px-3 py-3 text-right">Remaining</th>
                    <th scope="col" className="px-3 py-3 text-right">To review</th>
                    <th scope="col" className="px-3 py-3 text-right">With client</th>
                    <th scope="col" className="px-6 py-3">Last logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((c) => {
                    const status =
                      c.remaining < 0 ? { label: "Over", cls: "bg-red-50 text-red-700" } :
                      c.purchased > 0 && c.remaining <= c.low_balance_hours ? { label: "Low", cls: "bg-amber-50 text-amber-800" } :
                      null;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <Link href={`/portal/admin/clients/${c.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-slate-600">{formatHours(c.purchased)}</td>
                        <td className="px-3 py-4 text-right tabular-nums text-slate-600">{formatHours(c.used)}</td>
                        <td className="px-3 py-4 text-right">
                          <span className="font-semibold tabular-nums text-slate-900">{formatHours(c.remaining)}</span>
                          {status && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-amber-700">{c.pendingHours > 0 ? `${formatHours(c.pendingHours)} h` : ""}</td>
                        <td className="px-3 py-4 text-right tabular-nums text-blue-700">{c.awaitingClientHours > 0 ? `${formatHours(c.awaitingClientHours)} h` : ""}</td>
                        <td className="px-6 py-4 text-slate-500">{c.lastEntryDate ? formatDate(c.lastEntryDate) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Panel title="Add a client" description="Create the company, then add its email domain so its people join automatically.">
          <ActionForm action={createClientAction} submitLabel="Create client" pendingLabel="Creating…">
            <Field label="Company name" name="name" required maxLength={120} placeholder="Acme Manufacturing" />
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
