import Link from "next/link";
import { redirect } from "next/navigation";
import Dashboard from "@/components/portal/Dashboard";
import Icon from "@/components/shared/Icon";
import { getDashboardData, getIsAdmin, getVisibleClients, requireUser } from "@/lib/portal/data";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const user = await requireUser();
  if (await getIsAdmin()) redirect("/portal/admin");

  const clients = await getVisibleClients();
  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Icon name="clock" className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            {user.fullName ? `Thanks, ${user.fullName.split(" ")[0]}. ` : ""}Your account is waiting for approval
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            ERP VERS checks every new account before linking it to a company&apos;s dashboard. This usually takes one
            business day. You don&apos;t need to do anything else: sign in any time, and your hours will be here once
            you&apos;re approved.
          </p>
          <dl className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <dt className="font-semibold text-slate-500">Email</dt>
            <dd className="break-all text-slate-900">{user.email}</dd>
            {user.company && (
              <>
                <dt className="font-semibold text-slate-500">Company</dt>
                <dd className="text-slate-900">{user.company}</dd>
              </>
            )}
          </dl>
          <p className="mt-6 text-sm text-slate-500">
            Questions? Email <a className="font-semibold text-blue-600" href="mailto:support@erpvers.com">support@erpvers.com</a>.
          </p>
        </div>
      </div>
    );
  }

  const { client: requested } = await searchParams;
  const selected = clients.find((c) => c.id === requested) ?? clients[0];
  const data = await getDashboardData(selected.id);
  if (!data) redirect("/portal");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Prepaid hours</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{data.client.name}</h1>
        </div>
        {clients.length > 1 && (
          <nav aria-label="Switch company" className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/portal?client=${c.id}`}
                aria-current={c.id === selected.id ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                  c.id === selected.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <Dashboard data={data} />
    </div>
  );
}
