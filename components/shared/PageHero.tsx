import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
};

export default function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.24),transparent_26%),radial-gradient(circle_at_20%_100%,rgba(37,99,235,0.23),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{description}</p>
      </div>
    </section>
  );
}
