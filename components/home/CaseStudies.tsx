import Image from "next/image";
import Icon from "@/components/shared/Icon";
import SectionHeading from "@/components/ui/SectionHeading";

const caseStudies = [
  {
    client: "Sutthiphong",
    logo: "/clients/sutthiphong-logo.png",
    logoWidth: 400,
    logoHeight: 209,
    industry: "Industrial equipment · Canning machinery, est. 1977",
    summary:
      "A full scope of Infor LN development for a long-established canning machinery manufacturer — from core extensions to a mobile app that connects the factory floor directly to LN.",
    work: [
      "Infor LN development, customizations, and extensions",
      "Custom report design for operational and management visibility",
      "A mobile application for factory staff to record production data straight into Infor LN",
    ],
    outcome:
      "Production data now flows from the factory floor into Infor LN directly through mobile, instead of manual re-entry — with reporting tailored to how their team actually works.",
  },
];

export default function CaseStudies() {
  return (
    <section className="bg-slate-950 py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Trusted partners"
          title="Real Infor LN work, real clients."
          description="A look at what ERPVers has actually built — not just what we say we can do."
        />

        <div className="mt-12 grid gap-6">
          {caseStudies.map((study) => (
            <article key={study.client} className="rounded-2xl border border-white/10 bg-white/5 p-7 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">{study.industry}</p>
                <div className="rounded-xl bg-white p-3">
                  <Image
                    src={study.logo}
                    alt={`${study.client} logo`}
                    width={study.logoWidth}
                    height={study.logoHeight}
                    className="h-12 w-auto sm:h-14"
                  />
                </div>
              </div>

              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">{study.summary}</p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {study.work.map((item) => (
                  <li key={item} className="flex gap-3 rounded-xl bg-white/5 p-4 text-sm leading-6 text-slate-200">
                    <Icon name="check" className="mt-1 size-4 shrink-0 text-cyan-300" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-white/10 pt-6 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-white">Outcome: </span>
                {study.outcome}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
