import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";

type Tier = { hours: string; discount: string };

const tiers: Tier[] = [
  { hours: "100 hrs", discount: "10% off" },
  { hours: "150 hrs", discount: "15% off" },
  { hours: "200 hrs", discount: "18% off" },
  { hours: "200+ hrs", discount: "20% off" },
];

type PrepaidCreditsProps = {
  variant?: "full" | "teaser";
};

export default function PrepaidCredits({ variant = "full" }: PrepaidCreditsProps) {
  if (variant === "teaser") {
    return (
      <section className="bg-blue-600 py-14 sm:py-16">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center lg:px-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-200">Prepaid hour credits</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pay upfront for a block of hours and save up to 20%.
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Prepaid hour discount tiers">
              {tiers.map((tier) => (
                <li key={tier.hours} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white">
                  {tier.hours} &rarr; {tier.discount}
                </li>
              ))}
            </ul>
          </div>
          <Button href="/services#prepaid-credits" variant="outline" className="shrink-0">
            See the full breakdown <Icon name="arrow" className="ml-2 size-4" />
          </Button>
        </Reveal>
      </section>
    );
  }

  return (
    <section id="prepaid-credits" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Prepaid hour credits"
          title="Commit hours upfront, save more."
          description="Pay in advance for a block of hours at a discount on our standard rate, then draw on them across any development, integration, data, or training work."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, index) => (
            <Reveal key={tier.hours} delay={index * 80}>
              <article className="h-full rounded-2xl border border-slate-200 bg-white p-7 text-center transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon name="percent" className="size-6" />
                </span>
                <p className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{tier.hours}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">prepaid in advance</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-blue-600">{tier.discount}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal delay={320} className="mt-8">
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Discount applies to hours purchased in a single advance payment and can be used across any ERP VERS service. Get in touch to lock in your rate.
          </p>
        </Reveal>
        <Reveal delay={360} className="mt-8">
          <Button href="/contact">
            Ask about prepaid credits <Icon name="arrow" className="ml-2 size-4" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
