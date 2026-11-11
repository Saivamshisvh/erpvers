import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const steps = [
  {
    title: "Discovery call",
    text: "A short call to understand your Infor LN setup, the workflow or integration that needs attention, and whether we're a fit.",
  },
  {
    title: "Scoping",
    text: "We outline the approach, timeline, and cost before any commitment, so there are no surprises once work starts.",
  },
  {
    title: "Build",
    text: "Development happens inside your existing Infor LN environment and processes, with regular check-ins along the way.",
  },
  {
    title: "Handover & support",
    text: "Documentation, knowledge transfer, and ongoing support once the work is live.",
  },
];

export default function HowWeWork() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="How we work"
          title={"A simple, low\u2011risk way to start."}
          description="No long onboarding and no big upfront commitment. A short call to see if we're a fit, then a clear plan before any work begins."
        />
        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 90}>
              <div className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">
                  0{index + 1}
                </span>
                {index < steps.length - 1 && <span aria-hidden="true" className="hidden h-px flex-1 bg-slate-300 lg:-mr-8 lg:block" />}
              </div>
              <h3 className="mt-6 text-lg font-bold tracking-tight text-slate-950">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
