import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";
import Reveal from "@/components/shared/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "ERP VERS extends Infor LN with modern web, mobile, and integration expertise. See our ERP-first approach to building tools people actually want to use.",
  alternates: { canonical: "/about" },
};

const principles = [
  ["ERP-first thinking", "We begin with the operational process and ERP realities—not a generic app template."],
  ["Useful, not flashy", "Every screen, integration, and workflow should make a person’s day easier."],
  ["Built to evolve", "We design clean foundations that can grow from a focused improvement to a broader platform."],
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow="About ERP VERS"
          title={<>A modern product mindset for <span className="text-cyan-300">enterprise ERP.</span></>}
          description="ERP VERS helps manufacturing businesses close the gap between powerful ERP platforms and the simple, responsive experiences people expect today."
        />

        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:px-10">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Our focus</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Extend the ERP investment. Don’t replace it.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-lg leading-8 text-slate-600">
                Infor LN is built to run critical business operations. ERP VERS builds the web, mobile, integration,
                and automation layers that help people interact with it more effectively.
              </p>
              <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <span className="text-3xl font-bold tracking-tight text-blue-600">10+</span>
                <span className="max-w-[14rem] text-sm font-semibold leading-5 text-slate-700">
                  Years of hands-on Infor LN experience
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-3 lg:px-10">
            {principles.map(([title, text], index) => (
              <Reveal key={title} delay={index * 90}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                  <Icon name="shield" className="size-6 text-blue-600" />
                  <h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
