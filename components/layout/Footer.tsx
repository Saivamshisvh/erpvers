import Link from "next/link";
import Logo from "@/components/shared/Logo";
import { WHATSAPP_HREF } from "@/lib/whatsapp";

const CONTACT_EMAIL = "support@erpvers.com";

const columns = [
  {
    heading: "Services",
    links: [
      { href: "/services#erp-engineering", label: "Infor LN development" },
      { href: "/services#erp-engineering", label: "Integrations, web & mobile" },
      { href: "/services#erp-engineering", label: "Infor LN training" },
      { href: "/services#data-cloud", label: "Data & cloud" },
      { href: "/services#prepaid-credits", label: "Prepaid hour credits" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About ERP VERS" },
      { href: "/solutions", label: "Solutions" },
      { href: "/industries", label: "Industries" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.8fr_1.1fr] lg:px-10">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            Web, mobile, integration, and data solutions for teams who want more from their ERP investment.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{column.heading}</p>
            <ul className="mt-5 grid gap-3 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-300 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Get in touch</p>
          <a className="mt-5 block break-all text-base font-semibold text-white transition-colors hover:text-cyan-300" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          <a
            className="mt-3 inline-block text-sm text-slate-300 transition-colors hover:text-white"
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat on WhatsApp
          </a>
          <p className="mt-4 text-sm leading-6 text-slate-400">We reply within one business day.</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} ERP VERS. All rights reserved.</p>
          <p>Product names mentioned are trademarks of their respective owners.</p>
        </div>
      </div>
    </footer>
  );
}
