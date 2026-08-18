import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const features = [
  {
    title: "ERP Expertise",
    description:
      "Deep experience in Infor LN customization, extensions, integrations, and enterprise workflows.",
  },
  {
    title: "Modern Web Applications",
    description:
      "Responsive portals, dashboards, and web applications built with modern technologies.",
  },
  {
    title: "Seamless Integrations",
    description:
      "REST APIs, ION, BODs, and secure integrations between ERP and external systems.",
  },
  {
    title: "Long-Term Partnership",
    description:
      "From implementation to enhancements and support, we help clients grow with confidence.",
  },
];

export default function WhyERPVers() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          align="center"
          eyebrow="Why choose ERP VERS"
          title="Built for ERP. Designed for growth."
          description="We combine enterprise ERP expertise with modern web technologies to deliver scalable, secure and user-friendly business solutions."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-8 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                <h3 className="text-xl font-bold tracking-tight text-slate-950">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
