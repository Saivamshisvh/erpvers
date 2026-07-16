import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";

const principles = [
  ["ERP-first thinking", "We begin with the operational process and ERP realities—not a generic app template."],
  ["Useful, not flashy", "Every screen, integration, and workflow should make a person’s day easier."],
  ["Built to evolve", "We design clean foundations that can grow from a focused improvement to a broader platform."],
];

export default function AboutPage() {
  return <><Navbar /><main><PageHero eyebrow="About ERPVers" title={<>A modern product mindset for <span className="text-cyan-300">enterprise ERP.</span></>} description="ERPVers helps manufacturing businesses close the gap between powerful ERP platforms and the simple, responsive experiences people expect today." /><section className="bg-white py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:px-10"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Our focus</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Extend the ERP investment. Don’t replace it.</h2></div><p className="text-lg leading-8 text-slate-600">Infor LN is built to run critical business operations. ERPVers builds the web, mobile, integration, and automation layers that help people interact with it more effectively.</p></div></section><section className="bg-slate-50 py-20"><div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-3 lg:px-10">{principles.map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7"><Icon name="shield" className="size-6 text-blue-600" /><h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></section></main><Footer /></>;
}
