import Link from "next/link";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";

const links = [
  { href: "/services", label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-lg">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Main navigation">
        <Logo />
        <div className="hidden items-center gap-7 lg:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600">{link.label}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/contact" className="hidden text-sm font-semibold text-slate-700 hover:text-blue-600 sm:block">Contact</Link>
          <Button href="/contact" className="px-4 py-2.5">Start a conversation</Button>
          <details className="group relative lg:hidden">
            <summary className="grid size-10 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden" aria-label="Open navigation menu">
              <span className="grid gap-1.5"><span className="block h-0.5 w-4 rounded bg-current" /><span className="block h-0.5 w-4 rounded bg-current" /><span className="block h-0.5 w-4 rounded bg-current" /></span>
            </summary>
            <div className="absolute right-0 top-12 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
              {links.map((link) => <Link key={link.href} href={link.href} className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{link.label}</Link>)}
              <Link href="/contact" className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">Contact</Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
