import Reveal from "@/components/shared/Reveal";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  /** Use "dark" when the heading sits on a dark section background. */
  tone?: "light" | "dark";
};

export default function SectionHeading({ eyebrow, title, description, align = "left", tone = "light" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  const dark = tone === "dark";
  return (
    <Reveal className={`max-w-2xl ${alignment}`}>
      <p className={`mb-4 text-sm font-bold uppercase tracking-[0.16em] ${dark ? "text-cyan-300" : "text-blue-600"}`}>{eyebrow}</p>
      <h2 className={`text-balance text-3xl font-bold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      <p className={`mt-5 text-pretty text-base leading-7 sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
    </Reveal>
  );
}
