import Link from "next/link";
import Logo from "@/components/shared/Logo";

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_0.7fr_1fr] lg:px-10">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">Modern web, mobile, and integration solutions for manufacturers who want more from their ERP investment.</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Explore</p>
          <div className="mt-4 grid gap-2 text-sm">
            <Link href="/services" className="w-fit hover:text-white">Services</Link>
            <Link href="/solutions" className="w-fit hover:text-white">Solutions</Link>
            <Link href="/industries" className="w-fit hover:text-white">Industries</Link>
            <Link href="/about" className="w-fit hover:text-white">About ERPVers</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Start a conversation</p>
          <a className="mt-3 block break-all text-lg font-semibold text-white hover:text-blue-300" href="mailto:support@erpvers.com">support@erpvers.com</a>
          <p className="mt-2 text-sm text-slate-400">Tell us what you want your ERP to do next.</p>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} ERPVers. Built for the next phase of ERP.</div>
    </footer>
  );
}
