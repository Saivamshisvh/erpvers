import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const steps = [
  {
    icon: "chat" as const,
    title: "Discovery call",
    text: "A short call to understand your Infor LN setup, the workflow or integration that needs attention, and whether we're a fit.",
  },
  {
    icon: "layers" as const,
    title: "Scoping",
    text: "We outline the approach, timeline, and cost before any commitment — no surprises once work starts.",
  },
  {
    icon: "cube" as const,
    title: "Build",
    text: "Development happens inside your existing Infor LN environment and processes, with regular check-ins along the way.",
  },
  {
    icon: "shield" as const,
    title: "Handover & support",
    text: "Documentation, knowledge transfer, and ongoing support once the work is live.",
  },
];

export default function HowWeWork() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="How we work"
          title="A simple, low-risk way to start."
          description="No long onboarding, no big upfront commitment — just a short call to see if we're a fit, then a clear plan before any work begins."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 80}>
              <article className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon name={step.icon} className="size-6" />
                  </span>
                  <span className="text-sm font-bold text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
