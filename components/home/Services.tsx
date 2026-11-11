import Link from "next/link";
import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import TextLink from "@/components/ui/TextLink";

const ERP = "/services#erp-engineering";
const DATA = "/services#data-cloud";

const services = [
  { icon: "cube" as const, href: ERP, title: "Infor LN development", text: "Extensions, reports, automation, and performance improvements built around your processes." },
  { icon: "portal" as const, href: ERP, title: "Web applications", text: "Customer, supplier, and employee portals that make ERP data easier to use." },
  { icon: "mobile" as const, href: ERP, title: "Mobile workflows", text: "Purpose-built apps for warehouse, approvals, field teams, and shop-floor operations." },
  { icon: "network" as const, href: ERP, title: "ERP integrations", text: "Reliable API and ION-based connections that keep systems and teams in sync." },
  { icon: "book" as const, href: ERP, title: "Infor LN training", text: "Hands-on training and knowledge transfer that gets your own team confident on Infor LN." },
  { icon: "chart" as const, href: DATA, title: "Data analytics", text: "Power BI, Tableau, and Qlik Sense dashboards that turn ERP and business data into clear decisions." },
  { icon: "database" as const, href: DATA, title: "Data engineering", text: "Snowflake and Azure Data Factory pipelines that move ERP data where your teams need it." },
  { icon: "cloud" as const, href: DATA, title: "SAP BTP", text: "Integrations, extensions, and data services built on SAP Business Technology Platform." },
];

export default function Services() {
  return (
    <section id="services" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="What we do"
            title="Extend the value of the ERP you already trust."
            description="From a single workflow to connected data and cloud platforms, we help turn ERP complexity into practical tools for your people."
          />
          <TextLink href="/services" className="sm:mb-2">
            View all services
          </TextLink>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <Reveal key={service.title} delay={index * 60}>
              <Link
                href={service.href}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon name={service.icon} className="size-5" />
                  </span>
                  <Icon
                    name="arrow"
                    className="size-4 -rotate-45 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600"
                  />
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
