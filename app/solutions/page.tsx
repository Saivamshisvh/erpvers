import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Partner portals, operational dashboards, warehouse mobility, and connected workflows — practical solutions ERPVers builds around your existing Infor LN ERP.",
  alternates: { canonical: "/solutions" },
};

const solutions = [
  { icon: "portal" as const, title: "Partner portals", description: "Give customers and suppliers a clear, secure way to check orders, documents, delivery status, and requests." },
  { icon: "layers" as const, title: "Operational dashboards", description: "Bring production, inventory, and order data into focused views that support faster decisions." },
  { icon: "mobile" as const, title: "Warehouse mobility", description: "Make receiving, transfers, counting, and stock lookup practical from the warehouse floor." },
  { icon: "network" as const, title: "Connected workflows", description: "Connect ERP data to the systems and teams that need it, with traceable, dependable integrations." },
];

export default function SolutionsPage() {
  return <><Navbar /><main><PageHero eyebrow="Solutions" title={<>Built for the work <span className="text-cyan-300">around your ERP.</span></>} description="These are practical starting points for extending your ERP—not off-the-shelf promises. Each solution is tailored to your process and platform." /><section className="bg-white py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="grid gap-5 md:grid-cols-2">{solutions.map((solution, index) => <article key={solution.title} className="group relative overflow-hidden rounded-2xl border border-slate-200 p-7 sm:p-8"><span className="absolute right-7 top-6 text-5xl font-bold tracking-tighter text-slate-100">0{index + 1}</span><span className="grid size-12 place-items-center rounded-xl bg-slate-950 text-cyan-300"><Icon name={solution.icon} className="size-6" /></span><h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">{solution.title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-slate-600">{solution.description}</p></article>)}</div></div></section></main><Footer /></>;
}
