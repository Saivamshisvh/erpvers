import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import TextLink from "@/components/ui/TextLink";

const industries = ["Discrete manufacturing", "Industrial equipment", "Automotive & components", "Distribution"];

export default function Industries() {
  return (
    <section id="industries" className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
        <div>
          <SectionHeading
            eyebrow="Industries"
            title="For teams that make, move, and improve."
            description="ERP VERS is focused on the operational reality of manufacturing and distribution, not generic digital transformation."
          />
          <Reveal delay={80} className="mt-7">
            <TextLink href="/industries">How we work with each industry</TextLink>
          </Reveal>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {industries.map((industry, index) => (
            <Reveal key={industry} delay={index * 70}>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon name="check" className="size-4" />
                </span>
                {industry}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
