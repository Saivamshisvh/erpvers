import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CTASection from "@/components/shared/CTASection";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";
import PrepaidCredits from "@/components/shared/PrepaidCredits";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Infor LN development, ION integration, web portals, mobile apps, Infor LN training, data analytics (Power BI, Tableau, Qlik Sense), data engineering (Snowflake, Azure Data Factory), and SAP BTP - the services ERP VERS delivers.",
  alternates: { canonical: "/services" },
};

type Service = {
  icon: "cube" | "network" | "portal" | "mobile" | "book" | "chart" | "database" | "cloud";
  title: string;
  details: string[];
};

const erpServices: Service[] = [
  { icon: "cube", title: "Infor LN development", details: ["Extensions and customizations", "Reports and operational screens", "Process automation and performance tuning"] },
  { icon: "network", title: "Integration engineering", details: ["Infor ION and BOD integration", "REST and SOAP API services", "Reliable system-to-system workflows"] },
  { icon: "portal", title: "Enterprise web portals", details: ["Customer and supplier self-service", "Approval and exception management", "Role-based dashboards"] },
  { icon: "mobile", title: "Mobile applications", details: ["Warehouse and shop-floor workflows", "Field approvals and information lookup", "ERP-connected experiences for mobile teams"] },
  { icon: "book", title: "Infor LN training", details: ["Hands-on sessions for functional and technical teams", "Knowledge transfer for in-house development", "Onboarding support for new LN users"] },
];

const dataServices: Service[] = [
  { icon: "chart", title: "Data analytics", details: ["Power BI, Tableau, and Qlik Sense dashboards", "KPI reporting on operational, sales, and financial ERP data", "Self-service reporting for business teams"] },
  { icon: "database", title: "Data engineering", details: ["Azure Data Factory pipelines from ERP and business systems", "Snowflake data warehousing and modelling", "Data quality, cleansing, and migration support"] },
  { icon: "cloud", title: "SAP BTP", details: ["Integration Suite and API-based connectivity", "Side-by-side extensions to SAP applications", "Data and analytics services on SAP BTP"] },
];

const groups = [
  {
    id: "erp-engineering",
    eyebrow: "ERP engineering",
    title: "Infor LN and the tools around it.",
    description: "Development, integration, applications, and training for teams running Infor LN.",
    services: erpServices,
    tools: [] as string[],
    sectionBg: "bg-slate-50",
    cardBg: "bg-white",
  },
  {
    id: "data-cloud",
    eyebrow: "Data & cloud",
    title: "Turn business data into decisions.",
    description: "Analytics, data engineering, and SAP BTP expertise to connect, model, and make sense of your data.",
    services: dataServices,
    tools: ["Power BI", "Tableau", "Qlik Sense", "Snowflake", "Azure Data Factory", "SAP BTP"],
    sectionBg: "bg-white",
    cardBg: "bg-slate-50",
  },
];

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <PageHero
          eyebrow="Services"
          title={<>Technology that makes ERP easier <span className="text-cyan-300">to use.</span></>}
          description="ERP VERS combines ERP expertise, data skills, and modern product engineering to build the tools your teams need most."
        />

        {groups.map((group) => (
          <section key={group.id} id={group.id} className={`${group.sectionBg} py-20 sm:py-24`}>
            <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
              <SectionHeading eyebrow={group.eyebrow} title={group.title} description={group.description} />
              {group.tools.length > 0 && (
                <Reveal delay={60} className="mt-8">
                  <ul className="flex flex-wrap gap-2" aria-label="Tools we work with">
                    {group.tools.map((tool) => (
                      <li key={tool} className="rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-sm font-semibold text-blue-700">
                        {tool}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.services.map((service, index) => (
                  <Reveal key={service.title} delay={index * 80}>
                    <article className={`h-full rounded-2xl border border-slate-200 ${group.cardBg} p-7 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5 sm:p-8`}>
                      <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon name={service.icon} className="size-6" />
                      </span>
                      <h3 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{service.title}</h3>
                      <ul className="mt-6 grid gap-3">
                        {service.details.map((detail) => (
                          <li key={detail} className="flex gap-3 text-sm leading-6 text-slate-600">
                            <Icon name="check" className="mt-1 size-4 shrink-0 text-blue-600" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ))}

        <PrepaidCredits />

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
