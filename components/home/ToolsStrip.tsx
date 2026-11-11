import Reveal from "@/components/shared/Reveal";

const tools = ["Infor LN", "Infor ION", "SAP BTP", "Power BI", "Tableau", "Qlik Sense", "Snowflake", "Azure Data Factory"];

export default function ToolsStrip() {
  return (
    <section className="border-y border-slate-200 bg-white" aria-label="Platforms and tools we work with">
      <Reveal className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:gap-12 lg:px-10">
        <p className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Platforms and tools we work with</p>
        <ul className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3 lg:justify-between lg:gap-x-6">
          {tools.map((tool) => (
            <li key={tool} className="text-sm font-semibold tracking-tight text-slate-500 sm:text-base">
              {tool}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
