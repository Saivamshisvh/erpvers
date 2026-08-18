import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Icon from "@/components/shared/Icon";
import PageHero from "@/components/shared/PageHero";
import Reveal from "@/components/shared/Reveal";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Infor LN development, Infor ION integration engineering, enterprise web portals, and mobile applications — the services ERP VERS delivers for manufacturers.",
  alternates: { canonical: "/services" },
};

const services = [
  { icon: "cube" as const, title: "Infor LN development", details: ["Extensions and customizations", "Reports and operational screens", "Process automation and performance tuning"] },
  { icon: "network" as const, title: "Integration engineering", details: ["Infor ION and BOD integration", "REST and SOAP API services", "Reliable system-to-system workflows"] },
  { icon: "portal" as const, title: "Enterprise web portals", details: ["Customer and supplier self-service", "Approval and exception management", "Role-based dashboards"] },
  { icon: "mobile" as const, title: "Mobile applications", details: ["Warehouse and shop-floor workflows", "Field approvals and information lookup", "ERP-connected experiences for mobile teams"] },
];

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow="Services"
          title={<>Technology that makes ERP easier <span className="text-cyan-300">to use.</span></>}
          description="ERP VERS combines ERP expertise with modern product engineering to build the tools your teams need most."
        />

        <section className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-2 lg:px-10">
            {services.map((service, index) => (
              <Reveal key={service.title} delay={index * 80}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5 sm:p-8">
                  <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon name={service.icon} className="size-6" />
                  </span>
                  <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{service.title}</h2>
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
        </section>

        <section className="bg-white py-16">
          <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center lg:px-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Start with one workflow</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Tell us where your ERP experience has friction.
              </h2>
            </div>
            <Button href="/contact">
              Discuss your requirement <Icon name="arrow" className="ml-2 size-4" />
            </Button>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
