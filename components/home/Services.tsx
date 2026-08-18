import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const services = [
  { icon: "cube" as const, title: "Infor LN development", text: "Extensions, reports, automation, and performance improvements tailored to your processes." },
  { icon: "portal" as const, title: "Web applications", text: "Customer, supplier, and employee portals that make ERP data easier to use." },
  { icon: "mobile" as const, title: "Mobile workflows", text: "Purpose-built apps for warehouse, approvals, field teams, and shop-floor operations." },
  { icon: "network" as const, title: "ERP integrations", text: "Reliable API and ION-based connections that keep systems and teams in sync." },
  { icon: "book" as const, title: "Infor LN training", text: "Hands-on training and knowledge transfer that gets your own team confident on Infor LN." },
];

export default function Services() {
  return (
    <section id="services" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="What we do"
          title="Extend the value of the ERP you already trust."
          description="From a single workflow to a connected digital experience, we help turn ERP complexity into practical tools for your people."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Reveal key={service.title} delay={index * 80}>
              <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <Icon name={service.icon} className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
