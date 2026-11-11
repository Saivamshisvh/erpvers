import Icon from "@/components/shared/Icon";
import Reveal from "@/components/shared/Reveal";
import Button from "@/components/ui/Button";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

type CTASectionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Background of the band the card sits on, to match the section above it. */
  background?: "white" | "slate";
};

export default function CTASection({
  eyebrow = "Start with one workflow",
  title = "Tell us where your ERP or data has friction.",
  description = "A short call is enough to see whether we can help. You will hear back from us within one business day.",
  background = "white",
}: CTASectionProps) {
  return (
    <section className={`${background === "white" ? "bg-white" : "bg-slate-50"} py-16 sm:py-20`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.26),transparent_32%),radial-gradient(circle_at_10%_110%,rgba(37,99,235,0.28),transparent_36%)]"
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
                <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
                <p className="mt-4 text-pretty text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Button href="/contact">
                  Start a conversation <Icon name="arrow" className="ml-2 size-4" />
                </Button>
                <Button href={WHATSAPP_HREF} variant="outline" external>
                  Chat on WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
