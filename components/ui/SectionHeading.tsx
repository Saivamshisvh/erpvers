type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export default function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  );
}
