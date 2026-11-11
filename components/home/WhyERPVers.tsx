import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const features = [
  {
    icon: "cube" as const,
    title: "Infor LN depth",
    description: "More than ten years of hands-on Infor LN work: customizations, extensions, integrations, and the workflows around them.",
  },
  {
    icon: "portal" as const,
    title: "Modern web and mobile",
    description: "Responsive portals, dashboards, and mobile apps that give your teams a simpler way into ERP data.",
  },
  {
    icon: "network" as const,
    title: "Integration engineering",
    description: "REST APIs, ION, BODs, and secure integrations between your ERP and the systems around it.",
  },
  {
    icon: "users" as const,
    title: "One team, start to finish",
    description: "The people you speak to on the first call are the people who build, hand over, and support the work.",
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
          description="ERP knowledge and modern engineering in one team, so what we build fits the system you already run."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="flex h-full gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-7 sm:p-8">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                  <Icon name={feature.icon} className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{feature.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
