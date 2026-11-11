import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import TextLink from "@/components/ui/TextLink";

const solutions = [
  { icon: "portal" as const, number: "01", title: "Partner portals", text: "Give customers and suppliers the timely information and self-service tools they need." },
  { icon: "chart" as const, number: "02", title: "Operational dashboards", text: "Turn production, inventory, and order data into a clear view of work in progress." },
  { icon: "mobile" as const, number: "03", title: "Warehouse mobility", text: "Put receiving, transfers, counting, and lookups in the hands of your team." },
];

export default function Solutions() {
  return (
    <section id="solutions" className="relative overflow-hidden bg-slate-950 py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_0%_100%,rgba(37,99,235,0.16),transparent_34%)]"
      />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            tone="dark"
            eyebrow="Solutions"
            title="Built around the moments that keep operations moving."
            description="Start with the workflow creating the most friction, then build a better connected operation from there."
          />
          <TextLink href="/solutions" tone="dark" className="sm:mb-2">
            See all solutions
          </TextLink>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <Reveal key={solution.title} delay={index * 100}>
              <article className="h-full rounded-2xl border border-white/10 bg-white/5 p-7 transition-colors duration-200 hover:border-cyan-400/30 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-cyan-400 text-slate-950">
                    <Icon name={solution.icon} className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-500">{solution.number}</span>
                </div>
                <h3 className="mt-10 text-xl font-bold text-white">{solution.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{solution.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
