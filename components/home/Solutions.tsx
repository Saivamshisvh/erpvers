import Icon from "@/components/shared/Icon";
import SectionHeading from "@/components/ui/SectionHeading";

const solutions = [
  { icon: "portal" as const, number: "01", title: "Supplier & customer portals", text: "Give external partners the timely information and self-service tools they need." },
  { icon: "chart" as const, number: "02", title: "Production intelligence", text: "Turn operational data into a clear, responsive view of work in progress." },
  { icon: "mobile" as const, number: "03", title: "Warehouse mobility", text: "Put receiving, transfers, counting, and lookups in the hands of your team." },
];

export default function Solutions() {
  return <section id="solutions" className="bg-slate-950 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><SectionHeading eyebrow="Solutions" title="Built around the moments that keep operations moving." description="Start with the workflow creating the most friction, then build a better connected operation from there." /><div className="mt-12 grid gap-4 lg:grid-cols-3">{solutions.map((solution) => <article key={solution.title} className="rounded-2xl border border-white/10 bg-white/5 p-7"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-cyan-400 text-slate-950"><Icon name={solution.icon} className="size-5" /></span><span className="text-sm font-bold text-slate-500">{solution.number}</span></div><h3 className="mt-10 text-xl font-bold text-white">{solution.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{solution.text}</p></article>)}</div></div></section>;
}
