import type { Metadata } from "next";
import ActionForm from "@/components/portal/ActionForm";
import AdminNav from "@/components/portal/AdminNav";
import { Field, Panel, inputClass } from "@/components/portal/fields";
import { inviteFreelancerAction, resendFreelancerInviteAction, revokeFreelancerInviteAction, setFreelancerActiveAction, setFreelancerRateAction } from "@/lib/portal/actions";
import { getFreelancers, getPendingRegistrations, getReviewQueue, requireAdmin } from "@/lib/portal/data";
import { formatDate } from "@/lib/portal/format";

export const metadata: Metadata = { title: "Freelancers" };

export default async function FreelancersPage() {
  await requireAdmin();
  const [{ freelancers, invites }, queue, registrations] = await Promise.all([getFreelancers(), getReviewQueue(), getPendingRegistrations()]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Freelancers</h1>
      <AdminNav current="freelancers" reviewCount={queue.length} registrationCount={registrations.length} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start [&>*]:min-w-0">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {freelancers.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No freelancers yet. Invite your first one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {freelancers.map((f) => (
                <li key={f.user_id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className={`font-semibold ${f.active ? "text-slate-950" : "text-slate-400 line-through"}`}>{f.full_name}</p>
                    <p className="break-all text-sm text-slate-500">{f.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-5">
                    <ActionForm action={setFreelancerRateAction} variant="compact" submitLabel="Save rate" pendingLabel="Saving…" resetOnSuccess={false} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="userId" value={f.user_id} />
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        Default ₹/h
                        <input name="rate" type="number" min="0" step="1" defaultValue={f.default_rate_inr ?? ""} placeholder="e.g. 1200" className={`${inputClass} w-28 py-1.5`} />
                      </label>
                    </ActionForm>
                    <span className="text-sm text-slate-500">
                      {f.active ? `${f.openTasks} open ${f.openTasks === 1 ? "task" : "tasks"}` : "No access"}
                    </span>
                    <ActionForm
                      action={setFreelancerActiveAction}
                      variant="subtle"
                      submitLabel={f.active ? "Remove access" : "Restore access"}
                      pendingLabel="Saving…"
                      confirmMessage={f.active ? `Remove ${f.full_name}'s access? Their logged hours stay on record.` : undefined}
                    >
                      <input type="hidden" name="userId" value={f.user_id} />
                      <input type="hidden" name="active" value={f.active ? "false" : "true"} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {invites.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Invited, not registered yet</p>
              <ul className="mt-3 grid gap-2">
                {invites.map((i) => (
                  <li key={i.email} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">
                      {i.full_name} · <span className="break-all text-slate-500">{i.email}</span> · invited {formatDate(i.created_at)}
                    </span>
                    <div className="flex items-center gap-5">
                      <ActionForm action={resendFreelancerInviteAction} variant="subtle" submitLabel="Resend email" pendingLabel="Sending…">
                        <input type="hidden" name="email" value={i.email} />
                      </ActionForm>
                      <ActionForm action={revokeFreelancerInviteAction} variant="subtle" submitLabel="Cancel invite" pendingLabel="Removing…">
                        <input type="hidden" name="email" value={i.email} />
                      </ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Panel title="Invite a freelancer" description="We email them a link to register with this address. They get access as soon as they confirm their email. Then assign them tasks from a client page.">
          <ActionForm action={inviteFreelancerAction} submitLabel="Invite" pendingLabel="Inviting…">
            <Field label="Name" name="fullName" required maxLength={120} hint="Shown to clients in their work log." />
            <Field label="Email" name="email" type="email" required placeholder="name@example.com" />
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
