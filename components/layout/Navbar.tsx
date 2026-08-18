"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";

const links = [
  { href: "/", label: "Homepage" },
  { href: "/services", label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-lg">
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Main navigation">
        <Logo />
        <div className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`relative py-1 text-sm transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:rounded-full after:bg-blue-600 after:transition-all ${
                isActive(link.href)
                  ? "font-semibold text-blue-600 after:w-full"
                  : "font-medium text-slate-600 after:w-0 hover:text-blue-600 hover:after:w-full"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/contact" className="hidden text-sm font-semibold text-slate-700 hover:text-blue-600 sm:block">Contact</Link>
          <Button href="/contact" className="px-4 py-2.5">Start a conversation</Button>

          <div ref={menuRef} className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              className="grid size-10 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:border-blue-200"
            >
              <span className="relative grid size-4 place-items-center">
                <span
                  className={`absolute h-0.5 w-4 rounded bg-current transition-all duration-300 ${
                    menuOpen ? "rotate-45" : "-translate-y-1.5"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4 rounded bg-current transition-all duration-200 ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4 rounded bg-current transition-all duration-300 ${
                    menuOpen ? "-rotate-45" : "translate-y-1.5"
                  }`}
                />
              </span>
            </button>

            <div
              className={`absolute right-0 top-13 w-60 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 transition-all duration-200 ${
                menuOpen
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-2 scale-95 opacity-0"
              }`}
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive(link.href) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/contact" className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">Contact</Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
