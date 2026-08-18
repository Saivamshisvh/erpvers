import Button from "@/components/ui/Button";
import Icon from "@/components/shared/Icon";

const capabilities = ["Infor LN extensions", "Web portals & dashboards", "Mobile apps & integrations", "Infor LN training & enablement"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-50">
      <div className="absolute inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(circle_at_78%_28%,rgba(14,165,233,0.18),transparent_26%),radial-gradient(circle_at_55%_8%,rgba(37,99,235,0.14),transparent_32%)]" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-18 sm:px-8 md:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10 lg:pb-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm"><span className="size-1.5 rounded-full bg-cyan-400" /> ERP digital transformation partner</div>
          <h1 className="mt-7 max-w-2xl text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.04]">Modernize your ERP <span className="text-blue-600">without replacing it.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">ERP VERS helps manufacturers extend Infor LN with practical web applications, mobile workflows, and integrations—built around the way your teams already work.</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1" aria-label="ERP VERS capabilities">
            {capabilities.map((capability) => <li key={capability} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700"><span className="grid size-5 place-items-center rounded-full bg-blue-100 text-blue-700"><Icon name="check" className="size-3.5" /></span>{capability}</li>)}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3"><Button href="/contact">Book a consultation <Icon name="arrow" className="ml-2 size-4" /></Button><Button href="#services" variant="secondary">Explore services</Button></div>
          <p className="mt-6 text-sm text-slate-500">10+ years of hands-on Infor LN experience. Focused on manufacturing.</p>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}

function DashboardMockup() {
  const metrics = [{ label: "Open orders", value: "2,458", change: "+8.4%" }, { label: "Production plan", value: "97.2%", change: "On target" }];
  return (
    <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
      <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-200/70 to-cyan-100/40 blur-2xl" />
      <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur sm:p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white"><Icon name="layers" className="size-5" /></span><div><p className="text-sm font-bold text-slate-900">Operations overview</p><p className="text-xs text-slate-500">Today, 08:45 AM</p></div></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Example view</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3">{metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1 text-xs font-semibold text-emerald-600">{metric.change}</p></div>)}</div>
        <div className="mt-4 rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">Weekly production</p><p className="text-xs text-slate-500">Planned vs. completed</p></div><Icon name="chart" className="size-5 text-blue-600" /></div><div className="mt-5 flex h-24 items-end justify-between gap-2">{[42, 58, 48, 76, 66, 88, 82].map((height, index) => <div key={height} className="flex flex-1 flex-col items-center gap-2"><span className={`w-full rounded-t-md ${index === 5 ? "bg-cyan-400" : "bg-blue-100"}`} style={{ height: `${height}%` }} /><span className="text-[10px] text-slate-400">{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div></div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-3.5 text-white"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><Icon name="shield" className="size-4" /></span><div><p className="text-xs font-bold">ERP-connected workflows</p><p className="text-[11px] text-slate-400">Secure by design</p></div></div><Icon name="arrow" className="size-4 text-cyan-300" /></div>
      </div>
      <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-slate-100 bg-white p-3 shadow-lg sm:block"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-cyan-50 text-cyan-600"><Icon name="mobile" className="size-4" /></span><div><p className="text-xs font-bold text-slate-800">Mobile workflows</p><p className="text-[10px] text-slate-500">From shop floor to ERP</p></div></div></div>
    </div>
  );
}
