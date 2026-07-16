import Link from "next/link";

type LogoProps = {
  inverse?: boolean;
};

export default function Logo({ inverse = false }: LogoProps) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="ERPVers home">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105">
        E
      </span>
      <span className={`text-xl font-bold tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}>
        ERP<span className="text-blue-600">Vers</span>
      </span>
    </Link>
  );
}
