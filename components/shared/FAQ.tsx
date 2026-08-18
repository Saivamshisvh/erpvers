import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const faqs = [
  {
    q: "How do we get started?",
    a: "Tell us about the Infor LN workflow, integration, or application that needs attention. We'll scope a starting point on a short call before any commitment.",
  },
  {
    q: "Do you work within our existing Infor LN setup?",
    a: "Yes. We build within your existing Infor LN environment and processes rather than asking you to change how your team already works.",
  },
  {
    q: "Can you deliver Infor LN training separately from development work?",
    a: "Yes — hands-on training and knowledge transfer for functional and technical teams is one of our core services, independent of any development engagement.",
  },
  {
    q: "Do you work remotely?",
    a: "Yes. We work remotely with clients and schedule calls around your team's timezone.",
  },
];

export default function FAQ() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          align="center"
          eyebrow="FAQ"
          title="Common questions"
          description="A few things people usually ask before reaching out."
        />
        <div className="mt-12 grid gap-3">
          {faqs.map((faq, index) => (
            <Reveal key={faq.q} delay={index * 60}>
              <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 open:bg-white open:shadow-md open:shadow-blue-950/5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-slate-950 marker:content-none">
                  {faq.q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-slate-500 transition-transform duration-200 group-open:rotate-45 group-open:bg-blue-50 group-open:text-blue-600">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-600">{faq.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
