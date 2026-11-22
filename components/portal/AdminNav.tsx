import Link from "next/link";

type AdminNavProps = { current: "clients" | "review" | "freelancers"; reviewCount: number; registrationCount: number };

export default function AdminNav({ current, reviewCount, registrationCount }: AdminNavProps) {
  const items = [
    { key: "clients", href: "/portal/admin", label: "Clients", count: registrationCount },
    { key: "review", href: "/portal/admin/review", label: "Hours to review", count: reviewCount },
    { key: "freelancers", href: "/portal/admin/freelancers", label: "Freelancers", count: 0 },
  ] as const;
  return (
    <nav aria-label="Admin sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            item.key === current ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {item.label}
          {item.count > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
