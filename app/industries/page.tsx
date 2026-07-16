import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";

const industries = [
  ["Manufacturing", "Improve the connection between ERP, production teams, and operational insight."],
  ["Industrial equipment", "Support complex orders, inventory visibility, service workflows, and partner access."],
  ["Automotive & components", "Create dependable, timely workflows for quality, planning, and supply-chain collaboration."],
  ["Distribution", "Give warehouse and customer-facing teams better access to the information that drives fulfillment."],
];

export default function IndustriesPage() {
  return <><Navbar /><main><PageHero eyebrow="Industries" title={<>Created for companies that <span className="text-cyan-300">make and move.</span></>} description="ERPVers concentrates on operations-led businesses where a better system experience has a measurable impact on daily work." /><section className="bg-slate-50 py-20 sm:py-28"><div className="mx-auto max-w-5xl px-5 sm:px-8">{industries.map(([industry, description]) => <article key={industry} className="grid gap-4 border-b border-slate-200 py-7 sm:grid-cols-[0.75fr_1.25fr] sm:py-9"><div className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-950"><span className="grid size-9 place-items-center rounded-lg bg-blue-100 text-blue-600"><Icon name="check" className="size-5" /></span>{industry}</div><p className="text-base leading-7 text-slate-600">{description}</p></article>)}</div></section></main><Footer /></>;
}
